import { getSupabaseAdminClient } from "@/lib/supabase/client";

type AdminUser = {
  id: string;
  [key: string]: unknown;
};

type SupabaseAdminClient = {
  auth: {
    admin: {
      createUser: (args: Record<string, unknown>) => Promise<{
        data: { user: AdminUser | null };
        error: { message: string } | null;
      }>;
      getUserById: (uid: string) => Promise<{
        data: { user: AdminUser | null };
        error: { message: string } | null;
      }>;
      deleteUser: (uid: string) => Promise<{
        error: { message: string } | null;
      }>;
    };
    getUser: (token: string) => Promise<{
      data: { user: AdminUser | null };
      error: { message: string } | null;
    }>;
  };
  from: (table: string) => {
    delete: () => { eq: (field: string, value: string) => Promise<{ error: { message: string } | null }> };
  };
};

export function getAuth() {
  const supabase = getSupabaseAdminClient() as unknown as SupabaseAdminClient;

  return {
    async createUser({ email, password, user_metadata = {} }: Record<string, unknown>) {
      const { data, error } = await supabase.auth.admin.createUser({
        email: String(email),
        password: String(password),
        user_metadata,
        email_confirm: true,
      });
      if (error) throw error;
      return data.user as AdminUser;
    },
    async getUser(uid: string) {
      const { data, error } = await supabase.auth.admin.getUserById(uid);
      if (error) throw error;
      return data.user as AdminUser;
    },
    async deleteUser(uid: string) {
      const { error } = await supabase.auth.admin.deleteUser(uid);
      if (error) throw error;
    },
    async verifyIdToken(token: string) {
      const { data, error } = await supabase.auth.getUser(token);
      if (error) throw error;
      const uid = data.user?.id;
      if (!uid) throw new Error("Invalid token");
      return { uid };
    },
    async createSessionCookie(token: string) {
      return token;
    },
    async verifySessionCookie(token: string) {
      const { data, error } = await supabase.auth.getUser(token);
      if (error) throw error;
      const uid = data.user?.id;
      if (!uid) throw new Error("Invalid token");
      return { uid };
    },
    async revokeRefreshTokens() {
      return;
    },
    async createCustomToken(uid: string) {
      return uid;
    },
  };
}
