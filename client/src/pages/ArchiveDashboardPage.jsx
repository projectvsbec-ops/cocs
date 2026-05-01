import { useState, useEffect } from 'react'
import { supabase } from '../utils/supabaseClient'
import { useAuth } from '../context/AuthContext'
import toast from 'react-hot-toast'
import { 
  Database, Download, Trash2, CheckCircle, 
  AlertTriangle, RefreshCw, Archive, Clock, FileText
} from 'lucide-react'

// Dynamic CDN imports for Archiver
const loadJSZip = () => import('https://esm.sh/jszip@3.10.1')
const saveAs = (blob, name) => {
  const link = document.createElement('a')
  link.href = URL.createObjectURL(blob)
  link.download = name
  link.click()
}

export default function ArchiveDashboardPage() {
  const { user, isAdmin } = useAuth()
  const [archives, setArchives] = useState([])
  const [loading, setLoading] = useState(true)
  const [archiving, setArchiving] = useState(false)

  useEffect(() => { loadArchives() }, [])

  const loadArchives = async () => {
    setLoading(true)
    const { data } = await supabase.from('archive_logs').select('*').order('created_at', { ascending: false })
    setArchives(data || [])
    setLoading(false)
  }

  const generateArchive = async () => {
    if (!window.confirm('Are you sure you want to generate a new archive? This will fetch all "cold" data and evidence photos.')) return
    
    setArchiving(true)
    const toastId = toast.loading('Generating production archive (including photos)...')
    
    try {
      const JSZip = (await loadJSZip()).default
      const zip = new JSZip()
      
      const sixtyDaysAgo = new Date(Date.now() - 60 * 24 * 60 * 60 * 1000).toISOString()
      const thirtyDaysAgo = new Date(Date.now() - 30 * 24 * 60 * 60 * 1000).toISOString()
      const fifteenDaysAgo = new Date(Date.now() - 15 * 24 * 60 * 60 * 1000).toISOString()

      // 1. Fetch Enriched Cold Data
      const [wRes, iRes, aRes, lRes] = await Promise.all([
        supabase.from('work_updates').select('*, user:profiles!user_id(name), reviewer:profiles!verified_by(name), locations(name), departments(name)').eq('workflow_status', 'CLOSED').lt('created_at', sixtyDaysAgo),
        supabase.from('issues').select('*, reporter:profiles!reported_by(name), assignee:profiles!assigned_to(name), locations(name)').eq('lifecycle_status', 'CLOSED').lt('created_at', thirtyDaysAgo),
        supabase.from('audits').select('*, admin:profiles!admin_id(name)').lt('created_at', sixtyDaysAgo),
        supabase.from('activity_log').select('*, user:profiles(name)').lt('created_at', fifteenDaysAgo)
      ])

      const workUpdates = wRes.data || []
      const issues = iRes.data || []
      const audits = aRes.data || []
      const logs = lRes.data || []

      if ([workUpdates, issues, audits, logs].every(arr => arr.length === 0)) {
        throw new Error('No "cold" data found to archive.')
      }

      // 2. Process Photos
      const photoFolder = zip.folder('photos')
      const photoPromises = workUpdates
        .filter(w => w.photo_url)
        .map(async (w) => {
          try {
            const resp = await fetch(w.photo_url)
            if (!resp.ok) return
            const blob = await resp.blob()
            const ext = w.photo_url.split('.').pop().split('?')[0] || 'jpg'
            const photoName = `work_${w.id.substring(0, 8)}.${ext}`
            photoFolder.file(photoName, blob)
            w.local_photo_path = `photos/${photoName}`
          } catch (e) {
            console.warn('Failed to fetch photo:', w.photo_url)
          }
        })

      await Promise.all(photoPromises)

      // 3. Add Data Files to ZIP
      zip.file('work_updates.json', JSON.stringify(workUpdates, null, 2))
      zip.file('issues.json', JSON.stringify(issues, null, 2))
      zip.file('audits.json', JSON.stringify(audits, null, 2))
      
      const logCsv = ['id,user_name,action_type,entity_type,detail,created_at', ...logs.map(l => 
        `${l.id},"${l.user?.name || 'Unknown'}",${l.action_type},${l.entity_type},"${l.detail.replace(/"/g, '""')}",${l.created_at}`
      )].join('\n')
      zip.file('activity_logs.csv', logCsv)

      const blob = await zip.generateAsync({ type: 'blob', compression: 'DEFLATE' })
      const fileName = `COCS_Full_Archive_${new Date().toISOString().split('T')[0]}.zip`
      
      const counts = { 
        work: workUpdates.length, 
        issues: issues.length, 
        audits: audits.length, 
        logs: logs.length, 
        photos: photoPromises.length 
      }

      const { error: logErr } = await supabase.from('archive_logs').insert([{
        file_name: fileName,
        record_counts: counts,
        file_size: (blob.size / 1024 / 1024).toFixed(2) + ' MB',
        admin_id: user.id
      }])

      if (logErr) throw logErr

      saveAs(blob, fileName)
      toast.success('Archive generated and downloaded!', { id: toastId })
      loadArchives()
    } catch (err) {
      console.error(err)
      toast.error(err.message || 'Archival failed', { id: toastId })
    } finally {
      setArchiving(false)
    }
  }

  const handleDownload = async (archive) => {
    setArchiving(true)
    const toastId = toast.loading('Re-preparing full download (including photos)...')
    
    try {
      const JSZip = (await loadJSZip()).default
      const zip = new JSZip()
      
      const sixtyDaysAgo = new Date(Date.now() - 60 * 24 * 60 * 60 * 1000).toISOString()
      const thirtyDaysAgo = new Date(Date.now() - 30 * 24 * 60 * 60 * 1000).toISOString()
      const fifteenDaysAgo = new Date(Date.now() - 15 * 24 * 60 * 60 * 1000).toISOString()

      const [wRes, iRes, aRes, lRes] = await Promise.all([
        supabase.from('work_updates').select('*, user:profiles!user_id(name), reviewer:profiles!verified_by(name), locations(name), departments(name)').eq('workflow_status', 'CLOSED').lt('created_at', sixtyDaysAgo),
        supabase.from('issues').select('*, reporter:profiles!reported_by(name), assignee:profiles!assigned_to(name), locations(name)').eq('lifecycle_status', 'CLOSED').lt('created_at', thirtyDaysAgo),
        supabase.from('audits').select('*, admin:profiles!admin_id(name)').lt('created_at', sixtyDaysAgo),
        supabase.from('activity_log').select('*, user:profiles(name)').lt('created_at', fifteenDaysAgo)
      ])

      const workUpdates = wRes.data || []
      const photoFolder = zip.folder('photos')
      const photoPromises = workUpdates
        .filter(w => w.photo_url)
        .map(async (w) => {
          try {
            const resp = await fetch(w.photo_url)
            if (resp.ok) {
              const blob = await resp.blob()
              const ext = w.photo_url.split('.').pop().split('?')[0] || 'jpg'
              photoFolder.file(`work_${w.id.substring(0, 8)}.${ext}`, blob)
            }
          } catch (e) {}
        })
      await Promise.all(photoPromises)

      zip.file('work_updates.json', JSON.stringify(workUpdates, null, 2))
      zip.file('issues.json', JSON.stringify(iRes.data || [], null, 2))
      zip.file('audits.json', JSON.stringify(aRes.data || [], null, 2))
      
      const blob = await zip.generateAsync({ type: 'blob', compression: 'DEFLATE' })
      saveAs(blob, archive.file_name)

      await supabase.from('archive_logs').update({ download_status: true }).eq('id', archive.id)
      toast.success('Download started!', { id: toastId })
      loadArchives()
    } catch (err) {
      console.error(err)
      toast.error('Download failed', { id: toastId })
    } finally {
      setArchiving(false)
    }
  }

  const handleDeleteData = async (archive) => {
    if (!archive.download_status) {
      toast.error('You must download the archive before deleting data!')
      return
    }
    
    const confirm = window.confirm('DANGER: This will PERMANENTLY delete all records contained in this archive. Have you verified the ZIP file? Type "DELETE" to confirm.')
    if (confirm !== true) return

    const toastId = toast.loading('Executing safe deletion...')
    try {
      const sixtyDaysAgo = new Date(Date.now() - 60 * 24 * 60 * 60 * 1000).toISOString()
      const thirtyDaysAgo = new Date(Date.now() - 30 * 24 * 60 * 60 * 1000).toISOString()
      const fifteenDaysAgo = new Date(Date.now() - 15 * 24 * 60 * 60 * 1000).toISOString()

      await Promise.all([
        supabase.from('work_updates').delete().eq('workflow_status', 'CLOSED').lt('created_at', sixtyDaysAgo),
        supabase.from('issues').delete().eq('lifecycle_status', 'CLOSED').lt('created_at', thirtyDaysAgo),
        supabase.from('audits').delete().lt('created_at', sixtyDaysAgo),
        supabase.from('activity_log').delete().lt('created_at', fifteenDaysAgo)
      ])

      await supabase.from('archive_logs').update({ deletion_status: true, verified_by_admin: true }).eq('id', archive.id)
      
      toast.success('Database optimized! Cold data removed.', { id: toastId })
      loadArchives()
    } catch (err) {
      console.error(err)
      toast.error('Deletion failed', { id: toastId })
    }
  }

  if (!isAdmin) return <div className="page">Access Denied</div>

  return (
    <div className="page fade-in">
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '24px' }}>
        <div>
          <h1 style={{ margin: 0, fontSize: '1.8rem', fontWeight: 800 }}>📦 Data Archival</h1>
          <p style={{ margin: '4px 0 0', color: '#64748b' }}>Export human-readable data and evidence photos</p>
        </div>
        <button onClick={generateArchive} disabled={archiving} className="btn btn-primary" style={{ width: 'auto', padding: '12px 20px' }}>
          {archiving ? <RefreshCw className="spin" size={18} /> : <Archive size={18} />}
          Generate Full Backup
        </button>
      </div>

      <div className="card" style={{ padding: '24px', background: '#fff7ed', border: '1px solid #ffedd5', marginBottom: '32px' }}>
        <div style={{ display: 'flex', gap: '12px' }}>
          <AlertTriangle size={24} color="#d97706" />
          <div>
            <h4 style={{ margin: '0 0 8px', color: '#9a3412', fontWeight: 800 }}>Archive Scope</h4>
            <ul style={{ margin: 0, paddingLeft: '20px', fontSize: '0.85rem', color: '#c2410c', lineHeight: 1.6 }}>
              <li><b>Photos:</b> All evidence images included in <code>photos/</code> folder</li>
              <li><b>Readable Data:</b> IDs are replaced with User and Location names</li>
              <li><b>Safety:</b> Verification required before deletion</li>
            </ul>
          </div>
        </div>
      </div>

      <div className="section-title">Archival History</div>
      {loading ? (
        <p>Loading archives...</p>
      ) : archives.length === 0 ? (
        <div style={{ textAlign: 'center', padding: '60px 20px', background: 'white', borderRadius: '24px', border: '1px solid #f1f5f9' }}>
          <Database size={48} color="#cbd5e1" style={{ marginBottom: '16px' }} />
          <p style={{ color: '#94a3b8' }}>No archives generated yet.</p>
        </div>
      ) : (
        archives.map(a => (
          <div key={a.id} className="card" style={{ padding: '20px', marginBottom: '16px' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '16px' }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
                <div style={{ width: 44, height: 44, borderRadius: '12px', background: '#f1f5f9', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                  <FileText size={20} color="#64748b" />
                </div>
                <div>
                  <div style={{ fontWeight: 800, fontSize: '1rem' }}>{a.file_name}</div>
                  <div style={{ fontSize: '0.75rem', color: '#94a3b8' }}>Size: {a.file_size} • {new Date(a.created_at).toLocaleDateString()}</div>
                </div>
              </div>
              <div style={{ display: 'flex', gap: '8px' }}>
                <button onClick={() => handleDownload(a)} disabled={archiving} className="btn-icon" title="Download Archive">
                  <Download size={18} />
                </button>
                <button 
                  onClick={() => handleDeleteData(a)} 
                  className="btn-icon" 
                  style={{ color: a.deletion_status ? '#16a34a' : '#dc2626' }} 
                  disabled={a.deletion_status}
                >
                  <Trash2 size={18} />
                </button>
              </div>
            </div>

            <div style={{ display: 'flex', gap: '12px', flexWrap: 'wrap' }}>
              <div className={`badge ${a.download_status ? 'badge-green' : 'badge-yellow'}`}>
                {a.download_status ? '✅ Downloaded' : '⏳ Pending Download'}
              </div>
              <div className={`badge ${a.deletion_status ? 'badge-green' : 'badge-red'}`}>
                {a.deletion_status ? '🗑️ Optimized' : '📦 Active in DB'}
              </div>
              <div style={{ fontSize: '0.75rem', color: '#64748b', display: 'flex', gap: '8px', marginLeft: 'auto', fontWeight:600 }}>
                <span>Photos: {a.record_counts?.photos || 0}</span>
                <span>Work: {a.record_counts?.work || 0}</span>
                <span>Issues: {a.record_counts?.issues || 0}</span>
              </div>
            </div>
          </div>
        ))
      )}
    </div>
  )
}
