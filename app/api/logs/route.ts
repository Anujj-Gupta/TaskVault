import { auth } from '@clerk/nextjs/server'
import { createClient } from '@/lib/supabase/client-server'
import { NextRequest, NextResponse } from 'next/server'

export async function GET(req: NextRequest) {
  const { userId } = auth()
  if (!userId) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  const supabase = createClient()
  const { searchParams } = new URL(req.url)
  const taskId = searchParams.get('task_id')
  const limit  = parseInt(searchParams.get('limit') ?? '100')

  let query = supabase.from('logs').select('*').eq('user_id', userId)
    .order('created_at', { ascending: false }).limit(limit)
  if (taskId) query = query.eq('task_id', taskId)

  const { data, error } = await query
  if (error) return NextResponse.json({ error: error.message }, { status: 500 })
  return NextResponse.json(data)
}
