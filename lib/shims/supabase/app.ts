type SupabaseApp = {
  name: string;
  options: Record<string, unknown>;
};

export type ServiceAccount = Record<string, unknown>;

const apps: SupabaseApp[] = [];

export function initializeApp(options: Record<string, unknown>) {
  const app = { name: "[DEFAULT]", options };
  apps.push(app);
  return app;
}

export function getApps() {
  return apps;
}

export function getApp() {
  if (!apps.length) {
    throw new Error("Supabase app has not been initialized.");
  }
  return apps[0];
}

export function cert(serviceAccount: ServiceAccount) {
  return serviceAccount;
}
