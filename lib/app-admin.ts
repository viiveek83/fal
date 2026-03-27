export function isAppAdmin(email: string | null | undefined): boolean {
  if (!email) return false
  const emails = (process.env.APP_ADMIN_EMAILS || '')
    .split(',')
    .map(e => e.trim().toLowerCase())
  return emails.includes(email.toLowerCase())
}
