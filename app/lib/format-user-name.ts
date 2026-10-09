export function formatUserName(user: { first_name?: string; last_name?: string; username: string }): string {
  const fullName = [user.first_name, user.last_name].filter(Boolean).join(" ");
  return fullName || user.username;
}
