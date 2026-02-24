import { SignIn } from '@clerk/nextjs'

export default function SignInPage() {
  return (
    <div className="min-h-screen flex flex-col items-center justify-center gap-6" style={{ background: 'var(--bg)' }}>
      {/* Background glow */}
      <div className="fixed inset-0 overflow-hidden pointer-events-none">
        <div className="absolute top-1/4 left-1/2 -translate-x-1/2 w-96 h-96 rounded-full opacity-10"
          style={{ background: 'radial-gradient(circle, #7b5ea7 0%, transparent 70%)' }} />
        <div className="absolute bottom-1/4 left-1/3 w-64 h-64 rounded-full opacity-8"
          style={{ background: 'radial-gradient(circle, #c8ff00 0%, transparent 70%)' }} />
      </div>
      <div className="relative z-10 flex flex-col items-center gap-6">
        <div className="flex items-center gap-3">
          <div className="w-3 h-3 rounded-full animate-pulse-dot" style={{ background: '#c8ff00' }} />
          <span className="font-syne font-black text-2xl tracking-tight">TaskVault</span>
        </div>
        <SignIn
          appearance={{
            variables: {
              colorPrimary: '#c8ff00',
              colorBackground: '#111118',
              colorText: '#f0f0f8',
              colorInputBackground: '#1a1a24',
              colorInputText: '#f0f0f8',
              borderRadius: '12px',
              fontFamily: 'DM Mono, monospace',
            },
            elements: {
              card: 'shadow-2xl',
              formButtonPrimary: 'bg-[#c8ff00] text-[#08080e] hover:bg-[#d4ff1a] font-bold',
            }
          }}
        />
      </div>
    </div>
  )
}
