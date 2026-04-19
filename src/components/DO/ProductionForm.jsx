import React from 'react';
import { ArrowLeft, ArrowRight } from 'lucide-react';

function ProductionForm({ data, onUpdate, onPrev, onNext }) {
  const handleChange = (e) => {
    onUpdate({ ...data, [e.target.name]: e.target.value });
  };

  return (
    <div>
      <div style={{ marginBottom: '2rem' }}>
        <h2 style={{ margin: 0, fontSize: '1.8rem' }}>Production & Capacity</h2>
        <p style={{ color: '#64748b', margin: '0.5rem 0 0' }}>Analyze business viability and market potential.</p>
      </div>

      <div className="grid-2">
        <div className="form-group" style={{ gridColumn: 'span 1' }}>
          <label style={labelStyle}>Main Products / Services</label>
          <input type="text" name="products" value={data.products || ''} onChange={handleChange} style={inputStyle} placeholder="eg: Bed frames, Office desks, Kitchen cabinets" />
        </div>

        <div className="form-group" style={{ gridColumn: 'span 2' }}>
          <label style={labelStyle}>Required Raw Materials</label>
          <textarea name="rawMaterials" value={data.rawMaterials || ''} onChange={handleChange} style={{ ...inputStyle, minHeight: '80px' }} placeholder="Timber, Glue, Sandpaper, Vernish etc." />
        </div>

        <div className="form-group">
          <label style={labelStyle}>Monthly Production Capacity</label>
          <input type="text" name="capacity" value={data.capacity || ''} onChange={handleChange} style={inputStyle} placeholder="eg: 50 units / month" />
        </div>

        <div className="form-group">
          <label style={labelStyle}>Total Monthly Production Cost (LKR)</label>
          <input type="number" name="productionCost" value={data.productionCost || ''} onChange={handleChange} style={inputStyle} placeholder="150,000" />
        </div>

        <div className="form-group">
          <label style={labelStyle}>Estimated Monthly Sales / Income (LKR)</label>
          <input type="number" name="estimatedIncome" value={data.estimatedIncome || ''} onChange={handleChange} style={inputStyle} placeholder="250,000" />
        </div>

        <div className="form-group">
          <label style={labelStyle}>Total Current Asset Value (LKR)</label>
          <input type="number" name="assetValue" value={data.assetValue || ''} onChange={handleChange} style={inputStyle} placeholder="1,200,000" />
        </div>

        <div className="form-group" style={{ gridColumn: 'span 2' }}>
          <label style={{ ...labelStyle, color: '#10b981' }}>Auto-Calculated Net Monthly Profit (LKR)</label>
          <div style={{
            ...inputStyle,
            background: 'rgba(16, 185, 129, 0.05)',
            border: '1px solid rgba(16, 185, 129, 0.2)',
            color: '#10b981',
            fontWeight: 700,
            fontSize: '1.2rem',
            display: 'flex',
            alignItems: 'center'
          }}>
            LKR {((Number(data.estimatedIncome) || 0) - (Number(data.productionCost) || 0)).toLocaleString()}
          </div>
          <p style={{ margin: '0.5rem 0 0', fontSize: '0.75rem', color: '#64748b' }}>Calculated as: Estimated Income - Production Cost</p>
        </div>
      </div>

      <div style={{ marginTop: '3rem', display: 'flex', justifyContent: 'space-between' }}>
        <button onClick={onPrev} style={secondaryBtn}>
          <ArrowLeft size={18} /> Back
        </button>
        <button onClick={onNext} style={primaryBtn}>
          Next: Equipment Request <ArrowRight size={18} />
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

export default ProductionForm;
