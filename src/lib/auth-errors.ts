const MESSAGES: Record<string, string> = {
  // Kody błędów Supabase Auth (error.code)
  invalid_credentials: "Nieprawidłowy email lub hasło.",
  user_already_exists: "Konto z tym adresem email już istnieje.",
  email_exists: "Konto z tym adresem email już istnieje.",
  weak_password: "Hasło jest za słabe. Użyj co najmniej 6 znaków.",
  same_password: "Nowe hasło musi różnić się od poprzedniego.",
  over_email_send_rate_limit: "Zbyt wiele wiadomości w krótkim czasie. Spróbuj ponownie za kilka minut.",
  otp_expired: "Link wygasł lub został już użyty — wyślij nowy.",
  // Własne kody aplikacji
  validation_failed: "Nieprawidłowe dane formularza. Sprawdź pola i spróbuj ponownie.",
  not_configured: "Aplikacja nie jest poprawnie skonfigurowana. Spróbuj ponownie później.",
};

const FALLBACK_MESSAGE = "Coś poszło nie tak. Spróbuj ponownie.";

/**
 * Tłumaczy kod błędu auth (z parametru `?error=` w adresie) na polski komunikat.
 * Endpointy przekierowują z kodem; strony mapują kod na komunikat przy renderze.
 */
export function authErrorMessage(code: string | null): string | null {
  if (!code) {
    return null;
  }
  return MESSAGES[code] ?? FALLBACK_MESSAGE;
}
