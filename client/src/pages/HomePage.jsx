import { useAuth } from '../context/AuthContext'
import { Link } from 'react-router-dom'
import { PlusCircle, AlertTriangle, ClipboardList, CheckSquare, BarChart2, Search } from 'lucide-react'

const HomeCard = ({ to, icon, label, sublabel, color, bg }) => (
  <Link to={to} style={{ textDecoration: 'none' }}>
    <div style={{
      background: bg || 'white',
      borderRadius: '20px',
      padding: '24px 20px',
      display: 'flex', flexDirection: 'column', alignItems: 'center', gap: '12px',
      border: `2px solid ${color}22`,
      boxShadow: `0 4px 16px ${color}18`,
      transition: 'transform 0.15s ease, box-shadow 0.15s ease',
      cursor: 'pointer',
      minHeight: '140px',
      justifyContent: 'center',
    }}
      onMouseEnter={e => { e.currentTarget.style.transform='scale(1.03)'; e.currentTarget.style.boxShadow=`0 8px 24px ${color}30` }}
      onMouseLeave={e => { e.currentTarget.style.transform='scale(1)'; e.currentTarget.style.boxShadow=`0 4px 16px ${color}18` }}
    >
      <div style={{
        width: 56, height: 56, borderRadius: '16px',
        background: `${color}18`, display: 'flex', alignItems: 'center', justifyContent: 'center',
        color: color,
      }}>
        {icon}
      </div>
      <div style={{ textAlign: 'center' }}>
        <div style={{ fontWeight: 700, fontSize: '1rem', color: '#1e293b' }}>{label}</div>
        {sublabel && <div style={{ fontSize: '0.78rem', color: '#94a3b8', marginTop: '2px' }}>{sublabel}</div>}
      </div>
    </div>
  </Link>
)

export default function HomePage() {
  const { user } = useAuth()

  const roleColor = user?.role === 'Admin' ? '#7c3aed' : '#0891b2'
  const greeting = new Date().getHours() < 12 ? 'Good Morning' : new Date().getHours() < 17 ? 'Good Afternoon' : 'Good Evening'

  return (
    <div className="page fade-in">
      {/* Greeting */}
      <div style={{
        background: 'linear-gradient(135deg, #2563eb, #7c3aed)',
        borderRadius: '20px',
        padding: '24px',
        color: 'white',
        marginBottom: '24px',
        position: 'relative',
        overflow: 'hidden',
      }}>
        <div style={{
          position: 'absolute', right: '-20px', top: '-20px',
          width: '120px', height: '120px', borderRadius: '50%',
          background: 'rgba(255,255,255,0.08)',
        }} />
        <div style={{ fontSize: '0.85rem', opacity: 0.8, marginBottom: '4px' }}>{greeting} 👋</div>
        <div style={{ fontSize: '1.4rem', fontWeight: 800 }}>{user?.name}</div>
        <div style={{
          display: 'inline-flex', alignItems: 'center', marginTop: '8px',
          background: 'rgba(255,255,255,0.2)', borderRadius: '999px',
          padding: '4px 12px', fontSize: '0.78rem', fontWeight: 700,
        }}>
          {user?.role} • {user?.department_name || 'All Departments'}
        </div>
        <div style={{ marginTop: '8px', fontSize: '0.82rem', opacity: 0.75 }}>
          📅 {new Date().toLocaleDateString('en-IN', { weekday: 'long', year: 'numeric', month: 'long', day: 'numeric' })}
        </div>
      </div>

      {/* Action Cards */}
      <div style={{ marginBottom: '12px' }}>
        <h2 style={{ margin: '0 0 16px', fontSize: '1rem', fontWeight: 700, color: '#64748b', textTransform: 'uppercase', letterSpacing: '0.05em' }}>
          What do you want to do?
        </h2>
        <div className="card-grid">
          <HomeCard
            to="/work/new"
            icon={<PlusCircle size={28} />}
            label="Update Work"
            sublabel="Submit today's work"
            color="#2563eb"
          />
          <HomeCard
            to="/issue/new"
            icon={<AlertTriangle size={28} />}
            label="Report Issue"
            sublabel="Report a problem"
            color="#dc2626"
          />
          <HomeCard
            to="/my-tasks"
            icon={<ClipboardList size={28} />}
            label="My Tasks"
            sublabel="View your updates"
            color="#16a34a"
          />
          {(user?.role === 'Manager' || user?.role === 'Admin') && (
            <HomeCard
              to="/verify"
              icon={<CheckSquare size={28} />}
              label="Verify Work"
              sublabel="Approve or reject"
              color="#0891b2"
            />
          )}
          {user?.role === 'Admin' && (
            <HomeCard
              to="/dashboard"
              icon={<BarChart2 size={28} />}
              label="Dashboard"
              sublabel="View all stats"
              color="#7c3aed"
            />
          )}
          {user?.role === 'Admin' && (
            <HomeCard
              to="/audit/new"
              icon={<Search size={28} />}
              label="New Audit"
              sublabel="Conduct an audit"
              color="#d97706"
            />
          )}
        </div>
      </div>

      {/* Quick tips */}
      <div style={{
        marginTop: '24px', padding: '16px', background: '#fffbeb',
        borderRadius: '14px', border: '1px solid #fde68a'
      }}>
        <div style={{ fontWeight: 700, fontSize: '0.85rem', color: '#92400e', marginBottom: '6px' }}>💡 Tips</div>
        <ul style={{ margin: 0, paddingLeft: '18px', color: '#78350f', fontSize: '0.82rem', lineHeight: '1.8' }}>
          <li>Take a clear photo when submitting work updates</li>
          <li>Report issues immediately for faster resolution</li>
          <li>Verify your team's work daily</li>
        </ul>
      </div>
    </div>
  )
}
