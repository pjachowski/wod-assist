import type { APIRoute } from "astro";
import { z } from "zod";
import { createClient, PASSWORD_RECOVERY_COOKIE } from "@/lib/supabase";

export const prerender = false;

// Generic over the token type — in v2 the enum will also cover email confirmation.
const schema = z.object({
  token_hash: z.string().min(1),
  type: z.enum(["recovery"]),
});

export const GET: APIRoute = async (context) => {
  const parsed = schema.safeParse(Object.fromEntries(context.url.searchParams));
  if (!parsed.success) {
    return context.redirect("/auth/forgot-password?error=otp_expired");
  }

  const supabase = createClient(context.request.headers, context.cookies);
  if (!supabase) {
    return context.redirect("/auth/forgot-password?error=not_configured");
  }

  // verifyOtp writes the session into cookies (auto sign-in); the token is single-use,
  // so a second click on the same link lands on the "link expired" path.
  const { error } = await supabase.auth.verifyOtp(parsed.data);
  if (error) {
    return context.redirect("/auth/forgot-password?error=otp_expired");
  }

  context.cookies.set(PASSWORD_RECOVERY_COOKIE, "1", {
    path: "/",
    httpOnly: true,
    sameSite: "lax",
    secure: import.meta.env.PROD,
    maxAge: 60 * 15, // 15 minutes to set the new password
  });

  return context.redirect("/auth/update-password");
};
