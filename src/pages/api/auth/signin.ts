import type { APIRoute } from "astro";
import { z } from "zod";
import { createClient } from "@/lib/supabase";

const schema = z.object({
  email: z.email(),
  password: z.string().min(1),
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

  const supabase = createClient(context.request.headers, context.cookies);
  if (!supabase) {
    return context.redirect(errorRedirect("not_configured", enteredEmail));
  }
  const { error } = await supabase.auth.signInWithPassword(parsed.data);

  if (error) {
    return context.redirect(errorRedirect(error.code ?? "unknown", parsed.data.email));
  }

  return context.redirect("/");
};
