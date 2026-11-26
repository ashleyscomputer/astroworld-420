import React,{useCallback,useEffect,useMemo,useState} from "react";
import {
  ActivityIndicator,KeyboardAvoidingView,Modal,Platform,Pressable,
  ScrollView,StatusBar,StyleSheet,Text as NativeText,TextInput,View
} from "react-native";
import type { TextProps, TextStyle } from "react-native";
import { useFonts, Inter_400Regular, Inter_500Medium, Inter_600SemiBold, Inter_700Bold } from "@expo-google-fonts/inter";
import { Ionicons } from "@expo/vector-icons";
import { colors } from "./src/theme/colors";
import { Button, Field, Card, Heading, Metric } from "./src/components/ui/Primitives";
import type {Session} from "@supabase/supabase-js";
import {assertSupabaseConfigured,supabase,supabaseConfigured} from "./src/lib/supabase";
import {
  cacheProducts,enqueueSale,getCachedProducts,getPendingSales,
  markPendingSaleError,pendingSaleCount,removePendingSale
} from "./src/lib/offline";
import type {CartLine,Member,PaymentMethod,Product,Profile,QueuedSale,Sale} from "./src/types";

const T={bg:colors.background,surface:colors.surface,raised:colors.elevated,line:colors.border,text:colors.text,muted:colors.muted,green:colors.accent,greenDark:"#28351A",purple:colors.purple,purpleDark:"#29213F",red:colors.danger,amber:colors.warning};

function Text({style,...props}:TextProps){
  const flattened=StyleSheet.flatten(style) as TextStyle|undefined;
  const weight=flattened?.fontWeight;
  const family=weight==="900"||weight==="800"||weight==="700"||weight==="bold"?"Inter_700Bold":weight==="600"?"Inter_600SemiBold":weight==="500"?"Inter_500Medium":"Inter_400Regular";
  return <NativeText {...props} style={[{fontFamily:family},style]}/>;
}
type Tab="Home"|"Sales"|"Inventory"|"Members"|"More";
type ModalKind="payment"|"restock"|"adjust"|"prices"|"threshold"|"cost"|"newProduct"|"newMember"|"agreement"|"verifyPass"|"staff"|"expense"|null;
type ModalState={kind:ModalKind;product?:Product;sale?:Sale;member?:Member};
const money=(c:number|null|undefined)=>"R "+(Number(c??0)/100).toFixed(2);
const grams=(u:number)=>String(u/2).replace(/\.0$/,"");
const today=()=>{const d=new Date();return [d.getFullYear(),String(d.getMonth()+1).padStart(2,"0"),String(d.getDate()).padStart(2,"0")].join("-");};
const monthStart=()=>today().slice(0,8)+"01";
const uuid=()=>"xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx".replace(/[xy]/g,c=>{const r=Math.floor(Math.random()*16);return(c==="x"?r:(r&3)|8).toString(16);});
const networkError=(m:string)=>/network request failed|failed to fetch|fetch failed|networkerror|timeout|offline/i.test(m);
async function rpc<T=any>(name:string,params:Record<string,unknown>={}):Promise<T>{
  const {data,error}=await(supabase as any).rpc(name,params);
  if(error)throw new Error(error.message||name+" failed");
  return data as T;
}

