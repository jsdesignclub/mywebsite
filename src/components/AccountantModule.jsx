import React, { useEffect, useState } from 'react';
import { db, auth } from '../firebase';
import { collection, query, where, getDocs, updateDoc, doc, serverTimestamp } from 'firebase/firestore';
import { FileText, CheckCircle, Package, Eye, Search, Clock, DollarSign, Download, Truck, Printer } from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';

function AccountantModule({ statusFilter = 'approved' }) {
  const [applications, setApplications] = useState([]);
  const [loading, setLoading] = useState(true);
  const [selectedApp, setSelectedApp] = useState(null);
  const [searchTerm, setSearchTerm] = useState('');

  useEffect(() => {
    fetchApplications();
  }, [statusFilter]);

  const fetchApplications = async () => {
    setLoading(true);
    try {
      const q = query(
        collection(db, 'applications'),
        where('status', '==', statusFilter)
      );

      const querySnapshot = await getDocs(q);
      const docs = querySnapshot.docs.map(doc => ({
        id: doc.id,
        ...doc.data()
      }));
      setApplications(docs);
    } catch (error) {
      console.error("Error fetching accountant apps:", error);
    } finally {
      setLoading(false);
    }
  };

  const handleUpdateStatus = async (appId, newStatus) => {
    try {
      const appRef = doc(db, 'applications', appId);
      await updateDoc(appRef, {
        status: newStatus,
        procurementUpdate: {
          updatedBy: auth.currentUser.email,
          updatedAt: serverTimestamp(),
          phase: newStatus === 'ordered' ? 'Equipment Ordered' : 'Payment Disbursed'
        },
        lastUpdated: serverTimestamp()
      });

      alert(`Status Updated to: ${newStatus.toUpperCase()}`);
      setSelectedApp(null);
      fetchApplications();
    } catch (error) {
      alert('Error: ' + error.message);
    }
  };

  const handlePrint = () => {
    window.print();
  };

  if (loading) return <div style={{ padding: '4rem', textAlign: 'center' }}><p>Loading procurement registry...</p></div>;

  const filteredApps = applications.filter(app => 
    app.personal?.fullName?.toLowerCase().includes(searchTerm.toLowerCase()) ||
    app.personal?.nic?.toLowerCase().includes(searchTerm.toLowerCase())
  );

  // Flatten items for the table view
  const tableRows = filteredApps.flatMap(app => 
    (app.equipment?.items || []).map(item => ({
      appId: app.id,
      applicantName: app.personal?.fullName,
      officerEmail: app.officer?.email?.split('@')[0],
      itemName: item.name,
      brand: item.brand,
      qty: item.qty,
      unitPrice: item.unitPrice,
      total: item.qty * item.unitPrice,
      quotationData: item.quotationData,
      status: app.status,
      originalApp: app
    }))
  );

  return (
    <div className="animate-fade-in procurement-module">
      {/* Print Styles */}
      <style>{`
        @media print {
          body * { visibility: hidden; }
          .procurement-module, .procurement-module * { visibility: visible; }
          .procurement-module { position: absolute; left: 0; top: 0; width: 100%; }
          .no-print { display: none !important; }
          .glass { background: white !important; color: black !important; border: 1px solid #ccc !important; }
          table { border-collapse: collapse; width: 100%; }
          th, td { border: 1px solid #000; padding: 8px; text-align: left; color: #000 !important; }
          h2, p { color: #000 !important; }
        }
      `}</style>

      <div style={{ marginBottom: '2rem', display: 'flex', justifyContent: 'space-between', alignItems: 'flex-end' }} className="no-print">
        <div>
          <h2 style={{ fontSize: '2.5rem', margin: 0, color: '#fff' }}>Procurement Master List</h2>
          <p style={{ color: '#94a3b8' }}>Authorized equipment registry for disbursement and ordering.</p>
        </div>
        <div style={{ display: 'flex', gap: '1rem' }}>
          <div style={{ position: 'relative' }}>
            <Search size={18} style={{ position: 'absolute', left: '12px', top: '50%', transform: 'translateY(-50%)', color: '#475569' }} />
            <input 
              type="text" 
              placeholder="Search registry..." 
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              style={searchStyle}
            />
          </div>
          <button onClick={handlePrint} style={printBtnStyle}>
            <Printer size={18} /> Quick Print List
          </button>
        </div>
      </div>

      <div className="glass" style={{ overflowX: 'auto', padding: '1rem' }}>
        <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: '0.9rem' }}>
          <thead>
            <tr style={{ borderBottom: '1px solid rgba(255,255,255,0.1)', color: '#94a3b8', textTransform: 'uppercase', fontSize: '0.75rem' }}>
              <th style={thStyle}>Applicant</th>
              <th style={thStyle}>DO</th>
              <th style={thStyle}>Item Name</th>
              <th style={thStyle}>Brand/Spec</th>
              <th style={thStyle}>Qty</th>
              <th style={thStyle} className="no-print">Quotation</th>
              <th style={thStyle}>Amount (LKR)</th>
              <th style={thStyle} className="no-print">Action</th>
            </tr>
          </thead>
          <tbody>
            {tableRows.map((row, idx) => (
              <tr key={idx} style={{ borderBottom: '1px solid rgba(255,255,255,0.05)', transition: 'background 0.2s' }} className="table-row">
                <td style={tdStyle}><strong>{row.applicantName}</strong></td>
                <td style={tdStyle}><span style={{ opacity: 0.6 }}>{row.officerEmail}</span></td>
                <td style={tdStyle}>{row.itemName}</td>
                <td style={tdStyle}>{row.brand}</td>
                <td style={tdStyle}>{row.qty}</td>
                <td style={tdStyle} className="no-print">
                  {row.quotationData ? (
                    <button 
                      onClick={() => {
                        const link = document.createElement('a');
                        link.href = row.quotationData;
                        link.download = `quotation_${row.itemName}.png`;
                        link.click();
                      }}
                      style={iconBtnStyle}
                    >
                      <Download size={14} />
                    </button>
                  ) : '-'}
                </td>
                <td style={tdStyle}><strong>{row.total.toLocaleString()}</strong></td>
                <td style={tdStyle} className="no-print">
                  <div style={{ display: 'flex', gap: '0.5rem' }}>
                    <button 
                      onClick={() => setSelectedApp(row.originalApp)}
                      style={{ ...actionBtnStyle, background: 'rgba(59, 130, 246, 0.1)', color: '#3b82f6' }}
                    >
                      <Eye size={14} />
                    </button>
                    {statusFilter === 'approved' && (
                       <button 
                         onClick={() => handleUpdateStatus(row.appId, 'ordered')}
                         style={{ ...actionBtnStyle, background: 'rgba(168, 85, 247, 0.1)', color: '#a855f7' }}
                         title="Order Now"
                       >
                         <Package size={14} />
                       </button>
                    )}
                  </div>
                </td>
              </tr>
            ))}
          </tbody>
        </table>

        {tableRows.length === 0 && (
          <div style={{ padding: '4rem', textAlign: 'center', color: '#64748b' }}>
            <Clock size={48} style={{ opacity: 0.1, marginBottom: '1rem' }} />
            <p>No procurement records found for this phase.</p>
          </div>
        )}
      </div>

      {/* Detail Modal */}
      <AnimatePresence>
        {selectedApp && (
          <div style={modalOverlayStyle} onClick={() => setSelectedApp(null)} className="no-print">
            <motion.div 
               className="glass" 
               style={modalContentStyle} 
               onClick={e => e.stopPropagation()}
               initial={{ opacity: 0, y: 20 }}
               animate={{ opacity: 1, y: 0 }}
               exit={{ opacity: 0, y: 20 }}
            >
               <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '2.5rem' }}>
                  <h2 style={{ margin: 0 }}>Full Application Details</h2>
                  <button onClick={() => setSelectedApp(null)} style={{ background: 'transparent', border: 'none', color: '#94a3b8', cursor: 'pointer' }}>CLOSE</button>
               </div>

               <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '3rem' }}>
                  <div>
                    <h4 style={sectionTitle}>Beneficiary Identity</h4>
                    <p><strong>Name:</strong> {selectedApp.personal?.fullName}</p>
                    <p><strong>NIC:</strong> {selectedApp.personal?.nic}</p>
                    <p><strong>District/Division:</strong> {selectedApp.officer?.email?.split('@')[0]}</p>
                  </div>
                  <div>
                    <h4 style={sectionTitle}>Financial Breakdown</h4>
                    <div style={{ background: 'rgba(255,255,255,0.02)', padding: '1.5rem', borderRadius: '12px', border: '1px solid rgba(255,255,255,0.05)' }}>
                       <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '0.8rem', opacity: 0.7, fontSize: '0.9rem' }}>
                          <span>Total Equipment Request:</span>
                          <span>LKR {((selectedApp.equipment?.items || []).reduce((sum, i) => sum + (Number(i.qty) * Number(i.unitPrice)), 0)).toLocaleString()}</span>
                       </div>
                       <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '0.8rem', opacity: 0.7, fontSize: '0.9rem' }}>
                          <span>Govt Grant (50% / Max 100k):</span>
                          <span style={{ color: '#10b981', fontWeight: 700 }}>LKR {(selectedApp.equipment?.totalGrant || 0).toLocaleString()}</span>
                       </div>
                       <div style={{ borderTop: '1px solid rgba(255,255,255,0.05)', marginTop: '0.8rem', paddingTop: '0.8rem', display: 'flex', justifyContent: 'space-between', fontWeight: 700 }}>
                          <span>Applicant Contribution:</span>
                          <span style={{ color: '#3b82f6' }}>LKR {(((selectedApp.equipment?.items || []).reduce((sum, i) => sum + (Number(i.qty) * Number(i.unitPrice)), 0)) - (selectedApp.equipment?.totalGrant || 0)).toLocaleString()}</span>
                       </div>
                    </div>
                    <p style={{ margin: '1rem 0 0', fontSize: '0.75rem', color: '#64748b', fontStyle: 'italic' }}>* Policy: 50% matching grant provided, capped at a maximum of LKR 100,000.00</p>
                  </div>
               </div>

               <div style={{ marginTop: '3rem' }}>
                  <h4 style={sectionTitle}>Equipment Specification List</h4>
                  <table style={{ width: '100%', color: '#fff' }}>
                     <thead>
                        <tr style={{ textAlign: 'left', borderBottom: '1px solid rgba(255,255,255,0.1)' }}>
                           <th style={{ padding: '1rem' }}>Model/Name</th>
                           <th style={{ padding: '1rem' }}>Brand</th>
                           <th style={{ padding: '1rem' }}>Unit Price (LKR)</th>
                        </tr>
                     </thead>
                     <tbody>
                        {(selectedApp.equipment?.items || []).map((item, i) => (
                           <tr key={i} style={{ borderBottom: '1px solid rgba(255,255,255,0.05)' }}>
                              <td style={{ padding: '0.8rem' }}>{item.name}</td>
                              <td style={{ padding: '0.8rem' }}>{item.brand}</td>
                              <td style={{ padding: '0.8rem' }}>{(item.unitPrice).toLocaleString()}</td>
                           </tr>
                        ))}
                     </tbody>
                  </table>
               </div>

               {statusFilter === 'approved' && (
                  <div style={{ marginTop: '4rem', display: 'flex', gap: '1rem' }}>
                     <button 
                       onClick={() => handleUpdateStatus(selectedApp.id, 'ordered')}
                       style={{ flexGrow: 1, padding: '1rem', background: '#a855f7', border: 'none', borderRadius: '8px', color: '#fff', fontWeight: 700, cursor: 'pointer' }}
                     >
                       APPROVE & PLACE ORDER
                     </button>
                     <button 
                       onClick={() => handlePrint()}
                       style={{ padding: '1rem 2rem', background: 'rgba(255,255,255,0.1)', border: 'none', borderRadius: '8px', color: '#fff', cursor: 'pointer', display: 'flex', alignItems: 'center', gap: '0.5rem' }}
                     >
                       <Printer size={18} /> PRINT RECORD
                     </button>
                  </div>
               )}
            </motion.div>
          </div>
        )}
      </AnimatePresence>
    </div>
  );
}

