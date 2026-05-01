import { useState, useEffect } from 'react'
import { useAuth } from '../context/AuthContext'
import { useNavigate } from 'react-router-dom'
import { supabase } from '../utils/supabaseClient'
import toast from 'react-hot-toast'
import { Camera, Upload, CheckCircle, Clock, ArrowLeft } from 'lucide-react'

const WORK_TYPES = [
  'Routine Maintenance', 'Electrical Repair', 'Plumbing Work',
  'Civil Work', 'IT Support', 'Security Check', 'Cleaning',
  'Equipment Inspection', 'Installation', 'Other'
]

export default function WorkUpdatePage() {
  const { user } = useAuth()
  const navigate = useNavigate()
  const [locations, setLocations] = useState([])
  const [form, setForm] = useState({ 
    location_id: '', 
    work_type: '', 
    status: '', 
    notes: '' 
  })
  const [photo, setPhoto] = useState(null)
  const [preview, setPreview] = useState(null)
  const [loading, setLoading] = useState(false)

  // Fetch all locations
  useEffect(() => {
    async function fetchLocations() {
      const { data, error } = await supabase
        .from('locations')
        .select('*')
        .order('name')

      if (error) {
        console.error('Error fetching locations:', error)
        toast.error('Could not load locations')
      } else {
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
    }
    
    fetchLocations()
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
    if (!form.work_type) { toast.error('Please select a work type'); return }
    if (!form.status) { toast.error('Please select a status'); return }
    if (!photo) { toast.error('Please take or upload a photo'); return }

    setLoading(true)
    try {
      // 1. Upload photo to Supabase Storage
      const fileExt = photo.name.split('.').pop()
      const fileName = `${Math.random()}.${fileExt}`
      const filePath = `work-updates/${fileName}`

      const { error: uploadError } = await supabase.storage
        .from('photos')
        .upload(filePath, photo)

      if (uploadError) throw uploadError

      // Get public URL
      const { data: { publicUrl } } = supabase.storage
        .from('photos')
        .getPublicUrl(filePath)

      // 2. Insert record into database
      const { error: insertError } = await supabase
        .from('work_updates')
        .insert([{
          user_id: user.id,
          department_id: user.department_id,
          location_id: form.location_id,
          work_type: form.work_type,
          status: form.status,
          notes: form.notes,
          photo_url: publicUrl,
          verified_status: 'Pending'
        }])

      if (insertError) throw insertError
      
      // Log activity
      await supabase.from('activity_log').insert([{
        user_id: user.id,
        action: 'WORK_UPDATE',
        detail: `Submitted work update: ${form.work_type} - ${form.status}`
      }])

      toast.success('✅ Work update submitted!')
      navigate('/my-tasks')
    } catch (err) {
      console.error(err)
      toast.error(err.message || 'Submit failed. Try again.')
    } finally {
      setLoading(false)
    }
  }

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
        <h1 style={{ margin:0, fontSize:'1.5rem', fontWeight:800 }}>📋 Update Work</h1>
        <p style={{ margin:'4px 0 0', color:'#64748b' }}>Fill in your work details for today</p>
      </div>

      <form onSubmit={handleSubmit} style={{ display:'flex', flexDirection:'column', gap:'20px' }}>

        {/* Department */}
        <div className="card" style={{ padding:'16px' }}>
          <label className="form-label">🏢 Department</label>
          <div style={{
            padding:'14px 16px', background:'#f8fafc', borderRadius:'12px',
            fontWeight:600, color:'#475569', border:'2px solid #e2e8f0'
          }}>
            {user?.department_name || 'My Department'}
          </div>
        </div>

        {/* Location */}
        <div>
          <label className="form-label">📍 Location *</label>
          <select id="location-select" className="form-input"
            value={form.location_id}
            onChange={e => setForm({ ...form, location_id: e.target.value })}>
            <option value="">-- Select Location --</option>
            {locations.map(l => <option key={l.id} value={l.id}>{l.name}</option>)}
          </select>
        </div>

        {/* Work Type */}
        <div>
          <label className="form-label">🔧 Work Type *</label>
          <select id="work-type-select" className="form-input"
            value={form.work_type}
            onChange={e => setForm({ ...form, work_type: e.target.value })}>
            <option value="">-- Select Work Type --</option>
            {WORK_TYPES.map(w => <option key={w} value={w}>{w}</option>)}
          </select>
        </div>

        {/* Status */}
        <div>
          <label className="form-label">📊 Status *</label>
          <div className="grid-2">
            {['Completed', 'Pending'].map(s => (
              <button key={s} type="button" onClick={() => setForm({ ...form, status: s })} style={{
                minHeight:'52px', borderRadius:'12px', fontWeight:700, fontSize:'1rem',
                cursor:'pointer', border:'2px solid',
                background: form.status === s ? (s === 'Completed' ? '#dcfce7' : '#fef9c3') : 'white',
                borderColor: form.status === s ? (s === 'Completed' ? '#16a34a' : '#d97706') : '#e2e8f0',
                color: form.status === s ? (s === 'Completed' ? '#15803d' : '#b45309') : '#94a3b8',
                display:'flex', alignItems:'center', justifyContent:'center', gap:'8px'
              }}>
                {s === 'Completed' ? <CheckCircle size={20} /> : <Clock size={20} />} {s}
              </button>
            ))}
          </div>
        </div>

        {/* Photo */}
        <div>
          <label className="form-label">📷 Photo * (Mandatory)</label>
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
              gap:'10px', minHeight:'140px', border:'2px dashed #cbd5e1', borderRadius:'14px',
              cursor:'pointer', background:'#f8fafc', color:'#64748b'
            }}>
              <Camera size={36} color="#94a3b8" />
              <div style={{ fontWeight:600 }}>Tap to take / upload photo</div>
              <div style={{ fontSize:'0.78rem' }}>JPG, PNG, WEBP — max 10MB</div>
              <input type="file" accept="image/*" capture="environment"
                style={{ display:'none' }} onChange={handlePhoto} />
            </label>
          )}
        </div>

        {/* Notes */}
        <div>
          <label className="form-label">📝 Notes (Optional)</label>
          <textarea className="form-input" rows={3} placeholder="Any extra details..."
            style={{ resize:'vertical', minHeight:'90px' }}
            value={form.notes}
            onChange={e => setForm({ ...form, notes: e.target.value })} />
        </div>

        <button id="submit-work-btn" type="submit" className="btn btn-primary" disabled={loading}
          style={{ marginTop:'4px', fontSize:'1.1rem', minHeight:'58px' }}>
          {loading ? 'Submitting…' : <><Upload size={20} /> Submit Work Update</>}
        </button>
      </form>
    </div>
  )
}
