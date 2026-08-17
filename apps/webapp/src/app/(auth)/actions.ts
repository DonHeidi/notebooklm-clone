"use server";

import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";

// Auth server actions. Cookies CAN be written here (unlike in Server
// Components), so @supabase/ssr persists the session directly.

function credentials(formData: FormData) {
  return {
    email: String(formData.get("email") ?? "").trim(),
    password: String(formData.get("password") ?? ""),
  };
}

export async function logIn(formData: FormData): Promise<void> {
  const { email, password } = credentials(formData);
  const supabase = await createClient();
  const { error } = await supabase.auth.signInWithPassword({ email, password });
  if (error) {
    redirect(`/login?error=${encodeURIComponent(error.message)}`);
  }
  redirect("/");
}

export async function signUp(formData: FormData): Promise<void> {
  const { email, password } = credentials(formData);
  const supabase = await createClient();
  const { data, error } = await supabase.auth.signUp({ email, password });
  if (error) {
    redirect(`/signup?error=${encodeURIComponent(error.message)}`);
  }
  // Local dev has email confirmation disabled, so a session exists right
  // away. If confirmation is ever enabled, signUp returns a user without a
  // session — send them to /login with a hint instead of a broken redirect.
  if (!data.session) {
    redirect("/login?error=Check%20your%20email%20to%20confirm%20your%20account");
  }
  redirect("/");
}

export async function signOut(): Promise<void> {
  const supabase = await createClient();
  await supabase.auth.signOut();
  redirect("/login");
}
