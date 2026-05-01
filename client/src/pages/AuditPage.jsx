import { useState, useEffect } from 'react'
import { useNavigate } from 'react-router-dom'
import { supabase } from '../utils/supabaseClient'
import { useAuth } from '../context/AuthContext'
import toast from 'react-hot-toast'
import { ArrowLeft, Search, History, Shield, CheckCircle } from 'lucide-react'

export default function AuditPage() {
  const { user, isAdmin } = useAuth()
  const navigate = useNavigate()
  
  const [departments, setDepartments] = useState([])
  const [locations, setLocations] = useState([])
  const [history, setHistory] = useState([])
  const [form, setForm] = useState({ department_id:'', location_id:'', findings:'', score:'' })
  const [loading, setLoading] = useState(false)
  const [activeTab, setActiveTab] = useState('new') // 'new' or 'history'

  useEffect(() => {
    if (!isAdmin) return
    
    supabase.from('departments').select('*').order('name').then(({ data }) => setDepartments(data || []))
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
      .select(`*, departments(name), locations(name)`)
      .order('created_at', { ascending: false })
      .limit(20)
    setHistory(data || [])
  }

  const handleSubmit = async (e) => {
    e.preventDefault()
    if (!form.department_id) { toast.error('Select a department'); return }
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
        department_id: form.department_id,
        location_id: form.location_id || null,
        findings: form.findings,
        score: scoreVal,
      }]).select().single()

      if (error) throw error

      await supabase.from('activity_log').insert([{
        user_id: user.id,
        action_type: 'AUDIT',
        entity_type: 'audit',
        entity_id: audit.id,
        detail: `Conducted audit for ${departments.find(d => d.id === form.department_id)?.name} (Score: ${scoreVal})`
      }])

      toast.success('✅ Audit recorded successfully!')
      setForm({ department_id:'', location_id:'', findings:'', score:'' })
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

      <div style={{ marginBottom:'24px', display:'flex', justifyContent:'space-between', alignItems:'flex-end' }}>
        <div>
          <h1 style={{ margin:0, fontSize:'1.6rem', fontWeight:800 }}>🔍 Audit System</h1>
          <p style={{ margin:'4px 0 0', color:'#64748b' }}>Precision inspections and scoring</p>
        </div>
      </div>

      <div style={{ display:'flex', gap:'4px', background:'#f1f5f9', padding:'4px', borderRadius:'12px', marginBottom:'24px' }}>
        <button onClick={() => setActiveTab('new')} style={{ 
          flex:1, padding:'10px', borderRadius:'8px', border:'none', cursor:'pointer',
          background: activeTab === 'new' ? 'white' : 'transparent',
          fontWeight: activeTab === 'new' ? 700 : 500,
          boxShadow: activeTab === 'new' ? '0 2px 8px rgba(0,0,0,0.05)' : 'none'
        }}>New Inspection</button>
        <button onClick={() => setActiveTab('history')} style={{ 
          flex:1, padding:'10px', borderRadius:'8px', border:'none', cursor:'pointer',
          background: activeTab === 'history' ? 'white' : 'transparent',
          fontWeight: activeTab === 'history' ? 700 : 500,
          boxShadow: activeTab === 'history' ? '0 2px 8px rgba(0,0,0,0.05)' : 'none'
        }}>Audit History</button>
      </div>

      {activeTab === 'new' ? (
        <form onSubmit={handleSubmit} className="card" style={{ padding:'24px', display:'flex', flexDirection:'column', gap:'20px' }}>
          <div className="grid-2">
            <div>
              <label className="form-label">🏢 Target Department *</label>
              <select className="form-input" value={form.department_id} onChange={e => setForm({ ...form, department_id: e.target.value })}>
                <option value="">-- Select --</option>
                {departments.map(d => <option key={d.id} value={d.id}>{d.name}</option>)}
              </select>
            </div>
            <div>
              <label className="form-label">📍 Specific Location</label>
              <select className="form-input" value={form.location_id} onChange={e => setForm({ ...form, location_id: e.target.value })}>
                <option value="">-- Optional --</option>
                {locations.map(l => <option key={l.id} value={l.id}>{l.name}</option>)}
              </select>
            </div>
          </div>

          <div>
            <label className="form-label">📋 Findings & Remarks *</label>
            <textarea className="form-input" rows={6} placeholder="Describe the current state, violations, or improvements..." value={form.findings} onChange={e => setForm({ ...form, findings: e.target.value })} />
          </div>

          <div>
            <label className="form-label">🏅 Performance Score (0-100) *</label>
            <div style={{ display:'flex', alignItems:'center', gap:'16px' }}>
              <input type="number" className="form-input" style={{ width:'120px' }} value={form.score} onChange={e => setForm({ ...form, score: e.target.value })} placeholder="0-100" />
              {form.score && (
                <div style={{ flex:1, height:'12px', background:'#e2e8f0', borderRadius:'6px', overflow:'hidden' }}>
                  <div style={{ height:'100%', width:`${score}%`, background: scoreColor, transition:'width 0.4s' }} />
                </div>
              )}
            </div>
          </div>

          <button type="submit" className="btn btn-primary" disabled={loading} style={{ background:'#d97706', border:'none', height:'60px' }}>
            {loading ? 'Submitting Report…' : <><CheckCircle size={20} /> Certify & Submit Audit</>}
          </button>
        </form>
      ) : (
        <div style={{ display:'flex', flexDirection:'column', gap:'12px' }}>
          {history.map(a => (
            <div key={a.id} className="card" style={{ padding:'16px' }}>
              <div style={{ display:'flex', justifyContent:'space-between', marginBottom:'8px' }}>
                <span style={{ fontWeight:800, fontSize:'1rem' }}>{a.departments?.name}</span>
                <span style={{ 
                  padding:'4px 8px', borderRadius:'6px', background: a.score >= 80 ? '#dcfce7' : '#fee2e2',
                  color: a.score >= 80 ? '#16a34a' : '#dc2626', fontWeight:800, fontSize:'0.8rem'
                }}>{a.score}%</span>
              </div>
              <div style={{ fontSize:'0.85rem', color:'#64748b', marginBottom:'8px' }}>
                📍 {a.locations?.name || 'All Locations'} • 📅 {new Date(a.created_at).toLocaleDateString()}
              </div>
              <div style={{ fontSize:'0.9rem', color:'#475569', lineClamp:2, overflow:'hidden', display:'-webkit-box', WebkitLineClamp:2, WebkitBoxOrient:'vertical' }}>
                {a.findings}
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  )
}
