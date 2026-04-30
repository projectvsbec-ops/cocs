import { useState } from 'react'
import { useAuth } from '../context/AuthContext'
import { useNavigate } from 'react-router-dom'
import toast from 'react-hot-toast'
import { LogIn, Eye, EyeOff } from 'lucide-react'

export default function LoginPage() {
  const { login } = useAuth()
  const navigate = useNavigate()
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [showPass, setShowPass] = useState(false)
  const [loading, setLoading] = useState(false)

  const demoAccounts = [
    { label: '👑 Admin', email: 'admin@cocs.com' },
    { label: '🏢 Manager', email: 'elec.mgr@cocs.com' },
  ]

  const handleLogin = async (e) => {
    e.preventDefault()
    if (!email || !password) { toast.error('Please enter email and password'); return }
    setLoading(true)
    try {
      const user = await login(email, password)
      toast.success(`Welcome, ${user.name}! 👋`)
      navigate('/')
    } catch (err) {
      toast.error(err.message || 'Login failed. Please try again.')
    } finally {
      setLoading(false)
    }
  }

  return (
    <div style={{
      minHeight: '100vh', display: 'flex', flexDirection: 'column',
      alignItems: 'center', justifyContent: 'center',
      background: 'linear-gradient(135deg, #1e3a8a 0%, #2563eb 50%, #7c3aed 100%)',
      padding: '24px',
    }}>
      {/* Logo */}
      <div style={{ textAlign:'center', marginBottom:'32px' }} className="fade-in">
        <div style={{
          width: 80, height: 80, borderRadius: '24px',
          background: 'rgba(255,255,255,0.2)',
          backdropFilter: 'blur(10px)',
          border: '2px solid rgba(255,255,255,0.3)',
          display: 'flex', alignItems: 'center', justifyContent: 'center',
          margin: '0 auto 16px', fontSize: '2rem', fontWeight: 900, color: 'white'
        }}>CO</div>
        <h1 style={{ color:'white', fontSize:'1.8rem', fontWeight:800, margin:0 }}>COCS</h1>
        <p style={{ color:'rgba(255,255,255,0.75)', margin:'6px 0 0', fontSize:'0.9rem' }}>
          Campus Operations Control System
        </p>
      </div>

      {/* Login Card */}
      <div className="card glass fade-in" style={{ width:'100%', maxWidth:'420px', padding:'32px', boxShadow: '0 20px 40px rgba(0,0,0,0.1)' }}>
        <h2 style={{ margin:'0 0 8px', fontSize:'1.4rem', fontWeight:700 }}>Sign In</h2>
        <p style={{ margin:'0 0 24px', color:'#64748b', fontSize:'0.9rem' }}>Use your college email to login</p>

        <form onSubmit={handleLogin} style={{ display:'flex', flexDirection:'column', gap:'16px' }}>
          <div>
            <label className="form-label">Email Address</label>
            <input
              id="email-input"
              className="form-input"
              type="email"
              placeholder="you@cocs.com"
              value={email}
              onChange={e => setEmail(e.target.value)}
              autoComplete="email"
            />
          </div>
          <div>
            <label className="form-label">Password</label>
            <div style={{ position:'relative' }}>
              <input
                id="password-input"
                className="form-input"
                type={showPass ? 'text' : 'password'}
                placeholder="Enter password"
                value={password}
                onChange={e => setPassword(e.target.value)}
                style={{ paddingRight:'48px' }}
                autoComplete="current-password"
              />
              <button type="button" onClick={() => setShowPass(!showPass)} style={{
                position:'absolute', right:'14px', top:'50%', transform:'translateY(-50%)',
                background:'none', border:'none', cursor:'pointer', color:'#94a3b8'
              }}>
                {showPass ? <EyeOff size={18} /> : <Eye size={18} />}
              </button>
            </div>
          </div>

          <button id="login-btn" type="submit" className="btn btn-primary" disabled={loading} style={{ marginTop:'4px' }}>
            {loading ? 'Signing in…' : <><LogIn size={18} /> Sign In</>}
          </button>
        </form>

        {/* Demo accounts */}
        <div style={{ marginTop:'24px', padding:'16px', background:'#f8fafc', borderRadius:'12px', border:'1px solid #e2e8f0' }}>
          <p style={{ margin:'0 0 10px', fontSize:'0.78rem', fontWeight:700, color:'#64748b', textTransform:'uppercase', letterSpacing:'0.05em' }}>
            Demo Accounts (password: password123)
          </p>
          <div style={{ display:'flex', gap:'8px', flexWrap:'wrap' }}>
            {demoAccounts.map(a => (
              <button key={a.email} onClick={() => { setEmail(a.email); setPassword('password123') }}
                style={{
                  padding:'6px 12px', borderRadius:'8px', border:'1px solid #e2e8f0',
                  background:'white', fontSize:'0.8rem', fontWeight:600, cursor:'pointer',
                  color:'#475569',
                }}>
                {a.label}
              </button>
            ))}
          </div>
        </div>
      </div>

      <p style={{ color:'rgba(255,255,255,0.5)', marginTop:'24px', fontSize:'0.75rem' }}>
        © 2024 Campus Operations Control System
      </p>
    </div>
  )
}
