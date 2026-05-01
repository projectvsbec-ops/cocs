import { useState, useEffect } from 'react'
import { supabase } from '../utils/supabaseClient'
import { useAuth } from '../context/AuthContext'
import { useNavigate } from 'react-router-dom'
import toast from 'react-hot-toast'
import { 
  RefreshCw, ClipboardList, AlertTriangle, 
  Image, Edit3, MessageSquare, UserCheck 
} from 'lucide-react'

function StatusBadge({ status }) {
  const map = {
    SUBMITTED:    { cls:'badge-yellow', label:'⏳ Submitted' },
    REJECTED:     { cls:'badge-red',    label:'❌ Rejected' },
    APPROVED:     { cls:'badge-green',  label:'✅ Approved' },
    CLOSED:       { cls:'badge-gray',   label:'✔️ Closed' },
    RESUBMITTED:  { cls:'badge-blue',   label:'🔄 Resubmitted' },
    UNDER_REVIEW: { cls:'badge-yellow', label:'🔍 Under Review' },
    OPEN:         { cls:'badge-red',    label:'🔴 Open' },
    RESOLVED:     { cls:'badge-green',  label:'✅ Resolved' },
  }
  const s = map[status] || { cls:'badge-gray', label: status }
  return <span className={`badge ${s.cls}`}>{s.label}</span>
}

function WorkCard({ item }) {
  const navigate = useNavigate()
  const [imgOpen, setImgOpen] = useState(false)
  
  return (
    <div className="card" style={{ padding:'20px', marginBottom:'16px', borderLeft: item.workflow_status === 'REJECTED' ? '4px solid #dc2626' : 'none' }}>
      <div style={{ display:'flex', justifyContent:'space-between', alignItems:'flex-start', marginBottom:'12px' }}>
        <div>
          <div style={{ fontWeight:800, fontSize:'1.1rem', color:'#1e293b' }}>{item.work_type}</div>
          <div style={{ color:'#64748b', fontSize:'0.85rem', marginTop:'4px' }}>
            📍 {item.locations?.name || 'Global'}
          </div>
        </div>
        <StatusBadge status={item.workflow_status} />
      </div>

      <div style={{ display:'flex', gap:'8px', flexWrap:'wrap', marginBottom:'12px' }}>
        {item.photo_url && (
          <button onClick={() => setImgOpen(true)} className="badge" style={{ cursor:'pointer', border:'1px solid #e2e8f0', background:'white' }}>
            <Image size={14} /> View Evidence
          </button>
        )}
      </div>

      {item.verify_comment && (
        <div style={{ 
          marginTop:'12px', padding:'12px', background:'#fff1f2', 
          borderRadius:'12px', border:'1px solid #ffe4e6' 
        }}>
          <div style={{ display:'flex', alignItems:'center', gap:'6px', color:'#be123c', fontWeight:700, fontSize:'0.8rem', marginBottom:'4px' }}>
            <MessageSquare size={14} /> Admin Feedback
          </div>
          <div style={{ fontSize:'0.9rem', color:'#9f1239' }}>{item.verify_comment}</div>
          <div style={{ marginTop:'6px', fontSize:'0.75rem', color:'#f43f5e', display:'flex', alignItems:'center', gap:'4px' }}>
            <UserCheck size={12} /> Reviewed by {item.reviewer?.name || 'Administrator'}
          </div>
        </div>
      )}

      <div style={{ display:'flex', justifyContent:'space-between', alignItems:'center', marginTop:'16px' }}>
        <div style={{ fontSize:'0.75rem', color:'#94a3b8' }}>
          {new Date(item.created_at).toLocaleString()}
        </div>
        {item.workflow_status === 'REJECTED' && (
          <button 
            onClick={() => navigate(`/work/edit/${item.id}`)}
            className="btn btn-primary" 
            style={{ width:'auto', minHeight:'40px', padding:'0 16px', fontSize:'0.85rem', background:'#dc2626' }}>
            <Edit3 size={16} /> Fix & Resubmit
          </button>
        )}
      </div>

      {imgOpen && (
        <div onClick={() => setImgOpen(false)} className="overlay">
          <img src={item.photo_url} alt="Work" style={{ maxWidth:'100%', maxHeight:'90vh', borderRadius:'16px' }} />
        </div>
      )}
    </div>
  )
}

