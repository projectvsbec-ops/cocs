import { useState, useEffect } from 'react'
import { useNavigate } from 'react-router-dom'
import { supabase } from '../utils/supabaseClient'
import { useAuth } from '../context/AuthContext'
import toast from 'react-hot-toast'
import { ArrowLeft, Search, History, Shield, CheckCircle, MapPin } from 'lucide-react'

export default function AuditPage() {
  const { user, isAdmin } = useAuth()
  const navigate = useNavigate()
  
  const [locations, setLocations] = useState([])
  const [history, setHistory] = useState([])
  const [form, setForm] = useState({ location_id:'', findings:'', score:'' })
  const [loading, setLoading] = useState(false)
  const [activeTab, setActiveTab] = useState('new') // 'new' or 'history'

  useEffect(() => {
    if (!isAdmin) return
    
    supabase.from('locations').select('*').order('name').then(({ data }) => {
      const uniqueLocs = []
      const seen = new Set()
      for (const loc of (data || [])) {
        if (!seen.has(loc.name)) {
          seen.add(loc.name)
          uniqueLocs.push(loc)
        }
      }
      setLocations(uniqueLocs)
    })
    loadHistory()
  }, [isAdmin])

  const loadHistory = async () => {
    const { data } = await supabase
      .from('audits')
      .select(`*, locations(name)`)
      .order('created_at', { ascending: false })
      .limit(20)
    setHistory(data || [])
  }

  const handleSubmit = async (e) => {
    e.preventDefault()
    if (!form.location_id) { toast.error('Select a location'); return }
    if (!form.findings.trim()) { toast.error('Enter findings'); return }
    
    const scoreVal = parseInt(form.score)
    if (isNaN(scoreVal) || scoreVal < 0 || scoreVal > 100) {
      toast.error('Score must be between 0 and 100')
      return
    }

    setLoading(true)
    try {
      const { data: audit, error } = await supabase.from('audits').insert([{
        admin_id: user.id,
        location_id: form.location_id,
        findings: form.findings,
        score: scoreVal,
      }]).select().single()

      if (error) throw error

      await supabase.from('activity_log').insert([{
        user_id: user.id,
        action_type: 'AUDIT',
        entity_type: 'audit',
        entity_id: audit.id,
        detail: `Conducted audit for ${locations.find(l => l.id === form.location_id)?.name} (Score: ${scoreVal}%)`
      }])

      toast.success('✅ Audit recorded successfully!')
      setForm({ location_id:'', findings:'', score:'' })
      setActiveTab('history')
      loadHistory()
    } catch (err) {
      console.error(err)
      toast.error('Failed to save audit')
    } finally { setLoading(false) }
  }

  if (!isAdmin) return (
    <div className="page" style={{ textAlign:'center', paddingTop:'100px' }}>
      <Shield size={64} color="#dc2626" style={{ margin:'0 auto 20px' }} />
      <h2 style={{ fontWeight:800 }}>Restricted Access</h2>
      <p style={{ color:'#64748b' }}>Only administrators can conduct official campus audits.</p>
    </div>
  )

  const score = parseInt(form.score) || 0
  const scoreColor = score >= 80 ? '#16a34a' : score >= 50 ? '#d97706' : '#dc2626'

  return (
    <div className="page fade-in">
      <button onClick={() => navigate(-1)} className="btn-back">
        <ArrowLeft size={18} /> Back
      </button>

      <div style={{ marginBottom:'24px' }}>
        <h1 style={{ margin:0, fontSize:'1.6rem', fontWeight:800 }}>🔍 Audit System</h1>
        <p style={{ margin:'4px 0 0', color:'#64748b', fontWeight: 600 }}>Precision inspections and scoring</p>
      </div>

      <div style={{ display:'flex', gap:'4px', background:'#f1f5f9', padding:'4px', borderRadius:'14px', marginBottom:'24px' }}>
        <button onClick={() => setActiveTab('new')} style={{ 
          flex:1, padding:'12px', borderRadius:'10px', border:'none', cursor:'pointer',
          background: activeTab === 'new' ? 'white' : 'transparent',
          fontWeight: activeTab === 'new' ? 800 : 600,
          boxShadow: activeTab === 'new' ? '0 4px 12px rgba(0,0,0,0.05)' : 'none',
          color: activeTab === 'new' ? 'var(--primary)' : '#64748b',
          transition: 'all 0.2s'
        }}>New Inspection</button>
        <button onClick={() => setActiveTab('history')} style={{ 
          flex:1, padding:'12px', borderRadius:'10px', border:'none', cursor:'pointer',
          background: activeTab === 'history' ? 'white' : 'transparent',
          fontWeight: activeTab === 'history' ? 800 : 600,
          boxShadow: activeTab === 'history' ? '0 4px 12px rgba(0,0,0,0.05)' : 'none',
          color: activeTab === 'history' ? 'var(--primary)' : '#64748b',
          transition: 'all 0.2s'
        }}>Audit History</button>
      </div>

      {activeTab === 'new' ? (
        <form onSubmit={handleSubmit} className="card" style={{ padding:'24px', display:'flex', flexDirection:'column', gap:'24px' }}>
          <div>
            <label className="form-label" style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
              <MapPin size={16} color="var(--danger)" /> SPECIFIC LOCATION *
            </label>
            <select className="form-input" value={form.location_id} onChange={e => setForm({ ...form, location_id: e.target.value })}>
              <option value="">-- Select Location --</option>
              {locations.map(l => <option key={l.id} value={l.id}>{l.name}</option>)}
            </select>
          </div>

          <div>
            <label className="form-label">📋 FINDINGS & REMARKS *</label>
            <textarea 
              className="form-input" 
              rows={5} 
              style={{ borderRadius: '16px', padding: '16px' }}
              placeholder="Describe the current state, violations, or improvements..." 
              value={form.findings} 
              onChange={e => setForm({ ...form, findings: e.target.value })} 
            />
          </div>

          <div>
            <label className="form-label">🏅 PERFORMANCE SCORE (0-100) *</label>
            <div style={{ display:'flex', alignItems:'center', gap:'16px' }}>
              <input 
                type="number" 
                className="form-input" 
                style={{ width:'100px', textAlign: 'center', fontWeight: 800 }} 
                value={form.score} 
                onChange={e => setForm({ ...form, score: e.target.value })} 
                placeholder="0-100" 
              />
              <div style={{ flex:1, height:'12px', background:'#f1f5f9', borderRadius:'6px', overflow:'hidden' }}>
                <div style={{ height:'100%', width:`${score}%`, background: scoreColor, transition:'width 0.5s cubic-bezier(0.4, 0, 0.2, 1)' }} />
              </div>
            </div>
          </div>

          <button type="submit" className="btn btn-primary" disabled={loading} style={{ background:'linear-gradient(135deg, #d97706, #b45309)', border:'none', height:'64px', borderRadius: '20px', boxShadow: '0 10px 20px rgba(217, 119, 6, 0.2)' }}>
            {loading ? 'Submitting Report…' : <><CheckCircle size={20} /> Certify & Submit Audit</>}
          </button>
        </form>
      ) : (
        <div style={{ display:'flex', flexDirection:'column', gap:'14px' }}>
          {history.map(a => (
            <div key={a.id} className="card" style={{ padding:'20px', border:'1px solid #f1f5f9' }}>
              <div style={{ display:'flex', justifyContent:'space-between', marginBottom:'12px', alignItems: 'center' }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: '8px', fontWeight: 800, fontSize: '1.05rem', color: '#1e293b' }}>
                  <MapPin size={18} color="#64748b" /> {a.locations?.name || 'Global'}
                </div>
                <span style={{ 
                  padding:'6px 12px', borderRadius:'10px', background: a.score >= 80 ? '#dcfce7' : a.score >= 50 ? '#fef9c3' : '#fee2e2',
                  color: a.score >= 80 ? '#16a34a' : a.score >= 50 ? '#d97706' : '#dc2626', fontWeight:900, fontSize:'0.85rem'
                }}>{a.score}%</span>
              </div>
              <div style={{ fontSize:'0.8rem', color:'#94a3b8', fontWeight: 700, marginBottom:'12px' }}>
                📅 {new Date(a.created_at).toLocaleDateString()} • {new Date(a.created_at).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
              </div>
              <div style={{ fontSize:'0.9rem', color:'#475569', lineHeight: 1.5 }}>
                {a.findings}
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  )
}
