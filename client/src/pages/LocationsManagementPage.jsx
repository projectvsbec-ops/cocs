import { useState, useEffect } from 'react'
import { supabase } from '../utils/supabaseClient'
import { useAuth } from '../context/AuthContext'
import toast from 'react-hot-toast'
import { MapPin, Plus, Trash2, RefreshCw } from 'lucide-react'

export default function LocationsManagementPage() {
  const { user } = useAuth()
  const [departments, setDepartments] = useState([])
  const [selectedDept, setSelectedDept] = useState('')
  const [locations, setLocations] = useState([])
  const [newLocationName, setNewLocationName] = useState('')
  const [loading, setLoading] = useState(false)

  const loadDepartments = async () => {
    const { data, error } = await supabase.from('departments').select('*').order('name')
    if (error) toast.error('Failed to load departments')
    else {
      setDepartments(data || [])
      if (data && data.length > 0 && !selectedDept) setSelectedDept(data[0].id)
    }
  }

  const loadLocations = async (deptId) => {
    setLoading(true)
    const { data, error } = await supabase
      .from('locations')
      .select('*')
      .eq('department_id', deptId)
      .order('name')
    
    if (error) toast.error('Failed to load locations')
    else setLocations(data || [])
    setLoading(false)
  }

  useEffect(() => {
    loadDepartments()
  }, [])

  useEffect(() => {
    if (selectedDept) loadLocations(selectedDept)
  }, [selectedDept])

  const handleAddLocation = async (e) => {
    e.preventDefault()
    if (!newLocationName.trim() || !selectedDept) return
    
    setLoading(true)
    const { error } = await supabase.from('locations').insert([{
      name: newLocationName.trim(),
      department_id: selectedDept
    }])

    if (error) {
      toast.error(error.message || 'Failed to add location')
    } else {
      toast.success('Location added successfully!')
      setNewLocationName('')
      loadLocations(selectedDept)
    }
    setLoading(false)
  }

  const handleDeleteLocation = async (id, name) => {
    if (!window.confirm(`Are you sure you want to delete "${name}"?`)) return
    
    setLoading(true)
    const { error } = await supabase.from('locations').delete().eq('id', id)
    
    if (error) {
      toast.error(error.message || 'Failed to delete location. It might be in use.')
    } else {
      toast.success('Location deleted!')
      loadLocations(selectedDept)
    }
    setLoading(false)
  }

  return (
    <div className="page fade-in">
      <div style={{ display:'flex', justifyContent:'space-between', alignItems:'center', marginBottom:'24px' }}>
        <div>
          <h1 style={{ margin:0, fontSize:'1.5rem', fontWeight:800 }}>📍 Manage Locations</h1>
          <p style={{ margin:'4px 0 0', color:'#64748b' }}>Add or remove campus locations</p>
        </div>
        <button onClick={() => loadLocations(selectedDept)} style={{ background:'#f1f5f9', border:'none', borderRadius:'10px', width:40, height:40, display:'flex', alignItems:'center', justifyContent:'center', cursor:'pointer', color:'#475569' }}>
          <RefreshCw size={18} />
        </button>
      </div>

      <div className="card" style={{ padding: '20px', marginBottom: '20px' }}>
        <label className="form-label">Select Department</label>
        <select 
          className="form-input" 
          value={selectedDept} 
          onChange={(e) => setSelectedDept(e.target.value)}
          style={{ marginBottom: '20px' }}
        >
          {departments.map(d => <option key={d.id} value={d.id}>{d.name}</option>)}
        </select>

        <form onSubmit={handleAddLocation} style={{ display: 'flex', gap: '10px', alignItems: 'flex-end' }}>
          <div style={{ flex: 1 }}>
            <label className="form-label">Add New Location</label>
            <input 
              type="text" 
              className="form-input" 
              placeholder="e.g. Science Block 4"
              value={newLocationName}
              onChange={(e) => setNewLocationName(e.target.value)}
            />
          </div>
          <button type="submit" disabled={loading || !newLocationName.trim()} className="btn btn-primary" style={{ padding: '0 20px', height: '48px' }}>
            <Plus size={20} /> Add
          </button>
        </form>
      </div>

      <h3 style={{ margin: '0 0 16px', fontSize: '1.1rem' }}>Locations for this Department</h3>
      
      {loading && locations.length === 0 ? (
        <p style={{ color: '#94a3b8' }}>Loading locations...</p>
      ) : locations.length === 0 ? (
        <div className="card" style={{ padding: '30px', textAlign: 'center', color: '#94a3b8' }}>
          <MapPin size={40} style={{ margin: '0 auto 12px', opacity: 0.5 }} />
          No locations found for this department.
        </div>
      ) : (
        <div style={{ display: 'flex', flexDirection: 'column', gap: '10px' }}>
          {locations.map(loc => (
            <div key={loc.id} className="card" style={{ padding: '16px', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
                <div style={{ background: '#eff6ff', padding: '8px', borderRadius: '8px', color: '#2563eb' }}>
                  <MapPin size={18} />
                </div>
                <span style={{ fontWeight: 600, color: '#1e293b' }}>{loc.name}</span>
              </div>
              <button 
                onClick={() => handleDeleteLocation(loc.id, loc.name)}
                style={{ background: 'none', border: 'none', color: '#ef4444', cursor: 'pointer', padding: '8px' }}
                title="Delete Location"
              >
                <Trash2 size={18} />
              </button>
            </div>
          ))}
        </div>
      )}
    </div>
  )
}
