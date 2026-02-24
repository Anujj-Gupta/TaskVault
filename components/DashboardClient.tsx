'use client'

import { useState, useEffect, useCallback, useRef } from 'react'
import { useClerk } from '@clerk/nextjs'
import { useRouter } from 'next/navigation'
import { Task, Log, Priority, Category, Recurrence } from '@/lib/types'
import { formatDistanceToNow, format, isPast } from 'date-fns'
import {
  Bell, LogOut, Plus, Search, Filter, Clock, CheckCircle2,
  Trash2, ExternalLink, AlarmClock, BookOpen, ChevronRight,
  AlertTriangle, RotateCcw, Mail, X, Calendar
} from 'lucide-react'

type FilterType = 'all' | 'pending' | 'done' | 'overdue' | 'high'
type SortType = 'created' | 'due' | 'priority' | 'alpha'

interface Props {
  initialTasks: Task[]
  initialLogs: Log[]
  user: { id: string; email: string }
}

const PRIO_ORDER: Record<Priority, number> = { high: 0, medium: 1, low: 2 }
const TAG_COLORS: Record<Category, string> = {
  work:     'rgba(123,94,167,0.2)',
  personal: 'rgba(255,165,2,0.15)',
  health:   'rgba(46,213,115,0.15)',
  learning: 'rgba(56,189,248,0.15)',
  finance:  'rgba(200,255,0,0.12)',
  other:    'rgba(107,107,130,0.15)',
}
const TAG_TEXT: Record<Category, string> = {
  work: '#a78bfa', personal: '#fbbf24', health: '#34d399',
  learning: '#38bdf8', finance: '#c8ff00', other: '#6b6b82',
}

