import { useAuth } from '../context/AuthContext'
import { Link } from 'react-router-dom'
import { PlusCircle, AlertTriangle, ClipboardList, CheckSquare, BarChart2, Search, ArrowRight } from 'lucide-react'

const ActionButton = ({ to, icon, label, color, sublabel }) => (
  <Link to={to} style={{ textDecoration: 'none', display: 'block' }}>
    <div className="card" style={{ 
      padding: '16px', display: 'flex', alignItems: 'center', gap: '16px',
      background: 'white', border: '1px solid #f1f5f9'
    }}>
      <div style={{ 
        width: 48, height: 48, borderRadius: '12px', 
        background: `${color}12`, color: color,
        display: 'flex', alignItems: 'center', justifyContent: 'center',
        flexShrink: 0
      }}>
        {icon}
      </div>
      <div style={{ flex: 1 }}>
        <div style={{ fontWeight: 800, fontSize: '1rem', color: '#1e293b' }}>{label}</div>
        <div style={{ fontSize: '0.75rem', color: '#64748b', fontWeight: 500 }}>{sublabel}</div>
      </div>
      <ArrowRight size={18} color="#cbd5e1" />
    </div>
  </Link>
)

export default function HomePage() {
  const { user, isAdmin } = useAuth()
  const greeting = new Date().getHours() < 12 ? 'Good Morning' : new Date().getHours() < 17 ? 'Good Afternoon' : 'Good Evening'

  return (
    <div className="page fade-in">
      {/* Header Profile */}
      <div style={{ 
        display: 'flex', alignItems: 'center', justifyContent: 'space-between', 
        marginBottom: '24px', padding: '4px 0' 
      }}>
        <div>
          <div style={{ fontSize: '0.85rem', color: '#64748b', fontWeight: 600 }}>{greeting}</div>
          <h1 style={{ margin: 0, fontSize: '1.6rem', fontWeight: 900, color: '#0f172a' }}>{user?.name?.split(' ')[0]}</h1>
        </div>
        <div style={{ 
          width: 52, height: 52, borderRadius: '50%', background: 'linear-gradient(135deg, var(--primary), var(--secondary))',
          display: 'flex', alignItems: 'center', justifyContent: 'center', color: 'white',
          fontWeight: 800, fontSize: '1.2rem', boxShadow: '0 4px 12px rgba(37, 99, 235, 0.2)'
        }}>
          {user?.name?.[0]}
        </div>
      </div>

      {/* Role Banner */}
      <div style={{ 
        background: 'white', padding: '16px', borderRadius: '18px', 
        border: '1px solid #f1f5f9', boxShadow: 'var(--shadow)',
        marginBottom: '28px', display: 'flex', alignItems: 'center', gap: '12px'
      }}>
        <div style={{ 
          padding: '8px 12px', borderRadius: '10px', background: 'var(--primary-light)', 
          color: 'var(--primary)', fontWeight: 800, fontSize: '0.75rem', textTransform: 'uppercase'
        }}>
          {user?.role}
        </div>
        <div style={{ height: '16px', width: '1px', background: '#e2e8f0' }} />
        <div style={{ fontSize: '0.85rem', color: '#475569', fontWeight: 600 }}>
          {user?.department_name || 'Global Operations'}
        </div>
      </div>

      {/* Main Actions */}
      <div style={{ display: 'flex', flexDirection: 'column', gap: '12px', marginBottom: '32px' }}>
        <h2 style={{ fontSize: '0.75rem', fontWeight: 800, color: '#94a3b8', textTransform: 'uppercase', letterSpacing: '0.05em', marginBottom: '4px' }}>
          Quick Actions
        </h2>
        <ActionButton 
          to="/work/new" 
          icon={<PlusCircle size={24} />} 
          label="Update Daily Work" 
          sublabel="Submit progress for today"
          color="#2563eb"
        />
        <ActionButton 
          to="/issue/new" 
          icon={<AlertTriangle size={24} />} 
          label="Report Issue" 
          sublabel="Raise a concern or maintenance task"
          color="#dc2626"
        />
        <ActionButton 
          to="/my-tasks" 
          icon={<ClipboardList size={24} />} 
          label="My Task History" 
          sublabel="Track your recent submissions"
          color="#16a34a"
        />
      </div>

      {/* Admin/Manager Specific */}
      <div style={{ display: 'flex', flexDirection: 'column', gap: '12px', marginBottom: '32px' }}>
        <h2 style={{ fontSize: '0.75rem', fontWeight: 800, color: '#94a3b8', textTransform: 'uppercase', letterSpacing: '0.05em', marginBottom: '4px' }}>
          Operations Center
        </h2>
        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '12px' }}>
          <Link to="/dashboard" style={{ textDecoration:'none' }}>
            <div className="card" style={{ padding:'20px', textAlign:'center' }}>
              <BarChart2 size={24} color="#0891b2" style={{ marginBottom:'8px' }} />
              <div style={{ fontWeight:800, fontSize:'0.9rem', color:'#1e293b' }}>Live Status</div>
            </div>
          </Link>
          <Link to="/issues" style={{ textDecoration:'none' }}>
            <div className="card" style={{ padding:'20px', textAlign:'center' }}>
              <AlertTriangle size={24} color="#f59e0b" style={{ marginBottom:'8px' }} />
              <div style={{ fontWeight:800, fontSize:'0.9rem', color:'#1e293b' }}>Issues</div>
            </div>
          </Link>
          {isAdmin && (
            <Link to="/verify" style={{ textDecoration:'none' }}>
              <div className="card" style={{ padding:'20px', textAlign:'center' }}>
                <CheckSquare size={24} color="#7c3aed" style={{ marginBottom:'8px' }} />
                <div style={{ fontWeight:800, fontSize:'0.9rem', color:'#1e293b' }}>Verify Work</div>
              </div>
            </Link>
          )}
          {isAdmin && (
            <Link to="/audit/new" style={{ textDecoration:'none' }}>
              <div className="card" style={{ padding:'20px', textAlign:'center' }}>
                <Search size={24} color="#d97706" style={{ marginBottom:'8px' }} />
                <div style={{ fontWeight:800, fontSize:'0.9rem', color:'#1e293b' }}>Official Audit</div>
              </div>
            </Link>
          )}
        </div>
      </div>

      {/* Daily Quote/Tip */}
      <div style={{ 
        padding: '20px', borderRadius: '24px', background: 'linear-gradient(135deg, #f1f5f9, #f8fafc)',
        border: '1px solid #e2e8f0', marginBottom: '20px'
      }}>
        <div style={{ fontSize: '0.8rem', color: '#64748b', fontWeight: 700, marginBottom: '8px', display: 'flex', alignItems: 'center', gap: '6px' }}>
          💡 Operations Tip
        </div>
        <p style={{ margin: 0, fontSize: '0.9rem', color: '#334155', fontWeight: 500, lineHeight: 1.5 }}>
          Consistent reporting is the key to institutional excellence. Make sure to capture clear photos for all work updates.
        </p>
      </div>
    </div>
  )
}
