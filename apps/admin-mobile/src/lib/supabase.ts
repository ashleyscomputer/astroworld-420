import "react-native-url-polyfill/auto";
import { createClient } from "@supabase/supabase-js";
import * as SecureStore from "expo-secure-store";
import { Platform } from "react-native";

const url = process.env.EXPO_PUBLIC_SUPABASE_URL ?? "";
const key =
  process.env.EXPO_PUBLIC_SUPABASE_ANON_KEY ??
  process.env.EXPO_PUBLIC_SUPABASE_PUBLISHABLE_KEY ??
  "";

export const supabaseConfigured = Boolean(url && key);

// Native builds use the OS-backed Keychain / Android Keystore.
// The browser preview uses tab-scoped sessionStorage. This is for development
// preview only: browser storage is not equivalent to native secure storage.
const storage = Platform.OS === "web"
  ? {
      getItem: async (storageKey: string) =>
        globalThis.sessionStorage?.getItem(storageKey) ?? null,
      setItem: async (storageKey: string, value: string) => {
        globalThis.sessionStorage?.setItem(storageKey, value);
      },
      removeItem: async (storageKey: string) => {
        globalThis.sessionStorage?.removeItem(storageKey);
      },
    }
  : {
      getItem: (storageKey: string) => SecureStore.getItemAsync(storageKey),
      setItem: (storageKey: string, value: string) =>
        SecureStore.setItemAsync(storageKey, value),
      removeItem: (storageKey: string) => SecureStore.deleteItemAsync(storageKey),
    };

export const supabase = createClient<any>(
  url || "https://not-configured.supabase.co",
  key || "not-configured",
  {
    auth: {
      storage,
      autoRefreshToken: true,
      persistSession: true,
      detectSessionInUrl: false,
      flowType: "pkce",
    },
  }
);

export function assertSupabaseConfigured(): void {
  if (!supabaseConfigured) {
    throw new Error(
      "Supabase is not configured. Copy .env.example to .env and add the project URL and anon/publishable key."
    );
  }
}
