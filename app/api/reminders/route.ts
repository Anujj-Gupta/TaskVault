import { createClient } from '@/lib/supabase/server'
import { NextRequest, NextResponse } from 'next/server'

// POST — send a reminder email and log it
export async function POST(req: NextRequest) {
  const supabase = createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const { taskId, taskTitle, dueAt, userEmail } = await req.json()
  if (!userEmail) return NextResponse.json({ error: 'No email provided' }, { status: 400 })

  const RESEND_API_KEY = process.env.RESEND_API_KEY
  if (!RESEND_API_KEY) return NextResponse.json({ error: 'Email service not configured' }, { status: 503 })

  const dueText = dueAt ? new Date(dueAt).toLocaleString('en-US', { dateStyle: 'medium', timeStyle: 'short' }) : 'No due date set'
  const appUrl  = process.env.NEXT_PUBLIC_APP_URL ?? 'http://localhost:3000'

  const html = `
    <!DOCTYPE html>
    <html>
    <head><meta charset="UTF-8"></head>
    <body style="font-family:'DM Mono',monospace,Arial;background:#08080e;color:#f0f0f8;padding:40px;max-width:520px;margin:0 auto;">
      <div style="background:#111118;border:1px solid #2a2a38;border-radius:16px;padding:32px;">
        <div style="display:flex;align-items:center;gap:10px;margin-bottom:24px;">
          <div style="width:10px;height:10px;background:#c8ff00;border-radius:50%;"></div>
          <span style="font-weight:800;font-size:1.2rem;letter-spacing:-0.02em;">TaskVault</span>
        </div>
        <h2 style="color:#c8ff00;font-size:1rem;margin-bottom:8px;font-weight:600;">⏰ Reminder</h2>
        <h1 style="font-size:1.4rem;font-weight:700;margin-bottom:16px;color:#f0f0f8;">${taskTitle}</h1>
        <p style="color:#6b6b82;font-size:0.85rem;margin-bottom:24px;">Due: <span style="color:#ffa502;">${dueText}</span></p>
        <a href="${appUrl}/dashboard" style="display:inline-block;background:#c8ff00;color:#08080e;padding:12px 24px;border-radius:8px;font-weight:700;text-decoration:none;font-size:0.85rem;">
          Open TaskVault →
        </a>
        <p style="margin-top:24px;font-size:0.7rem;color:#6b6b82;">You're receiving this because you set a reminder in TaskVault.</p>
      </div>
    </body>
    </html>
  `

  const res = await fetch('https://api.resend.com/emails', {
    method: 'POST',
    headers: { Authorization: `Bearer ${RESEND_API_KEY}`, 'Content-Type': 'application/json' },
    body: JSON.stringify({
      from: 'TaskVault <reminders@yourdomain.com>', // Change to your verified Resend domain
      to: [userEmail],
      subject: `⏰ Reminder: ${taskTitle}`,
      html,
    }),
  })

  if (!res.ok) {
    const err = await res.text()
    return NextResponse.json({ error: `Email failed: ${err}` }, { status: 500 })
  }

  // Log the email
  await supabase.from('logs').insert({
    user_id: user.id,
    task_id: taskId,
    task_title: taskTitle,
    type: 'email_sent',
    message: `Reminder email sent to ${userEmail}`,
  })

  return NextResponse.json({ success: true })
}
