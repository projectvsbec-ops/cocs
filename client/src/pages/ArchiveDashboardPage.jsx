import { useState, useEffect } from 'react'
import { supabase } from '../utils/supabaseClient'
import { useAuth } from '../context/AuthContext'
import toast from 'react-hot-toast'
import { 
  Database, Download, Trash2, CheckCircle, 
  AlertTriangle, RefreshCw, Archive, Clock, FileText,
  ChevronRight, Info, ShieldCheck
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
    if (!window.confirm('Are you sure? This will package all records older than 30 days and evidence photos.')) return
    
    setArchiving(true)
    const toastId = toast.loading('Generating backup & zipping photos...')
    
    try {
      const JSZip = (await loadJSZip()).default
      const zip = new JSZip()
      const thirtyDaysAgo = new Date(Date.now() - 30 * 24 * 60 * 60 * 1000).toISOString()

      const [wRes, iRes, aRes, lRes] = await Promise.all([
        supabase.from('work_updates').select('*, user:profiles!user_id(name), reviewer:profiles!verified_by(name), locations(name), departments(name)').eq('workflow_status', 'CLOSED').lt('created_at', thirtyDaysAgo),
        supabase.from('issues').select('*, reporter:profiles!reported_by(name), assignee:profiles!assigned_to(name), locations(name)').eq('lifecycle_status', 'CLOSED').lt('created_at', thirtyDaysAgo),
        supabase.from('audits').select('*, admin:profiles!admin_id(name)').lt('created_at', thirtyDaysAgo),
        supabase.from('activity_log').select('*, user:profiles(name)').or(`action_type.eq.AUDIT,created_at.lt.${thirtyDaysAgo}`)
      ])

      const workUpdates = wRes.data || []
      const issues = iRes.data || []
      const audits = aRes.data || []
      const logs = lRes.data || []

      if ([workUpdates, issues, audits, logs].every(arr => arr.length === 0)) {
        throw new Error('No data older than 30 days found to archive.')
      }

      const workFolder = zip.folder('Operations_Work')
      const workPhotos = workFolder.folder('Work_Photos')
      const workReport = workUpdates.map(w => ({
        id: w.id, created_at: w.created_at, type: w.work_type, location: w.locations?.name || 'N/A',
        submitted_by: w.user?.name || 'Unknown', verified_by: w.reviewer?.name || 'N/A',
        workflow_status: w.workflow_status, feedback: w.verify_comment || 'None'
      }))

      const workPhotoPromises = workUpdates.filter(w => w.photo_url).map(async (w) => {
        try {
          const resp = await fetch(w.photo_url)
          if (resp.ok) {
            const blob = await resp.blob()
            workPhotos.file(`work_${w.id.substring(0, 8)}.jpg`, blob)
          }
        } catch (e) {}
      })

      await Promise.all(workPhotoPromises)
      workFolder.file('Work_Report.json', JSON.stringify(workReport, null, 2))
      zip.folder('Maintenance_Issues').file('Issues_Report.json', JSON.stringify(issues, null, 2))
      zip.folder('Institutional_Audits').file('Audits_Report.json', JSON.stringify(audits, null, 2))
      zip.file('Archive_Metadata.json', JSON.stringify({ generated_by: user.name, timestamp: new Date().toISOString() }, null, 2))

      const blob = await zip.generateAsync({ type: 'blob', compression: 'DEFLATE' })
      const fileName = `COCS_Audit_Backup_${new Date().toISOString().split('T')[0]}.zip`
      
      const { error: logErr } = await supabase.from('archive_logs').insert([{
        file_name: fileName,
        record_counts: { work: workUpdates.length, issues: issues.length, photos: workUpdates.filter(w=>w.photo_url).length },
        file_size: (blob.size / 1024 / 1024).toFixed(2) + ' MB',
        admin_id: user.id
      }])

      if (logErr) throw logErr
      saveAs(blob, fileName)
      toast.success('Archive ready!', { id: toastId })
      loadArchives()
    } catch (err) {
      toast.error(err.message, { id: toastId })
    } finally {
      setArchiving(false)
    }
  }

  const handleDownload = async (archive) => {
    if (archive.deletion_status) {
      toast.error('Data purged from database - download unavailable.')
      return
    }
    setArchiving(true)
    const toastId = toast.loading('Fetching and zipping data...')
    try {
      const JSZip = (await loadJSZip()).default
      const zip = new JSZip()
      const thirtyDaysAgo = new Date(Date.now() - 30 * 24 * 60 * 60 * 1000).toISOString()
      const [wRes] = await Promise.all([
        supabase.from('work_updates').select('*, user:profiles!user_id(name), locations(name)').eq('workflow_status', 'CLOSED').lt('created_at', thirtyDaysAgo)
      ])
      zip.file('Work_Data.json', JSON.stringify(wRes.data || [], null, 2))
      const blob = await zip.generateAsync({ type: 'blob' })
      saveAs(blob, archive.file_name)
      await supabase.from('archive_logs').update({ download_status: true }).eq('id', archive.id)
      toast.success('Download started!', { id: toastId })
      loadArchives()
    } catch (e) {
      toast.error('Download failed', { id: toastId })
    } finally {
      setArchiving(false)
    }
  }

  const handleDeleteData = async (archive) => {
    if (!archive.download_status) {
      toast.error('Download first!')
      return
    }
    if (!window.confirm('🚨 PERMANENT DELETE: Confirm deletion of database records and photos?')) return
    const toastId = toast.loading('Purging records...')
    try {
      const thirtyDaysAgo = new Date(Date.now() - 30 * 24 * 60 * 60 * 1000).toISOString()
      await Promise.all([
        supabase.from('work_updates').delete().eq('workflow_status', 'CLOSED').lt('created_at', thirtyDaysAgo),
        supabase.from('issues').delete().eq('lifecycle_status', 'CLOSED').lt('created_at', thirtyDaysAgo),
        supabase.from('audits').delete().lt('created_at', thirtyDaysAgo),
        supabase.from('activity_log').delete().or(`action_type.eq.AUDIT,created_at.lt.${thirtyDaysAgo}`)
      ])
      await supabase.from('archive_logs').update({ deletion_status: true, verified_by_admin: true }).eq('id', archive.id)
      toast.success('Data Purged!', { id: toastId })
      loadArchives()
    } catch (e) {
      toast.error('Purge failed', { id: toastId })
    }
  }

  if (!isAdmin) return <div className="page">Access Denied</div>

  return (
    <div className="page fade-in" style={{ paddingBottom: '120px' }}>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '24px' }}>
        <div>
          <h1 style={{ margin: 0, fontSize: '1.8rem', fontWeight: 900, color: '#0f172a' }}>📦 Data Archival</h1>
          <p style={{ margin: '4px 0 0', color: '#64748b', fontWeight: 600 }}>Records older than 30 days</p>
        </div>
        <button onClick={generateArchive} disabled={archiving} className="btn btn-primary" style={{ width: 'auto', padding: '12px 20px', borderRadius: '16px' }}>
          <Archive size={18} style={{ marginRight: '8px' }} />
          Backup
        </button>
      </div>

      <div className="card" style={{ padding: '20px', background: '#fff7ed', border: '1px solid #ffedd5', marginBottom: '32px' }}>
        <div style={{ display: 'flex', gap: '12px' }}>
          <ShieldCheck size={24} color="#d97706" />
          <div>
            <h4 style={{ margin: '0 0 8px', color: '#9a3412', fontWeight: 800 }}>Retention Policy (30 Days)</h4>
            <div style={{ fontSize: '0.85rem', color: '#c2410c', lineHeight: 1.6 }}>
              • All <b>Closed</b> records older than 30 days are targeted.<br/>
              • <b>Photos</b> are permanently purged after optimization.<br/>
              • <b>Safety:</b> Download is required before data can be deleted.
            </div>
          </div>
        </div>
      </div>

      <div className="section-title">Archival History</div>
      
      {loading ? (
        <div style={{ textAlign: 'center', padding: '40px' }}><RefreshCw className="spin" size={32} color="#cbd5e1" /></div>
      ) : archives.length === 0 ? (
        <div className="card" style={{ padding: '40px', textAlign: 'center', color: '#94a3b8' }}>
          <Database size={40} style={{ marginBottom: '12px', opacity: 0.3 }} />
          <div>No archives found</div>
        </div>
      ) : (
        <div style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
          {archives.map(a => (
            <div key={a.id} className="card" style={{ padding: '20px', border: '1px solid #f1f5f9' }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: '16px' }}>
                <div style={{ display: 'flex', gap: '14px' }}>
                  <div style={{ width: 44, height: 44, borderRadius: '12px', background: '#f8fafc', display: 'flex', alignItems: 'center', justifyContent: 'center', color: '#64748b' }}>
                    <FileText size={22} />
                  </div>
                  <div>
                    <div style={{ fontWeight: 800, fontSize: '0.95rem', color: '#1e293b', marginBottom: '4px', wordBreak: 'break-all' }}>{a.file_name}</div>
                    <div style={{ fontSize: '0.75rem', color: '#94a3b8', fontWeight: 600 }}>{a.file_size} • {new Date(a.created_at).toLocaleDateString()}</div>
                  </div>
                </div>
                <div style={{ display: 'flex', gap: '10px' }}>
                  <button onClick={() => handleDownload(a)} disabled={archiving || a.deletion_status} className="btn-icon" style={{ opacity: a.deletion_status ? 0.3 : 1 }}>
                    <Download size={18} />
                  </button>
                  <button onClick={() => handleDeleteData(a)} disabled={a.deletion_status} className="btn-icon" style={{ background: a.deletion_status ? '#f8fafc' : '#fee2e2', color: a.deletion_status ? '#cbd5e1' : '#ef4444', border: 'none' }}>
                    <Trash2 size={18} />
                  </button>
                </div>
              </div>

              <div style={{ display: 'flex', flexWrap: 'wrap', gap: '8px', marginBottom: '16px' }}>
                <div className={`badge ${a.download_status ? 'badge-green' : 'badge-yellow'}`} style={{ fontSize: '0.65rem' }}>
                  {a.download_status ? '✅ DOWNLOADED' : '⏳ PENDING'}
                </div>
                <div className={`badge ${a.deletion_status ? 'badge-blue' : 'badge-gray'}`} style={{ fontSize: '0.65rem' }}>
                  {a.deletion_status ? '🛡️ OPTIMIZED' : '📦 IN DATABASE'}
                </div>
              </div>

              <div style={{ display: 'flex', gap: '12px', borderTop: '1px solid #f8fafc', paddingTop: '12px', fontSize: '0.75rem', color: '#64748b', fontWeight: 700 }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: '4px' }}>🖼️ {a.record_counts?.photos || 0} Photos</div>
                <div style={{ display: 'flex', alignItems: 'center', gap: '4px' }}>📋 {a.record_counts?.work || 0} Tasks</div>
                <div style={{ display: 'flex', alignItems: 'center', gap: '4px' }}>⚠️ {a.record_counts?.issues || 0} Issues</div>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  )
}