function IssueCard({ item }) {
  const pColor = item.priority==='High'?'#dc2626':item.priority==='Medium'?'#d97706':'#16a34a'
  return (
    <div className="card" style={{ padding:'20px', marginBottom:'16px', borderLeft:`4px solid ${pColor}` }}>
      <div style={{ display:'flex', justifyContent:'space-between', alignItems:'flex-start', marginBottom:'12px' }}>
        <div>
          <div style={{ fontWeight:800, fontSize:'1.1rem' }}>{item.issue_type}</div>
          <div style={{ color:'#64748b', fontSize:'0.85rem', marginTop:'4px' }}>📍 {item.locations?.name || 'Global'}</div>
        </div>
        <StatusBadge status={item.lifecycle_status} />
      </div>
      
      <div style={{ display:'flex', gap:'8px', marginBottom:'12px' }}>
        <span className="badge" style={{ background:`${pColor}18`, color:pColor }}>
          {item.priority} Priority
        </span>
        {item.due_at && (
          <span className="badge badge-gray">SLA: {new Date(item.due_at).toLocaleTimeString([], { hour:'2-digit', minute:'2-digit' })}</span>
        )}
      </div>

      {item.description && <p style={{ margin:'0 0 16px', fontSize:'0.9rem', color:'#475569' }}>{item.description}</p>}
      
      <div style={{ fontSize:'0.75rem', color:'#94a3b8' }}>
        {new Date(item.created_at).toLocaleString()}
      </div>
    </div>
  )
}

export default function MyTasksPage() {
  const { user } = useAuth()
  const [tab, setTab] = useState('work')
  const [workUpdates, setWorkUpdates] = useState([])
  const [issues, setIssues] = useState([])
  const [loading, setLoading] = useState(true)

  const load = async () => {
    setLoading(true)
    try {
      const [wRes, iRes] = await Promise.all([
        supabase
          .from('work_updates')
          .select(`*, locations(name), reviewer:profiles!verified_by(name)`)
          .eq('user_id', user.id)
          .order('created_at', { ascending: false }),
        supabase
          .from('issues')
          .select(`*, locations(name)`)
          .eq('reported_by', user.id)
          .order('created_at', { ascending: false })
      ])

      if (wRes.error) throw wRes.error
      if (iRes.error) throw iRes.error

      setWorkUpdates(wRes.data)
      setIssues(iRes.data)
    } catch (err) {
      console.error(err)
      toast.error('Could not load your history')
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => { if (user) load() }, [user])

  return (
    <div className="page fade-in">
      <div style={{ display:'flex', justifyContent:'space-between', alignItems:'center', marginBottom:'24px' }}>
        <div>
          <h1 style={{ margin:0, fontSize:'1.6rem', fontWeight:800 }}>📋 My History</h1>
          <p style={{ margin:'4px 0 0', color:'#64748b' }}>Track your operational contributions</p>
        </div>
        <button onClick={load} className="btn-icon">
          <RefreshCw size={18} />
        </button>
      </div>

      <div style={{ display:'flex', gap:'6px', background:'#f1f5f9', borderRadius:'14px', padding:'4px', marginBottom:'24px' }}>
        <button 
          onClick={() => setTab('work')} 
          className={`btn ${tab==='work'?'btn-primary':''}`} 
          style={{ flex:1, minHeight:'44px', background: tab==='work' ? '#2563eb' : 'transparent', color: tab==='work' ? 'white' : '#64748b', border:'none' }}>
          Work ({workUpdates.length})
        </button>
        <button 
          onClick={() => setTab('issues')} 
          className={`btn ${tab==='issues'?'btn-primary':''}`} 
          style={{ flex:1, minHeight:'44px', background: tab==='issues' ? '#2563eb' : 'transparent', color: tab==='issues' ? 'white' : '#64748b', border:'none' }}>
          Issues ({issues.length})
        </button>
      </div>

      {loading ? (
        [1,2].map(i => <div key={i} className="skeleton" style={{ height:'150px', borderRadius:'20px', marginBottom:'16px' }} />)
      ) : tab === 'work' ? (
        workUpdates.length === 0
          ? <div style={{ textAlign:'center', padding:'80px 20px' }}><ClipboardList size={48} style={{ opacity:0.2, margin:'0 auto 12px' }} /><p>No work updates found</p></div>
          : workUpdates.map(w => <WorkCard key={w.id} item={w} />)
      ) : (
        issues.length === 0
          ? <div style={{ textAlign:'center', padding:'80px 20px' }}><AlertTriangle size={48} style={{ opacity:0.2, margin:'0 auto 12px' }} /><p>No issues reported</p></div>
          : issues.map(i => <IssueCard key={i.id} item={i} />)
      )}
    </div>
  )
}
