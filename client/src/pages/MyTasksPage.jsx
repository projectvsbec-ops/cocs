import { useState, useEffect } from 'react'
import { supabase } from '../utils/supabaseClient'
import { useAuth } from '../context/AuthContext'
import { useNavigate } from 'react-router-dom'
import toast from 'react-hot-toast'
import { 
  RefreshCw, ClipboardList, AlertTriangle, 
  Image, Edit3, MessageSquare, UserCheck,
  Hand, CheckCircle2, MapPin
} from 'lucide-react'

function StatusBadge({ status }) {
  const map = {
    SUBMITTED:    { cls:'badge-yellow', label:'⏳ Submitted' },
    REJECTED:     { cls:'badge-red',    label:'❌ Rejected' },
    APPROVED:     { cls:'badge-green',  label:'✅ Approved' },
    CLOSED:       { cls:'badge-gray',   label:'✔️ Closed' },
    RESUBMITTED:  { cls:'badge-blue',   label:'🔄 Resubmitted' },
    UNDER_REVIEW: { cls:'badge-yellow', label:'🔍 Under Review' },
    OPEN:         { cls:'badge-red',    label:'🔴 AVAILABLE' },
    CLAIMED:      { cls:'badge-blue',   label:'💎 CLAIMED' },
  }
  const s = map[status] || { cls:'badge-gray', label: status }
  return <span className={`badge ${s.cls}`}>{s.label}</span>
}

