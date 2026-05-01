import { useState, useEffect } from 'react'
import { supabase } from '../utils/supabaseClient'
import toast from 'react-hot-toast'
import { RefreshCw, ClipboardList, AlertTriangle, Image } from 'lucide-react'

function StatusBadge({ status }) {
  const map = {
    Completed:    { cls:'badge-green',  label:'✅ Completed' },
    Pending:      { cls:'badge-yellow', label:'⏳ Pending' },
    Approved:     { cls:'badge-green',  label:'👍 Approved' },
    Rejected:     { cls:'badge-red',    label:'❌ Rejected' },
    Open:         { cls:'badge-red',    label:'🔴 Open' },
    'In Progress':{ cls:'badge-blue',   label:'🔵 In Progress' },
    Closed:       { cls:'badge-gray',   label:'⚫ Closed' },
  }
  const s = map[status] || { cls:'badge-gray', label: status }
  return <span className={`badge ${s.cls}`}>{s.label}</span>
}

function WorkCard({ item }) {
  const [imgOpen, setImgOpen] = useState(false)
  return (
    <div className="card" style={{ padding:'16px', marginBottom:'12px' }}>
      <div style={{ display:'flex', justifyContent:'space-between', alignItems:'flex-start', marginBottom:'10px' }}>
        <div>
          <div style={{ fontWeight:700, fontSize:'1rem' }}>{item.work_type}</div>
          <div style={{ color:'#64748b', fontSize:'0.82rem', marginTop:'2px' }}>
            📍 {item.locations?.name} • {item.departments?.name || 'All Department'}
          </div>
        </div>
        <StatusBadge status={item.status} />
      </div>
      <div style={{ display:'flex', gap:'8px', flexWrap:'wrap', alignItems:'center' }}>
        <span className={`badge ${item.verified_status==='Approved'?'badge-green':item.verified_status==='Rejected'?'badge-red':'badge-yellow'}`} style={{ fontSize:'0.72rem' }}>
          {item.verified_status==='Approved'?'👍':item.verified_status==='Rejected'?'❌':'⏳'} {item.verified_status}
        </span>
        {item.photo_url && (
          <button onClick={() => setImgOpen(true)} style={{
            display:'flex', alignItems:'center', gap:'4px', padding:'4px 10px',
            borderRadius:'8px', border:'1px solid #e2e8f0', background:'#f8fafc',
            cursor:'pointer', fontSize:'0.75rem', fontWeight:600, color:'#475569'
          }}><Image size={13} /> View Photo</button>
        )}
      </div>
      {item.verify_comment && (
        <div style={{ marginTop:'8px', padding:'8px 12px', background:'#f1f5f9', borderRadius:'8px', fontSize:'0.82rem', color:'#475569' }}>
          💬 {item.verify_comment}
        </div>
      )}
      <div style={{ marginTop:'8px', fontSize:'0.75rem', color:'#94a3b8' }}>
        {new Date(item.created_at).toLocaleString('en-IN')}
      </div>
      {imgOpen && (
        <div onClick={() => setImgOpen(false)} style={{
          position:'fixed', inset:0, background:'rgba(0,0,0,0.85)',
          zIndex:999, display:'flex', alignItems:'center', justifyContent:'center', padding:'20px'
        }}>
          <img src={item.photo_url} alt="Work" style={{ maxWidth:'100%', maxHeight:'90vh', borderRadius:'12px' }} />
        </div>
      )}
    </div>
  )
}

function IssueCard({ item }) {
  const pColor = item.priority==='High'?'#dc2626':item.priority==='Medium'?'#d97706':'#16a34a'
  return (
    <div className="card" style={{ padding:'16px', marginBottom:'12px', borderLeft:`4px solid ${pColor}` }}>
      <div style={{ display:'flex', justifyContent:'space-between', alignItems:'flex-start', marginBottom:'8px' }}>
        <div>
          <div style={{ fontWeight:700, fontSize:'1rem' }}>{item.issue_type}</div>
          <div style={{ color:'#64748b', fontSize:'0.82rem', marginTop:'2px' }}>📍 {item.locations?.name}</div>
        </div>
        <StatusBadge status={item.status} />
      </div>
      <span className="badge" style={{ background:`${pColor}18`, color:pColor, fontSize:'0.72rem' }}>
        {item.priority} Priority
      </span>
      {item.description && <div style={{ marginTop:'8px', fontSize:'0.82rem', color:'#64748b' }}>{item.description}</div>}
      <div style={{ marginTop:'8px', fontSize:'0.75rem', color:'#94a3b8' }}>
        {new Date(item.created_at).toLocaleString('en-IN')}
      </div>
    </div>
  )
}

