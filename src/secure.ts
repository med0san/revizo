import { Platform } from "react-native";
import * as Native from "expo-secure-store";

// Sur le web, expo-secure-store n'existe pas : on retombe sur localStorage.
const web = Platform.OS === "web";

export async function getItemAsync(k: string): Promise<string | null> {
  if (web) return globalThis.localStorage?.getItem(k) ?? null;
  return Native.getItemAsync(k);
}
export async function setItemAsync(k: string, v: string): Promise<void> {
  if (web) { globalThis.localStorage?.setItem(k, v); return; }
  return Native.setItemAsync(k, v);
}
export async function deleteItemAsync(k: string): Promise<void> {
  if (web) { globalThis.localStorage?.removeItem(k); return; }
  return Native.deleteItemAsync(k);
}
