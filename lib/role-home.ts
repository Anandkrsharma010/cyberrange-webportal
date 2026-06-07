export function getRoleHome(role?: string | null): string {
  if (role === "sys_admin") return "/admin"
  if (role === "course_admin") return "/course-admin"
  return "/dashboard"
}

export function getAdminEntry(role?: string | null): string | null {
  if (role === "sys_admin") return "/admin"
  if (role === "course_admin") return "/course-admin"
  return null
}