// Internal Styles
const thStyle = { padding: '1.2rem 1rem', textAlign: 'left', fontWeight: 600 };
const tdStyle = { padding: '1.2rem 1rem' };
const sectionTitle = { fontSize: '0.75rem', textTransform: 'uppercase', color: '#64748b', marginBottom: '1rem', letterSpacing: '0.1em' };

const searchStyle = {
  padding: '0.8rem 1.2rem 0.8rem 3rem',
  background: 'rgba(255,255,255,0.03)',
  border: '1px solid rgba(255,255,255,0.1)',
  borderRadius: '10px',
  color: '#fff',
  width: '300px',
  outline: 'none',
  fontSize: '0.9rem'
};

const printBtnStyle = {
  display: 'flex',
  alignItems: 'center',
  gap: '0.5rem',
  padding: '0.8rem 1.5rem',
  background: 'rgba(255,255,255,0.05)',
  border: '1px solid rgba(255,255,255,0.1)',
  borderRadius: '10px',
  color: '#fff',
  cursor: 'pointer',
  fontWeight: 600
};

const iconBtnStyle = {
  background: 'rgba(168, 85, 247, 0.1)',
  border: 'none',
  borderRadius: '6px',
  color: '#a855f7',
  padding: '0.4rem',
  cursor: 'pointer',
  display: 'flex'
};

const actionBtnStyle = {
  padding: '0.5rem',
  borderRadius: '6px',
  border: 'none',
  cursor: 'pointer',
  display: 'flex',
  alignItems: 'center',
  justifyContent: 'center'
};

const modalOverlayStyle = {
  position: 'fixed',
  inset: 0,
  background: 'rgba(0,0,0,0.85)',
  backdropFilter: 'blur(12px)',
  display: 'flex',
  alignItems: 'center',
  justifyContent: 'center',
  zIndex: 1000,
  padding: '2rem'
};

const modalContentStyle = {
  width: '100%',
  maxWidth: '1000px',
  padding: '3rem',
  background: '#0c111d',
  borderRadius: '20px',
  border: '1px solid rgba(255,255,255,0.1)'
};

export default AccountantModule;
