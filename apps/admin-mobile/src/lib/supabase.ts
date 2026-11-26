import "react-native-url-polyfill/auto";
import { createClient } from "@supabase/supabase-js";
import * as SecureStore from "expo-secure-store";

const url = process.env.EXPO_PUBLIC_SUPABASE_URL ?? "";
const key = process.env.EXPO_PUBLIC_SUPABASE_ANON_KEY ??
  process.env.EXPO_PUBLIC_SUPABASE_PUBLISHABLE_KEY ?? "";

export const supabaseConfigured = Boolean(url && key);
const secureStorage = {
  getItem:(storageKey:string)=>SecureStore.getItemAsync(storageKey),
  setItem:(storageKey:string,value:string)=>SecureStore.setItemAsync(storageKey,value),
  removeItem:(storageKey:string)=>SecureStore.deleteItemAsync(storageKey),
};

export const supabase = createClient<any>(
  url || "https://not-configured.supabase.co",
  key || "not-configured",
  {auth:{
    storage:secureStorage,
    autoRefreshToken:true,
    persistSession:true,
    detectSessionInUrl:false,
    flowType:"pkce"
  }}
);

export function assertSupabaseConfigured():void {
  if (!supabaseConfigured) {
    throw new Error("Supabase is not configured. Copy .env.example to .env and add the project URL and anon/publishable key.");
  }
}