export default function App(){
  const [fontsLoaded]=useFonts({Inter_400Regular,Inter_500Medium,Inter_600SemiBold,Inter_700Bold});
  const [session,setSession]=useState<Session|null>(null);
  const [profile,setProfile]=useState<Profile|null>(null);
  const [booting,setBooting]=useState(true);
  const [busy,setBusy]=useState(false);
  const [tab,setTab]=useState<Tab>("Home");
  const [salesView,setSalesView]=useState<"register"|"history">("register");
  const [inventoryQuery,setInventoryQuery]=useState("");
  const [memberQuery,setMemberQuery]=useState("");
  const [salesFilter,setSalesFilter]=useState<"all"|"paid"|"unpaid"|"refunded"|"cancelled">("all");
  const [email,setEmail]=useState("");
  const [password,setPassword]=useState("");
  const [products,setProducts]=useState<Product[]>([]);
  const [sales,setSales]=useState<Sale[]>([]);
  const [members,setMembers]=useState<Member[]>([]);
  const [staff,setStaff]=useState<Profile[]>([]);
  const [ops,setOps]=useState<any>(null);
  const [financials,setFinancials]=useState<any>(null);
  const [cart,setCart]=useState<CartLine[]>([]);
  const [customerName,setCustomerName]=useState("");
  const [checkoutPayment,setCheckoutPayment]=useState<PaymentMethod|"unpaid">("cash");
  const [queueCount,setQueueCount]=useState(0);
  const [modal,setModal]=useState<ModalState>({kind:null});
  const [form,setForm]=useState<Record<string,string>>({});
  const [notice,setNotice]=useState("");
  const [dialog,setDialog]=useState<{title:string;message:string;confirmLabel?:string;danger?:boolean;onConfirm?:()=>void}|null>(null);
  const superAdmin=profile?.role==="super_admin";

  const setField=(key:string,value:string)=>setForm(old=>({...old,[key]:value}));
  const openModal=(kind:ModalKind,extra:Omit<ModalState,"kind">={})=>{setForm({});setModal({kind,...extra});};
  const closeModal=()=>setModal({kind:null});
  const askToConfirm=(title:string,message:string,confirmLabel:string,onConfirm:()=>void,danger=false)=>setDialog({title,message,confirmLabel,onConfirm,danger});

  useEffect(()=>{
    let mounted=true;
    void supabase.auth.getSession().then(({data})=>{if(mounted)setSession(data.session);}).catch(()=>{if(mounted)setNotice("Session restore failed. Sign in again.");}).finally(()=>{if(mounted)setBooting(false);});
    const {data}=supabase.auth.onAuthStateChange((_event,next)=>{setSession(next);if(!next){setProfile(null);setProducts([]);setSales([]);setMembers([]);}});
    return()=>{mounted=false;data.subscription.unsubscribe();};
  },[]);

  const syncQueue=useCallback(async()=>{
    if(!session?.user||!supabaseConfigured)return;
    const pending=await getPendingSales();
    for(const item of pending){
      try{
        await rpc("record_sale_with_payment",{
          p_request_id:item.requestId,p_items:item.items,p_customer_name:item.customerName,
          p_member_id:null,p_payment_method:item.paymentMethod,p_notes:item.notes
        });
        await removePendingSale(item.requestId);
      }catch(error){
        const message=error instanceof Error?error.message:"Sync failed";
        await markPendingSaleError(item.requestId,message);
        break;
      }
    }
    setQueueCount(await pendingSaleCount());
  },[session]);

  const refresh=useCallback(async()=>{
    if(!session?.user)return;
    assertSupabaseConfigured();
    const {data:person,error:personError}=await supabase.from("profiles").select("id,username,full_name,role,active").eq("id",session.user.id).single();
    if(personError||!person||!person.active){await supabase.auth.signOut();throw new Error("This account is not active in the Astroworld Admin profiles table.");}
    const me=person as Profile;setProfile(me);
    const [productResult,stockResult,salesResult,membersResult,opsResult]=await Promise.all([
      supabase.from("products").select("id,name,sort_order,active,price1_cents,price2_cents,price3_cents,low_stock_half_units,revision").eq("active",true).order("sort_order"),
      supabase.from("stock").select("product_id,half_units,revision"),
      supabase.from("sales").select("id,ref,customer_name,status,payment_status,payment_method,total_cents,created_at,revision").order("created_at",{ascending:false}).limit(30),
      supabase.from("members").select("id,full_name,phone,email,status,created_at").order("created_at",{ascending:false}).limit(50),
      (supabase as any).rpc("ops_summary")
    ]);
    if(!productResult.error&&!stockResult.error&&productResult.data){
      const stockMap=new Map<string,any>((stockResult.data??[]).map((row:any)=>[row.product_id,row]));
      const joined=(productResult.data as any[]).map(p=>({...p,half_units:Number(stockMap.get(p.id)?.half_units??0),stock_revision:Number(stockMap.get(p.id)?.revision??0)} as Product));
      setProducts(joined);await cacheProducts(joined);
    }else{
      const cached=await getCachedProducts();if(cached.length)setProducts(cached);
      setNotice("Inventory or stock could not be refreshed. Showing the last verified cache where available.");
    }
    if(!salesResult.error&&salesResult.data)setSales(salesResult.data as Sale[]);
    if(!membersResult.error&&membersResult.data)setMembers(membersResult.data as Member[]);
    if(!opsResult.error)setOps(opsResult.data);
    if(me.role==="super_admin"){
      const {data:moneyData}=await(supabase as any).rpc("financial_summary",{p_from:monthStart(),p_to:today()});
      if(moneyData)setFinancials(moneyData);
      const {data:people}=await supabase.from("profiles").select("id,username,full_name,role,active").order("created_at");
      if(people)setStaff(people as Profile[]);
    }
    await syncQueue();
  },[session,syncQueue]);

  useEffect(()=>{if(!session)return;setBusy(true);void refresh().catch(e=>setNotice(e instanceof Error?e.message:"Could not load admin data.")).finally(()=>setBusy(false));},[session,refresh]);

  const addToCart=(productId:string,size:"full"|"half")=>setCart(old=>{
    const existing=old.find(item=>item.product_id===productId&&item.size===size);
    return existing?old.map(item=>item===existing?{...item,quantity:Math.min(100,item.quantity+1)}:item):[...old,{product_id:productId,size,quantity:1}];
  });
  const changeQuantity=(index:number,delta:number)=>setCart(old=>old.map((line,i)=>i===index?{...line,quantity:line.quantity+delta}:line).filter(line=>line.quantity>0));
  const estimate=useMemo(()=>{
    const fullCounts=new Map<string,number>();let sum=0;
    for(const line of cart){
      const p=products.find(item=>item.id===line.product_id);if(!p)continue;
      if(line.size==="half"){sum+=(p.price1_cents/2)*line.quantity;continue;}
      let count=fullCounts.get(line.product_id)??0;
      for(let i=0;i<line.quantity;i++){sum+=count===0?p.price1_cents:count===1?p.price2_cents:p.price3_cents;count++;}
      fullCounts.set(line.product_id,count);
    }
    return sum;
  },[cart,products]);

  const checkout=async()=>{
    if(!cart.length)return;
    const queued:QueuedSale={requestId:uuid(),items:cart,customerName:customerName.trim(),paymentMethod:checkoutPayment==="unpaid"?null:checkoutPayment,notes:"",queuedAt:new Date().toISOString()};
    setBusy(true);
    try{
      assertSupabaseConfigured();
      const result=await rpc<{id:string;ref:string;total_cents:number}>("record_sale_with_payment",{
        p_request_id:queued.requestId,p_items:queued.items,p_customer_name:queued.customerName,
        p_member_id:null,p_payment_method:queued.paymentMethod,p_notes:queued.notes
      });
      setNotice("Sale "+result.ref+" recorded for "+money(result.total_cents)+".");
      setCart([]);setCustomerName("");await refresh();
    }catch(error){
      const message=error instanceof Error?error.message:"Sale could not be saved.";
      if(networkError(message)){
        await enqueueSale(queued);setQueueCount(await pendingSaleCount());
        setNotice("Saved on this device. Pending server confirmation and stock validation.");
        setCart([]);setCustomerName("");
      }else setNotice(message);
    }finally{setBusy(false);}
  };

  const inventoryModal=(kind:ModalKind,product:Product)=>{
    const initial:Record<string,string>=kind==="prices"
      ?{price1:(product.price1_cents/100).toFixed(2),price2:(product.price2_cents/100).toFixed(2),price3:(product.price3_cents/100).toFixed(2)}
      :kind==="threshold"?{threshold_g:grams(product.low_stock_half_units)}
      :kind==="adjust"?{quantity_g:grams(product.half_units),reason:""}
      :kind==="cost"?{cost:""}
      :{quantity_g:"10",reason:"Restock"};
    setForm(initial);setModal({kind,product});
  };

  const doAction=async()=>{
    const current=modal;const v=form;setBusy(true);
    try{
      switch(current.kind){
        case "payment":
          if(current.sale)await rpc("record_sale_payment",{p_sale_id:current.sale.id,p_revision:current.sale.revision,p_payment_method:v.payment_method});
          break;
        case "restock":
          if(current.product)await rpc("restock_product",{p_product_id:current.product.id,p_add_half:Math.round(Number(v.quantity_g)*2),p_reason:v.reason||"Mobile restock"});
          break;
        case "adjust":
          if(current.product)await rpc("adjust_stock",{p_product_id:current.product.id,p_new_half:Math.round(Number(v.quantity_g)*2),p_revision:current.product.stock_revision,p_reason:v.reason||""});
          break;
        case "prices":
          if(current.product)await rpc("update_product_prices",{p_product_id:current.product.id,p1:Math.round(Number(v.price1)*100),p2:Math.round(Number(v.price2)*100),p3:Math.round(Number(v.price3)*100),p_revision:current.product.revision});
          break;
        case "threshold":
          if(current.product)await rpc("set_low_stock_threshold",{p_product_id:current.product.id,p_threshold_half:Math.round(Number(v.threshold_g)*2),p_revision:current.product.revision});
          break;
        case "cost":
          if(current.product)await rpc("set_product_cost",{p_product_id:current.product.id,p_cost_per_gram_cents:v.cost===""?null:Math.round(Number(v.cost)*100)});
          break;
        case "newProduct":
          await rpc("create_product",{p_product_id:v.id?.trim().toLowerCase().replace(/\s+/g,"-"),p_name:v.name?.trim(),p_sort_order:Number(v.sort_order||products.length+1),p_price1_cents:Math.round(Number(v.price1)*100),p_price2_cents:Math.round(Number(v.price2)*100),p_price3_cents:Math.round(Number(v.price3)*100),p_low_stock_half_units:Math.round(Number(v.threshold_g||10)*2)});
          break;
        case "newMember":
          await rpc("create_member",{p_full_name:v.full_name?.trim(),p_phone:v.phone?.trim()||"",p_email:v.email?.trim()||""});
          break;
        case "agreement":
          if(current.member)await rpc("record_agreement",{p_member_id:current.member.id,p_version:v.version?.trim(),p_signer_name:v.signer_name?.trim()});
          break;
        case "verifyPass":{
          const result=await rpc<any>("verify_member_pass",{p_token:v.token?.trim()});
          const member=result.member;
          setDialog({title:"Pass: "+String(result.result??"unknown"),message:member?String(member.full_name)+" · "+String(member.plan??"No active plan")+" · "+String(member.expires_at??"No expiry returned"):"No member details returned."});
          break;
        }
        case "staff":{
          assertSupabaseConfigured();
          const {data,error}=await supabase.functions.invoke("invite-staff",{body:{email:v.email?.trim(),username:v.username?.trim(),full_name:v.full_name?.trim()}});
          if(error)throw new Error(error.message);if(data?.error)throw new Error(data.error);
          setDialog({title:"Invitation sent",message:"Supabase Auth will deliver the staff invitation email."});
          break;
        }
        case "expense":
          await rpc("add_expense",{p_category:v.category?.trim(),p_description:v.description?.trim()||"",p_amount_cents:Math.round(Number(v.amount)*100),p_incurred_on:v.incurred_on||today()});
          break;
        default:break;
      }
      closeModal();await refresh();setNotice("Saved successfully.");
    }catch(error){setNotice(error instanceof Error?error.message:"Action failed.");}
    finally{setBusy(false);}
  };

  const saleAction=(sale:Sale,kind:"cancel"|"refund")=>{
    const question=kind==="refund"?"Refund this sale and restock its items?":"Cancel this unpaid sale and restore its stock?";
    askToConfirm(kind==="refund"?"Confirm refund":"Confirm cancellation",question,kind==="refund"?"Refund + restock":"Cancel sale",()=>{
      setBusy(true);
      const name=kind==="refund"?"refund_sale":"cancel_sale";
      const params=kind==="refund"?{p_sale_id:sale.id,p_revision:sale.revision,p_restock:true,p_reason:"Refunded in admin app"}:{p_sale_id:sale.id,p_revision:sale.revision,p_reason:"Cancelled in admin app"};
      void rpc(name,params).then(refresh).catch(e=>setNotice(e instanceof Error?e.message:"Unable to update sale.")).finally(()=>setBusy(false));
    },true);
  };

  const fields=():Array<{key:string;label:string;type?:"default"|"email-address"|"numeric"|"decimal-pad"|"phone-pad"}>=>{
    switch(modal.kind){
      case "restock":return[{key:"quantity_g",label:"Add stock (grams)",type:"decimal-pad"},{key:"reason",label:"Reason"}];
      case "adjust":return[{key:"quantity_g",label:"New stock level (grams)",type:"decimal-pad"},{key:"reason",label:"Reason (required)"}];
      case "prices":return[{key:"price1",label:"1st gram price (R)",type:"decimal-pad"},{key:"price2",label:"2nd gram price (R)",type:"decimal-pad"},{key:"price3",label:"3rd+ gram price (R)",type:"decimal-pad"}];
      case "threshold":return[{key:"threshold_g",label:"Low-stock threshold (g)",type:"decimal-pad"}];
      case "cost":return[{key:"cost",label:"Cost per gram (R, blank = unknown)",type:"decimal-pad"}];
      case "newProduct":return[{key:"id",label:"Product ID (lowercase, hyphens)"},{key:"name",label:"Product name"},{key:"sort_order",label:"Sort order",type:"numeric"},{key:"price1",label:"1st gram price (R)",type:"decimal-pad"},{key:"price2",label:"2nd gram price (R)",type:"decimal-pad"},{key:"price3",label:"3rd+ gram price (R)",type:"decimal-pad"},{key:"threshold_g",label:"Low-stock threshold (g)",type:"decimal-pad"}];
      case "newMember":return[{key:"full_name",label:"Full name"},{key:"phone",label:"Phone",type:"phone-pad"},{key:"email",label:"Email",type:"email-address"}];
      case "agreement":return[{key:"version",label:"Agreement version"},{key:"signer_name",label:"Signer full name"}];
      case "verifyPass":return[{key:"token",label:"Pass token (AW420:...)"}];
      case "staff":return[{key:"email",label:"Staff email",type:"email-address"},{key:"username",label:"Username"},{key:"full_name",label:"Full name"}];
      case "expense":return[{key:"category",label:"Category"},{key:"description",label:"Description"},{key:"amount",label:"Amount (R)",type:"decimal-pad"},{key:"incurred_on",label:"Date (YYYY-MM-DD)"}];
      default:return[];
    }
  };

  const renderModal=()=>{
    if(!modal.kind)return null;
    return <Modal transparent animationType="slide" visible onRequestClose={closeModal}>
      <KeyboardAvoidingView behavior={Platform.OS==="ios"?"padding":undefined} style={s.modalBackdrop}>
        <View style={s.modalCard}>
          <View style={s.rowBetween}>
            <Text style={s.modalTitle}>{modal.kind==="payment"?"Record payment":modal.kind==="newProduct"?"Add product":modal.kind==="newMember"?"New member":modal.kind==="staff"?"Invite staff":modal.kind==="expense"?"Add expense":modal.kind==="verifyPass"?"Verify QR pass":modal.kind.charAt(0).toUpperCase()+modal.kind.slice(1)}</Text>
            <Pressable onPress={closeModal}><Text style={s.muted}>Close ✕</Text></Pressable>
          </View>
          {modal.kind==="payment"?<View style={s.row}>
            <Button title="Cash" kind={form.payment_method==="cash"?"primary":"secondary"} onPress={()=>setField("payment_method","cash")}/>
            <Button title="Card" kind={form.payment_method==="card"?"primary":"secondary"} onPress={()=>setField("payment_method","card")}/>
          </View>:null}
          <ScrollView style={{maxHeight:420}} keyboardShouldPersistTaps="handled">
            {fields().map(f=><Field key={f.key} label={f.label} value={form[f.key]??""} onChange={v=>setField(f.key,v)} type={f.type}/>)}
          </ScrollView>
          <View style={s.row}>
            <Button title="Back" kind="secondary" onPress={closeModal}/>
            <Button title={busy?"Saving...":"Save"} onPress={()=>void doAction()} disabled={busy||(modal.kind==="payment"&&!form.payment_method)}/>
          </View>
        </View>
      </KeyboardAvoidingView>
    </Modal>;
  };

  const home=()=> <>
    <View style={s.hero}>
      <Text style={s.eyebrow}>ASTROWORLD 420 · ADMIN</Text>
      <Text style={s.heroTitle}>Control room.</Text>
      <Text style={s.heroSub}>Operations at a glance. Keep the floor moving.</Text>
      <View style={s.heroAccent}/>
    </View>
    <View style={s.metricGrid}>
      <Metric label="Sales today" value={String(ops?.sales_today??"—")} accent={T.green}/>
      <Metric label="Unpaid sales" value={String(ops?.unpaid_sales??"—")} accent={T.purple}/>
      <Metric label="Pending members" value={String(ops?.pending_members??"—")} accent={T.amber}/>
      <Metric label="Low-stock items" value={String(ops?.low_stock?.length??"—")} accent={T.red}/>
    </View>
    {superAdmin&&financials?<Card>
      <Heading title="This month" hint="Financial view · Super Admin only"/>
      {([["Paid revenue",financials.paid_revenue_cents],["Gross profit",financials.gross_profit_cents],["Expenses",financials.expenses_cents],["Net profit",financials.net_profit_cents]] as any[]).map(([label,value])=><View key={label} style={s.rowBetween}><Text style={s.muted}>{label}</Text><Text style={s.metricValue}>{money(value)}</Text></View>)}
      <Text style={s.micro}>Profit is calculated only where every paid sale line has a recorded cost.</Text>
    </Card>:null}
    <Heading title="Needs attention" hint="Live database summary"/>
    {(ops?.low_stock??[]).slice(0,5).map((item:any)=><Card key={item.product_id} style={s.compact}><View style={s.rowBetween}><View><Text style={s.cardTitle}>{item.name}</Text><Text style={s.muted}>{grams(Number(item.half_units))} g remaining</Text></View><Text style={s.low}>LOW STOCK</Text></View></Card>)}
    {!ops?.low_stock?.length?<Card><Text style={s.muted}>No low-stock alerts. The shelves are behaving.</Text></Card>:null}
    <Card style={s.syncCard}><View style={s.rowBetween}><View><Text style={s.cardTitle}>Offline queue</Text><Text style={s.muted}>{queueCount} sale(s) waiting to sync</Text></View><Button title="Sync now" small onPress={()=>void syncQueue().then(refresh)}/></View>
      {queueCount>0?<Text style={s.micro}>Queued sales are not confirmed, do not count as revenue, and still need server stock validation.</Text>:null}
    </Card>
  </>;

  const salesScreen=()=> <>
    <Heading title="Sales" hint="Fast counter checkout and transaction history"/>
    <View style={s.row}>
      <Button title="Register" small kind={salesView==="register"?"primary":"secondary"} onPress={()=>setSalesView("register")}/>
      <Button title="Sales history" small kind={salesView==="history"?"primary":"secondary"} onPress={()=>setSalesView("history")}/>
    </View>
    {salesView==="register"?<Card>
      <Text style={s.cardTitle}>Build a sale</Text>
      <Field label="Customer name (optional)" value={customerName} onChange={setCustomerName}/>
      <Text style={s.fieldLabel}>Payment at counter</Text>
      <View style={s.row}>{(["cash","card","unpaid"] as const).map(m=><Button key={m} title={m.toUpperCase()} small kind={checkoutPayment===m?"primary":"secondary"} onPress={()=>setCheckoutPayment(m)}/>)}</View>
      <View style={s.divider}/>
      {products.map(p=><View key={p.id} style={s.productPick}>
        <View style={{flex:1}}><Text style={s.cardTitle}>{p.name}</Text><Text style={s.muted}>{money(p.price1_cents)} / g · {grams(p.half_units)} g available</Text></View>
        <View style={s.row}><Button title="+½" small kind="secondary" onPress={()=>addToCart(p.id,"half")}/><Button title="+1g" small onPress={()=>addToCart(p.id,"full")}/></View>
      </View>)}
      {cart.length?<>
        <View style={s.divider}/><Text style={s.cardTitle}>Cart</Text>
        {cart.map((line,index)=>{const p=products.find(item=>item.id===line.product_id);return <View key={line.product_id+line.size} style={s.rowBetween}>
          <Text style={s.muted}>{p?.name??line.product_id} · {line.size==="half"?"½ g":"1 g"} × {line.quantity}</Text>
          <View style={s.row}><Pressable onPress={()=>changeQuantity(index,-1)}><Text style={s.cartAction}>−</Text></Pressable><Pressable onPress={()=>changeQuantity(index,1)}><Text style={s.cartAction}>＋</Text></Pressable></View>
        </View>;})}
        <View style={s.rowBetween}><Text style={s.cardTitle}>Estimate</Text><Text style={s.metricValue}>{money(estimate)}</Text></View>
        <Text style={s.micro}>Estimate only. Postgres calculates the final tiered total and checks stock during checkout.</Text>
        <Button title={busy?"Saving...":"Complete sale"} disabled={busy||!cart.length} onPress={()=>void checkout()}/>
      </>:<Text style={s.muted}>Tap a product to add it to the cart.</Text>}
    </Card>:null}
    {salesView==="history"?<>
    <Heading title="Sales history" hint="Latest 30 transactions"/>
    <View style={s.wrap}>{(["all","paid","unpaid","refunded","cancelled"] as const).map(filter=><Button key={filter} title={filter.toUpperCase()} small kind={salesFilter===filter?"primary":"secondary"} onPress={()=>setSalesFilter(filter)}/>)}</View>
    {sales.filter(sale=>salesFilter==="all"||(salesFilter==="cancelled"?sale.status==="cancelled":sale.payment_status===salesFilter)).map(sale=><Card key={sale.id} style={s.compact}>
      <View style={s.rowBetween}><View style={{flex:1}}><Text style={s.cardTitle}>{sale.ref}</Text><Text style={s.muted}>{sale.customer_name||"Walk-in"} · {new Date(sale.created_at).toLocaleString()}</Text></View>
        <View style={{alignItems:"flex-end"}}><Text style={s.metricValue}>{money(sale.total_cents)}</Text><Text style={sale.payment_status==="paid"?s.paid:s.unpaid}>{sale.payment_status.toUpperCase()}</Text></View></View>
      {sale.payment_method?<Text style={s.micro}>Paid by {sale.payment_method}</Text>:null}
      <View style={s.wrap}>
        {sale.status==="active"&&sale.payment_status==="unpaid"?<>
          <Button title="Mark cash/card paid" small kind="secondary" onPress={()=>openModal("payment",{sale})}/>
          <Button title="Cancel" small kind="danger" onPress={()=>saleAction(sale,"cancel")}/>
        </>:null}
        {superAdmin&&sale.status==="active"&&sale.payment_status==="paid"?<Button title="Refund + restock" small kind="danger" onPress={()=>saleAction(sale,"refund")}/>:null}
      </View>
    </Card>)}
    </>:null}
  </>;

  const inventoryScreen=()=> <>
    <Heading title="Inventory" hint="Stock uses 0.5 g increments"/>
    <Field label="Search products" value={inventoryQuery} onChange={setInventoryQuery} placeholder="Find a product..."/>
    {superAdmin?<Button title="+ Add product" onPress={()=>openModal("newProduct")}/>:null}
    {products.filter(p=>p.name.toLowerCase().includes(inventoryQuery.trim().toLowerCase())).map(p=>{
      const low=p.half_units<=p.low_stock_half_units;
      return <Card key={p.id}>
        <View style={s.rowBetween}><View style={{flex:1}}><Text style={s.cardTitle}>{p.name}</Text><Text style={s.muted}>{p.id}</Text></View><Text style={[s.stockValue,low&&{color:T.red}]}>{grams(p.half_units)} g</Text></View>
        <View style={s.rowBetween}><Text style={s.micro}>Alert at {grams(p.low_stock_half_units)} g</Text><Text style={s.micro}>{money(p.price1_cents)} / g</Text></View>
        {superAdmin?<View style={s.wrap}>
          <Button title="Restock" small onPress={()=>inventoryModal("restock",p)}/>
          <Button title="Adjust" small kind="secondary" onPress={()=>inventoryModal("adjust",p)}/>
          <Button title="Prices" small kind="secondary" onPress={()=>inventoryModal("prices",p)}/>
          <Button title="Threshold" small kind="secondary" onPress={()=>inventoryModal("threshold",p)}/>
          <Button title="Cost" small kind="quiet" onPress={()=>inventoryModal("cost",p)}/>
          {p.half_units===0?<Button title="Retire" small kind="danger" onPress={()=>askToConfirm("Retire product?",p.name+" will be hidden from new sales. Historical sale records remain.","Retire",()=>void rpc("retire_product",{p_product_id:p.id,p_revision:p.revision}).then(refresh).catch(e=>setNotice(e.message)),true)}/>:null}
        </View>:<Text style={s.micro}>Staff view · Super Admin manages inventory and pricing.</Text>}
      </Card>;
    })}
  </>;

  const membersScreen=()=> <>
    <Heading title="Members" hint="Requests, membership and pass verification"/>
    <Field label="Search members" value={memberQuery} onChange={setMemberQuery} placeholder="Name, phone or email..."/>
    <View style={s.row}><Button title="+ New member" onPress={()=>openModal("newMember")}/><Button title="Verify pass" kind="secondary" onPress={()=>openModal("verifyPass")}/></View>
    {members.filter(member=>[member.full_name,member.phone??"",member.email??""].some(value=>value.toLowerCase().includes(memberQuery.trim().toLowerCase()))).map(member=><Card key={member.id}>
      <View style={s.rowBetween}><View style={{flex:1}}><Text style={s.cardTitle}>{member.full_name}</Text><Text style={s.muted}>{member.phone||member.email||"No contact details"}</Text></View><Text style={member.status==="active"?s.paid:member.status==="pending"?s.unpaid:s.low}>{member.status.toUpperCase()}</Text></View>
      <Text style={s.micro}>Added {new Date(member.created_at).toLocaleDateString()}</Text>
      <View style={s.wrap}>
        {member.status==="pending"?<>
          <Button title="Approve · day" small onPress={()=>void rpc("approve_member",{p_member_id:member.id,p_plan:"day"}).then(refresh).catch(e=>setNotice(e.message))}/>
          <Button title="Approve · monthly" small kind="secondary" onPress={()=>void rpc("approve_member",{p_member_id:member.id,p_plan:"monthly"}).then(refresh).catch(e=>setNotice(e.message))}/>
        </>:null}
        {member.status==="active"?<>
          <Button title="Issue QR pass" small onPress={()=>{setBusy(true);void rpc<any>("issue_member_pass",{p_member_id:member.id}).then(result=>setDialog({title:"Pass issued",message:"One-time token. It is only revealed once:\n\n"+String(result.token??"Token unavailable")})).catch(e=>setNotice(e.message)).finally(()=>setBusy(false));}}/>
          <Button title="Agreement" small kind="secondary" onPress={()=>openModal("agreement",{member})}/>
          <Button title="Disable" small kind="danger" onPress={()=>askToConfirm("Disable member?","This revokes membership access.","Disable",()=>void rpc("disable_member",{p_member_id:member.id}).then(refresh).catch(e=>setNotice(e.message)),true)}/>
        </>:null}
      </View>
    </Card>)}
  </>;

  const moreScreen=()=> <>
    <Heading title="More" hint="Account, financials and admin tools"/>
    <Card><Text style={s.cardTitle}>{profile?.full_name||profile?.username}</Text><Text style={s.muted}>{profile?.username} · {profile?.role.replace("_"," ")}</Text><View style={s.row}>
      <Button title="Refresh" small onPress={()=>void refresh().catch(e=>setNotice(e.message))}/><Button title="Sign out" small kind="danger" onPress={()=>void supabase.auth.signOut()}/>
    </View></Card>
    {superAdmin?<>
      <Heading title="Financial snapshot" hint="South African calendar month"/>
      <Card>
        {([["Paid revenue",financials?.paid_revenue_cents],["Gross profit",financials?.gross_profit_cents],["Expenses",financials?.expenses_cents],["Net profit",financials?.net_profit_cents],["Refunds",financials?.refunded_cents],["Unpaid value",financials?.unpaid_value_cents]] as any[]).map(([label,value])=><View key={label} style={s.rowBetween}><Text style={s.muted}>{label}</Text><Text style={s.metricValue}>{money(Number(value??0))}</Text></View>)}
        <Text style={s.micro}>Unpaid sales are not revenue. Profit excludes sale lines with unknown costs.</Text>
      </Card>
      <View style={s.row}><Button title="+ Invite staff" onPress={()=>openModal("staff")}/><Button title="+ Expense" kind="secondary" onPress={()=>openModal("expense")}/></View>
      <Heading title="Staff accounts"/>
      {staff.map(person=><Card key={person.id} style={s.compact}>
        <View style={s.rowBetween}><View><Text style={s.cardTitle}>{person.full_name||person.username}</Text><Text style={s.muted}>{person.username} · {person.role}</Text></View><Text style={person.active?s.paid:s.low}>{person.active?"ACTIVE":"DISABLED"}</Text></View>
        {person.role!=="super_admin"?<Button title={person.active?"Deactivate":"Reactivate"} small kind="secondary" onPress={()=>askToConfirm("Update staff access?","The database will enforce this change on the next request.","Continue",()=>void rpc("set_staff_active",{p_user_id:person.id,p_active:!person.active}).then(refresh).catch(e=>setNotice(e.message)))}/>:null}
      </Card>)}
    </>:<Card><Text style={s.muted}>Staff access is limited to day-to-day sales, inventory visibility and member operations.</Text></Card>}
    <Card style={s.syncCard}><Text style={s.cardTitle}>Offline mode</Text><Text style={s.muted}>{queueCount} sale(s) queued locally</Text><Text style={s.micro}>Queued sales are not presented as completed until Supabase accepts them. Retry sync after reconnecting.</Text><Button title="Retry sync" small onPress={()=>void syncQueue().then(refresh)}/></Card>
  </>;

  const renderDialog=()=> <Modal transparent animationType="fade" visible={!!dialog} onRequestClose={()=>setDialog(null)}>
    <View style={s.dialogBackdrop}>
      <View style={s.dialogCard}>
        <Text style={s.modalTitle}>{dialog?.title}</Text>
        <Text style={s.muted}>{dialog?.message}</Text>
        <View style={s.row}>
          {dialog?.onConfirm?<Button title="Not now" kind="secondary" onPress={()=>setDialog(null)}/>:null}
          <Button title={dialog?.confirmLabel??"Got it"} kind={dialog?.danger?"danger":"primary"} onPress={()=>{const action=dialog?.onConfirm;setDialog(null);action?.();}}/>
        </View>
      </View>
    </View>
  </Modal>;

  if(booting||!fontsLoaded)return <View style={s.loading}><StatusBar barStyle="light-content"/><ActivityIndicator size="large" color={T.green}/><Text style={s.muted}>Opening the control room...</Text></View>;
  if(!session)return <View style={s.login}>
    <StatusBar barStyle="light-content"/><View style={s.loginGlow}/>
    <Text style={s.eyebrow}>ASTROWORLD 420</Text><Text style={s.loginTitle}>Admin access.</Text>
    <Text style={s.heroSub}>Private operations console. Staff accounts are invited by a Super Admin.</Text>
    {!supabaseConfigured?<Card><Text style={s.warning}>Supabase is not configured. Copy .env.example to .env and add the project URL and anon/publishable key.</Text></Card>:null}
    <Field label="Email" value={email} onChange={setEmail} placeholder="admin@example.com" type="email-address"/>
    <Field label="Password" value={password} onChange={setPassword} placeholder="Password" secure/>
    <Button title={busy?"Signing in...":"Sign in"} disabled={busy||!supabaseConfigured} onPress={()=>{setBusy(true);void supabase.auth.signInWithPassword({email:email.trim(),password}).then(({error})=>{if(error)setNotice(error.message);}).catch(e=>setNotice(e instanceof Error?e.message:"Sign in failed.")).finally(()=>setBusy(false));}}/>
    {notice?<Text style={s.warning}>{notice}</Text>:null}
    <Text style={s.micro}>No public registration. Your active profile and role are checked in Postgres after login.</Text>
  </View>;

  const tabs:Tab[]=["Home","Sales","Inventory","Members","More"];
  return <View style={s.app}>
    <StatusBar barStyle="light-content"/>
    <View style={s.topBar}><View><Text style={s.brand}>ASTROWORLD <Text style={{color:T.green}}>420</Text></Text><Text style={s.topSub}>{superAdmin?"SUPER ADMIN":"STAFF"} · PRIVATE ADMIN</Text></View><Pressable onPress={()=>void refresh().catch(e=>setNotice(e.message))} style={s.avatar}><Text style={s.avatarText}>{(profile?.full_name||profile?.username||"A").slice(0,1).toUpperCase()}</Text></Pressable></View>
    {notice?<Pressable onPress={()=>setNotice("")} style={s.notice}><Text style={s.noticeText}>{notice}  ×</Text></Pressable>:null}
    {busy?<View style={s.busyLine}><ActivityIndicator size="small" color={T.green}/><Text style={s.micro}>Syncing...</Text></View>:null}
    <ScrollView contentContainerStyle={s.content} showsVerticalScrollIndicator={false}>
      {tab==="Home"?home():tab==="Sales"?salesScreen():tab==="Inventory"?inventoryScreen():tab==="Members"?membersScreen():moreScreen()}
    </ScrollView>
    <View style={s.tabBar}>{tabs.map(item=>{const icon=({Home:"grid",Sales:"cart",Inventory:"cube",Members:"people",More:"ellipsis-horizontal"} as const)[item];const active=tab===item;return <Pressable key={item} accessibilityRole="button" accessibilityState={{selected:active}} onPress={()=>setTab(item)} style={s.tabItem}><Ionicons name={icon as any} size={20} color={active?T.green:"#777181"}/><Text style={[s.tabLabel,active&&s.tabLabelActive]}>{item}</Text></Pressable>;})}</View>
    {renderModal()}
    {renderDialog()}
  </View>;
}

