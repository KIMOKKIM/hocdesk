/**
 * 우측 상단 관리자 표시명
 * ADMIN_DISPLAY_NAME 또는 NEXT_PUBLIC_ADMIN_DISPLAY_NAME
 */
export function getAdminDisplayName(): string {
  return (
    process.env.ADMIN_DISPLAY_NAME?.trim() ||
    process.env.NEXT_PUBLIC_ADMIN_DISPLAY_NAME?.trim() ||
    "HOCDESK"
  );
}

export function getAdminAvatarInitials(name = getAdminDisplayName()): string {
  const cleaned = name.replace(/\s+/g, "");
  if (cleaned.length >= 2) return cleaned.slice(0, 2).toUpperCase();
  return cleaned.slice(0, 1).toUpperCase() || "H";
}
