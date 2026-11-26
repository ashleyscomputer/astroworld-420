import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
  "Access-Control-Allow-Methods": "POST, OPTIONS",
};
const json = (body:Record<string,unknown>,status=200) =>
  new Response(JSON.stringify(body),{status,headers:{...corsHeaders,"Content-Type":"application/json"}});

Deno.serve(async(request:Request)=>{
  if(request.method==="OPTIONS")return new Response("ok",{headers:corsHeaders});
  if(request.method!=="POST")return json({error:"Method not allowed"},405);

  const authorization=request.headers.get("Authorization");
  if(!authorization?.startsWith("Bearer "))return json({error:"Not authenticated"},401);

  const url=Deno.env.get("SUPABASE_URL");
  const anonKey=Deno.env.get("SUPABASE_ANON_KEY");
  const serviceKey=Deno.env.get("SUPABASE_SERVICE_ROLE_KEY");
  if(!url||!anonKey||!serviceKey)return json({error:"Edge Function secrets are not configured"},500);

  const callerClient=createClient(url,anonKey,{
    global:{headers:{Authorization:authorization}},
    auth:{persistSession:false,autoRefreshToken:false}
  });
  const adminClient=createClient(url,serviceKey,{
    auth:{persistSession:false,autoRefreshToken:false}
  });

  try{
    const {data:authData,error:authError}=await callerClient.auth.getUser();
    const caller=authData.user;
    if(authError||!caller)return json({error:"Invalid or expired session"},401);

    const {data:profile,error:profileError}=await adminClient
      .from("profiles").select("role,active").eq("id",caller.id).maybeSingle();
    if(profileError)return json({error:"Could not verify administrator role"},500);
    if(!profile||profile.role!=="super_admin"||profile.active!==true){
      return json({error:"Active Super Admin access required"},403);
    }

    const body=await request.json();
    const email=String(body.email??"").trim().toLowerCase();
    const username=String(body.username??"").trim();
    const fullName=String(body.full_name??"").trim();
    if(!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email))return json({error:"A valid email is required"},400);
    if(!/^[a-zA-Z0-9._-]{3,40}$/.test(username))return json({error:"Username must be 3-40 characters using letters, numbers, dot, underscore or hyphen"},400);
    if(fullName.length<2||fullName.length>100)return json({error:"Full name must be 2-100 characters"},400);

    const {data:existingProfile,error:usernameError}=await adminClient
      .from("profiles").select("id").eq("username",username).maybeSingle();
    if(usernameError)return json({error:"Could not validate username"},500);
    if(existingProfile)return json({error:"That username is already in use"},409);

    const {data:existingUsers,error:listError}=await adminClient.auth.admin.listUsers({page:1,perPage:1000});
    if(listError)return json({error:"Could not validate the invitation email"},500);
    if(existingUsers.users.some(user=>user.email?.toLowerCase()===email)){
      return json({error:"An Auth account with that email already exists"},409);
    }

    const {data:invitation,error:inviteError}=await adminClient.auth.admin.inviteUserByEmail(email,{
      data:{full_name:fullName,username}
    });
    if(inviteError||!invitation.user){
      return json({error:inviteError?.message??"Could not create the invitation"},400);
    }

    const {error:insertError}=await adminClient.from("profiles").insert({
      id:invitation.user.id,username,full_name:fullName,role:"staff",active:true
    });
    if(insertError){
      await adminClient.auth.admin.deleteUser(invitation.user.id);
      return json({error:"The Auth invite was rolled back because the staff profile could not be created: "+insertError.message},409);
    }
    return json({ok:true,user_id:invitation.user.id,email});
  }catch(error){
    return json({error:error instanceof Error?error.message:"Unexpected invitation error"},500);
  }
});