import type {
  AuthChangeEvent,
  Session,
  User as SupabaseUser,
} from "@supabase/supabase-js";
import { getSupabaseBrowserClient } from "@/lib/supabase/client";

export type User = SupabaseUser & {
  uid: string;
  displayName?: string | null;
  photoURL?: string | null;
  phoneNumber?: string | null;
};

export type UserCredential = {
  user: User;
  providerId?: string;
};

type AuthStateCallback = (user: User | null) => void;

let currentUser: User | null = null;
let authSubscription: { unsubscribe: () => void } | null = null;

function syncCurrentUser(session: Session | null) {
  currentUser = session?.user ? normalizeUser(session.user) : null;
}

function normalizeUser(user: SupabaseUser): User {
  return {
    ...user,
    uid: user.id,
    displayName:
      (user.user_metadata?.fullName as string | undefined) ??
      (user.user_metadata?.name as string | undefined) ??
      null,
    photoURL:
      (user.user_metadata?.avatar_url as string | undefined) ??
      (user.user_metadata?.picture as string | undefined) ??
      (user.user_metadata?.photoURL as string | undefined) ??
      null,
    phoneNumber: user.phone ?? null,
  };
}

async function ensureAuthSubscription() {
  if (authSubscription) return;

  const supabase = getSupabaseBrowserClient();
  const { data } = await supabase.auth.getSession();
  syncCurrentUser(data.session ?? null);

  const { data: listener } = supabase.auth.onAuthStateChange(
    (_event: AuthChangeEvent, session) => {
      syncCurrentUser(session);
    }
  );

  authSubscription = listener.subscription;
}

export function getAuth() {
  void ensureAuthSubscription();

  return {
    get currentUser() {
      return currentUser;
    },
  };
}

export async function onAuthStateChanged(
  _auth: ReturnType<typeof getAuth>,
  callback: AuthStateCallback
) {
  await ensureAuthSubscription();
  callback(currentUser);

  const supabase = getSupabaseBrowserClient();
  const { data } = supabase.auth.onAuthStateChange((_event, session) => {
    syncCurrentUser(session);
    callback(currentUser);
  });

  return () => {
    data.subscription.unsubscribe();
  };
}

export class GoogleAuthProvider {
  public readonly providerId = "google";
  private readonly scopes = new Set<string>();

  addScope(scope: string) {
    this.scopes.add(scope);
  }

  get addedScopes() {
    return Array.from(this.scopes);
  }
}

export async function signInWithEmailAndPassword(
  auth: ReturnType<typeof getAuth>,
  email: string,
  password: string
): Promise<UserCredential> {
  void auth;
  const supabase = getSupabaseBrowserClient();
  const { data, error } = await supabase.auth.signInWithPassword({
    email,
    password,
  });

  if (error) throw error;

  if (!data.user) throw new Error("Supabase sign-in did not return a user.");

  syncCurrentUser(data.session ?? null);
  return { user: normalizeUser(data.user), providerId: data.user.app_metadata?.provider };
}

export async function signOut(_auth: ReturnType<typeof getAuth>) {
  void _auth;
  const supabase = getSupabaseBrowserClient();
  const { error } = await supabase.auth.signOut();
  if (error) throw error;
  syncCurrentUser(null);
}

export async function signInWithPopup(
  auth: ReturnType<typeof getAuth>,
  provider: GoogleAuthProvider
): Promise<UserCredential> {
  void auth;
  const supabase = getSupabaseBrowserClient();
  const { error } = await supabase.auth.signInWithOAuth({
    provider: provider.providerId as "google",
    options: {
      scopes: provider.addedScopes.join(" "),
      redirectTo: `${window.location.origin}/auth/callback`,
    },
  });

  if (error) throw error;

  throw new Error(
    "Supabase OAuth uses a redirect flow. Handle the callback route instead of signInWithPopup."
  );
}

export async function signInWithCustomToken() {
  throw new Error("Custom tokens are not supported with Supabase Auth.");
}

export async function updateProfile(
  _user: User,
  updates: Record<string, unknown>
) {
  const supabase = getSupabaseBrowserClient();
  const { error } = await supabase.auth.updateUser({ data: updates });
  if (error) throw error;
}

export function getAdditionalUserInfo(result: UserCredential) {
  return {
    isNewUser: !!result.user.created_at && !!result.user.identities?.length,
    providerId: result.providerId ?? result.user.app_metadata?.provider,
  };
}