const s=StyleSheet.create({
  app:{flex:1,backgroundColor:T.bg},loading:{flex:1,backgroundColor:T.bg,alignItems:"center",justifyContent:"center",gap:14},
  login:{flex:1,backgroundColor:T.bg,padding:26,paddingTop:80,justifyContent:"center",gap:17},
  loginGlow:{position:"absolute",top:80,right:-100,width:260,height:260,borderRadius:200,backgroundColor:"#4B3B65",opacity:0.28},
  loginTitle:{color:T.text,fontSize:42,fontWeight:"800",letterSpacing:-1.5},
  hero:{padding:22,borderRadius:24,backgroundColor:"#191623",borderWidth:1,borderColor:"rgba(213,239,134,0.22)",overflow:"hidden",marginBottom:16},
  heroTitle:{fontSize:38,fontWeight:"800",color:T.text,letterSpacing:-1.6,marginTop:10},
  heroSub:{color:T.muted,fontSize:14,lineHeight:21,marginTop:8},
  heroAccent:{width:92,height:5,backgroundColor:T.green,borderRadius:5,marginTop:20},
  eyebrow:{color:T.green,fontWeight:"800",fontSize:11,letterSpacing:2.4},
  topBar:{flexDirection:"row",justifyContent:"space-between",alignItems:"center",paddingHorizontal:20,paddingTop:Platform.OS==="android"?42:56,paddingBottom:14,borderBottomWidth:1,borderBottomColor:T.line},
  brand:{fontSize:16,fontWeight:"900",color:T.text,letterSpacing:1.3},topSub:{color:T.muted,fontSize:9,letterSpacing:1.6,marginTop:4},
  avatar:{width:38,height:38,borderRadius:20,backgroundColor:T.purpleDark,alignItems:"center",justifyContent:"center",borderWidth:1,borderColor:"rgba(165,139,211,0.42)"},
  avatarText:{color:T.purple,fontWeight:"900",fontSize:16},
  content:{padding:18,paddingBottom:36,gap:14},
  card:{backgroundColor:T.surface,borderColor:T.line,borderWidth:1,borderRadius:18,padding:16,gap:12},
  compact:{padding:13,gap:8},heading:{gap:4,marginTop:8,marginBottom:2},
  headingText:{color:T.text,fontSize:21,fontWeight:"800",letterSpacing:-0.5},
  cardTitle:{color:T.text,fontSize:15,fontWeight:"700"},
  muted:{color:T.muted,fontSize:12,lineHeight:18},micro:{color:"#A6A2B1",fontSize:10,lineHeight:15},
  metricGrid:{flexDirection:"row",flexWrap:"wrap",gap:10},metric:{flexGrow:1,flexBasis:"46%",minHeight:92,padding:14,borderRadius:16,borderWidth:1,borderColor:T.line,backgroundColor:T.surface,gap:5},
  metricAccent:{width:26,height:3,borderRadius:2,marginBottom:4},
  metricValue:{color:T.text,fontSize:19,fontWeight:"800",fontVariant:["tabular-nums"]},metricLabel:{color:T.muted,fontSize:11},
  row:{flexDirection:"row",alignItems:"center",gap:8},wrap:{flexDirection:"row",flexWrap:"wrap",alignItems:"center",gap:7,marginTop:7},
  rowBetween:{flexDirection:"row",alignItems:"center",justifyContent:"space-between",gap:10},
  button:{minHeight:43,paddingHorizontal:14,paddingVertical:10,borderRadius:12,alignItems:"center",justifyContent:"center",flex:1},
  buttonSmall:{minHeight:34,paddingHorizontal:10,paddingVertical:7,borderRadius:10,flex:0},
  primary:{backgroundColor:T.green},secondary:{backgroundColor:T.raised,borderWidth:1,borderColor:T.line},
  quiet:{backgroundColor:"transparent",borderWidth:1,borderColor:T.line},danger:{backgroundColor:"#4A202B",borderWidth:1,borderColor:"#713342"},
  buttonText:{color:"#07120F",fontSize:12,fontWeight:"800"},disabled:{opacity:0.45},
  field:{gap:6,marginBottom:10},fieldLabel:{color:T.muted,fontSize:11,fontWeight:"700"},
  input:{minHeight:46,paddingHorizontal:13,borderRadius:11,borderWidth:1,borderColor:T.line,color:T.text,backgroundColor:"#1D1826",fontSize:14},
  divider:{height:1,backgroundColor:T.line,marginVertical:4},
  productPick:{flexDirection:"row",alignItems:"center",justifyContent:"space-between",gap:10,paddingVertical:9,borderBottomWidth:1,borderBottomColor:"#1C2834"},
  cartAction:{color:T.green,fontSize:22,fontWeight:"800",paddingHorizontal:6},
  stockValue:{color:T.green,fontSize:25,fontWeight:"900"},
  low:{color:T.red,fontSize:10,fontWeight:"900",letterSpacing:0.7},
  paid:{color:T.green,fontSize:10,fontWeight:"900",letterSpacing:0.7},
  unpaid:{color:T.amber,fontSize:10,fontWeight:"900",letterSpacing:0.7},
  syncCard:{borderColor:"rgba(213,239,134,0.20)",backgroundColor:"#191623"},
  notice:{marginHorizontal:14,marginTop:8,padding:10,borderRadius:9,backgroundColor:T.purpleDark},
  noticeText:{color:"#D5C9FF",fontSize:11},warning:{color:T.amber,fontSize:12,lineHeight:18},
  busyLine:{flexDirection:"row",alignItems:"center",gap:8,paddingHorizontal:18,paddingTop:7},
  tabBar:{flexDirection:"row",justifyContent:"space-around",alignItems:"center",backgroundColor:"#141119",borderTopWidth:1,borderTopColor:T.line,paddingTop:9,paddingBottom:Platform.OS==="ios"?26:12},
  tabItem:{alignItems:"center",justifyContent:"center",gap:5,minWidth:55},
  tabDot:{width:5,height:5,borderRadius:3,backgroundColor:"#4D5966"},
  tabDotActive:{width:16,backgroundColor:T.green},
  tabLabel:{fontSize:10,color:"#A6A2B1",fontWeight:"700"},tabLabelActive:{color:T.text},
  modalBackdrop:{flex:1,justifyContent:"flex-end",backgroundColor:"rgba(0,0,0,0.72)"},
  modalCard:{backgroundColor:T.surface,padding:20,borderTopLeftRadius:24,borderTopRightRadius:24,borderColor:T.line,borderWidth:1,gap:14,maxHeight:"90%"},
  modalTitle:{color:T.text,fontSize:21,fontWeight:"800"},
  dialogBackdrop:{flex:1,justifyContent:"center",alignItems:"center",padding:22,backgroundColor:"rgba(5,4,8,0.78)"},
  dialogCard:{width:"100%",maxWidth:440,backgroundColor:"#1D1826",borderWidth:1,borderColor:"rgba(241,240,232,0.10)",borderRadius:22,padding:22,gap:16}
});