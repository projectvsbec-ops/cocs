import { Link, useLocation, useNavigate } from 'react-router-dom'
import { useAuth } from '../context/AuthContext'
import { Home, ClipboardList, CheckSquare, BarChart2, LogOut, Menu, X, Bell, AlertTriangle } from 'lucide-react'
import { useState, useEffect } from 'react'
import NotificationsCenter from './NotificationsCenter'
import { supabase } from '../utils/supabaseClient'

export default function Navbar() {
  const { user, logout } = useAuth()
  const location = useLocation()
  const navigate = useNavigate()
  const [menuOpen, setMenuOpen] = useState(false)
  const [notifOpen, setNotifOpen] = useState(false)
  const [unreadCount, setUnreadCount] = useState(0)

  useEffect(() => {
    if (user) {
      const fetchUnread = async () => {
        const { count } = await supabase.from('notifications').select('*', { count: 'exact', head: true }).eq('user_id', user.id).eq('read', false)
        setUnreadCount(count || 0)
      }
      fetchUnread()
      
      const channel = supabase.channel('notifs').on('postgres_changes', { event: 'INSERT', schema: 'public', table: 'notifications' }, fetchUnread).subscribe()
      return () => supabase.removeChannel(channel)
    }
  }, [user])

  const handleLogout = () => {
    logout()
    navigate('/login')
    setMenuOpen(false)
  }

  const roleColor = user?.role === 'Admin' ? 'var(--secondary)' : 'var(--accent)'

  const links = [
    { to: '/',          icon: <Home size={22} />,         label: 'Home',      roles: ['Admin','Manager'] },
    { to: '/my-tasks',  icon: <ClipboardList size={22} />,label: 'Tasks',     roles: ['Admin','Manager'] },
    { to: '/verify',    icon: <CheckSquare size={22} />,  label: 'Verify',    roles: ['Manager','Admin'] },
    { to: '/dashboard', icon: <BarChart2 size={22} />,    label: 'Dashboard', roles: ['Admin','Manager'] },
    { to: '/issues',    icon: <AlertTriangle size={22} />, label: 'Issues',    roles: ['Admin','Manager'] },
  ].filter(l => l.roles.includes(user?.role))

  const isActive = (to) => location.pathname === to

  return (
    <>
      {/* ── TOP NAVBAR ── */}
      <nav style={{
        position: 'sticky', top: 0, zIndex: 100,
        height: '64px', background: 'rgba(255,255,255,0.85)',
        backdropFilter: 'blur(12px)', WebkitBackdropFilter: 'blur(12px)',
        borderBottom: '1px solid rgba(226, 232, 240, 0.8)',
        display: 'flex', alignItems: 'center', justifyContent: 'space-between',
        padding: '0 16px', paddingTop: 'var(--safe-top)',
      }}>
        {/* Logo */}
        <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
          <div style={{
            width: 38, height: 38, borderRadius: '12px',
            background: 'linear-gradient(135deg, var(--primary), var(--secondary))',
            display: 'flex', alignItems: 'center', justifyContent: 'center',
            color: 'white', fontWeight: 900, fontSize: '0.95rem', flexShrink: 0,
            boxShadow: '0 4px 12px rgba(37, 99, 235, 0.25)'
          }}>CO</div>
          <div>
            <div style={{ fontWeight: 800, fontSize: '0.9rem', color: '#0f172a', letterSpacing:'-0.02em' }}>COCS</div>
            <div style={{ fontSize: '0.6rem', color: '#64748b', fontWeight:700, textTransform:'uppercase' }}>Ops Control</div>
          </div>
        </div>

        {/* Right Section */}
        <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
          <button onClick={() => setNotifOpen(true)} style={{
            background: 'none', border: 'none', padding: '10px', position: 'relative', cursor: 'pointer', color: '#475569'
          }}>
            <Bell size={22} />
            {unreadCount > 0 && (
              <div style={{
                position: 'absolute', top: 8, right: 8, background: 'var(--danger)', color: 'white',
                fontSize: '0.6rem', fontWeight: 900, width: 18, height: 18, borderRadius: '50%',
                display: 'flex', alignItems: 'center', justifyContent: 'center', border: '2px solid white'
              }}>
                {unreadCount > 9 ? '9+' : unreadCount}
              </div>
            )}
          </button>

          <button
            onClick={() => setMenuOpen(!menuOpen)}
            style={{
              background: menuOpen ? 'var(--primary-light)' : '#f8fafc',
              border: 'none', borderRadius: '12px',
              width: 42, height: 42, display: 'flex', alignItems: 'center', justifyContent: 'center',
              cursor: 'pointer', color: menuOpen ? 'var(--primary)' : '#475569',
              transition: 'all 0.2s'
            }}>
            {menuOpen ? <X size={22} /> : <Menu size={22} />}
          </button>
        </div>
      </nav>

      {/* ── MOBILE MENU OVERLAY ── */}
      {menuOpen && (
        <div className="overlay" onClick={() => setMenuOpen(false)} style={{ top: '64px', background: 'rgba(15, 23, 42, 0.6)' }}>
          <div
            onClick={e => e.stopPropagation()}
            style={{
              background: 'white', position: 'absolute', top: 0, left: 0, right: 0,
              padding: '16px', borderRadius: '0 0 32px 32px',
              boxShadow: '0 20px 40px rgba(0,0,0,0.1)',
              animation: 'fadeInUp 0.3s ease-out'
            }}>
            <div style={{ display:'flex', alignItems:'center', gap:'12px', padding:'0 8px 16px', borderBottom:'1px solid #f1f5f9', marginBottom:'12px' }}>
              <div style={{ width:44, height:44, borderRadius:'50%', background:'#f1f5f9', display:'flex', alignItems:'center', justifyContent:'center', fontSize:'1.2rem' }}>👤</div>
              <div>
                <div style={{ fontWeight:800, fontSize:'1rem', color:'#1e293b' }}>{user?.name}</div>
                <div style={{ fontSize:'0.7rem', fontWeight:800, color:roleColor, textTransform:'uppercase' }}>{user?.role}</div>
              </div>
            </div>

            {links.map(l => (
              <Link key={l.to} to={l.to} onClick={() => setMenuOpen(false)} style={{
                display: 'flex', alignItems: 'center', gap: '14px',
                padding: '16px', borderRadius: '16px', textDecoration: 'none',
                fontWeight: 700, fontSize: '1rem', marginBottom: '4px',
                background: isActive(l.to) ? 'var(--primary-light)' : 'transparent',
                color: isActive(l.to) ? 'var(--primary)' : '#475569',
                transition: 'all 0.2s'
              }}>
                <span style={{ opacity: isActive(l.to) ? 1 : 0.6 }}>{l.icon}</span> {l.label}
              </Link>
            ))}

            <button onClick={handleLogout} style={{
              display: 'flex', alignItems: 'center', gap: '14px',
              padding: '16px', borderRadius: '16px', marginTop: '12px',
              fontWeight: 700, fontSize: '1rem', cursor: 'pointer',
              background: '#fff1f2', color: 'var(--danger)', border: 'none',
              width: '100%', transition: 'all 0.2s'
            }}>
              <LogOut size={20} /> Logout Account
            </button>
          </div>
        </div>
      )}

      {/* ── BOTTOM TAB BAR ── */}
      <div style={{
        position: 'fixed', bottom: 0, left: 0, right: 0, zIndex: 98,
        background: 'rgba(255,255,255,0.9)', backdropFilter: 'blur(16px)',
        borderTop: '1px solid rgba(226, 232, 240, 0.8)',
        display: 'flex', paddingBottom: 'var(--safe-bottom)',
        height: 'calc(65px + var(--safe-bottom))'
      }}>
        {links.map(l => (
          <Link key={l.to} to={l.to} className={`nav-link ${isActive(l.to) ? 'active' : ''}`} style={{
            flex: 1, display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center',
            textDecoration: 'none', transition: 'all 0.3s cubic-bezier(0.4, 0, 0.2, 1)',
            position: 'relative'
          }}>
            <div style={{ 
              transform: isActive(l.to) ? 'translateY(-2px)' : 'none',
              transition: 'transform 0.3s ease'
            }}>
              {l.icon}
            </div>
            <span style={{ fontSize:'0.65rem', marginTop:'2px' }}>{l.label}</span>
            {isActive(l.to) && (
              <div style={{
                position:'absolute', top:0, width:'24px', height:'3px', 
                background:'var(--primary)', borderRadius:'0 0 4px 4px'
              }} />
            )}
          </Link>
        ))}
      </div>

      <NotificationsCenter isOpen={notifOpen} onClose={() => setNotifOpen(false)} />
    </>
  )
}
