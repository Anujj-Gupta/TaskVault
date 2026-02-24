import { createClient } from '@/lib/supabase/server'
import { NextRequest, NextResponse } from 'next/server'

// GET all tasks for authenticated user
export async function GET() {
  const supabase = createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const { data, error } = await supabase
    .from('tasks')
    .select('*')
    .eq('user_id', user.id)
    .order('created_at', { ascending: false })

  if (error) return NextResponse.json({ error: error.message }, { status: 500 })
  return NextResponse.json(data)
}

// POST create a task + log entry
export async function POST(req: NextRequest) {
  const supabase = createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const body = await req.json()
  const { title, description, link, due_at, remind_at, recurrence, category, priority } = body

  if (!title?.trim()) return NextResponse.json({ error: 'Title is required' }, { status: 400 })

  const { data: task, error } = await supabase
    .from('tasks')
    .insert({ user_id: user.id, title: title.trim(), description, link, due_at, remind_at, recurrence, category, priority })
    .select()
    .single()

  if (error) return NextResponse.json({ error: error.message }, { status: 500 })

  // Log it
  await supabase.from('logs').insert({
    user_id: user.id,
    task_id: task.id,
    task_title: task.title,
    type: 'created',
    message: `Task created — priority: ${priority}, category: ${category}`,
  })

  return NextResponse.json(task, { status: 201 })
}

// PATCH update a task (done toggle, snooze, etc.)
export async function PATCH(req: NextRequest) {
  const supabase = createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const body = await req.json()
  const { id, ...updates } = body

  // If marking done, set completed_at
  if (updates.done === true) updates.completed_at = new Date().toISOString()
  if (updates.done === false) updates.completed_at = null

  const { data: task, error } = await supabase
    .from('tasks')
    .update(updates)
    .eq('id', id)
    .eq('user_id', user.id)
    .select()
    .single()

  if (error) return NextResponse.json({ error: error.message }, { status: 500 })

  // Log the action
  const logType = updates.done === true ? 'completed' : updates.done === false ? 'reopened' : 'updated'
  const logMsg = updates.done === true ? 'Task marked as completed 🎉'
    : updates.done === false ? 'Task re-opened'
    : updates.remind_at ? `Snoozed until ${updates.remind_at}`
    : 'Task updated'

  await supabase.from('logs').insert({
    user_id: user.id,
    task_id: task.id,
    task_title: task.title,
    type: logType,
    message: logMsg,
  })

  return NextResponse.json(task)
}

// DELETE a task
export async function DELETE(req: NextRequest) {
  const supabase = createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const { searchParams } = new URL(req.url)
  const id = searchParams.get('id')
  if (!id) return NextResponse.json({ error: 'Task ID required' }, { status: 400 })

  // Get task title before deleting
  const { data: task } = await supabase.from('tasks').select('title').eq('id', id).single()

  const { error } = await supabase.from('tasks').delete().eq('id', id).eq('user_id', user.id)
  if (error) return NextResponse.json({ error: error.message }, { status: 500 })

  // Log (task_id will become null due to on delete set null)
  await supabase.from('logs').insert({
    user_id: user.id,
    task_id: null,
    task_title: task?.title ?? 'Unknown task',
    type: 'deleted',
    message: 'Task permanently deleted from the vault.',
  })

  return NextResponse.json({ success: true })
}
