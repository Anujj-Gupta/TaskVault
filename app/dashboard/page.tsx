import { redirect } from 'next/navigation'
import { createClient } from '@/lib/supabase/server'
import DashboardClient from '@/components/DashboardClient'
import { Task, Log } from '@/lib/types'

export default async function DashboardPage() {
  const supabase = createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) redirect('/auth')

  // Fetch initial tasks
  const { data: tasks } = await supabase
    .from('tasks')
    .select('*')
    .eq('user_id', user.id)
    .order('created_at', { ascending: false })

  // Fetch recent logs (last 100)
  const { data: logs } = await supabase
    .from('logs')
    .select('*')
    .eq('user_id', user.id)
    .order('created_at', { ascending: false })
    .limit(100)

  return (
    <DashboardClient
      initialTasks={(tasks ?? []) as Task[]}
      initialLogs={(logs ?? []) as Log[]}
      user={{ id: user.id, email: user.email ?? '' }}
    />
  )
}
