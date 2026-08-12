/**
 * Autorização do painel admin — SERVER-ONLY (lê ADMIN_EMAILS, sem NEXT_PUBLIC_).
 * Lista de e-mails separada por vírgula. Comparação case-insensitive.
 */
export function emailsAdmin(): string[] {
  return (process.env.ADMIN_EMAILS ?? "")
    .split(",")
    .map((e) => e.trim().toLowerCase())
    .filter(Boolean);
}

export function isAdminEmail(email: string | null | undefined): boolean {
  if (!email) return false;
  return emailsAdmin().includes(email.trim().toLowerCase());
}
