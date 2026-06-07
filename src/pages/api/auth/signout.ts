import type { APIRoute } from "astro";
import { createClient, PASSWORD_RECOVERY_COOKIE, SESSION_PERSIST_COOKIE } from "@/lib/supabase";

export const POST: APIRoute = async (context) => {
  const supabase = createClient(context.request.headers, context.cookies);
  if (supabase) {
    await supabase.auth.signOut();
  }
  // Signing out mid password-reset flow must not leave a dangling recovery-intent marker.
  context.cookies.delete(PASSWORD_RECOVERY_COOKIE, { path: "/" });
  // The persistence-mode marker belongs to the session being ended — remove it with the session.
  context.cookies.delete(SESSION_PERSIST_COOKIE, { path: "/" });
  return context.redirect("/");
};
