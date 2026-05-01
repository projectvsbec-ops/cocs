import { useState, useEffect } from 'react'
import { useAuth } from '../context/AuthContext'
import { useNavigate } from 'react-router-dom'
import { supabase } from '../utils/supabaseClient'
import toast from 'react-hot-toast'
import { AlertTriangle, Camera, Upload, ArrowLeft } from 'lucide-react'

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
    supabase
      .from('locations')
      .select('*')
      .order('name')
      .then(({ data, error }) => {
        if (error) toast.error('Could not load locations')
        else {
          const uniqueLocs = []
          const seen = new Set()
          for (const loc of (data || [])) {
            if (!seen.has(loc.name)) {
              seen.add(loc.name)
              uniqueLocs.push(loc)
            }
          }
          setLocations(uniqueLocs)
        }
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
    
    setLoading(true)
    try {
      let publicUrl = null

      if (photo) {
        const fileExt = photo.name.split('.').pop()
        const fileName = `${Math.random()}.${fileExt}`
        const filePath = `issues/${fileName}`

        const { error: uploadError } = await supabase.storage
          .from('photos')
          .upload(filePath, photo)

        if (uploadError) throw uploadError

        const { data } = supabase.storage
          .from('photos')
          .getPublicUrl(filePath)
        
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
          status: 'Open'
        }])

      if (insertError) throw insertError

      await supabase.from('activity_log').insert([{
        user_id: user.id,
        action: 'ISSUE_REPORT',
        detail: `Reported ${form.priority} priority issue: ${form.issue_type}`
      }])

      toast.success('🚨 Issue reported successfully!')
      navigate('/my-tasks')
    } catch (err) {
      console.error(err)
      toast.error(err.message || 'Submit failed. Try again.')
    } finally {
      setLoading(false)
    }
  }

  const priorities = [
    { val:'High',   color:'#dc2626', bg:'#fee2e2', emoji:'🔴' },
    { val:'Medium', color:'#d97706', bg:'#fef9c3', emoji:'🟡' },
    { val:'Low',    color:'#16a34a', bg:'#dcfce7', emoji:'🟢' },
  ]

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
        <h1 style={{ margin:0, fontSize:'1.5rem', fontWeight:800 }}>🚨 Report Issue</h1>
        <p style={{ margin:'4px 0 0', color:'#64748b' }}>Describe the problem so it can be fixed quickly</p>
      </div>

      <form onSubmit={handleSubmit} style={{ display:'flex', flexDirection:'column', gap:'20px' }}>

        {/* Department */}
        <div className="card" style={{ padding:'16px' }}>
          <label className="form-label">🏢 Department</label>
          <div style={{
            padding:'14px 16px', background:'#f8fafc', borderRadius:'12px',
            fontWeight:600, color:'#475569', border:'2px solid #e2e8f0'
          }}>
            {user?.department_name}
          </div>
        </div>

        {/* Location */}
        <div>
          <label className="form-label">📍 Location *</label>
          <select id="issue-location-select" className="form-input"
            value={form.location_id}
            onChange={e => setForm({ ...form, location_id: e.target.value })}>
            <option value="">-- Select Location --</option>
            {locations.map(l => <option key={l.id} value={l.id}>{l.name}</option>)}
          </select>
        </div>

        {/* Issue Type */}
        <div>
          <label className="form-label">⚠️ Issue Type *</label>
          <select id="issue-type-select" className="form-input"
            value={form.issue_type}
            onChange={e => setForm({ ...form, issue_type: e.target.value })}>
            <option value="">-- Select Issue Type --</option>
            {ISSUE_TYPES.map(t => <option key={t} value={t}>{t}</option>)}
          </select>
        </div>

        {/* Priority */}
        <div>
          <label className="form-label">🎯 Priority Level *</label>
          <div className="grid-3">
            {priorities.map(p => (
              <button key={p.val} type="button" onClick={() => setForm({ ...form, priority: p.val })} style={{
                minHeight:'56px', borderRadius:'12px', fontWeight:700,
                cursor:'pointer', border:'2px solid',
                background: form.priority === p.val ? p.bg : 'white',
                borderColor: form.priority === p.val ? p.color : '#e2e8f0',
                color: form.priority === p.val ? p.color : '#94a3b8',
                display:'flex', flexDirection:'column', alignItems:'center', justifyContent:'center', gap:'2px'
              }}>
                <span style={{ fontSize:'1.3rem' }}>{p.emoji}</span>
                <span style={{ fontSize:'0.8rem' }}>{p.val}</span>
              </button>
            ))}
          </div>
        </div>

        {/* Photo (optional for issues) */}
        <div>
          <label className="form-label">📷 Photo (Optional)</label>
          {preview ? (
            <div style={{ position:'relative' }}>
              <img src={preview} alt="Preview" style={{
                width:'100%', maxHeight:'220px', objectFit:'cover',
                borderRadius:'14px', border:'2px solid #e2e8f0'
              }} />
              <button type="button" onClick={() => { setPhoto(null); setPreview(null) }} style={{
                position:'absolute', top:'10px', right:'10px',
                background:'rgba(0,0,0,0.6)', color:'white', border:'none',
                borderRadius:'8px', padding:'6px 12px', cursor:'pointer', fontWeight:600
              }}>Change</button>
            </div>
          ) : (
            <label style={{
              display:'flex', flexDirection:'column', alignItems:'center', justifyContent:'center',
              gap:'10px', minHeight:'120px', border:'2px dashed #fca5a5', borderRadius:'14px',
              cursor:'pointer', background:'#fff5f5', color:'#ef4444'
            }}>
              <Camera size={32} color="#fca5a5" />
              <div style={{ fontWeight:600, color:'#94a3b8' }}>Add a photo of the issue</div>
              <input type="file" accept="image/*" capture="environment"
                style={{ display:'none' }} onChange={handlePhoto} />
            </label>
          )}
        </div>

        {/* Description */}
        <div>
          <label className="form-label">📝 Description (Optional)</label>
          <textarea className="form-input" rows={3} placeholder="Describe the issue in detail..."
            style={{ resize:'vertical', minHeight:'90px' }}
            value={form.description}
            onChange={e => setForm({ ...form, description: e.target.value })} />
        </div>

        <button id="submit-issue-btn" type="submit" className="btn" disabled={loading} style={{
          marginTop:'4px', fontSize:'1.1rem', minHeight:'58px',
          background:'#dc2626', color:'white', borderRadius:'12px'
        }}>
          {loading ? 'Submitting…' : <><AlertTriangle size={20} /> Report This Issue</>}
        </button>
      </form>
    </div>
  )
}
