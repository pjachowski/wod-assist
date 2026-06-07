import type { APIRoute } from "astro";
import { z } from "zod";
import { createClient } from "@/lib/supabase";

const schema = z.object({
  email: z.email(),
  password: z.string().min(1),
});

export const POST: APIRoute = async (context) => {
  const form = await context.request.formData();
  const parsed = schema.safeParse(Object.fromEntries(form));
  if (!parsed.success) {
    return context.redirect("/auth/signin?error=validation_failed");
  }

  const supabase = createClient(context.request.headers, context.cookies);
  if (!supabase) {
    return context.redirect("/auth/signin?error=not_configured");
  }
  const { error } = await supabase.auth.signInWithPassword(parsed.data);

  if (error) {
    return context.redirect(`/auth/signin?error=${error.code ?? "unknown"}`);
  }

  return context.redirect("/");
};
