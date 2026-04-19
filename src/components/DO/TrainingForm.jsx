import React from 'react';
import { ArrowLeft, ArrowRight, Award, GraduationCap } from 'lucide-react';

function TrainingForm({ data, onUpdate, onPrev, onNext }) {
  const handleChange = (e) => {
    onUpdate({ ...data, [e.target.name]: e.target.value });
  };

  return (
    <div>
      <div style={{ marginBottom: '2rem' }}>
        <h2 style={{ margin: 0, fontSize: '1.8rem' }}>Training & Qualifications</h2>
        <p style={{ color: '#64748b', margin: '0.5rem 0 0' }}>Crucial for scoring. Provide professional certifications and educational background.</p>
      </div>

      <div className="grid-2" style={{
        marginTop: '2rem'
      }}>
        <div className="form-group" style={{ gridColumn: 'span 1' }}>
          <label style={labelStyle}>NVQ Level (if applicable)</label>
          <div style={{ display: 'flex', gap: '0.8rem', flexWrap: 'wrap' }}>
            {[1, 2, 3, 4, 5, 6, 7].map(level => (
              <button
                key={level}
                type="button"
                onClick={() => onUpdate({ ...data, nvqLevel: level })}
                style={{
                  padding: '1rem',
                  borderRadius: '12px',
                  background: data.nvqLevel === level ? 'rgba(31, 78, 121, 0.4)' : 'rgba(255,255,255,0.03)',
                  border: data.nvqLevel === level ? '2px solid #2e75b6' : '1px solid rgba(255,255,255,0.1)',
                  color: data.nvqLevel === level ? '#fff' : '#94a3b8',
                  minWidth: '60px',
                  cursor: 'pointer',
                  fontWeight: 600
                }}
              >
                L{level}
              </button>
            ))}
            <button
              type="button"
              onClick={() => onUpdate({ ...data, nvqLevel: 'none' })}
              style={{
                padding: '1rem',
                borderRadius: '12px',
                background: data.nvqLevel === 'none' ? 'rgba(244, 63, 94, 0.1)' : 'rgba(255,255,255,0.03)',
                border: data.nvqLevel === 'none' ? '2px solid #f43f5e' : '1px solid rgba(255,255,255,0.1)',
                color: data.nvqLevel === 'none' ? '#f43f5e' : '#475569',
                cursor: 'pointer'
              }}
            >
              None
            </button>
          </div>
        </div>

        <div className="form-group">
          <label style={labelStyle}>Highest Degree</label>
          <select name="degree" value={data.degree || ''} onChange={handleChange} style={inputStyle}>
            <option value="">Select Degree</option>
            <option value="none">None</option>
            <option value="diploma">Diploma</option>
            <option value="bachelor">Bachelor's Degree</option>
            <option value="masters">Master's or Higher</option>
          </select>
        </div>

        <div className="form-group">
          <label style={labelStyle}>Years of Field Experience</label>
          <input type="number" name="experienceYears" value={data.experienceYears || ''} onChange={handleChange} style={inputStyle} min="0" />
        </div>

        <div className="form-group" style={{ gridColumn: 'span 2' }}>
          <label style={labelStyle}>Other Related Training Programs</label>
          <textarea 
            name="otherTraining" 
            value={data.otherTraining || ''} 
            onChange={handleChange} 
            style={{ ...inputStyle, minHeight: '100px', resize: 'vertical' }} 
            placeholder="List any workshops, short courses, or vocational training relevant to the business..." 
          />
        </div>
      </div>

      <div style={{ marginTop: '3rem', display: 'flex', justifyContent: 'space-between' }}>
        <button onClick={onPrev} style={secondaryBtn}>
          <ArrowLeft size={18} /> Back
        </button>
        <button onClick={onNext} style={primaryBtn}>
          Next: Production <ArrowRight size={18} />
        </button>
      </div>
    </div>
  );
}

const labelStyle = {
  display: 'block',
  marginBottom: '0.8rem',
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

const primaryBtn = {
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
};

const secondaryBtn = {
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
};

export default TrainingForm;
