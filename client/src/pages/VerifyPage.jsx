import { useState, useEffect } from 'react'
import { supabase } from '../utils/supabaseClient'
import { useAuth } from '../context/AuthContext'
import toast from 'react-hot-toast'
import { CheckCircle, XCircle, RefreshCw, Image } from 'lucide-react'

function VerifyCard({ item, onAction }) {
  const { user } = useAuth()
  const [comment, setComment] = useState('')
  const [loading, setLoading] = useState(false)
  const [imgOpen, setImgOpen] = useState(false)

  const handleAction = async (status) => {
    setLoading(true)
    try {
      const { error } = await supabase
        .from('work_updates')
        .update({ 
          verified_status: status, 
          verify_comment: comment,
          verified_by: user.id,
          verified_at: new Date().toISOString()
        })
        .eq('id', item.id)

      if (error) throw error

      await supabase.from('activity_log').insert([{
        user_id: user.id,
        action: 'VERIFY',
        detail: `${status} work update #${item.id.substring(0,8)}`
      }])

      toast.success(`Work ${status.toLowerCase()} successfully!`)
      onAction()
    } catch (err) {
      console.error(err)
      toast.error(err.message || 'Action failed')
    } finally { setLoading(false) }
  }

  return (
    <div className="card" style={{ padding:'18px', marginBottom:'14px' }}>
      <div style={{ display:'flex', justifyContent:'space-between', alignItems:'flex-start', marginBottom:'12px' }}>
        <div style={{ flex:1 }}>
          <div style={{ fontWeight:700, fontSize:'1rem' }}>{item.work_type}</div>
          <div style={{ color:'#64748b', fontSize:'0.82rem', marginTop:'3px' }}>
            👷 {item.profiles?.name}
          </div>
          <div style={{ color:'#94a3b8', fontSize:'0.78rem', marginTop:'2px' }}>
            📍 {item.locations?.name} • {item.departments?.name}
          </div>
        </div>
        <span className={`badge ${item.status==='Completed'?'badge-green':'badge-yellow'}`}>
          {item.status==='Completed'?'✅':'⏳'} {item.status}
        </span>
      </div>

      {item.notes && (
        <div style={{ padding:'10px 12px', background:'#f8fafc', borderRadius:'10px', fontSize:'0.82rem', color:'#475569', marginBottom:'12px' }}>
          📝 {item.notes}
        </div>
      )}

      {item.photo_url && (
        <button onClick={() => setImgOpen(true)} style={{
          display:'flex', alignItems:'center', gap:'6px', padding:'8px 14px',
          borderRadius:'10px', border:'1px solid #e2e8f0', background:'#f8fafc',
          cursor:'pointer', fontSize:'0.82rem', fontWeight:600, color:'#475569',
          width:'100%', justifyContent:'center', marginBottom:'12px'
        }}>
          <Image size={16} /> View Work Photo
        </button>
      )}

      <div style={{ marginBottom:'10px' }}>
        <label style={{ display:'block', fontSize:'0.78rem', fontWeight:700, color:'#94a3b8', textTransform:'uppercase', marginBottom:'6px' }}>
          Add Comment (optional)
        </label>
        <textarea
          className="form-input"
          rows={2}
          placeholder="Write a comment for the staff..."
          value={comment}
          onChange={e => setComment(e.target.value)}
          style={{ resize:'none', minHeight:'72px', fontSize:'0.9rem' }}
        />
      </div>

      <div className="grid-2">
        <button onClick={() => handleAction('Approved')} disabled={loading}
          className="btn btn-success" style={{ minHeight:'48px', fontSize:'0.9rem' }}>
          <CheckCircle size={18} /> Approve
        </button>
        <button onClick={() => handleAction('Rejected')} disabled={loading}
          className="btn btn-danger" style={{ minHeight:'48px', fontSize:'0.9rem' }}>
          <XCircle size={18} /> Reject
        </button>
      </div>

      <div style={{ marginTop:'8px', fontSize:'0.72rem', color:'#94a3b8', textAlign:'right' }}>
        Submitted: {new Date(item.created_at).toLocaleString('en-IN')}
      </div>

      {imgOpen && (
        <div onClick={() => setImgOpen(false)} style={{
          position:'fixed', inset:0, background:'rgba(0,0,0,0.88)',
          zIndex:999, display:'flex', alignItems:'center', justifyContent:'center', padding:'20px'
        }}>
          <img src={item.photo_url} alt="Work" style={{ maxWidth:'100%', maxHeight:'88vh', borderRadius:'14px' }} />
        </div>
      )}
    </div>
  )
}

export default function VerifyPage() {
  const [items, setItems] = useState([])
  const [loading, setLoading] = useState(true)

  const load = async () => {
    setLoading(true)
    try {
      const { data, error } = await supabase
        .from('work_updates')
        .select(`
          *,
          profiles!user_id(name),
          departments(name),
          locations(name)
        `)
        .eq('verified_status', 'Pending')
        .order('created_at', { ascending: false })

      if (error) throw error
      setItems(data)
    } catch (err) {
      console.error(err)
      toast.error('Could not load pending work') 
    } finally { setLoading(false) }
  }

  useEffect(() => { load() }, [])

  return (
    <div className="page fade-in">
      <div style={{ display:'flex', justifyContent:'space-between', alignItems:'center', marginBottom:'20px' }}>
        <div>
          <h1 style={{ margin:0, fontSize:'1.5rem', fontWeight:800 }}>✅ Verify Work</h1>
          <p style={{ margin:'4px 0 0', color:'#64748b', fontSize:'0.85rem' }}>
            {items.length} item{items.length!==1?'s':''} waiting for review
          </p>
        </div>
        <button onClick={load} style={{ background:'#f1f5f9', border:'none', borderRadius:'10px', width:40, height:40, display:'flex', alignItems:'center', justifyContent:'center', cursor:'pointer', color:'#475569' }}>
          <RefreshCw size={18} />
        </button>
      </div>

      {loading ? (
        [1,2].map(i => <div key={i} className="skeleton" style={{ height:'200px', borderRadius:'16px', marginBottom:'14px' }} />)
      ) : items.length === 0 ? (
        <div style={{ textAlign:'center', padding:'70px 20px', color:'#94a3b8' }}>
          <CheckCircle size={56} style={{ margin:'0 auto 16px', display:'block', color:'#86efac' }} />
          <p style={{ fontWeight:700, fontSize:'1.1rem', color:'#16a34a' }}>All caught up! 🎉</p>
          <p style={{ fontSize:'0.85rem' }}>No pending work updates to verify right now.</p>
        </div>
      ) : (
        items.map(item => <VerifyCard key={item.id} item={item} onAction={load} />)
      )}
    </div>
  )
}
