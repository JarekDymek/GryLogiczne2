import { createClient, type SupabaseClient } from "@supabase/supabase-js";
import {
  resolveOwnerAccess,
  type OwnerAccessState,
  type OwnerIdentity,
} from "./ownerAccess";

const supabaseUrl = import.meta.env.VITE_SUPABASE_URL?.trim() ?? "";
const supabaseAnonKey = import.meta.env.VITE_SUPABASE_ANON_KEY?.trim() ?? "";

let client: SupabaseClient | null | undefined;

export function isOwnerAuthConfigured(): boolean {
  return Boolean(supabaseUrl && supabaseAnonKey);
}

export function getOwnerAuthClient(): SupabaseClient | null {
  if (!isOwnerAuthConfigured()) {
    return null;
  }
  if (client === undefined) {
    client = createClient(supabaseUrl, supabaseAnonKey, {
      auth: {
        persistSession: true,
        autoRefreshToken: true,
        detectSessionInUrl: true,
      },
    });
  }
  return client;
}

export async function loadOwnerAccess(): Promise<OwnerAccessState> {
  const authClient = getOwnerAuthClient();
  if (!authClient) {
    return { status: "unconfigured" };
  }

  const { data: userData, error: userError } = await authClient.auth.getUser();
  if (userError && !userError.message.toLowerCase().includes("session")) {
    return { status: "error", message: "Nie udało się potwierdzić konta właściciela." };
  }
  if (!userData.user) {
    return { status: "signed-out" };
  }

  const identity: OwnerIdentity = {
    id: userData.user.id,
    email: userData.user.email ?? null,
  };
  const { data: role, error: roleError } = await authClient.rpc("current_app_role");
  if (roleError) {
    return { status: "error", message: "Backend nie potwierdził roli konta." };
  }
  return resolveOwnerAccess(identity, role);
}

export async function requestOwnerMagicLink(email: string): Promise<string | null> {
  const authClient = getOwnerAuthClient();
  if (!authClient) {
    return "Autoryzacja właściciela nie jest skonfigurowana.";
  }
  const redirectUrl = new URL(import.meta.env.BASE_URL, window.location.origin);
  redirectUrl.hash = "owner";
  const { error } = await authClient.auth.signInWithOtp({
    email: email.trim(),
    options: {
      emailRedirectTo: redirectUrl.toString(),
      shouldCreateUser: false,
    },
  });
  return error ? "Nie udało się wysłać bezpiecznego linku logowania." : null;
}

export async function signOutOwner(): Promise<void> {
  await getOwnerAuthClient()?.auth.signOut();
}

