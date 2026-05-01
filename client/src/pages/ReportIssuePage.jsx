import { useState, useEffect } from 'react'
import { useAuth } from '../context/AuthContext'
import { useNavigate } from 'react-router-dom'
import { supabase } from '../utils/supabaseClient'
import toast from 'react-hot-toast'
import { AlertTriangle, Camera, Upload, ArrowLeft, Info } from 'lucide-react'

const ISSUE_TYPES = [
  'Power Failure', 'Water Leakage', 'Network Issue', 'Equipment Damage',
  'Security Breach', 'Fire Hazard', 'Structural Damage', 'Cleanliness',
  'Vehicle Breakdown', 'AC/Cooling Issue', 'Other'
]

export default function ReportIssuePage() {
  const { user } = useAuth()
  const navigate = useNavigate()
  const [locations, setLocations] = useState([])
  const [form, setForm] = useState({ location_id: '', issue_type: '', priority: '', description: '' })
  const [photo, setPhoto] = useState(null)
  const [preview, setPreview] = useState(null)
  const [loading, setLoading] = useState(false)

  useEffect(() => {
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
  }, [])

  const handlePhoto = (e) => {
    const file = e.target.files[0]
    if (!file) return
    if (file.size > 10 * 1024 * 1024) { toast.error('Photo must be under 10MB'); return }
    setPhoto(file)
    setPreview(URL.createObjectURL(file))
  }

  const handleSubmit = async (e) => {
    e.preventDefault()
    if (!form.location_id) { toast.error('Please select a location'); return }
    if (!form.issue_type) { toast.error('Please select an issue type'); return }
    if (!form.priority) { toast.error('Please select priority level'); return }
    
    // SLA Enforcement: Photo mandatory for HIGH priority
    if (form.priority === 'High' && !photo) {
      toast.error('Evidence photo is mandatory for HIGH priority issues');
      return
    }

    setLoading(true)
    try {
      let publicUrl = null
      if (photo) {
        const fileExt = photo.name.split('.').pop()
        const fileName = `${Math.random()}.${fileExt}`
        const filePath = `issues/${fileName}`
        const { error: uploadError } = await supabase.storage.from('photos').upload(filePath, photo)
        if (uploadError) throw uploadError
        const { data } = supabase.storage.from('photos').getPublicUrl(filePath)
        publicUrl = data.publicUrl
      }

      const { error: insertError } = await supabase
        .from('issues')
        .insert([{
          reported_by: user.id,
          department_id: user.department_id,
          location_id: form.location_id,
          issue_type: form.issue_type,
          priority: form.priority,
          description: form.description,
          photo_url: publicUrl,
          lifecycle_status: 'OPEN'
        }])

      if (insertError) throw insertError

      await supabase.from('activity_log').insert([{
        user_id: user.id,
        action_type: 'ISSUE_REPORT',
        entity_type: 'issue',
        detail: `Reported ${form.priority} priority issue: ${form.issue_type}`,
        metadata: { priority: form.priority, sla_hours: form.priority === 'High' ? 2 : form.priority === 'Medium' ? 6 : 24 }
      }])

      toast.success('🚨 Issue reported and SLA tracking started!')
      navigate('/dashboard')
    } catch (err) {
      console.error(err)
      toast.error(err.message || 'Submit failed')
    } finally {
      setLoading(false)
    }
  }

  const priorities = [
    { val:'High',   color:'#dc2626', bg:'#fee2e2', emoji:'🔴', sla: '2h' },
    { val:'Medium', color:'#d97706', bg:'#fef9c3', emoji:'🟡', sla: '6h' },
    { val:'Low',    color:'#16a34a', bg:'#dcfce7', emoji:'🟢', sla: '24h' },
  ]

  return (
    <div className="page fade-in">
      <button onClick={() => navigate(-1)} className="btn-back">
        <ArrowLeft size={18} /> Back
      </button>

      <div style={{ marginBottom:'24px' }}>
        <h1 style={{ margin:0, fontSize:'1.6rem', fontWeight:800, color:'#1e293b' }}>🚨 Report Issue</h1>
        <p style={{ margin:'4px 0 0', color:'#64748b' }}>Precision reporting for campus safety and maintenance</p>
      </div>

      <div style={{ 
        padding:'14px', background:'#eff6ff', borderRadius:'14px', 
        display:'flex', gap:'12px', marginBottom:'24px', border:'1px solid #dbeafe'
      }}>
        <Info size={24} color="#2563eb" />
        <div style={{ fontSize:'0.85rem', color:'#1e40af', lineHeight:1.5 }}>
          <strong>SLA Note:</strong> High priority issues are monitored for resolution within 2 hours. Medium issues within 6 hours. Evidence is required for High priority.
        </div>
      </div>

      <form onSubmit={handleSubmit} style={{ display:'flex', flexDirection:'column', gap:'20px' }}>

        <div className="card" style={{ padding:'20px', display:'flex', flexDirection:'column', gap:'16px' }}>
          <div>
            <label className="form-label">📍 Location *</label>
            <select className="form-input" value={form.location_id} onChange={e => setForm({...form, location_id: e.target.value})}>
              <option value="">-- Select --</option>
              {locations.map(l => <option key={l.id} value={l.id}>{l.name}</option>)}
            </select>
          </div>
          <div>
            <label className="form-label">⚠️ Issue Type *</label>
            <select className="form-input" value={form.issue_type} onChange={e => setForm({...form, issue_type: e.target.value})}>
              <option value="">-- Select --</option>
              {ISSUE_TYPES.map(t => <option key={t} value={t}>{t}</option>)}
            </select>
          </div>
        </div>

        <div>
          <label className="form-label">🎯 Severity & SLA *</label>
          <div className="grid-3">
            {priorities.map(p => (
              <button key={p.val} type="button" onClick={() => setForm({ ...form, priority: p.val })} style={{
                minHeight:'70px', borderRadius:'16px', fontWeight:700,
                cursor:'pointer', border:'2px solid',
                background: form.priority === p.val ? p.bg : 'white',
                borderColor: form.priority === p.val ? p.color : '#e2e8f0',
                color: form.priority === p.val ? p.color : '#94a3b8',
                display:'flex', flexDirection:'column', alignItems:'center', justifyContent:'center'
              }}>
                <span style={{ fontSize:'1.2rem' }}>{p.emoji}</span>
                <span style={{ fontSize:'0.8rem' }}>{p.val}</span>
                <span style={{ fontSize:'0.65rem', opacity:0.7 }}>SLA: {p.sla}</span>
              </button>
            ))}
          </div>
        </div>

        <div>
          <label className="form-label">📷 Evidence Photo {form.priority === 'High' ? '*' : '(Optional)'}</label>
          {preview ? (
            <div style={{ position:'relative' }}>
              <img src={preview} alt="Preview" style={{ width:'100%', maxHeight:'240px', objectFit:'cover', borderRadius:'16px' }} />
              <button type="button" onClick={() => { setPhoto(null); setPreview(null) }} className="btn-badge-overlay">Change</button>
            </div>
          ) : (
            <label className={`upload-placeholder ${form.priority === 'High' ? 'mandatory-border' : ''}`}>
              <Camera size={36} color={form.priority === 'High' ? '#dc2626' : '#94a3b8'} />
              <div style={{ fontWeight:700 }}>{form.priority === 'High' ? 'Evidence Required' : 'Take/Upload Photo'}</div>
              <input type="file" accept="image/*" capture="environment" style={{ display:'none' }} onChange={handlePhoto} />
            </label>
          )}
        </div>

        <div>
          <label className="form-label">📝 Detailed Description</label>
          <textarea className="form-input" rows={4} placeholder="What exactly is the problem?" value={form.description} onChange={e => setForm({...form, description: e.target.value})} />
        </div>

        <button type="submit" className="btn" disabled={loading} style={{
          marginTop:'12px', fontSize:'1.1rem', minHeight:'60px',
          background:'#dc2626', color:'white', borderRadius:'16px', fontWeight:800
        }}>
          {loading ? 'Submitting…' : <><AlertTriangle size={20} /> Deploy Issue Report</>}
        </button>
      </form>
    </div>
  )
}
