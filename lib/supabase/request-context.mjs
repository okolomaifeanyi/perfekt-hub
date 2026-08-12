import { AsyncLocalStorage } from "node:async_hooks";

const supabaseClientStorage = new AsyncLocalStorage();

globalThis.__supabaseGetCurrentClient = () =>
  supabaseClientStorage.getStore() ?? null;

export function runWithSupabaseClient(client, callback) {
  return supabaseClientStorage.run(client, callback);
}

export function getCurrentSupabaseClient() {
  return supabaseClientStorage.getStore() ?? null;
}
