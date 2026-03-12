/* ──────────────────────────────────────────
 *  Shared TypeScript interfaces
 *  Single source of truth for all data shapes
 * ────────────────────────────────────────── */

export interface Student {
  id: string
  name: string
  email: string
  phone: string | null
  status: string
  role?: string
  avatar_url?: string | null
}

export interface Group {
  id: string
  name: string
  image_url: string | null
  description: string | null
  courses: { name: string } | null
  telegram_link?: string | null
  drive_link?: string | null
  meet_link?: string | null
}

export interface ChatMessage {
  id: string
  group_id: string
  student_id: string | null
  member_id: string | null
  sender_type: 'student' | 'member'
  sender_name: string | null
  sender_avatar_url?: string | null
  sender_role?: string | null
  content: string
  file_url: string | null
  file_type: string | null
  pinned?: boolean
  reactions?: Record<string, string[]>
  created_at: string
}

export interface SessionRecord {
  id: string
  title: string
  session_date: string | null
  day_of_week: string | null
  start_time: string | null
  end_time: string | null
  recording_url: string | null
  status: string
  has_todo: boolean
}

export interface Announcement {
  id: string
  group_id: string
  member_id: string
  title: string
  content: string
  priority: 'normal' | 'important' | 'urgent'
  pinned: boolean
  image_url: string | null
  created_at: string
  member_name?: string
}

export interface CreativityUpload {
  id: string
  group_id: string
  student_id: string | null
  member_id?: string | null
  title: string
  description: string | null
  file_url: string | null
  file_type: string | null
  status: 'submitted' | 'reviewed' | 'approved'
  feedback: string | null
  created_at: string
  student_name?: string
}

export interface Todo {
  id: string
  title: string
  description: string | null
  file_url: string | null
  file_type: string | null
  is_completed: boolean
  due_date: string | null
  created_at: string
}

export interface SupportMessage {
  id: string
  conversation_id: string
  sender_type: 'student' | 'support'
  sender_id: string
  content: string
  created_at: string
}

export type Tab = 'general' | 'annonces' | 'creativity' | 'resources' | 'todos' | 'support'
