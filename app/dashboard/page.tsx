import { auth, currentUser } from '@clerk/nextjs/server'
import { redirect } from 'next/navigation'
import { createClient } from '@/lib/supabase/client-server'
import DashboardClient from '@/components/DashboardClient'
import { Task, Log } from '@/lib/types'

export default async function DashboardPage() {
  const { userId } = auth()
  if (!userId) redirect('/sign-in')

  const user = await currentUser()
  const supabase = createClient()

  const { data: tasks } = await supabase
    .from('tasks')
    .select('*')
    .eq('user_id', userId)
    .order('created_at', { ascending: false })

  const { data: logs } = await supabase
    .from('logs')
    .select('*')
    .eq('user_id', userId)
    .order('created_at', { ascending: false })
    .limit(100)

  return (
    <DashboardClient
      initialTasks={(tasks ?? []) as Task[]}
      initialLogs={(logs ?? []) as Log[]}
      user={{
        id: userId,
        email: user?.emailAddresses[0]?.emailAddress ?? '',
        name: user?.firstName ?? '',
      }}
    />
  )
}
