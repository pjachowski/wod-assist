import type { APIRoute } from "astro";
import { z } from "zod";
import { createClient } from "@/lib/supabase";

export const prerender = false;

const schema = z.object({
  email: z.email(),
});

export const POST: APIRoute = async (context) => {
  const form = await context.request.formData();
  const parsed = schema.safeParse(Object.fromEntries(form));
  if (!parsed.success) {
    return context.redirect("/auth/forgot-password?error=validation_failed");
  }

  const supabase = createClient(context.request.headers, context.cookies);
  if (!supabase) {
    return context.redirect("/auth/forgot-password?error=not_configured");
  }

  const { error } = await supabase.auth.resetPasswordForEmail(parsed.data.email);

  // The send rate limit does not reveal account existence — safe to surface directly.
  if (error?.code === "over_email_send_rate_limit") {
    return context.redirect("/auth/forgot-password?error=over_email_send_rate_limit");
  }

  // Neutral confirmation regardless of account existence (prevents enumeration).
  return context.redirect("/auth/forgot-password?sent=1");
};
