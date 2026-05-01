import { useState, useEffect } from 'react'
import { supabase } from '../utils/supabaseClient'
import { useAuth } from '../context/AuthContext'
import toast from 'react-hot-toast'
import { 
  AlertTriangle, Clock, User, CheckCircle, 
  ArrowRight, Filter, Search, Play, Check 
} from 'lucide-react'

function IssueCard({ issue, onUpdate }) {
  const { user, isAdmin } = useAuth()
  const [loading, setLoading] = useState(false)
  const [managers, setManagers] = useState([])
  const [showAssign, setShowAssign] = useState(false)

  const isAssignedToMe = issue.assigned_to === user?.id
  const canUpdate = isAdmin || isAssignedToMe

  const updateStatus = async (newStatus) => {
    setLoading(true)
    try {
      const updates = { lifecycle_status: newStatus }
      if (newStatus === 'RESOLVED') updates.resolved_at = new Date().toISOString()
      if (newStatus === 'CLOSED') updates.closed_at = new Date().toISOString()

      const { error } = await supabase.from('issues').update(updates).eq('id', issue.id)
      if (error) throw error
      
      await supabase.from('activity_log').insert([{
        user_id: user.id,
        action_type: newStatus,
        entity_type: 'issue',
        entity_id: issue.id,
        detail: `Issue moved to ${newStatus}`
      }])

      toast.success(`Issue marked as ${newStatus}`)
      onUpdate()
    } catch (err) {
      toast.error('Failed to update issue')
    } finally { setLoading(false) }
  }

  const assignTo = async (managerId) => {
    setLoading(true)
    try {
      const { error } = await supabase.from('issues').update({ 
        assigned_to: managerId,
        lifecycle_status: 'ASSIGNED'
      }).eq('id', issue.id)
      
      if (error) throw error

      // Notify the manager
      await supabase.from('notifications').insert([{
        user_id: managerId,
        type: 'ASSIGNED',
        title: 'New Issue Assigned',
        message: `You have been assigned to resolve: ${issue.issue_type}`,
        entity_type: 'issue',
        entity_id: issue.id
      }])

      toast.success('Issue assigned!')
      setShowAssign(false)
      onUpdate()
    } catch (err) { toast.error('Assignment failed') }
    finally { setLoading(false) }
  }

  const fetchManagers = async () => {
    const { data } = await supabase.from('profiles').select('id, name').eq('role', 'Manager')
    setManagers(data || [])
    setShowAssign(true)
  }

  const isOverdue = issue.due_at && new Date(issue.due_at) < new Date() && issue.lifecycle_status !== 'CLOSED'

  return (
    <div className="card" style={{ padding:'20px', marginBottom:'16px', borderLeft: `4px solid ${isOverdue ? '#dc2626' : '#2563eb'}` }}>
      <div style={{ display:'flex', justifyContent:'space-between', alignItems:'flex-start' }}>
        <div>
          <div style={{ display:'flex', alignItems:'center', gap:'8px' }}>
            <span style={{ fontWeight:800, fontSize:'1.1rem' }}>{issue.issue_type}</span>
            <span style={{ 
              fontSize:'0.65rem', padding:'2px 8px', borderRadius:'999px', 
              background: issue.priority === 'High' ? '#fee2e2' : '#f1f5f9',
              color: issue.priority === 'High' ? '#dc2626' : '#64748b',
              fontWeight: 800
            }}>{issue.priority.toUpperCase()}</span>
          </div>
          <div style={{ fontSize:'0.85rem', color:'#64748b', marginTop:'4px' }}>
            📍 {issue.locations?.name || 'Unknown Location'} • Reported by {issue.profiles?.name}
          </div>
        </div>
        <div style={{ textAlign:'right' }}>
          <div style={{ fontSize:'0.7rem', fontWeight:800, color: isOverdue ? '#dc2626' : '#94a3b8' }}>
            {isOverdue ? '⚠️ OVERDUE' : 'SLA DUE'}
          </div>
          <div style={{ fontSize:'0.8rem', fontWeight:700 }}>
            {new Date(issue.due_at).toLocaleString([], { hour:'2-digit', minute:'2-digit', day:'numeric', month:'short' })}
          </div>
        </div>
      </div>

      <p style={{ margin:'16px 0', fontSize:'0.9rem', color:'#475569' }}>{issue.description}</p>

      <div style={{ display:'flex', alignItems:'center', gap:'12px', marginBottom:'16px' }}>
        <div style={{ fontSize:'0.8rem', background:'#f8fafc', padding:'6px 12px', borderRadius:'8px', border:'1px solid #e2e8f0' }}>
          Status: <strong>{issue.lifecycle_status}</strong>
        </div>
        <div style={{ fontSize:'0.8rem', color:'#64748b' }}>
          👤 {issue.assigned_to_profile?.name || 'Unassigned'}
        </div>
      </div>

      <div style={{ display:'flex', gap:'8px', flexWrap:'wrap' }}>
        {isAdmin && issue.lifecycle_status === 'OPEN' && !showAssign && (
          <button onClick={fetchManagers} className="btn btn-primary" style={{ padding:'8px 16px', fontSize:'0.85rem' }}>
            <User size={16} /> Assign Manager
          </button>
        )}

        {showAssign && (
          <div style={{ width:'100%', padding:'12px', background:'#f1f5f9', borderRadius:'12px' }}>
            <div style={{ fontSize:'0.8rem', fontWeight:700, marginBottom:'8px' }}>Assign to:</div>
            <div style={{ display:'flex', gap:'8px', flexWrap:'wrap' }}>
              {managers.map(m => (
                <button key={m.id} onClick={() => assignTo(m.id)} className="badge" style={{ cursor:'pointer', border:'none' }}>{m.name}</button>
              ))}
              <button onClick={() => setShowAssign(false)} style={{ border:'none', background:'none', color:'#dc2626', fontSize:'0.8rem' }}>Cancel</button>
            </div>
          </div>
        )}

        {canUpdate && issue.lifecycle_status === 'ASSIGNED' && (
          <button onClick={() => updateStatus('IN_PROGRESS')} className="btn btn-primary" style={{ padding:'8px 16px', fontSize:'0.85rem', background:'#7c3aed' }}>
            <Play size={16} /> Start Working
          </button>
        )}

        {canUpdate && issue.lifecycle_status === 'IN_PROGRESS' && (
          <button onClick={() => updateStatus('RESOLVED')} className="btn btn-primary" style={{ padding:'8px 16px', fontSize:'0.85rem', background:'#16a34a' }}>
            <Check size={16} /> Mark Resolved
          </button>
        )}

        {isAdmin && issue.lifecycle_status === 'RESOLVED' && (
          <button onClick={() => updateStatus('CLOSED')} className="btn btn-primary" style={{ padding:'8px 16px', fontSize:'0.85rem', background:'#1e293b' }}>
            <CheckCircle size={16} /> Verify & Close
          </button>
        )}
      </div>
    </div>
  )
}

