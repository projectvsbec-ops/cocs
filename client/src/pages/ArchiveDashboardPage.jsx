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
      
      const thirtyDaysAgo = new Date(Date.now() - 30 * 24 * 60 * 60 * 1000).toISOString()

      // 1. Fetch Enriched Cold Data (Unified 30 Days)
      const [wRes, iRes, aRes, lRes] = await Promise.all([
        supabase.from('work_updates').select('*, user:profiles!user_id(name), reviewer:profiles!verified_by(name), locations(name), departments(name)').eq('workflow_status', 'CLOSED').lt('created_at', thirtyDaysAgo),
        supabase.from('issues').select('*, reporter:profiles!reported_by(name), assignee:profiles!assigned_to(name), locations(name)').eq('lifecycle_status', 'CLOSED').lt('created_at', thirtyDaysAgo),
        supabase.from('audits').select('*, admin:profiles!admin_id(name)').lt('created_at', thirtyDaysAgo),
        supabase.from('activity_log').select('*, user:profiles(name)').lt('created_at', thirtyDaysAgo)
      ])

      const workUpdates = wRes.data || []
      const issues = iRes.data || []
      const audits = aRes.data || []
      const logs = lRes.data || []

      if ([workUpdates, issues, audits, logs].every(arr => arr.length === 0)) {
        throw new Error('No "cold" data found to archive.')
      }

      // 2. Create Hierarchical Folders
      const workFolder = zip.folder('Operations_Work')
      const issuesFolder = zip.folder('Maintenance_Issues')
      const auditsFolder = zip.folder('Institutional_Audits')
      const logsFolder = zip.folder('Security_Logs')
      
      const workPhotos = workFolder.folder('Work_Photos')
      const issuePhotos = issuesFolder.folder('Issue_Photos')

      // 3. Process Operations Work (with solver/reviewer details)
      const workReport = workUpdates.map(w => ({
        id: w.id,
        created_at: w.created_at,
        closed_at: w.last_transition_at || w.updated_at,
        type: w.work_type,
        location: w.locations?.name || 'Global',
        department: w.departments?.name || 'N/A',
        submitted_by: w.user?.name || 'Unknown',
        verified_by: w.reviewer?.name || 'Pending/N/A',
        claim_status: w.claim_status,
        workflow_status: w.workflow_status,
        admin_feedback: w.verify_comment || 'No feedback',
        notes: w.notes,
        photo_filename: w.photo_url ? `work_${w.id.substring(0, 8)}.jpg` : 'None'
      }))

      const workPhotoPromises = workUpdates
        .filter(w => w.photo_url)
        .map(async (w) => {
          try {
            const resp = await fetch(w.photo_url)
            if (resp.ok) {
              const blob = await resp.blob()
              const ext = w.photo_url.split('.').pop().split('?')[0] || 'jpg'
              workPhotos.file(`work_${w.id.substring(0, 8)}.${ext}`, blob)
            }
          } catch (e) {}
        })

      // 4. Process Maintenance Issues
      const issueReport = issues.map(i => ({
        id: i.id,
        reported_at: i.created_at,
        resolved_at: i.updated_at,
        type: i.issue_type,
        priority: i.priority,
        location: i.locations?.name || 'Global',
        reported_by: i.reporter?.name || 'Unknown',
        assigned_to: i.assignee?.name || 'Unassigned',
        lifecycle_status: i.lifecycle_status,
        description: i.description,
        resolution_notes: i.resolution_notes || 'N/A'
      }))

      // 5. Build Final ZIP
      await Promise.all(workPhotoPromises)

      zip.file('Archive_Metadata.json', JSON.stringify({
        generated_by: user.name,
        role: user.role,
        timestamp: new Date().toISOString(),
        record_counts: { work: workUpdates.length, issues: issues.length, audits: audits.length, logs: logs.length }
      }, null, 2))

      workFolder.file('Work_Master_Report.json', JSON.stringify(workReport, null, 2))
      issuesFolder.file('Issues_Master_Report.json', JSON.stringify(issueReport, null, 2))
      auditsFolder.file('Audits_Master_Report.json', JSON.stringify(audits, null, 2))
      
      const logCsv = ['Timestamp,User,Action,Entity,Details', ...logs.map(l => 
        `"${l.created_at}","${l.user?.name || 'System'}","${l.action_type}","${l.entity_type}","${l.detail.replace(/"/g, '""')}"`
      )].join('\n')
      logsFolder.file('System_Activity_Trace.csv', logCsv)

      const blob = await zip.generateAsync({ type: 'blob', compression: 'DEFLATE' })
      const fileName = `COCS_Audit_Backup_${new Date().toISOString().split('T')[0]}.zip`
      
      const counts = { work: workUpdates.length, issues: issues.length, audits: audits.length, logs: logs.length, photos: workUpdates.filter(w=>w.photo_url).length }


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
    if (archive.deletion_status) {
      toast.error('This data has already been purged from the database and cannot be re-downloaded.')
      return
    }
    setArchiving(true)
    const toastId = toast.loading('Re-preparing production backup (including folders & photos)...')
    
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
      const workFolder = zip.folder('Operations_Work')
      const workPhotos = workFolder.folder('Work_Photos')
      
      const workReport = workUpdates.map(w => ({
        id: w.id, created_at: w.created_at, type: w.work_type, location: w.locations?.name || 'Global',
        submitted_by: w.user?.name || 'Unknown', verified_by: w.reviewer?.name || 'N/A',
        workflow_status: w.workflow_status, admin_feedback: w.verify_comment || 'No feedback'
      }))

      const workPhotoPromises = workUpdates
        .filter(w => w.photo_url)
        .map(async (w) => {
          try {
            const resp = await fetch(w.photo_url)
            if (resp.ok) {
              const blob = await resp.blob()
              const ext = w.photo_url.split('.').pop().split('?')[0] || 'jpg'
              workPhotos.file(`work_${w.id.substring(0, 8)}.${ext}`, blob)
            }
          } catch (e) {}
        })

      await Promise.all(workPhotoPromises)
      workFolder.file('Work_Master_Report.json', JSON.stringify(workReport, null, 2))
      zip.folder('Maintenance_Issues').file('Issues_Master_Report.json', JSON.stringify(iRes.data || [], null, 2))
      zip.folder('Institutional_Audits').file('Audit_Master_Report.json', JSON.stringify(aRes.data || [], null, 2))
      
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
    
    const confirm = window.confirm('🚨 DANGER: This will PERMANENTLY delete all records and their attached PHOTOS from the database and storage. Type "DELETE" to confirm.')
    if (confirm !== true) return

    const toastId = toast.loading('Cleaning up database and storage...')
    try {
      const thirtyDaysAgo = new Date(Date.now() - 30 * 24 * 60 * 60 * 1000).toISOString()

      // 1. Identify Photos to delete
      const { data: workWithPhotos } = await supabase
        .from('work_updates')
        .select('photo_url')
        .eq('workflow_status', 'CLOSED')
        .lt('created_at', thirtyDaysAgo)
      
      const photoPaths = (workWithPhotos || [])
        .filter(w => w.photo_url)
        .map(w => {
          const parts = w.photo_url.split('/')
          return parts[parts.length - 1] // Get filename
        })

      // 2. Delete from Storage
      if (photoPaths.length > 0) {
        await supabase.storage.from('photos').remove(photoPaths.map(p => `work-updates/${p}`))
      }

      // 3. Delete from Tables
      await Promise.all([
        supabase.from('work_updates').delete().eq('workflow_status', 'CLOSED').lt('created_at', thirtyDaysAgo),
        supabase.from('issues').delete().eq('lifecycle_status', 'CLOSED').lt('created_at', thirtyDaysAgo),
        supabase.from('audits').delete().lt('created_at', thirtyDaysAgo),
        supabase.from('activity_log').delete().lt('created_at', thirtyDaysAgo)
      ])

      await supabase.from('archive_logs').update({ deletion_status: true, verified_by_admin: true }).eq('id', archive.id)
      
      toast.success('Database and Storage optimized! Old data removed.', { id: toastId })
      loadArchives()
    } catch (err) {
      console.error(err)
      toast.error('Optimization failed', { id: toastId })
    }
  }

  if (!isAdmin) return <div className="page">Access Denied</div>

  return (
    <div className="page fade-in">
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '24px' }}>
        <div>
          <h1 style={{ margin: 0, fontSize: '1.8rem', fontWeight: 800 }}>📦 Data Archival</h1>
          <p style={{ margin: '4px 0 0', color: '#64748b' }}>Clean up records older than 30 days</p>
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
            <h4 style={{ margin: '0 0 8px', color: '#9a3412', fontWeight: 800 }}>Retention Policy (Unified 30 Days)</h4>
            <ul style={{ margin: 0, paddingLeft: '20px', fontSize: '0.85rem', color: '#c2410c', lineHeight: 1.6 }}>
              <li><b>Work & Issues:</b> Archived after 30 days (Closed only)</li>
              <li><b>Photos:</b> Permanently deleted from storage during optimization</li>
              <li><b>Safety:</b> Records stay in DB until you verify the backup ZIP</li>
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
                <button 
                  onClick={() => handleDownload(a)} 
                  disabled={archiving || a.deletion_status} 
                  className="btn-icon" 
                  style={{ opacity: a.deletion_status ? 0.3 : 1 }}
                  title={a.deletion_status ? "Data Purged" : "Download Archive"}
                >
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
