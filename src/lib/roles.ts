/**
 * Centralized role helpers for the desktop app.
 *
 * Roles (from student.role, comma-separated):
 *   - student (no role / undefined)
 *   - teacher
 *   - support
 *   - admin
 *   - confirmation (treated like support)
 */

function parseRoles(role?: string): string[] {
  if (!role) return []
  return role.split(',').map(r => r.trim().toLowerCase())
}

/** Has any staff role (teacher, support, admin, confirmation) */
export function isStaff(role?: string): boolean {
  return parseRoles(role).some(r => ['admin', 'teacher', 'support', 'confirmation'].includes(r))
}

/** Is specifically admin */
export function isAdmin(role?: string): boolean {
  return parseRoles(role).includes('admin')
}

/** Is teacher or admin */
export function isTeacher(role?: string): boolean {
  const roles = parseRoles(role)
  return roles.includes('teacher') || roles.includes('admin')
}

/** Is support, confirmation, or admin */
export function isSupport(role?: string): boolean {
  const roles = parseRoles(role)
  return roles.includes('support') || roles.includes('confirmation') || roles.includes('admin')
}

// ── Per-tab permission helpers ──

/** Discussion: who can send messages */
export function canSendMessage(role?: string): boolean {
  // everyone can send messages
  return true
}

/** Discussion: who can edit/delete other people's messages + pin */
export function canModerateChat(role?: string): boolean {
  return isStaff(role)
}

/** Discussion: who can delete own messages */
export function canDeleteOwnMessage(role?: string): boolean {
  return true
}

/** Annonces: who can add/delete announcements */
export function canManageAnnouncements(role?: string): boolean {
  // teacher, support, admin
  return isStaff(role)
}

/** Créativité: who can submit creative work */
export function canSubmitCreativity(role?: string): boolean {
  // students and everyone can submit
  return true
}

/** Créativité: who can review/approve submissions */
export function canReviewCreativity(role?: string): boolean {
  return isStaff(role)
}

/** Ressources: who can manage sessions (mark done, share recording link) */
export function canManageResources(role?: string): boolean {
  // only teacher and admin, NOT support
  return isTeacher(role)
}

/** Tâches: who can add/delete todos */
export function canManageTodos(role?: string): boolean {
  // only teacher and admin, NOT support
  return isTeacher(role)
}

/** Tâches: who can toggle completion */
export function canToggleTodos(role?: string): boolean {
  return true
}