export default function MyTasksPage() {
  const [tab, setTab] = useState('work')
  const [workUpdates, setWorkUpdates] = useState([])
  const [issues, setIssues] = useState([])
  const [loading, setLoading] = useState(true)

  const load = async () => {
    setLoading(true)
    try {
      // Supabase handles RLS, so we just fetch all accessible records
      const [wRes, iRes] = await Promise.all([
        supabase
          .from('work_updates')
          .select(`
            *,
            locations(name),
            departments(name),
            profiles!user_id(name)
          `)
          .order('created_at', { ascending: false }),
        supabase
          .from('issues')
          .select(`
            *,
            locations(name),
            departments(name),
            profiles!reported_by(name)
          `)
          .order('created_at', { ascending: false })
      ])

      if (wRes.error) throw wRes.error
      if (iRes.error) throw iRes.error

      setWorkUpdates(wRes.data)
      setIssues(iRes.data)
    } catch (err) {
      console.error(err)
      toast.error('Could not load data')
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => { load() }, [])

  const tabStyle = (active) => ({
    flex:1, padding:'12px', borderRadius:'10px', border:'none',
    fontWeight:700, fontSize:'0.88rem', cursor:'pointer',
    background: active ? '#2563eb' : 'transparent',
    color: active ? 'white' : '#64748b',
  })

  return (
    <div className="page fade-in">
      <div style={{ display:'flex', justifyContent:'space-between', alignItems:'center', marginBottom:'20px' }}>
        <div>
          <h1 style={{ margin:0, fontSize:'1.5rem', fontWeight:800 }}>📋 My Tasks</h1>
          <p style={{ margin:'4px 0 0', color:'#64748b', fontSize:'0.85rem' }}>Your submitted work and issues</p>
        </div>
        <button onClick={load} style={{ background:'#f1f5f9', border:'none', borderRadius:'10px', width:40, height:40, display:'flex', alignItems:'center', justifyContent:'center', cursor:'pointer', color:'#475569' }}>
          <RefreshCw size={18} />
        </button>
      </div>

      <div style={{ display:'flex', gap:'6px', background:'#f1f5f9', borderRadius:'12px', padding:'4px', marginBottom:'20px' }}>
        <button style={tabStyle(tab==='work')} onClick={() => setTab('work')}>
          Work Updates ({workUpdates.length})
        </button>
        <button style={tabStyle(tab==='issues')} onClick={() => setTab('issues')}>
          Issues ({issues.length})
        </button>
      </div>

      {loading ? (
        [1,2,3].map(i => <div key={i} className="skeleton" style={{ height:'100px', borderRadius:'16px', marginBottom:'12px' }} />)
      ) : tab === 'work' ? (
        workUpdates.length === 0
          ? <div style={{ textAlign:'center', padding:'60px 20px', color:'#94a3b8' }}><ClipboardList size={48} style={{ margin:'0 auto 12px', display:'block', opacity:0.4 }} /><p style={{ fontWeight:600 }}>No work updates yet</p></div>
          : workUpdates.map(w => <WorkCard key={w.id} item={w} />)
      ) : (
        issues.length === 0
          ? <div style={{ textAlign:'center', padding:'60px 20px', color:'#94a3b8' }}><AlertTriangle size={48} style={{ margin:'0 auto 12px', display:'block', opacity:0.4 }} /><p style={{ fontWeight:600 }}>No issues reported yet</p></div>
          : issues.map(i => <IssueCard key={i.id} item={i} />)
      )}
    </div>
  )
}
