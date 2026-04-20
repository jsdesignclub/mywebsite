import React from 'react';
import { ArrowRight, Search } from 'lucide-react';

function PersonalDetailsForm({ data, onUpdate, onNext }) {
  const handleChange = (e) => {
    onUpdate({ ...data, [e.target.name]: e.target.value });
  };

  return (
    <div>
      <div style={{ 
        display: 'flex', 
        flexDirection: 'row', 
        flexWrap: 'wrap', 
        justifyContent: 'space-between', 
        alignItems: 'center', 
        marginBottom: '2rem',
        gap: '1rem'
      }}>
        <div style={{ minWidth: '200px', flex: '1' }}>
          <h2 style={{ margin: 0, fontSize: 'clamp(1.4rem, 5vw, 1.8rem)' }}>Personal Information</h2>
          <p style={{ color: '#64748b', margin: '0.5rem 0 0', fontSize: '0.9rem' }}>Enter legal identity and contact details for the applicant.</p>
        </div>
        <div style={{ position: 'relative', width: '100%', maxWidth: '250px' }}>
          <Search size={16} style={{ position: 'absolute', left: '12px', top: '50%', transform: 'translateY(-50%)', color: '#475569' }} />
          <input 
            type="text" 
            placeholder="Quick NIC Lookup..." 
            style={{ 
              padding: '0.6rem 1rem 0.6rem 2.5rem', 
              background: 'rgba(255,255,255,0.03)', 
              border: '1px solid rgba(255,255,255,0.1)', 
              borderRadius: '20px',
              color: '#fff',
              fontSize: '0.85rem',
              width: '100%'
            }} 
          />
        </div>
      </div>

      <div 
        className="grid-2"
        style={{
          marginTop: '1.5rem'
        }}
      >
        <div className="form-group">
          <label style={labelStyle}>Full Name (As per NIC)</label>
          <input type="text" name="fullName" value={data.fullName || ''} onChange={handleChange} style={inputStyle} placeholder="eg: Mahagamage Perera" />
        </div>

        <div className="form-group">
          <label style={labelStyle}>NIC Number</label>
          <input type="text" name="nic" value={data.nic || ''} onChange={handleChange} style={inputStyle} placeholder="eg: 199012345678" />
        </div>

        <div className="form-group">
          <label style={labelStyle}>Date of Birth</label>
          <input type="date" name="dob" value={data.dob || ''} onChange={handleChange} style={inputStyle} />
        </div>

        <div className="form-group">
          <label style={labelStyle}>Gender</label>
          <select name="gender" value={data.gender || ''} onChange={handleChange} style={inputStyle}>
            <option value="">Select Gender</option>
            <option value="male">Male</option>
            <option value="female">Female</option>
            <option value="other">Other</option>
          </select>
        </div>

        <div className="form-group">
          <label style={labelStyle}>Phone Number</label>
          <input type="text" name="phone" value={data.phone || ''} onChange={handleChange} style={inputStyle} placeholder="+94 7X XXX XXXX" />
        </div>

        <div className="form-group">
          <label style={labelStyle}>WhatsApp Number</label>
          <input type="text" name="whatsapp" value={data.whatsapp || ''} onChange={handleChange} style={inputStyle} placeholder="+94 7X XXX XXXX" />
        </div>

        <div className="form-group">
          <label style={labelStyle}>Occupation</label>
          <select name="occupation" value={data.occupation || ''} onChange={handleChange} style={inputStyle}>
            <option value="">Select Occupation</option>
            <option value="government">Government job</option>
            <option value="semi_government">Semi government</option>
            <option value="ngo">NGO</option>
            <option value="private">Private</option>
            <option value="self_employment">Self employment</option>
            <option value="other">Other</option>
          </select>
        </div>

        <div className="form-group" style={{ gridColumn: '1 / -1' }}>
          <label style={labelStyle}>Permanent Address</label>
          <textarea name="address" value={data.address || ''} onChange={handleChange} style={{ ...inputStyle, minHeight: '80px', resize: 'vertical' }} placeholder="No, Street, City" />
        </div>

        <div className="form-group">
          <label style={labelStyle}>District</label>
          <select name="district" value={data.district || 'Badulla'} onChange={handleChange} style={inputStyle}>
            <option value="Badulla">Badulla</option>
            <option value="Monaragala">Monaragala</option>
          </select>
        </div>

        <div className="form-group">
          <label style={labelStyle}>DS Division</label>
          <input type="text" name="dsDivision" value={data.dsDivision || ''} onChange={handleChange} style={inputStyle} placeholder="eg: Hali-Ela" />
        </div>

        <div className="form-group">
          <label style={labelStyle}>GS Division</label>
          <input type="text" name="gsDivision" value={data.gsDivision || ''} onChange={handleChange} style={inputStyle} placeholder="Enter Name or Code" />
        </div>

        <div className="form-group">
          <label style={labelStyle}>Marital Status</label>
          <select name="maritalStatus" value={data.maritalStatus || ''} onChange={handleChange} style={inputStyle}>
            <option value="">Select Status</option>
            <option value="single">Single</option>
            <option value="married">Married</option>
            <option value="widowed">Widowed</option>
          </select>
        </div>

        <div className="form-group">
          <label style={labelStyle}>Number of Dependants</label>
          <input type="number" name="dependants" value={data.dependants || ''} onChange={handleChange} style={inputStyle} />
        </div>
      </div>

      <div style={{ marginTop: '3rem', display: 'flex', justifyContent: 'flex-end', flexWrap: 'wrap' }}>
        <button 
          onClick={onNext}
          style={{
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            gap: '0.8rem',
            padding: '1rem 2rem',
            background: 'linear-gradient(135deg, #1f4e79 0%, #2e75b6 100%)',
            border: 'none',
            borderRadius: '10px',
            color: '#fff',
            fontWeight: 700,
            cursor: 'pointer',
            width: window.innerWidth < 768 ? '100%' : 'auto'
          }}
        >
          Next: Business Details
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
  boxSizing: 'border-box',
  transition: 'border-color 0.2s'
};

export default PersonalDetailsForm;
