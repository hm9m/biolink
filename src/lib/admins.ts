import adminsTxt from '@/admins.txt?raw';

export const ADMIN_EMAILS: string[] = adminsTxt
  .split(/\r?\n/)
  .map((line) => line.trim().toLowerCase())
  .filter((line) => line.length > 0 && !line.startsWith('#'));

export function isEmailAdmin(email: string | null | undefined): boolean {
  if (!email) return false;
  return ADMIN_EMAILS.includes(email.trim().toLowerCase());
}