function WorkCard({ item, onClaim, onUpdate }) {
  const navigate = useNavigate()
  const { user } = useAuth()
  const [imgOpen, setImgOpen] = useState(false)
  const isAvailable = item.workflow_status === 'OPEN'
  
  const handleFinish = async (id) => {
    const toastId = toast.loading('Submitting work for review...')
    try {
      const { error } = await supabase
        .from('work_updates')
        .update({ workflow_status: 'SUBMITTED', claim_status: 'Completed' })
        .eq('id', id)
      if (error) throw error
      toast.success('Work submitted to Admin for verification!', { id: toastId })
      onUpdate() // Call the refresh function
    } catch (err) {
      toast.error('Submission failed', { id: toastId })
    }
  }

  return (
    <div className="card" style={{ padding:'20px', marginBottom:'16px', borderLeft: isAvailable ? '4px solid #ef4444' : (item.workflow_status === 'CLAIMED' ? '4px solid #2563eb' : (item.workflow_status === 'REJECTED' ? '4px solid #dc2626' : 'none')) }}>
      <div style={{ display:'flex', justifyContent:'space-between', alignItems:'flex-start', marginBottom:'12px' }}>
        <div>
          <div style={{ fontWeight:800, fontSize:'1.1rem', color:'#1e293b' }}>{item.work_type}</div>
          <div style={{ color:'#64748b', fontSize:'0.85rem', marginTop:'4px', display:'flex', alignItems:'center', gap:'4px' }}>
            <MapPin size={14} /> {item.locations?.name || 'Global'}
          </div>
        </div>
        <StatusBadge status={item.workflow_status} />
      </div>

      {item.notes && <p style={{ margin:'12px 0', fontSize:'0.9rem', color:'#475569' }}>{item.notes}</p>}

      <div style={{ display:'flex', gap:'8px', flexWrap:'wrap', marginBottom:'12px' }}>
        {item.photo_url && (
          <button onClick={() => setImgOpen(true)} className="badge" style={{ cursor:'pointer', border:'1px solid #e2e8f0', background:'white' }}>
            <Image size={14} /> View Evidence
          </button>
        )}
      </div>

      {item.verify_comment && (
        <div style={{ marginTop:'12px', padding:'12px', background:'#fff1f2', borderRadius:'12px', border:'1px solid #ffe4e6' }}>
          <div style={{ display:'flex', alignItems:'center', gap:'6px', color:'#be123c', fontWeight:700, fontSize:'0.8rem', marginBottom:'4px' }}>
            <MessageSquare size={14} /> Admin Feedback
          </div>
          <div style={{ fontSize:'0.9rem', color:'#9f1239' }}>{item.verify_comment}</div>
        </div>
      )}

      <div style={{ display:'flex', justifyContent:'space-between', alignItems:'center', marginTop:'16px' }}>
        <div style={{ fontSize:'0.75rem', color:'#94a3b8' }}>
          {new Date(item.created_at).toLocaleString()}
        </div>
        
        {isAvailable ? (
          <button 
            onClick={() => onClaim(item.id)}
            className="btn btn-primary" 
            style={{ width:'auto', minHeight:'40px', padding:'0 16px', fontSize:'0.85rem', background:'#2563eb' }}>
            <Hand size={16} /> Manager Claim
          </button>
        ) : item.workflow_status === 'CLAIMED' ? (
          <button 
            onClick={() => handleFinish(item.id)}
            className="btn" 
            style={{ 
              width:'auto', minHeight:'40px', padding:'0 16px', fontSize:'0.85rem', 
              background:'#16a34a', color:'white', fontWeight:800, borderRadius:'12px' 
            }}>
            <CheckCircle2 size={16} /> Finish & Submit
          </button>
        ) : (
          item.workflow_status === 'REJECTED' && (
            <button 
              onClick={() => navigate(`/work/edit/${item.id}`)}
              className="btn btn-primary" 
              style={{ width:'auto', minHeight:'40px', padding:'0 16px', fontSize:'0.85rem', background:'#dc2626' }}>
              <Edit3 size={16} /> Fix & Resubmit
            </button>
          )
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

export default function MyTasksPage() {
  const { user } = useAuth()
  const [tab, setTab] = useState('claimed') // 'claimed', 'pool'
  const [myWork, setMyWork] = useState([])
  const [pool, setPool] = useState([])
  const [loading, setLoading] = useState(true)

  const load = async () => {
    setLoading(true)
    try {
      const [myRes, poolRes] = await Promise.all([
        supabase
          .from('work_updates')
          .select(`*, locations(name)`)
          .eq('user_id', user.id)
          .order('created_at', { ascending: false }),
        supabase
          .from('work_updates')
          .select(`*, locations(name)`)
          .eq('workflow_status', 'OPEN')
          .order('created_at', { ascending: false })
      ])

      setMyWork(myRes.data || [])
      setPool(poolRes.data || [])
    } catch (err) {
      toast.error('Could not load task data')
    } finally {
      setLoading(false)
    }
  }

  const handleClaim = async (id) => {
    const toastId = toast.loading('Claiming task...')
    try {
      const { error } = await supabase
        .from('work_updates')
        .update({ 
          user_id: user.id, 
          workflow_status: 'CLAIMED',
          claim_status: 'Pending'
        })
        .eq('id', id)
      
      if (error) throw error
      toast.success('Task Claimed! Moved to your history.', { id: toastId })
      load()
    } catch (err) {
      toast.error('Claim failed', { id: toastId })
    }
  }

  useEffect(() => { if (user) load() }, [user])

  return (
    <div className="page fade-in">
      <div style={{ display:'flex', justifyContent:'space-between', alignItems:'center', marginBottom:'24px' }}>
        <div>
          <h1 style={{ margin:0, fontSize:'1.6rem', fontWeight:900 }}>Manager Claim</h1>
          <p style={{ margin:'4px 0 0', color:'#64748b', fontWeight: 600 }}>Available Tasks & My History</p>
        </div>
        <button onClick={load} className="btn-icon">
          <RefreshCw size={18} className={loading ? 'spin' : ''} />
        </button>
      </div>

      <div style={{ display:'flex', gap:'6px', background:'#f1f5f9', borderRadius:'16px', padding:'4px', marginBottom:'24px' }}>
        <button 
          onClick={() => setTab('pool')} 
          style={{ 
            flex:1, minHeight:'48px', borderRadius:'12px', border:'none', cursor:'pointer',
            background: tab==='pool' ? 'white' : 'transparent', 
            color: tab==='pool' ? 'var(--primary)' : '#64748b',
            fontWeight: 800, fontSize:'0.9rem', boxShadow: tab==='pool' ? '0 4px 12px rgba(0,0,0,0.05)' : 'none'
          }}>
          Task Pool ({pool.length})
        </button>
        <button 
          onClick={() => setTab('claimed')} 
          style={{ 
            flex:1, minHeight:'48px', borderRadius:'12px', border:'none', cursor:'pointer',
            background: tab==='claimed' ? 'white' : 'transparent', 
            color: tab==='claimed' ? 'var(--primary)' : '#64748b',
            fontWeight: 800, fontSize:'0.9rem', boxShadow: tab==='claimed' ? '0 4px 12px rgba(0,0,0,0.05)' : 'none'
          }}>
          My Claims ({myWork.length})
        </button>
      </div>

      {loading ? (
        <div className="skeleton" style={{ height:'150px', borderRadius:'20px' }} />
      ) : tab === 'pool' ? (
        pool.length === 0
          ? <div style={{ textAlign:'center', padding:'60px 20px', color:'#94a3b8' }}><ClipboardList size={48} style={{ opacity:0.2, margin:'0 auto 12px' }} /><p>No available tasks in the pool</p></div>
          : pool.map(w => <WorkCard key={w.id} item={w} onClaim={handleClaim} onUpdate={load} />)
      ) : (
        myWork.length === 0
          ? <div style={{ textAlign:'center', padding:'60px 20px', color:'#94a3b8' }}><CheckCircle2 size={48} style={{ opacity:0.2, margin:'0 auto 12px' }} /><p>You haven't claimed any tasks yet</p></div>
          : myWork.map(w => <WorkCard key={w.id} item={w} onClaim={handleClaim} onUpdate={load} />)
      )}
    </div>
  )
}
