import type { APIRoute } from "astro";
import { z } from "zod";
import { createClient, PASSWORD_RECOVERY_COOKIE } from "@/lib/supabase";

export const prerender = false;

const schema = z
  .object({
    password: z.string().min(6),
    confirmPassword: z.string().min(6),
  })
  .refine((data) => data.password === data.confirmPassword);

export const POST: APIRoute = async (context) => {
  const supabase = createClient(context.request.headers, context.cookies);
  if (!supabase) {
    return context.redirect("/auth/update-password?error=not_configured");
  }

  // Requires an active session AND the recovery-intent marker at the same time —
  // a regular signed-in session without the marker must not change the password here.
  const hasRecoveryIntent = context.cookies.get(PASSWORD_RECOVERY_COOKIE)?.value === "1";
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user || !hasRecoveryIntent) {
    return context.redirect("/auth/forgot-password?error=otp_expired");
  }

  const form = await context.request.formData();
  const parsed = schema.safeParse(Object.fromEntries(form));
  if (!parsed.success) {
    return context.redirect("/auth/update-password?error=validation_failed");
  }

  const { error } = await supabase.auth.updateUser({ password: parsed.data.password });
  if (error) {
    return context.redirect(`/auth/update-password?error=${error.code ?? "unknown"}`);
  }

  context.cookies.delete(PASSWORD_RECOVERY_COOKIE, { path: "/" });
  return context.redirect("/dashboard?notice=password_updated");
};
