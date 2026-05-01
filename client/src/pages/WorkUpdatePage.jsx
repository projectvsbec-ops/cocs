import { useState, useEffect } from 'react'
import { useAuth } from '../context/AuthContext'
import { useNavigate, useParams } from 'react-router-dom'
import { supabase } from '../utils/supabaseClient'
import toast from 'react-hot-toast'
import { Camera, Upload, CheckCircle, Clock, ArrowLeft, Send } from 'lucide-react'

const WORK_TYPES = [
  'Routine Maintenance', 'Electrical Repair', 'Plumbing Work',
  'Civil Work', 'IT Support', 'Security Check', 'Cleaning',
  'Equipment Inspection', 'Installation', 'Other'
]

export default function WorkUpdatePage() {
  const { user, isAdmin } = useAuth()
  const { id } = useParams()
  const navigate = useNavigate()
  
  const [locations, setLocations] = useState([])
  const [form, setForm] = useState({ 
    location_id: '', 
    work_type: '', 
    claim_status: 'Pending', 
    notes: '',
    workflow_status: isAdmin ? 'OPEN' : 'SUBMITTED'
  })
  const [postAsOpen, setPostAsOpen] = useState(isAdmin)
  const [photo, setPhoto] = useState(null)
  const [preview, setPreview] = useState(null)
  const [loading, setLoading] = useState(false)
  const [existingRecord, setExistingRecord] = useState(null)

  useEffect(() => {
    if (user) {
      let query = supabase.from('locations').select('*').order('name')
      // Show locations belonging to user's department OR global locations (null department)
      if (user.role === 'Manager' && user.department_id) {
        query = query.or(`department_id.eq.${user.department_id},department_id.is.null`)
      }
      query.then(({ data }) => setLocations(data || []))
    }

    if (id) {
      loadExistingRecord()
    }
  }, [id])

  const loadExistingRecord = async () => {
    const { data, error } = await supabase
      .from('work_updates')
      .select('*')
      .eq('id', id)
      .single()
    
    if (data) {
      setExistingRecord(data)
      setForm({
        location_id: data.location_id,
        work_type: data.work_type,
        claim_status: data.claim_status,
        notes: data.notes,
        workflow_status: data.workflow_status === 'REJECTED' ? 'RESUBMITTED' : data.workflow_status
      })
      if (data.photo_url) setPreview(data.photo_url)
    }
  }

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

    setLoading(true)
    try {
      let publicUrl = preview
      if (photo) {
        const fileExt = photo.name.split('.').pop()
        const fileName = `${Math.random()}.${fileExt}`
        const filePath = `work-updates/${fileName}`
        const { error: uploadError } = await supabase.storage.from('photos').upload(filePath, photo)
        if (uploadError) throw uploadError
        const { data: { publicUrl: url } } = supabase.storage.from('photos').getPublicUrl(filePath)
        publicUrl = url
      }

      const payload = {
        user_id: user.id,
        department_id: user.department_id,
        location_id: form.location_id,
        work_type: form.work_type,
        claim_status: form.claim_status,
        notes: form.notes,
        photo_url: publicUrl,
        workflow_status: form.workflow_status,
        last_transition_at: new Date().toISOString()
      }

      let error
      if (id) {
        const { error: updateError } = await supabase.from('work_updates').update(payload).eq('id', id)
        error = updateError
      } else {
        const { error: insertError } = await supabase.from('work_updates').insert([payload])
        error = insertError
      }

      if (error) throw error
      
      await supabase.from('activity_log').insert([{
        user_id: user.id,
        action_type: id ? 'RESUBMITTED' : 'SUBMITTED',
        entity_type: 'work',
        entity_id: id || null,
        detail: `${id ? 'Resubmitted' : 'Submitted'} work update: ${form.work_type}`
      }])

      toast.success(`✅ Work ${id ? 'resubmitted' : 'submitted'}!`)
      navigate('/dashboard')
    } catch (err) {
      console.error(err)
      toast.error(err.message || 'Submit failed')
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="page fade-in">
      <button onClick={() => navigate(-1)} className="btn-back">
        <ArrowLeft size={18} /> Back
      </button>

      <div style={{ marginBottom:'24px' }}>
        <h1 style={{ margin:0, fontSize:'1.6rem', fontWeight:800, color:'#1e293b' }}>
          {id ? '✏️ Resubmit Work' : '📋 New Work Submission'}
        </h1>
        <p style={{ margin:'4px 0 0', color:'#64748b' }}>
          {id ? 'Correct the issues and resubmit for review' : 'Fill in your daily operation details'}
        </p>
      </div>

      <form onSubmit={handleSubmit} style={{ display:'flex', flexDirection:'column', gap:'24px' }}>
        
        {/* Workflow Badge */}
        {id && existingRecord && (
          <div style={{ 
            padding:'12px 16px', borderRadius:'12px', background:'#fee2e2', color:'#b91c1c',
            border:'1px solid #fecaca', display:'flex', flexDirection:'column', gap:'4px'
          }}>
            <div style={{ fontWeight:800, fontSize:'0.85rem', textTransform:'uppercase' }}>Rejected Status</div>
            <div style={{ fontSize:'0.9rem' }}>💬 Feedback: {existingRecord.verify_comment || 'No comment provided'}</div>
          </div>
        )}

        {/* Admin Task Posting Toggle */}
        {isAdmin && !id && (
          <div className="card" style={{ padding:'20px', background:'#eff6ff', border:'1px solid #dbeafe' }}>
            <label style={{ display:'flex', alignItems:'center', gap:'12px', cursor:'pointer' }}>
              <input 
                type="checkbox" 
                checked={postAsOpen} 
                onChange={(e) => {
                  setPostAsOpen(e.target.checked)
                  setForm({ ...form, workflow_status: e.target.checked ? 'OPEN' : 'SUBMITTED' })
                }}
                style={{ width:'20px', height:'20px' }}
              />
              <div>
                <div style={{ fontWeight:800, color:'#1e40af' }}>Post as Open Task (Task Pool)</div>
                <div style={{ fontSize:'0.8rem', color:'#60a5fa' }}>Allow any Manager to claim and complete this work</div>
              </div>
            </label>
          </div>
        )}

        {/* Location & Type */}
        <div className="card" style={{ padding:'20px', display:'flex', flexDirection:'column', gap:'16px' }}>
          <div>
            <label className="form-label">📍 Location *</label>
            <select className="form-input" value={form.location_id} onChange={e => setForm({...form, location_id: e.target.value})}>
              <option value="">-- Select --</option>
              {locations.map(l => <option key={l.id} value={l.id}>{l.name}</option>)}
            </select>
          </div>
          <div>
            <label className="form-label">🔧 Work Type *</label>
            <select className="form-input" value={form.work_type} onChange={e => setForm({...form, work_type: e.target.value})}>
              <option value="">-- Select --</option>
              {WORK_TYPES.map(w => <option key={w} value={w}>{w}</option>)}
            </select>
          </div>
        </div>

        {/* Claim Status */}
        <div>
          <label className="form-label">📊 My Claim Status</label>
          <div className="grid-2">
            {['Completed', 'Pending'].map(s => (
              <button key={s} type="button" onClick={() => setForm({ ...form, claim_status: s })} style={{
                minHeight:'52px', borderRadius:'14px', fontWeight:700,
                cursor:'pointer', border:'2px solid',
                background: form.claim_status === s ? (s === 'Completed' ? '#dcfce7' : '#fef9c3') : 'white',
                borderColor: form.claim_status === s ? (s === 'Completed' ? '#16a34a' : '#d97706') : '#e2e8f0',
                color: form.claim_status === s ? (s === 'Completed' ? '#15803d' : '#b45309') : '#94a3b8',
                display:'flex', alignItems:'center', justifyContent:'center', gap:'8px'
              }}>
                {s === 'Completed' ? <CheckCircle size={20} /> : <Clock size={20} />} {s}
              </button>
            ))}
          </div>
        </div>

        {/* Evidence */}
        <div>
          <label className="form-label">📷 Evidence (Photo)</label>
          {preview ? (
            <div style={{ position:'relative' }}>
              <img src={preview} alt="Preview" style={{ width:'100%', maxHeight:'240px', objectFit:'cover', borderRadius:'16px' }} />
              <button type="button" onClick={() => { setPhoto(null); setPreview(null) }} className="btn-badge-overlay">Change</button>
            </div>
          ) : (
            <label className="upload-placeholder">
              <Camera size={40} color="#94a3b8" />
              <div style={{ fontWeight:700 }}>Upload Work Photo</div>
              <input type="file" accept="image/*" capture="environment" style={{ display:'none' }} onChange={handlePhoto} />
            </label>
          )}
        </div>

        {/* Notes */}
        <div>
          <label className="form-label">📝 Additional Notes</label>
          <textarea className="form-input" rows={4} placeholder="What was achieved?" value={form.notes} onChange={e => setForm({...form, notes: e.target.value})} />
        </div>

        <button type="submit" className="btn btn-primary" disabled={loading} style={{ minHeight:'60px', fontSize:'1.1rem' }}>
          {loading ? 'Processing…' : <><Send size={20} /> {id ? 'Resubmit for Review' : 'Submit for Admin Review'}</>}
        </button>
      </form>
    </div>
  )
}
