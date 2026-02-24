import { auth } from '@clerk/nextjs/server'
import { createClient } from '@/lib/supabase/client-server'
import { NextRequest, NextResponse } from 'next/server'

export async function GET() {
  const { userId } = auth()
  if (!userId) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  const supabase = createClient()
  const { data, error } = await supabase
    .from('tasks').select('*').eq('user_id', userId).order('created_at', { ascending: false })
  if (error) return NextResponse.json({ error: error.message }, { status: 500 })
  return NextResponse.json(data)
}

export async function POST(req: NextRequest) {
  const { userId } = auth()
  if (!userId) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  const supabase = createClient()
  const body = await req.json()
  const { title, description, link, due_at, remind_at, recurrence, category, priority } = body
  if (!title?.trim()) return NextResponse.json({ error: 'Title is required' }, { status: 400 })

  const { data: task, error } = await supabase
    .from('tasks')
    .insert({ user_id: userId, title: title.trim(), description, link, due_at, remind_at, recurrence, category, priority })
    .select().single()
  if (error) return NextResponse.json({ error: error.message }, { status: 500 })

  await supabase.from('logs').insert({
    user_id: userId, task_id: task.id, task_title: task.title,
    type: 'created', message: `Task created — priority: ${priority}, category: ${category}`,
  })
  return NextResponse.json(task, { status: 201 })
}

export async function PATCH(req: NextRequest) {
  const { userId } = auth()
  if (!userId) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  const supabase = createClient()
  const body = await req.json()
  const { id, ...updates } = body
  if (updates.done === true) updates.completed_at = new Date().toISOString()
  if (updates.done === false) updates.completed_at = null

  const { data: task, error } = await supabase
    .from('tasks').update(updates).eq('id', id).eq('user_id', userId).select().single()
  if (error) return NextResponse.json({ error: error.message }, { status: 500 })

  const logType = updates.done === true ? 'completed' : updates.done === false ? 'reopened' : 'updated'
  const logMsg  = updates.done === true ? 'Task marked as completed 🎉'
    : updates.done === false ? 'Task re-opened'
    : updates.remind_at ? `Snoozed until ${updates.remind_at}` : 'Task updated'

  await supabase.from('logs').insert({
    user_id: userId, task_id: task.id, task_title: task.title, type: logType, message: logMsg,
  })
  return NextResponse.json(task)
}

export async function DELETE(req: NextRequest) {
  const { userId } = auth()
  if (!userId) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  const supabase = createClient()
  const { searchParams } = new URL(req.url)
  const id = searchParams.get('id')
  if (!id) return NextResponse.json({ error: 'Task ID required' }, { status: 400 })

  const { data: task } = await supabase.from('tasks').select('title').eq('id', id).single()
  const { error } = await supabase.from('tasks').delete().eq('id', id).eq('user_id', userId)
  if (error) return NextResponse.json({ error: error.message }, { status: 500 })

  await supabase.from('logs').insert({
    user_id: userId, task_id: null, task_title: task?.title ?? 'Unknown task',
    type: 'deleted', message: 'Task permanently deleted from the vault.',
  })
  return NextResponse.json({ success: true })
}
