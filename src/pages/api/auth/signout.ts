import type { APIRoute } from "astro";
import { createClient, PASSWORD_RECOVERY_COOKIE } from "@/lib/supabase";

export const POST: APIRoute = async (context) => {
  const supabase = createClient(context.request.headers, context.cookies);
  if (supabase) {
    await supabase.auth.signOut();
  }
  // Signing out mid password-reset flow must not leave a dangling recovery-intent marker.
  context.cookies.delete(PASSWORD_RECOVERY_COOKIE, { path: "/" });
  return context.redirect("/");
};
