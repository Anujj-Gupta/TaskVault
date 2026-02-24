'use client'

import { useState } from 'react'
import { createClient } from '@/lib/supabase/client'
import { useRouter } from 'next/navigation'

export default function AuthPage() {
  const [mode, setMode] = useState<'signin' | 'signup'>('signin')
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [loading, setLoading] = useState(false)
  const [message, setMessage] = useState<{ text: string; type: 'error' | 'success' } | null>(null)
  const router = useRouter()
  const supabase = createClient()

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    setLoading(true)
    setMessage(null)

    if (mode === 'signup') {
      const { error } = await supabase.auth.signUp({ email, password })
      if (error) setMessage({ text: error.message, type: 'error' })
      else setMessage({ text: 'Check your email for a confirmation link!', type: 'success' })
    } else {
      const { error } = await supabase.auth.signInWithPassword({ email, password })
      if (error) setMessage({ text: error.message, type: 'error' })
      else router.push('/dashboard')
    }

    setLoading(false)
  }

  return (
    <div className="min-h-screen flex items-center justify-center p-6" style={{ background: 'var(--bg)' }}>
      {/* Background glow */}
      <div className="fixed inset-0 overflow-hidden pointer-events-none">
        <div className="absolute top-1/4 left-1/2 -translate-x-1/2 w-96 h-96 rounded-full opacity-10"
          style={{ background: 'radial-gradient(circle, var(--accent2) 0%, transparent 70%)' }} />
        <div className="absolute bottom-1/4 left-1/3 w-64 h-64 rounded-full opacity-8"
          style={{ background: 'radial-gradient(circle, var(--accent) 0%, transparent 70%)' }} />
      </div>

      <div className="w-full max-w-md animate-fade-up">
        {/* Logo */}
        <div className="text-center mb-10">
          <div className="inline-flex items-center gap-3 mb-4">
            <div className="w-3 h-3 rounded-full animate-pulse-dot" style={{ background: 'var(--accent)' }} />
            <span className="font-syne font-black text-2xl tracking-tight">TaskVault</span>
          </div>
          <p className="text-sm" style={{ color: 'var(--muted)' }}>Your productivity bucket list, backed by real data.</p>
        </div>

        {/* Card */}
        <div className="rounded-2xl p-8" style={{ background: 'var(--surface)', border: '1px solid var(--border)' }}>
          {/* Tab switcher */}
          <div className="flex rounded-xl p-1 mb-8" style={{ background: 'var(--surface2)' }}>
            {(['signin', 'signup'] as const).map(m => (
              <button key={m} onClick={() => setMode(m)}
                className="flex-1 py-2 rounded-lg text-xs font-syne font-bold transition-all duration-200"
                style={{
                  background: mode === m ? 'var(--accent)' : 'transparent',
                  color: mode === m ? '#08080e' : 'var(--muted)',
                }}>
                {m === 'signin' ? 'Sign In' : 'Sign Up'}
              </button>
            ))}
          </div>

          <form onSubmit={handleSubmit} className="space-y-4">
            <div>
              <label className="block text-xs mb-2 uppercase tracking-widest" style={{ color: 'var(--muted)' }}>Email</label>
              <input type="email" required value={email} onChange={e => setEmail(e.target.value)}
                placeholder="you@example.com" />
            </div>
            <div>
              <label className="block text-xs mb-2 uppercase tracking-widest" style={{ color: 'var(--muted)' }}>Password</label>
              <input type="password" required value={password} onChange={e => setPassword(e.target.value)}
                placeholder={mode === 'signup' ? 'Min. 6 characters' : '••••••••'} minLength={6} />
            </div>

            {message && (
              <div className="p-3 rounded-lg text-xs"
                style={{
                  background: message.type === 'error' ? 'rgba(255,71,87,0.1)' : 'rgba(46,213,115,0.1)',
                  border: `1px solid ${message.type === 'error' ? 'rgba(255,71,87,0.3)' : 'rgba(46,213,115,0.3)'}`,
                  color: message.type === 'error' ? 'var(--danger)' : 'var(--success)',
                }}>
                {message.text}
              </div>
            )}

            <button type="submit" disabled={loading}
              className="w-full py-3 rounded-xl font-syne font-bold text-sm transition-all duration-150 disabled:opacity-50"
              style={{ background: 'var(--accent)', color: '#08080e' }}>
              {loading ? 'Please wait...' : mode === 'signin' ? 'Sign In →' : 'Create Account →'}
            </button>
          </form>

          <p className="mt-6 text-center text-xs" style={{ color: 'var(--muted)' }}>
            {mode === 'signin' ? "Don't have an account? " : 'Already have an account? '}
            <button onClick={() => setMode(mode === 'signin' ? 'signup' : 'signin')}
              className="transition-colors" style={{ color: 'var(--accent)' }}>
              {mode === 'signin' ? 'Sign up free' : 'Sign in'}
            </button>
          </p>
        </div>

        <p className="text-center mt-6 text-xs" style={{ color: 'var(--muted)' }}>
          Secured by Supabase Auth · Data stays private
        </p>
      </div>
    </div>
  )
}
