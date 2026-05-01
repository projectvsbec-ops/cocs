import { useState, useEffect } from 'react'
import { useNavigate } from 'react-router-dom'
import { supabase } from '../utils/supabaseClient'
import { useAuth } from '../context/AuthContext'
import toast from 'react-hot-toast'
import { ArrowLeft, Search } from 'lucide-react'

export default function AuditPage() {
  const { user } = useAuth()
  const navigate = useNavigate()
  const [departments, setDepartments] = useState([])
  const [locations, setLocations] = useState([])
  const [form, setForm] = useState({ department_id:'', location_id:'', findings:'', score:'' })
  const [loading, setLoading] = useState(false)

  useEffect(() => {
    supabase.from('departments').select('*').order('name').then(({ data }) => setDepartments(data || []))
  }, [])

  useEffect(() => {
    supabase.from('locations').select('*').order('name')
      .then(({ data }) => {
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
  }, [])

  const handleSubmit = async (e) => {
    e.preventDefault()
    if (!form.department_id) { toast.error('Select a department'); return }
    if (!form.findings.trim()) { toast.error('Enter audit findings'); return }
    setLoading(true)
    try {
      const { error } = await supabase.from('audits').insert([{
        admin_id: user.id,
        department_id: form.department_id,
        location_id: form.location_id || null,
        findings: form.findings,
        score: parseInt(form.score) || 0,
      }])

      if (error) throw error

      await supabase.from('activity_log').insert([{
        user_id: user.id,
        action: 'AUDIT',
        detail: `Conducted audit (Score: ${form.score || 0})`
      }])

      toast.success('✅ Audit recorded successfully!')
      navigate('/dashboard')
    } catch (err) {
      console.error(err)
      toast.error(err.message || 'Failed to save audit')
    } finally { setLoading(false) }
  }

  const score = parseInt(form.score) || 0
  const scoreColor = score >= 80 ? '#16a34a' : score >= 50 ? '#d97706' : '#dc2626'

  return (
    <div className="page fade-in">
      <button onClick={() => navigate(-1)} style={{
        display:'flex', alignItems:'center', gap:'6px', background:'none',
        border:'none', color:'#2563eb', fontWeight:600, fontSize:'0.9rem',
        cursor:'pointer', padding:'0 0 16px', marginLeft:'-4px'
      }}>
        <ArrowLeft size={18} /> Back
      </button>

      <div style={{ marginBottom:'24px' }}>
        <h1 style={{ margin:0, fontSize:'1.5rem', fontWeight:800 }}>🔍 New Audit</h1>
        <p style={{ margin:'4px 0 0', color:'#64748b' }}>Record an inspection or audit finding</p>
      </div>

      <form onSubmit={handleSubmit} style={{ display:'flex', flexDirection:'column', gap:'20px' }}>

        <div>
          <label className="form-label">🏢 Department *</label>
          <select id="audit-dept-select" className="form-input"
            value={form.department_id}
            onChange={e => setForm({ ...form, department_id: e.target.value, location_id:'' })}>
            <option value="">-- Select Department --</option>
            {departments.map(d => <option key={d.id} value={d.id}>{d.name}</option>)}
          </select>
        </div>

        <div>
          <label className="form-label">📍 Location (Optional)</label>
          <select id="audit-loc-select" className="form-input"
            value={form.location_id}
            onChange={e => setForm({ ...form, location_id: e.target.value })}>
            <option value="">-- All Locations --</option>
            {locations.map(l => <option key={l.id} value={l.id}>{l.name}</option>)}
          </select>
        </div>

        <div>
          <label className="form-label">📋 Audit Findings *</label>
          <textarea className="form-input" rows={5}
            placeholder="Write detailed audit findings and observations..."
            style={{ resize:'vertical', minHeight:'130px' }}
            value={form.findings}
            onChange={e => setForm({ ...form, findings: e.target.value })} />
        </div>

        <div>
          <label className="form-label">
            🏅 Score (0-100)
            {form.score && (
              <span style={{ marginLeft:'10px', color: scoreColor, fontWeight:800 }}>
                {score}/100 — {score>=80?'Good ✅':score>=50?'Fair ⚠️':'Poor ❌'}
              </span>
            )}
          </label>
          <input
            id="audit-score-input"
            className="form-input"
            type="number" min="0" max="100"
            placeholder="Enter score out of 100"
            value={form.score}
            onChange={e => setForm({ ...form, score: e.target.value })}
          />
          {form.score && (
            <div style={{ marginTop:'8px', height:'8px', background:'#e2e8f0', borderRadius:'999px', overflow:'hidden' }}>
              <div style={{ height:'100%', width:`${score}%`, background: scoreColor, borderRadius:'999px', transition:'width 0.4s' }} />
            </div>
          )}
        </div>

        <button id="submit-audit-btn" type="submit" className="btn" disabled={loading} style={{
          minHeight:'58px', fontSize:'1.1rem', background:'#d97706', color:'white', borderRadius:'12px'
        }}>
          {loading ? 'Saving…' : <><Search size={20} /> Save Audit Report</>}
        </button>
      </form>
    </div>
  )
}
