import { useState, useEffect } from 'react'
import { supabase } from '../utils/supabaseClient'
import { useAuth } from '../context/AuthContext'
import { Bell, Check, X, Info, AlertTriangle } from 'lucide-react'
import { useNavigate } from 'react-router-dom'

export default function NotificationsCenter({ isOpen, onClose }) {
  const { user } = useAuth()
  const navigate = useNavigate()
  const [notifs, setNotifs] = useState([])
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    if (isOpen && user) {
      loadNotifs()
    }
  }, [isOpen, user])

  const loadNotifs = async () => {
    setLoading(true)
    const { data } = await supabase
      .from('notifications')
      .select('*')
      .eq('user_id', user.id)
      .order('created_at', { ascending: false })
      .limit(20)
    setNotifs(data || [])
    setLoading(false)
  }

  const markRead = async (notification) => {
    await supabase.from('notifications').update({ read: true }).eq('id', notification.id)
    setNotifs(notifs.map(n => n.id === notification.id ? { ...n, read: true } : n))
    
    // NAVIGATION LOGIC
    if (notification.entity_type === 'work' && notification.type === 'REJECTED') {
      navigate(`/work/edit/${notification.entity_id}`)
      onClose()
    } else if (notification.entity_type === 'work') {
      navigate('/my-tasks')
      onClose()
    } else if (notification.entity_type === 'issue') {
      navigate('/issues')
      onClose()
    }
  }

  if (!isOpen) return null

  return (
    <div style={{
      position: 'fixed', inset: 0, zIndex: 1000,
      background: 'rgba(0,0,0,0.4)', display: 'flex', justifyContent: 'flex-end'
    }} onClick={onClose}>
      <div style={{
        width: '100%', maxWidth: '380px', background: 'white', height: '100vh',
        boxShadow: '-4px 0 20px rgba(0,0,0,0.1)', display: 'flex', flexDirection: 'column'
      }} onClick={e => e.stopPropagation()}>
        
        <div style={{ padding: '20px', borderBottom: '1px solid #f1f5f9', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
          <h2 style={{ margin: 0, fontSize: '1.2rem', fontWeight: 800 }}>Notifications</h2>
          <button onClick={onClose} className="btn-icon"><X size={20} /></button>
        </div>

        <div style={{ flex: 1, overflowY: 'auto', padding: '10px' }}>
          {loading ? (
            <p style={{ textAlign: 'center', color: '#94a3b8', marginTop: '20px' }}>Loading notifications…</p>
          ) : notifs.length === 0 ? (
            <div style={{ textAlign: 'center', padding: '40px 20px', color: '#94a3b8' }}>
              <Bell size={48} style={{ opacity: 0.2, marginBottom: '12px' }} />
              <p>No new updates</p>
            </div>
          ) : (
            notifs.map(n => (
              <div key={n.id} onClick={() => markRead(n)} style={{
                padding: '16px', borderRadius: '14px', marginBottom: '8px',
                background: n.read ? 'white' : '#eff6ff',
                border: '1px solid', borderColor: n.read ? '#f1f5f9' : '#dbeafe',
                cursor: 'pointer', transition: 'all 0.2s'
              }}>
                <div style={{ display: 'flex', gap: '12px' }}>
                  <div style={{ 
                    width: '32px', height: '32px', borderRadius: '8px', 
                    background: n.type === 'REJECTED' ? '#fee2e2' : n.type === 'SLA' ? '#fff7ed' : '#dcfce7',
                    display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0
                  }}>
                    {n.type === 'REJECTED' ? <AlertTriangle size={16} color="#dc2626" /> : <Info size={16} color="#2563eb" />}
                  </div>
                  <div style={{ flex: 1 }}>
                    <div style={{ fontSize: '0.9rem', fontWeight: 700, color: '#1e293b' }}>{n.title}</div>
                    <div style={{ fontSize: '0.8rem', color: '#64748b', marginTop: '2px' }}>{n.message}</div>
                    <div style={{ fontSize: '0.7rem', color: '#94a3b8', marginTop: '6px' }}>{new Date(n.created_at).toLocaleTimeString()}</div>
                  </div>
                  {!n.read && <div style={{ width: '8px', height: '8px', borderRadius: '50%', background: '#2563eb' }} />}
                </div>
              </div>
            ))
          )}
        </div>
      </div>
    </div>
  )
}
