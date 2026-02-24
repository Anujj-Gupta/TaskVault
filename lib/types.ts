export type Priority = 'low' | 'medium' | 'high'
export type Category = 'work' | 'personal' | 'health' | 'learning' | 'finance' | 'other'
export type Recurrence = 'daily' | 'weekly' | 'monthly' | null

export interface Task {
  id: string
  user_id: string
  title: string
  description: string | null
  link: string | null
  due_at: string | null
  remind_at: string | null
  recurrence: Recurrence
  category: Category
  priority: Priority
  done: boolean
  completed_at: string | null
  created_at: string
  updated_at: string
}

export type LogType =
  | 'created'
  | 'completed'
  | 'reopened'
  | 'deleted'
  | 'reminded'
  | 'snoozed'
  | 'email_sent'
  | 'updated'

export interface Log {
  id: string
  user_id: string
  task_id: string | null
  task_title: string
  type: LogType
  message: string
  created_at: string
}