export default function IssuesPage() {
  const { user, isAdmin } = useAuth()
  const [issues, setIssues] = useState([])
  const [loading, setLoading] = useState(true)
  const [filter, setFilter] = useState('ALL')

  const loadIssues = async () => {
    setLoading(true)
    let query = supabase
      .from('issues')
      .select(`*, profiles!reported_by(name), locations(name), assigned_to_profile:profiles!assigned_to(name)`)
      .order('due_at', { ascending: true })

    if (filter === 'MINE' && !isAdmin) {
      query = query.eq('assigned_to', user.id)
    } else if (filter === 'OPEN') {
      query = query.neq('lifecycle_status', 'CLOSED')
    }

    const { data } = await query
    setIssues(data || [])
    setLoading(false)
  }

  useEffect(() => { loadIssues() }, [filter])

  return (
    <div className="page fade-in">
      <div style={{ marginBottom:'24px' }}>
        <h1 style={{ margin:0, fontSize:'1.8rem', fontWeight:800 }}>🚨 Issue Command</h1>
        <p style={{ margin:'4px 0 0', color:'#64748b' }}>Manage campus-wide incidents and SLAs</p>
      </div>

      <div style={{ display:'flex', gap:'8px', marginBottom:'24px', overflowX:'auto', paddingBottom:'4px' }}>
        <button onClick={() => setFilter('ALL')} className={`badge ${filter==='ALL'?'badge-blue':''}`} style={{ cursor:'pointer' }}>All Issues</button>
        <button onClick={() => setFilter('OPEN')} className={`badge ${filter==='OPEN'?'badge-yellow':''}`} style={{ cursor:'pointer' }}>Pending Resolution</button>
        {!isAdmin && <button onClick={() => setFilter('MINE')} className={`badge ${filter==='MINE'?'badge-green':''}`} style={{ cursor:'pointer' }}>Assigned to Me</button>}
      </div>

      {loading ? (
        <div className="skeleton" style={{ height:'200px', borderRadius:'20px' }} />
      ) : issues.length === 0 ? (
        <div style={{ textAlign:'center', padding:'60px' }}>
          <CheckCircle size={48} color="#16a34a" style={{ opacity:0.3, marginBottom:'12px' }} />
          <p style={{ color:'#94a3b8' }}>No issues found matching filters.</p>
        </div>
      ) : (
        issues.map(issue => <IssueCard key={issue.id} issue={issue} onUpdate={loadIssues} />)
      )}
    </div>
  )
}
