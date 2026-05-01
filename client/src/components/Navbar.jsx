import { Link, useLocation, useNavigate } from 'react-router-dom'
import { useAuth } from '../context/AuthContext'
import { Home, ClipboardList, CheckSquare, BarChart2, LogOut, Menu, X, Bell } from 'lucide-react'
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

  const roleColor = user?.role === 'Admin' ? '#7c3aed' : '#0891b2'

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
        position: 'sticky',
        top: 0,
        zIndex: 100,
        height: '60px',
        background: 'white',
        borderBottom: '1px solid #e2e8f0',
        boxShadow: '0 2px 8px rgba(0,0,0,0.06)',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'space-between',
        padding: '0 16px',
        paddingTop: 'env(safe-area-inset-top, 0px)',
      }}>
        {/* Logo */}
        <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
          <div style={{
            width: 36, height: 36, borderRadius: '10px',
            background: 'linear-gradient(135deg, #2563eb, #7c3aed)',
            display: 'flex', alignItems: 'center', justifyContent: 'center',
            color: 'white', fontWeight: 800, fontSize: '0.9rem', flexShrink: 0,
          }}>CO</div>
          <div>
            <div style={{ fontWeight: 700, fontSize: '0.9rem', color: '#1e293b', lineHeight: 1.1 }}>COCS</div>
            <div style={{ fontSize: '0.65rem', color: '#94a3b8', lineHeight: 1.1 }}>Campus Operations</div>
          </div>
        </div>

        {/* Right: user info + hamburger */}
        <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
          
          <button onClick={() => setNotifOpen(true)} style={{
            background: 'none', border: 'none', padding: '8px', position: 'relative', cursor: 'pointer', color: '#64748b'
          }}>
            <Bell size={22} />
            {unreadCount > 0 && (
              <div style={{
                position: 'absolute', top: 6, right: 6, background: '#dc2626', color: 'white',
                fontSize: '0.6rem', fontWeight: 800, width: 16, height: 16, borderRadius: '50%',
                display: 'flex', alignItems: 'center', justifyContent: 'center', border: '2px solid white'
              }}>
                {unreadCount}
              </div>
            )}
          </button>

          <div style={{ textAlign: 'right' }}>
            <div style={{ fontWeight: 600, fontSize: '0.82rem', color: '#1e293b', maxWidth: '120px', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
              {user?.name}
            </div>
            <div style={{ fontSize: '0.65rem', fontWeight: 700, color: roleColor, textTransform: 'uppercase', letterSpacing: '0.05em' }}>
              {user?.role}
            </div>
          </div>
          <button
            id="hamburger-btn"
            onClick={() => setMenuOpen(!menuOpen)}
            aria-label="Open menu"
            style={{
              background: menuOpen ? '#eff6ff' : '#f1f5f9',
              border: 'none', borderRadius: '10px',
              width: 40, height: 40, minWidth: 40,
              display: 'flex', alignItems: 'center', justifyContent: 'center',
              cursor: 'pointer', color: '#475569',
            }}>
            {menuOpen ? <X size={20} /> : <Menu size={20} />}
          </button>
        </div>
      </nav>

      {/* ── SLIDE-DOWN MENU OVERLAY ── */}
      {menuOpen && (
        <div
          onClick={() => setMenuOpen(false)}
          style={{
            position: 'fixed', inset: 0, top: '60px',
            background: 'rgba(0,0,0,0.45)', zIndex: 99,
          }}>
          <div
            onClick={e => e.stopPropagation()}
            style={{
              background: 'white',
              padding: '12px',
              borderRadius: '0 0 20px 20px',
              boxShadow: '0 8px 24px rgba(0,0,0,0.12)',
            }}>
            {links.map(l => (
              <Link key={l.to} to={l.to} onClick={() => setMenuOpen(false)} style={{
                display: 'flex', alignItems: 'center', gap: '14px',
                padding: '14px 16px', borderRadius: '12px', textDecoration: 'none',
                fontWeight: 600, fontSize: '1rem', marginBottom: '4px',
                background: isActive(l.to) ? '#eff6ff' : 'transparent',
                color: isActive(l.to) ? '#2563eb' : '#475569',
              }}>
                {l.icon} {l.label}
              </Link>
            ))}

            <div style={{ height: '1px', background: '#f1f5f9', margin: '8px 0' }} />

            <button
              id="logout-btn"
              onClick={handleLogout}
              style={{
                display: 'flex', alignItems: 'center', gap: '14px',
                padding: '14px 16px', borderRadius: '12px',
                fontWeight: 600, fontSize: '1rem', cursor: 'pointer',
                background: '#fee2e2', color: '#dc2626', border: 'none',
                width: '100%',
              }}>
              <LogOut size={20} /> Logout
            </button>

            <div style={{ height: '4px' }} />
          </div>
        </div>
      )}

      {/* ── BOTTOM TAB BAR ── */}
      <div style={{
        position: 'fixed',
        bottom: 0, left: 0, right: 0,
        zIndex: 98,
        background: 'white',
        borderTop: '1px solid #e2e8f0',
        boxShadow: '0 -2px 12px rgba(0,0,0,0.06)',
        display: 'flex',
        paddingBottom: 'env(safe-area-inset-bottom, 0px)',
      }}>
        {links.map(l => (
          <Link key={l.to} to={l.to} style={{
            flex: 1,
            display: 'flex',
            flexDirection: 'column',
            alignItems: 'center',
            justifyContent: 'center',
            padding: '10px 4px',
            textDecoration: 'none',
            gap: '3px',
            color: isActive(l.to) ? '#2563eb' : '#94a3b8',
            fontWeight: isActive(l.to) ? 700 : 500,
            fontSize: '0.62rem',
            textTransform: 'uppercase',
            letterSpacing: '0.03em',
            borderTop: isActive(l.to) ? '3px solid #2563eb' : '3px solid transparent',
            minWidth: 0,
          }}>
            {l.icon}
            <span style={{ overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap', maxWidth: '100%' }}>
              {l.label}
            </span>
          </Link>
        ))}
      </div>

      <NotificationsCenter isOpen={notifOpen} onClose={() => setNotifOpen(false)} />
    </>
  )
}
