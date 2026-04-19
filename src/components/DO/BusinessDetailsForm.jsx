import React, { useState, useEffect } from 'react';
import { ArrowLeft, ArrowRight, Plus } from 'lucide-react';
import { db } from '../../firebase';
import { collection, getDocs } from 'firebase/firestore';

function BusinessDetailsForm({ data, onUpdate, onPrev, onNext }) {
  const [sectors, setSectors] = useState(['Manufacturing', 'Services', 'Agriculture', 'Tourism', 'IT & Digital']);
  const [isOther, setIsOther] = useState(false);
  const [newSector, setNewSector] = useState('');

  useEffect(() => {
    const fetchSectors = async () => {
      try {
        const querySnapshot = await getDocs(collection(db, 'settings_sectors'));
        const customSectors = querySnapshot.docs.map(doc => doc.data().name);
        if (customSectors.length > 0) {
          // Merge default with custom, unique only
          setSectors(prev => [...new Set([...prev, ...customSectors])]);
        }
      } catch (err) {
        console.error("Error fetching sectors:", err);
      }
    };
    fetchSectors();
  }, []);

  const handleChange = (e) => {
    const value = e.target.value;
    if (value === 'other') {
      setIsOther(true);
      onUpdate({ ...data, sector: '' });
    } else {
      setIsOther(false);
      onUpdate({ ...data, [e.target.name]: value });
    }
  };

  return (
    <div>
      <div style={{ marginBottom: '2rem' }}>
        <h2 style={{ margin: 0, fontSize: '1.8rem' }}>Business Details</h2>
        <p style={{ color: '#64748b', margin: '0.5rem 0 0' }}>Provide information about the applicant's existing venture.</p>
      </div>

      <div 
        className="grid-2"
        style={{
          marginTop: '2rem'
        }}
      >
        <div className="form-group" style={{ gridColumn: 'span 1' }}>
          <label style={labelStyle}>Registered Business Name</label>
          <input type="text" name="businessName" value={data.businessName || ''} onChange={handleChange} style={inputStyle} placeholder="eg: S&M Carpentry Solutions" />
        </div>

        <div className="form-group">
          <label style={labelStyle}>Business Registration Number</label>
          <input type="text" name="regNo" value={data.regNo || ''} onChange={handleChange} style={inputStyle} placeholder="BR-XXXX-XXXX" />
        </div>

        <div className="form-group">
          <label style={labelStyle}>Registration Date</label>
          <input type="date" name="regDate" value={data.regDate || ''} onChange={handleChange} style={inputStyle} />
        </div>

        <div className="form-group">
          <label style={labelStyle}>Trade Licence Number</label>
          <input type="text" name="licenseNo" value={data.licenseNo || ''} onChange={handleChange} style={inputStyle} />
        </div>

        <div className="form-group">
          <label style={labelStyle}>Licence Issued Date</label>
          <input type="date" name="licenseDate" value={data.licenseDate || ''} onChange={handleChange} style={inputStyle} />
        </div>

        <div className="form-group">
          <label style={labelStyle}>Current Employee Count</label>
          <input type="number" name="employeeCount" value={data.employeeCount || ''} onChange={handleChange} style={inputStyle} min="0" />
        </div>

        <div className="form-group">
          <label style={labelStyle}>Business Nature / Sector</label>
          <div style={{ display: 'flex', gap: '0.5rem', flexDirection: 'column' }}>
            <select 
              name="sector" 
              value={isOther ? 'other' : (data.sector || '')} 
              onChange={handleChange} 
              style={inputStyle}
            >
              <option value="">Select Sector</option>
              {sectors.map(s => <option key={s} value={s}>{s}</option>)}
              <option value="other">+ Other (Add New)</option>
            </select>
            
            {isOther && (
              <div className="animate-fade-in" style={{ marginTop: '0.5rem', display: 'flex', gap: '0.5rem' }}>
                <input 
                  type="text" 
                  placeholder="Enter custom sector name..." 
                  value={newSector}
                  onChange={(e) => {
                    setNewSector(e.target.value);
                    onUpdate({ ...data, sector: e.target.value, isNewSector: true });
                  }}
                  style={inputStyle}
                />
              </div>
            )}
          </div>
        </div>
      </div>

      <div style={{ marginTop: '3rem', display: 'flex', justifyContent: 'space-between' }}>
        <button 
          onClick={onPrev}
          style={{
            display: 'flex',
            alignItems: 'center',
            gap: '0.8rem',
            padding: '0.8rem 2rem',
            background: 'rgba(255,255,255,0.05)',
            border: '1px solid rgba(255,255,255,0.1)',
            borderRadius: '8px',
            color: '#cbd5e1',
            fontWeight: 600,
            cursor: 'pointer'
          }}
        >
          <ArrowLeft size={18} />
          Back: Personal Info
        </button>

        <button 
          onClick={onNext}
          style={{
            display: 'flex',
            alignItems: 'center',
            gap: '0.8rem',
            padding: '0.8rem 2rem',
            background: 'linear-gradient(135deg, #1f4e79 0%, #2e75b6 100%)',
            border: 'none',
            borderRadius: '8px',
            color: '#fff',
            fontWeight: 600,
            cursor: 'pointer'
          }}
        >
          Next: Training & Qualifications
          <ArrowRight size={18} />
        </button>
      </div>
    </div>
  );
}

const labelStyle = {
  display: 'block',
  marginBottom: '0.5rem',
  fontSize: '0.85rem',
  fontWeight: 600,
  color: '#94a3b8',
  textTransform: 'uppercase',
  letterSpacing: '0.025em'
};

const inputStyle = {
  width: '100%',
  padding: '0.8rem 1rem',
  background: 'rgba(255,255,255,0.03)',
  border: '1px solid rgba(255,255,255,0.1)',
  borderRadius: '8px',
  color: '#fff',
  fontSize: '1rem',
  outline: 'none',
  boxSizing: 'border-box'
};

export default BusinessDetailsForm;