export default function DashboardClient({ initialTasks, initialLogs, user }: Props) {
  const [tasks, setTasks]   = useState<Task[]>(initialTasks)
  const [logs, setLogs]     = useState<Log[]>(initialLogs)
  const [filter, setFilter] = useState<FilterType>('all')
  const [sort, setSort]     = useState<SortType>('created')
  const [search, setSearch] = useState('')
  const [toasts, setToasts] = useState<{ id: string; icon: string; title: string; msg: string; type: string }[]>([])
  const [logModal, setLogModal] = useState<{ open: boolean; taskId: string | null }>({ open: false, taskId: null })
  const [emailModal, setEmailModal] = useState(false)
  const [addOpen, setAddOpen] = useState(false)
  const [userEmail, setUserEmail] = useState('')
  const remindTimers = useRef<Record<string, ReturnType<typeof setTimeout>>>({})
  const router = useRouter()
  const { signOut: clerkSignOut } = useClerk()

  // Form state
  const [form, setForm] = useState({
    title: '', description: '', link: '', due_at: '',
    remind_at: '', recurrence: '' as Recurrence | '',
    category: 'work' as Category, priority: 'medium' as Priority,
  })

  // ── Toast ────────────────────────────────────────────────
  const toast = useCallback((icon: string, title: string, msg: string, type = 'info') => {
    const id = Date.now().toString()
    setToasts(t => [...t, { id, icon, title, msg, type }])
    setTimeout(() => setToasts(t => t.filter(x => x.id !== id)), 4500)
  }, [])

  // ── Reminders ────────────────────────────────────────────
  const scheduleReminder = useCallback((task: Task) => {
    if (!task.remind_at || task.done) return
    const ms = new Date(task.remind_at).getTime() - Date.now()
    if (ms <= 0 || ms > 7 * 24 * 60 * 60 * 1000) return
    if (remindTimers.current[task.id]) clearTimeout(remindTimers.current[task.id])
    remindTimers.current[task.id] = setTimeout(async () => {
      toast('🔔', 'Reminder!', `"${task.title}" needs your attention.`, 'remind')
      if ('Notification' in window && Notification.permission === 'granted') {
        new Notification('TaskVault', { body: task.title })
      }
      // Send email via API
      if (userEmail) {
        await fetch('/api/reminders', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ taskId: task.id, taskTitle: task.title, dueAt: task.due_at, userEmail }),
        })
        toast('📧', 'Email sent!', `Reminder sent to ${userEmail}`, 'info')
        // Refresh logs
        const logsRes = await fetch('/api/logs')
        if (logsRes.ok) setLogs(await logsRes.json())
      }
    }, ms)
  }, [toast, userEmail])

  useEffect(() => {
    tasks.forEach(t => scheduleReminder(t))
    return () => Object.values(remindTimers.current).forEach(clearTimeout)
  }, [tasks, scheduleReminder])

  // Push notification permission
  useEffect(() => {
    if ('Notification' in window && Notification.permission === 'default') {
      Notification.requestPermission()
    }
  }, [])

  // ── API helpers ──────────────────────────────────────────
  async function refreshTasks() {
    const res = await fetch('/api/tasks')
    if (res.ok) setTasks(await res.json())
  }
  async function refreshLogs(taskId?: string) {
    const url = taskId ? `/api/logs?task_id=${taskId}` : '/api/logs'
    const res = await fetch(url)
    if (res.ok) setLogs(await res.json())
  }

  // ── Create task ──────────────────────────────────────────
  async function handleAdd() {
    if (!form.title.trim()) { toast('⚠️', 'Missing title', 'Please enter a task title.', 'warn'); return }
    const res = await fetch('/api/tasks', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ ...form, recurrence: form.recurrence || null }),
    })
    if (!res.ok) { const e = await res.json(); toast('❌', 'Error', e.error, 'error'); return }
    const task = await res.json()
    setTasks(t => [task, ...t])
    setLogs(l => [{ id: Date.now().toString(), user_id: user.id, task_id: task.id, task_title: task.title, type: 'created', message: `Task created`, created_at: new Date().toISOString() }, ...l])
    setForm({ title: '', description: '', link: '', due_at: '', remind_at: '', recurrence: '', category: 'work', priority: 'medium' })
    setAddOpen(false)
    scheduleReminder(task)
    toast('✅', 'Task added!', `"${task.title}" is in the vault.`, 'success')
  }

  // ── Toggle done ──────────────────────────────────────────
  async function handleToggle(task: Task) {
    const res = await fetch('/api/tasks', {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ id: task.id, done: !task.done }),
    })
    if (!res.ok) return
    const updated = await res.json()
    setTasks(t => t.map(x => x.id === task.id ? updated : x))
    await refreshLogs()
    if (!task.done) toast('🎉', 'Completed!', `"${task.title}" done.`, 'success')
  }

  // ── Delete ───────────────────────────────────────────────
  async function handleDelete(task: Task) {
    const res = await fetch(`/api/tasks?id=${task.id}`, { method: 'DELETE' })
    if (!res.ok) return
    setTasks(t => t.filter(x => x.id !== task.id))
    await refreshLogs()
    toast('🗑️', 'Deleted', `"${task.title}" removed.`, 'warn')
  }

  // ── Snooze ───────────────────────────────────────────────
  async function handleSnooze(task: Task) {
    const snooze = new Date(Date.now() + 30 * 60 * 1000).toISOString()
    const res = await fetch('/api/tasks', {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ id: task.id, remind_at: snooze }),
    })
    if (!res.ok) return
    const updated = await res.json()
    setTasks(t => t.map(x => x.id === task.id ? updated : x))
    scheduleReminder(updated)
    await refreshLogs()
    toast('😴', 'Snoozed', `"${task.title}" snoozed 30 min.`, 'info')
  }

  // ── Sign out ─────────────────────────────────────────────
  async function signOut() {
    await clerkSignOut()
    router.push('/auth')
  }

  // ── Filter & sort ────────────────────────────────────────
  const now = Date.now()
  const filtered = tasks.filter(t => {
    if (search && !t.title.toLowerCase().includes(search.toLowerCase())) return false
    if (filter === 'pending') return !t.done
    if (filter === 'done')    return t.done
    if (filter === 'overdue') return !t.done && !!t.due_at && new Date(t.due_at).getTime() < now
    if (filter === 'high')    return t.priority === 'high' && !t.done
    return true
  }).sort((a, b) => {
    if (sort === 'due')      return (a.due_at ?? '9999') < (b.due_at ?? '9999') ? -1 : 1
    if (sort === 'priority') return PRIO_ORDER[a.priority] - PRIO_ORDER[b.priority]
    if (sort === 'alpha')    return a.title.localeCompare(b.title)
    return new Date(b.created_at).getTime() - new Date(a.created_at).getTime()
  })

  const stats = {
    total:   tasks.length,
    pending: tasks.filter(t => !t.done).length,
    overdue: tasks.filter(t => !t.done && !!t.due_at && new Date(t.due_at).getTime() < now).length,
    done:    tasks.filter(t => t.done).length,
  }
  const pct = stats.total ? Math.round(stats.done / stats.total * 100) : 0

  // Logs to show in modal
  const visibleLogs = logModal.taskId ? logs.filter(l => l.task_id === logModal.taskId) : logs

  const LOG_ICON: Record<string, string> = {
    created: '✨', completed: '✅', reopened: '↩️', deleted: '🗑️',
    reminded: '🔔', snoozed: '😴', email_sent: '📧', updated: '✏️',
  }

  return (
    <div className="min-h-screen" style={{ background: 'var(--bg)' }}>
      {/* ── Header ─────────────────────────────────────── */}
      <header className="sticky top-0 z-50 backdrop-blur-xl" style={{ background: 'rgba(8,8,14,0.9)', borderBottom: '1px solid var(--border)' }}>
        <div className="max-w-5xl mx-auto px-6 py-4 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="w-2.5 h-2.5 rounded-full animate-pulse-dot" style={{ background: 'var(--accent)' }} />
            <span className="font-syne font-black text-lg tracking-tight">TaskVault</span>
          </div>
          <div className="flex items-center gap-3">
            <span className="text-xs hidden sm:block" style={{ color: 'var(--muted)' }}>{user.email}</span>
            <button onClick={() => setEmailModal(true)}
              className="flex items-center gap-2 px-3 py-2 rounded-lg text-xs transition-all"
              style={{ background: 'var(--surface2)', border: '1px solid var(--border)', color: 'var(--muted)' }}>
              <Mail size={13} /> Email
            </button>
            <button onClick={signOut}
              className="flex items-center gap-1.5 px-3 py-2 rounded-lg text-xs transition-all"
              style={{ background: 'var(--surface2)', border: '1px solid var(--border)', color: 'var(--muted)' }}>
              <LogOut size={13} /> Sign out
            </button>
          </div>
        </div>
      </header>

      <div className="max-w-5xl mx-auto px-6 py-8">
        {/* ── Stats bar ──────────────────────────────────── */}
        <div className="grid grid-cols-4 gap-3 mb-6">
          {[
            { label: 'Total', val: stats.total, color: 'var(--accent)' },
            { label: 'Pending', val: stats.pending, color: 'var(--warn)' },
            { label: 'Overdue', val: stats.overdue, color: 'var(--danger)' },
            { label: 'Done', val: stats.done, color: 'var(--success)' },
          ].map(s => (
            <div key={s.label} className="rounded-xl p-4 text-center animate-fade-up"
              style={{ background: 'var(--surface)', border: '1px solid var(--border)' }}>
              <div className="font-syne font-black text-2xl" style={{ color: s.color }}>{s.val}</div>
              <div className="text-xs mt-0.5" style={{ color: 'var(--muted)' }}>{s.label}</div>
            </div>
          ))}
        </div>

        {/* Progress bar */}
        <div className="rounded-full overflow-hidden mb-8 h-1.5" style={{ background: 'var(--surface2)' }}>
          <div className="h-full rounded-full transition-all duration-700"
            style={{ width: `${pct}%`, background: 'linear-gradient(90deg, var(--accent2), var(--accent))' }} />
        </div>

        {/* ── Add task ───────────────────────────────────── */}
        <div className="mb-6 rounded-2xl overflow-hidden" style={{ border: '1px solid var(--border)' }}>
          <button onClick={() => setAddOpen(o => !o)}
            className="w-full flex items-center justify-between px-6 py-4 text-sm font-syne font-bold transition-all"
            style={{ background: 'var(--surface)' }}>
            <span className="flex items-center gap-2">
              <Plus size={16} style={{ color: 'var(--accent)' }} /> Add New Task
            </span>
            <ChevronRight size={16} className={`transition-transform duration-200 ${addOpen ? 'rotate-90' : ''}`} style={{ color: 'var(--muted)' }} />
          </button>

          {addOpen && (
            <div className="px-6 pb-6 pt-2 animate-fade-up" style={{ background: 'var(--surface)' }}>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 mb-3">
                <input placeholder="Task title *" value={form.title} onChange={e => setForm(f => ({ ...f, title: e.target.value }))} />
                <input placeholder="🔗 Article or resource URL" value={form.link} onChange={e => setForm(f => ({ ...f, link: e.target.value }))} />
              </div>
              <div className="mb-3">
                <textarea rows={2} placeholder="Description (optional)" value={form.description}
                  onChange={e => setForm(f => ({ ...f, description: e.target.value }))} />
              </div>
              <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 mb-4">
                <input type="datetime-local" value={form.due_at} onChange={e => setForm(f => ({ ...f, due_at: e.target.value }))} title="Due date" />
                <input type="datetime-local" value={form.remind_at} onChange={e => setForm(f => ({ ...f, remind_at: e.target.value }))} title="Remind me at" />
                <select value={form.recurrence ?? ''} onChange={e => setForm(f => ({ ...f, recurrence: e.target.value as Recurrence | '' }))}>
                  <option value="">No repeat</option>
                  <option value="daily">Repeat daily</option>
                  <option value="weekly">Repeat weekly</option>
                  <option value="monthly">Repeat monthly</option>
                </select>
              </div>

              {/* Category */}
              <div className="mb-3">
                <div className="text-xs mb-2 uppercase tracking-widest" style={{ color: 'var(--muted)' }}>Category</div>
                <div className="flex flex-wrap gap-2">
                  {(['work','personal','health','learning','finance','other'] as Category[]).map(c => (
                    <button key={c} onClick={() => setForm(f => ({ ...f, category: c }))}
                      className="px-3 py-1.5 rounded-full text-xs border transition-all"
                      style={{
                        borderColor: form.category === c ? TAG_TEXT[c] : 'var(--border)',
                        background:  form.category === c ? TAG_COLORS[c] : 'transparent',
                        color:       form.category === c ? TAG_TEXT[c] : 'var(--muted)',
                      }}>
                      {c}
                    </button>
                  ))}
                </div>
              </div>

              {/* Priority */}
              <div className="mb-5">
                <div className="text-xs mb-2 uppercase tracking-widest" style={{ color: 'var(--muted)' }}>Priority</div>
                <div className="flex gap-2">
                  {(['low','medium','high'] as Priority[]).map(p => {
                    const col = p === 'low' ? 'var(--success)' : p === 'medium' ? 'var(--warn)' : 'var(--danger)'
                    const bg  = p === 'low' ? 'rgba(46,213,115,0.1)' : p === 'medium' ? 'rgba(255,165,2,0.1)' : 'rgba(255,71,87,0.1)'
                    return (
                      <button key={p} onClick={() => setForm(f => ({ ...f, priority: p }))}
                        className="flex-1 py-2 rounded-lg text-xs border transition-all"
                        style={{
                          borderColor: form.priority === p ? col : 'var(--border)',
                          background:  form.priority === p ? bg : 'transparent',
                          color:       form.priority === p ? col : 'var(--muted)',
                        }}>
                        {p === 'low' ? '🟢' : p === 'medium' ? '🟡' : '🔴'} {p}
                      </button>
                    )
                  })}
                </div>
              </div>

              <div className="flex justify-end gap-2">
                <button onClick={() => setAddOpen(false)}
                  className="px-4 py-2 rounded-lg text-xs border transition-all"
                  style={{ border: '1px solid var(--border)', color: 'var(--muted)' }}>
                  Cancel
                </button>
                <button onClick={handleAdd}
                  className="px-5 py-2 rounded-lg text-xs font-syne font-bold transition-all"
                  style={{ background: 'var(--accent)', color: '#08080e' }}>
                  Add to Vault →
                </button>
              </div>
            </div>
          )}
        </div>

        {/* ── Filters ────────────────────────────────────── */}
        <div className="flex flex-wrap gap-2 items-center mb-5">
          <div className="relative flex-1 min-w-48">
            <Search size={13} className="absolute left-3 top-1/2 -translate-y-1/2" style={{ color: 'var(--muted)' }} />
            <input placeholder="Search tasks..." value={search} onChange={e => setSearch(e.target.value)}
              className="pl-8" style={{ paddingLeft: '2rem' }} />
          </div>
          <div className="flex gap-1.5 flex-wrap">
            {(['all','pending','done','overdue','high'] as FilterType[]).map(f => (
              <button key={f} onClick={() => setFilter(f)}
                className="px-3 py-1.5 rounded-full text-xs border transition-all"
                style={{
                  borderColor: filter === f ? 'var(--accent)' : 'var(--border)',
                  background:  filter === f ? 'rgba(200,255,0,0.08)' : 'transparent',
                  color:       filter === f ? 'var(--accent)' : 'var(--muted)',
                }}>
                {f === 'high' ? '🔴 High' : f.charAt(0).toUpperCase() + f.slice(1)}
              </button>
            ))}
          </div>
          <select value={sort} onChange={e => setSort(e.target.value as SortType)} style={{ maxWidth: 160 }}>
            <option value="created">Sort: Newest</option>
            <option value="due">Sort: Due Date</option>
            <option value="priority">Sort: Priority</option>
            <option value="alpha">Sort: A-Z</option>
          </select>
          <button onClick={() => setLogModal({ open: true, taskId: null })}
            className="flex items-center gap-1.5 px-3 py-2 rounded-lg text-xs border transition-all"
            style={{ border: '1px solid var(--border)', color: 'var(--muted)' }}>
            <BookOpen size={13} /> Full Log
          </button>
        </div>

        {/* ── Task list ──────────────────────────────────── */}
        <div className="space-y-3">
          {filtered.length === 0 && (
            <div className="text-center py-20" style={{ color: 'var(--muted)' }}>
              <div className="text-5xl mb-4 opacity-30">📭</div>
              <div className="font-syne font-bold mb-1" style={{ color: 'var(--text)' }}>Nothing here</div>
              <div className="text-xs">Add a task above to start building your vault.</div>
            </div>
          )}
          {filtered.map(task => {
            const isOverdue = !task.done && !!task.due_at && new Date(task.due_at).getTime() < now
            const prioColor = task.priority === 'high' ? 'var(--danger)' : task.priority === 'medium' ? 'var(--warn)' : 'var(--success)'
            return (
              <div key={task.id} className="rounded-xl p-4 transition-all animate-fade-up"
                style={{
                  background: 'var(--surface)',
                  border: '1px solid var(--border)',
                  borderLeft: `3px solid ${prioColor}`,
                  opacity: task.done ? 0.6 : 1,
                }}>
                <div className="flex gap-3 items-start">
                  {/* Checkbox */}
                  <button onClick={() => handleToggle(task)}
                    className="flex-shrink-0 w-7 h-7 rounded-lg border-2 flex items-center justify-center transition-all mt-0.5"
                    style={{
                      borderColor: task.done ? 'var(--success)' : 'var(--border)',
                      background:  task.done ? 'var(--success)' : 'transparent',
                    }}>
                    {task.done && <CheckCircle2 size={14} color="#08080e" strokeWidth={3} />}
                  </button>

                  {/* Content */}
                  <div className="flex-1 min-w-0">
                    <div className={`font-syne font-semibold text-sm mb-1 ${task.done ? 'line-through' : ''}`}
                      style={{ color: task.done ? 'var(--muted)' : 'white', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>
                      {task.title}
                    </div>
                    {task.description && (
                      <div className="text-xs mb-2 line-clamp-2" style={{ color: 'var(--muted)' }}>{task.description}</div>
                    )}
                    <div className="flex flex-wrap gap-2 items-center">
                      <span className="text-xs px-2 py-0.5 rounded"
                        style={{ background: TAG_COLORS[task.category], color: TAG_TEXT[task.category], border: `1px solid ${TAG_TEXT[task.category]}30` }}>
                        {task.category}
                      </span>
                      {task.due_at && (
                        <span className="flex items-center gap-1 text-xs"
                          style={{ color: isOverdue ? 'var(--danger)' : 'var(--muted)' }}>
                          {isOverdue ? <AlertTriangle size={11} /> : <Calendar size={11} />}
                          {format(new Date(task.due_at), 'MMM d, h:mm a')}
                        </span>
                      )}
                      {task.remind_at && !task.done && (
                        <span className="flex items-center gap-1 text-xs" style={{ color: 'var(--warn)' }}>
                          <Bell size={11} /> {format(new Date(task.remind_at), 'MMM d, h:mm a')}
                        </span>
                      )}
                      {task.recurrence && (
                        <span className="flex items-center gap-1 text-xs" style={{ color: 'var(--muted)' }}>
                          <RotateCcw size={11} /> {task.recurrence}
                        </span>
                      )}
                      {task.done && task.completed_at && (
                        <span className="text-xs" style={{ color: 'var(--success)' }}>
                          ✓ {formatDistanceToNow(new Date(task.completed_at), { addSuffix: true })}
                        </span>
                      )}
                      <span className="text-xs" style={{ color: 'var(--muted)' }}>
                        added {formatDistanceToNow(new Date(task.created_at), { addSuffix: true })}
                      </span>
                    </div>
                  </div>

                  {/* Actions */}
                  <div className="flex gap-1.5 flex-shrink-0">
                    {task.link && (
                      <a href={task.link.startsWith('http') ? task.link : `https://${task.link}`} target="_blank" rel="noopener noreferrer"
                        title="Open link"
                        className="w-8 h-8 flex items-center justify-center rounded-lg border transition-all"
                        style={{ border: '1px solid var(--border)', color: 'var(--muted)' }}>
                        <ExternalLink size={13} />
                      </a>
                    )}
                    <button onClick={() => setLogModal({ open: true, taskId: task.id })} title="View log"
                      className="w-8 h-8 flex items-center justify-center rounded-lg border transition-all"
                      style={{ border: '1px solid var(--border)', color: 'var(--muted)' }}>
                      <BookOpen size={13} />
                    </button>
                    {!task.done && task.remind_at && (
                      <button onClick={() => handleSnooze(task)} title="Snooze 30 min"
                        className="w-8 h-8 flex items-center justify-center rounded-lg border transition-all"
                        style={{ border: '1px solid var(--border)', color: 'var(--muted)' }}>
                        <AlarmClock size={13} />
                      </button>
                    )}
                    <button onClick={() => handleDelete(task)} title="Delete"
                      className="w-8 h-8 flex items-center justify-center rounded-lg border transition-all"
                      style={{ border: '1px solid var(--border)', color: 'var(--muted)' }}
                      onMouseEnter={e => { (e.currentTarget as HTMLElement).style.color = 'var(--danger)'; (e.currentTarget as HTMLElement).style.borderColor = 'var(--danger)' }}
                      onMouseLeave={e => { (e.currentTarget as HTMLElement).style.color = 'var(--muted)'; (e.currentTarget as HTMLElement).style.borderColor = 'var(--border)' }}>
                      <Trash2 size={13} />
                    </button>
                  </div>
                </div>
              </div>
            )
          })}
        </div>
      </div>

      {/* ── Log Modal ──────────────────────────────────────── */}
      {logModal.open && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-6"
          style={{ background: 'rgba(0,0,0,0.75)', backdropFilter: 'blur(6px)' }}
          onClick={e => { if (e.target === e.currentTarget) setLogModal({ open: false, taskId: null }) }}>
          <div className="w-full max-w-lg max-h-[80vh] overflow-y-auto rounded-2xl p-6 animate-fade-up"
            style={{ background: 'var(--surface)', border: '1px solid var(--border)' }}>
            <div className="flex justify-between items-center mb-6">
              <span className="font-syne font-bold">
                {logModal.taskId ? '📋 Task Log' : '📋 Full Activity Log'}
              </span>
              <button onClick={() => setLogModal({ open: false, taskId: null })}
                className="w-7 h-7 flex items-center justify-center rounded-lg" style={{ color: 'var(--muted)' }}>
                <X size={15} />
              </button>
            </div>
            {visibleLogs.length === 0 ? (
              <p className="text-xs text-center py-8" style={{ color: 'var(--muted)' }}>No activity yet.</p>
            ) : (
              <div className="space-y-0">
                {visibleLogs.map((log, i) => (
                  <div key={log.id} className="grid gap-x-4 pb-5" style={{ gridTemplateColumns: '1fr auto' }}>
                    <div className="relative pl-5">
                      <div className="absolute left-0 top-1.5 w-2 h-2 rounded-full"
                        style={{ background: log.type === 'completed' ? 'var(--success)' : log.type === 'created' ? 'var(--accent)' : 'var(--accent2)' }} />
                      {i < visibleLogs.length - 1 && (
                        <div className="absolute left-[3px] top-4 bottom-0 w-px" style={{ background: 'var(--border)' }} />
                      )}
                      <div className="text-xs font-medium">{LOG_ICON[log.type] ?? '•'} {log.task_title}</div>
                      <div className="text-xs mt-0.5" style={{ color: 'var(--muted)' }}>{log.message}</div>
                    </div>
                    <div className="text-right text-xs" style={{ color: 'var(--muted)' }}>
                      {formatDistanceToNow(new Date(log.created_at), { addSuffix: true })}
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>
      )}

      {/* ── Email Modal ────────────────────────────────────── */}
      {emailModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-6"
          style={{ background: 'rgba(0,0,0,0.75)', backdropFilter: 'blur(6px)' }}
          onClick={e => { if (e.target === e.currentTarget) setEmailModal(false) }}>
          <div className="w-full max-w-md rounded-2xl p-6 animate-fade-up"
            style={{ background: 'var(--surface)', border: '1px solid var(--border)' }}>
            <div className="flex justify-between items-center mb-4">
              <span className="font-syne font-bold">📧 Email Reminder Settings</span>
              <button onClick={() => setEmailModal(false)} style={{ color: 'var(--muted)' }}><X size={15} /></button>
            </div>
            <p className="text-xs mb-4" style={{ color: 'var(--muted)' }}>Receive email reminders at this address when tasks are due.</p>
            <input type="email" placeholder="you@example.com" value={userEmail}
              onChange={e => setUserEmail(e.target.value)} className="mb-3" />
            <button onClick={() => { localStorage.setItem('tv_email', userEmail); setEmailModal(false); toast('📧', 'Saved!', `Reminders → ${userEmail}`, 'success') }}
              className="w-full py-2.5 rounded-xl font-syne font-bold text-sm"
              style={{ background: 'var(--accent)', color: '#08080e' }}>
              Save Email
            </button>
            <p className="text-xs mt-3" style={{ color: 'var(--muted)' }}>Powered by Resend. Configure RESEND_API_KEY in your .env.local file.</p>
          </div>
        </div>
      )}

      {/* ── Toasts ─────────────────────────────────────────── */}
      <div className="fixed top-20 right-5 z-50 flex flex-col gap-2 pointer-events-none">
        {toasts.map(t => (
          <div key={t.id} className="flex gap-3 items-start p-3.5 rounded-xl min-w-60 max-w-xs animate-slide-in pointer-events-auto"
            style={{
              background: 'var(--surface2)',
              border: `1px solid ${t.type === 'success' ? 'rgba(46,213,115,0.3)' : t.type === 'warn' ? 'rgba(255,165,2,0.3)' : t.type === 'remind' ? 'rgba(255,165,2,0.3)' : 'var(--border)'}`,
              boxShadow: '0 8px 32px rgba(0,0,0,0.4)',
            }}>
            <span className="text-lg">{t.icon}</span>
            <div>
              <div className="font-syne font-bold text-xs">{t.title}</div>
              <div className="text-xs mt-0.5" style={{ color: 'var(--muted)' }}>{t.msg}</div>
            </div>
          </div>
        ))}
      </div>

      {/* Restore email from localStorage */}
      <EmailRestorer onRestore={setUserEmail} />
    </div>
  )
}

// Tiny client component to restore email from localStorage
function EmailRestorer({ onRestore }: { onRestore: (e: string) => void }) {
  useEffect(() => {
    const saved = localStorage.getItem('tv_email')
    if (saved) onRestore(saved)
  }, [onRestore])
  return null
}
