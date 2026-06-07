import { createServerClient, parseCookieHeader } from "@supabase/ssr";
import type { AstroCookies } from "astro";
import { SUPABASE_URL, SUPABASE_KEY } from "astro:env/server";

/**
 * Recovery-intent marker — set by /api/auth/confirm after a successful verifyOtp,
 * required (alongside an active session) by /auth/update-password and its endpoint.
 * Without it, any regular signed-in session could change the password without knowing the old one.
 */
export const PASSWORD_RECOVERY_COOKIE = "wa-password-recovery";

/**
 * Session-persistence marker — set by /api/auth/signin based on the "remember me" checkbox
 * ("1" = persistent cookies, "0" = session cookies). Read back on every request so token
 * refreshes in middleware keep the mode the user picked. Absent marker = persistent
 * (sessions created before this feature keep their old behavior).
 */
export const SESSION_PERSIST_COOKIE = "wa-session-persist";

interface CreateClientOptions {
  persistSession?: boolean;
}

export function createClient(requestHeaders: Headers, cookies: AstroCookies, options?: CreateClientOptions) {
  if (!SUPABASE_URL || !SUPABASE_KEY) {
    return null;
  }
  const requestCookies = parseCookieHeader(requestHeaders.get("Cookie") ?? "");
  const persistSession =
    options?.persistSession ?? requestCookies.find((cookie) => cookie.name === SESSION_PERSIST_COOKIE)?.value !== "0";
  return createServerClient(SUPABASE_URL, SUPABASE_KEY, {
    cookies: {
      getAll() {
        return requestCookies.map(({ name, value }) => ({
          name,
          value: value ?? "",
        }));
      },
      setAll(cookiesToSet) {
        cookiesToSet.forEach(({ name, value, options: cookieOptions }) => {
          // Session mode: strip maxAge/expires so auth cookies die with the browser session.
          // Only when maxAge > 0 — @supabase/ssr deletes cookies via maxAge: 0, and stripping
          // that would turn a deletion into a set and break sign-out.
          if (!persistSession && typeof cookieOptions.maxAge === "number" && cookieOptions.maxAge > 0) {
            const sessionOptions = { ...cookieOptions };
            delete sessionOptions.maxAge;
            delete sessionOptions.expires;
            cookies.set(name, value, sessionOptions);
            return;
          }
          cookies.set(name, value, cookieOptions);
        });
      },
    },
  });
}
