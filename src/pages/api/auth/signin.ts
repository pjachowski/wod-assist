import type { APIRoute } from "astro";
import { z } from "zod";
import { createClient, SESSION_PERSIST_COOKIE, PERSIST_COOKIE_MAX_AGE } from "@/lib/supabase";

const schema = z.object({
  email: z.email(),
  password: z.string().min(1),
  remember: z.string().optional(),
});

// Keeps the entered email in the form after a failed attempt (re-fill via query param).
function errorRedirect(code: string, email?: string) {
  return `/auth/signin?error=${code}${email ? `&email=${encodeURIComponent(email)}` : ""}`;
}

export const POST: APIRoute = async (context) => {
  const form = await context.request.formData();
  const rawEmail = form.get("email");
  const enteredEmail = typeof rawEmail === "string" ? rawEmail : undefined;

  const parsed = schema.safeParse(Object.fromEntries(form));
  if (!parsed.success) {
    return context.redirect(errorRedirect("validation_failed", enteredEmail));
  }

  const { email, password, remember } = parsed.data;
  const persistSession = remember === "1";

  const supabase = createClient(context.request.headers, context.cookies, { persistSession });
  if (!supabase) {
    return context.redirect(errorRedirect("not_configured", enteredEmail));
  }
  const { error } = await supabase.auth.signInWithPassword({ email, password });

  if (error) {
    return context.redirect(errorRedirect(error.code ?? "unknown", email));
  }

  // Persist the chosen mode so middleware token refreshes keep it on subsequent requests.
  if (persistSession) {
    context.cookies.set(SESSION_PERSIST_COOKIE, "1", {
      path: "/",
      httpOnly: true,
      sameSite: "lax",
      secure: import.meta.env.PROD,
      maxAge: PERSIST_COOKIE_MAX_AGE,
    });
  } else {
    context.cookies.set(SESSION_PERSIST_COOKIE, "0", {
      path: "/",
      httpOnly: true,
      sameSite: "lax",
      secure: import.meta.env.PROD,
    });
  }

  return context.redirect("/");
};
