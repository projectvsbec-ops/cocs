import { useState, useEffect } from 'react'
import { supabase } from '../utils/supabaseClient'
import { useAuth } from '../context/AuthContext'
import toast from 'react-hot-toast'
import { CheckCircle, XCircle, RefreshCw, Image, Shield, AlertCircle } from 'lucide-react'

function VerifyCard({ item, onAction }) {
  const { user } = useAuth()
  const [comment, setComment] = useState('')
  const [loading, setLoading] = useState(false)
  const [imgOpen, setImgOpen] = useState(false)

  const handleTransition = async (status) => {
    if (status === 'REJECTED' && !comment.trim()) {
      toast.error('Rejection requires a comment')
      return
    }

    setLoading(true)
    try {
      const { error } = await supabase
        .from('work_updates')
        .update({ 
          workflow_status: status === 'APPROVED' ? 'CLOSED' : 'REJECTED', 
          verify_comment: comment,
          verified_by: user.id,
          last_transition_at: new Date().toISOString()
        })
        .eq('id', item.id)

      if (error) throw error

      await supabase.from('activity_log').insert([{
        user_id: user.id,
        action_type: status,
        entity_type: 'work',
        entity_id: item.id,
        detail: `${status} work update from ${item.profiles?.name}`,
        metadata: { comment }
      }])

      toast.success(`Work ${status.toLowerCase()} successfully!`)
      onAction()
    } catch (err) {
      console.error(err)
      toast.error('Action failed. Ensure you have Admin privileges.')
    } finally { setLoading(false) }
  }

  return (
    <div className="card" style={{ padding:'20px', marginBottom:'16px', borderLeft: '4px solid #7c3aed' }}>
      <div style={{ display:'flex', justifyContent:'space-between', alignItems:'flex-start', marginBottom:'12px' }}>
        <div style={{ flex:1 }}>
          <div style={{ fontWeight:800, fontSize:'1.1rem', color:'#1e293b' }}>{item.work_type}</div>
          <div style={{ display:'flex', alignItems:'center', gap:'6px', color:'#64748b', fontSize:'0.85rem', marginTop:'4px' }}>
            <span style={{ fontWeight:700 }}>👷 {item.profiles?.name}</span>
            <span>•</span>
            <span>📍 {item.locations?.name}</span>
          </div>
        </div>
        <div style={{ 
          padding:'6px 12px', borderRadius:'999px', background:'#f1f5f9', 
          color:'#475569', fontSize:'0.75rem', fontWeight:800, textTransform:'uppercase' 
        }}>
          {item.workflow_status}
        </div>
      </div>

      <div style={{ display:'flex', gap:'12px', marginBottom:'16px' }}>
        <div className={`badge ${item.claim_status==='Completed'?'badge-green':'badge-yellow'}`} style={{ fontSize:'0.75rem' }}>
          Worker Claim: {item.claim_status}
        </div>
      </div>

      {item.notes && (
        <div style={{ padding:'12px', background:'#f8fafc', borderRadius:'12px', fontSize:'0.9rem', color:'#334155', marginBottom:'16px' }}>
          {item.notes}
        </div>
      )}

      {item.photo_url && (
        <div style={{ position:'relative', marginBottom:'16px' }}>
          <img 
            src={item.photo_url} 
            alt="Evidence" 
            style={{ width:'100%', maxHeight:'200px', objectFit:'cover', borderRadius:'12px', cursor:'pointer' }}
            onClick={() => setImgOpen(true)}
          />
          <div style={{ position:'absolute', bottom:10, right:10, background:'rgba(0,0,0,0.5)', color:'white', padding:'4px 8px', borderRadius:'6px', fontSize:'0.7rem' }}>
            Click to expand
          </div>
        </div>
      )}

      <div style={{ marginBottom:'16px' }}>
        <label className="form-label" style={{ fontSize:'0.75rem' }}>Admin Feedback / Comment</label>
        <textarea
          className="form-input"
          rows={2}
          placeholder="Required for rejections..."
          value={comment}
          onChange={e => setComment(e.target.value)}
          style={{ fontSize:'0.9rem' }}
        />
      </div>

      <div className="grid-2">
        <button onClick={() => handleTransition('APPROVED')} disabled={loading}
          className="btn btn-primary" style={{ background: '#16a34a', border:'none' }}>
          <CheckCircle size={18} /> Approve & Close
        </button>
        <button onClick={() => handleTransition('REJECTED')} disabled={loading}
          className="btn btn-danger">
          <XCircle size={18} /> Reject to Manager
        </button>
      </div>

      {imgOpen && (
        <div onClick={() => setImgOpen(false)} style={{
          position:'fixed', inset:0, background:'rgba(0,0,0,0.9)',
          zIndex:999, display:'flex', alignItems:'center', justifyContent:'center', padding:'20px'
        }}>
          <img src={item.photo_url} alt="Work Full" style={{ maxWidth:'100%', maxHeight:'90vh', borderRadius:'16px' }} />
        </div>
      )}
    </div>
  )
}

export default function VerifyPage() {
  const { isAdmin } = useAuth()
  const [items, setItems] = useState([])
  const [loading, setLoading] = useState(true)

  const loadPending = async () => {
    setLoading(true)
    try {
      const { data, error } = await supabase
        .from('work_updates')
        .select(`*, profiles!user_id(name), locations(name)`)
        .in('workflow_status', ['SUBMITTED', 'RESUBMITTED', 'UNDER_REVIEW'])
        .order('created_at', { ascending: false })

      if (error) throw error
      setItems(data)
    } catch (err) {
      console.error(err)
      toast.error('Failed to load pending reviews')
    } finally { setLoading(false) }
  }

  useEffect(() => { loadPending() }, [])

  if (!isAdmin) return (
    <div className="page" style={{ textAlign:'center', paddingTop:'100px' }}>
      <Shield size={64} color="#dc2626" style={{ margin:'0 auto 20px' }} />
      <h2 style={{ fontWeight:800 }}>Access Denied</h2>
      <p style={{ color:'#64748b' }}>Only Deans or Super Admins can verify work updates.</p>
    </div>
  )

  return (
    <div className="page fade-in">
      <div style={{ display:'flex', justifyContent:'space-between', alignItems:'center', marginBottom:'24px' }}>
        <div>
          <h1 style={{ margin:0, fontSize:'1.8rem', fontWeight:800 }}>⚖️ Compliance Review</h1>
          <p style={{ margin:'4px 0 0', color:'#64748b' }}>{items.length} submissions awaiting your decision</p>
        </div>
        <button onClick={loadPending} className="btn-icon">
          <RefreshCw size={20} />
        </button>
      </div>

      {loading ? (
        [1,2].map(i => <div key={i} className="skeleton" style={{ height:'300px', borderRadius:'20px', marginBottom:'16px' }} />)
      ) : items.length === 0 ? (
        <div style={{ textAlign:'center', padding:'80px 20px', background:'#f8fafc', borderRadius:'24px' }}>
          <CheckCircle size={56} style={{ color:'#16a34a', margin:'0 auto 16px' }} />
          <h3 style={{ fontWeight:800, color:'#1e293b' }}>Zero Pending Items</h3>
          <p style={{ color:'#64748b' }}>Great job! You have reviewed all operational updates.</p>
        </div>
      ) : (
        items.map(item => <VerifyCard key={item.id} item={item} onAction={loadPending} />)
      )}
    </div>
  )
}
