import React, { useEffect, useState } from 'react';
import { db, auth } from '../firebase';
import { collection, query, where, getDocs, updateDoc, doc, serverTimestamp } from 'firebase/firestore';
import { FileText, CheckCircle, XCircle, Eye, Search, AlertCircle, Clock } from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';

import { useAuth } from '../context/AuthContext';

function DSModule() {
  const { userDivision } = useAuth();
  const [applications, setApplications] = useState([]);
  const [loading, setLoading] = useState(true);
  const [selectedApp, setSelectedApp] = useState(null);
  const [searchTerm, setSearchTerm] = useState('');

  useEffect(() => {
    fetchPendingApplications();
  }, [userDivision]);

  const fetchPendingApplications = async () => {
    if (!userDivision) {
      setLoading(false);
      return;
    }
    
    setLoading(true);
    try {
      // DS sees all pending applications for their division
      const q = query(
        collection(db, 'applications'),
        where('status', '==', 'pending_ds'),
        where('division', '==', userDivision)
      );

      const querySnapshot = await getDocs(q);
      const docs = querySnapshot.docs.map(doc => ({
        id: doc.id,
        ...doc.data()
      }));
      setApplications(docs);
    } catch (error) {
      console.error("Error fetching DS apps:", error);
    } finally {
      setLoading(false);
    }
  };

  const handleAction = async (appId, newStatus) => {
    const reason = newStatus === 'rejected' ? window.prompt('Enter reason for rejection:') : null;
    if (newStatus === 'rejected' && reason === null) return;

    try {
      const appRef = doc(db, 'applications', appId);
      await updateDoc(appRef, {
        status: newStatus === 'approved' ? 'pending_director' : newStatus,
        dsReview: {
          reviewedBy: auth.currentUser.email,
          reviewedAt: serverTimestamp(),
          comments: reason
        },
        lastUpdated: serverTimestamp()
      });

      alert(`Application ${newStatus === 'approved' ? 'Forwarded to Director' : 'Rejected'} successfully!`);
      setSelectedApp(null);
      fetchPendingApplications();
    } catch (error) {
      alert('Error updating status: ' + error.message);
    }
  };

  if (loading) return <div style={{ padding: '4rem', textAlign: 'center' }}><p>Loading pending reviews...</p></div>;

  return (
    <div className="animate-fade-in">
      <div style={{ marginBottom: '2rem' }}>
        <h2 style={{ fontSize: '2rem', margin: 0 }}>Approval Queue</h2>
        <p style={{ color: '#64748b' }}>Review and action applications submitted by Development Officers.</p>
      </div>

      <div className="grid-2">
        {applications.map(app => (
          <div key={app.id} className="glass card-hover" style={{ padding: '1.5rem', cursor: 'pointer' }} onClick={() => setSelectedApp(app)}>
            <div style={{ display: 'flex', flexWrap: 'wrap', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: '1.5rem', gap: '1rem' }}>
              <div style={{ display: 'flex', gap: '1rem', alignItems: 'center' }}>
                <div style={{ padding: '0.8rem', background: 'rgba(59, 130, 246, 0.1)', borderRadius: '12px' }}>
                  <FileText color="#3b82f6" size={24} />
                </div>
                <div>
                  <h4 style={{ margin: 0 }}>{app.personal?.fullName}</h4>
                  <p style={{ margin: 0, fontSize: '0.8rem', color: '#64748b' }}>NIC: {app.personal?.nic}</p>
                </div>
              </div>
              <div style={{ textAlign: 'right', marginLeft: 'auto' }}>
                <span style={{ fontSize: '1.2rem', fontWeight: 800, color: app.score > 30 ? '#10b981' : '#3b82f6' }}>{app.score || 0} pts</span>
              </div>
            </div>

            <div style={{ background: 'rgba(255,255,255,0.03)', padding: '1rem', borderRadius: '8px', marginBottom: '1.5rem' }}>
               <p style={{ margin: 0, fontSize: '0.85rem' }}><strong>Business:</strong> {app.business?.businessName}</p>
               <p style={{ margin: '0.4rem 0 0', fontSize: '0.85rem' }}><strong>Grant:</strong> LKR {(app.equipment?.totalGrant || 0).toLocaleString()}</p>
            </div>

            <div style={{ display: 'flex', flexWrap: 'wrap', gap: '0.8rem' }}>
              <button 
                onClick={(e) => { e.stopPropagation(); handleAction(app.id, 'approved'); }}
                style={{ flexGrow: 1, padding: '0.7rem', background: '#10b981', border: 'none', borderRadius: '8px', color: '#fff', fontWeight: 600, cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '0.5rem', minWidth: '150px' }}
              >
                <CheckCircle size={18} /> Approve
              </button>
              <button 
                onClick={(e) => { e.stopPropagation(); handleAction(app.id, 'rejected'); }}
                style={{ flexGrow: 1, padding: '0.7rem', background: '#f43f5e', border: 'none', borderRadius: '8px', color: '#fff', fontWeight: 600, cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '0.5rem', minWidth: '100px' }}
              >
                <XCircle size={18} /> Reject
              </button>
            </div>
          </div>
        ))}
      </div>

      {applications.length === 0 && (
        <div className="glass" style={{ padding: '5rem', textAlign: 'center', color: '#64748b' }}>
          <Clock size={48} style={{ marginBottom: '1rem', opacity: 0.2 }} />
          <p>No pending applications in your queue.</p>
        </div>
      )}

      {/* Detailed Review Modal (Reusing/Extending View Logic) */}
      <AnimatePresence>
        {selectedApp && (
          <div style={modalOverlayStyle} onClick={() => setSelectedApp(null)}>
             <motion.div 
               className="glass-card" 
               style={{ ...modalContentStyle, padding: 0 }} 
               onClick={e => e.stopPropagation()}
               initial={{ opacity: 0, scale: 0.9 }}
               animate={{ opacity: 1, scale: 1 }}
               exit={{ opacity: 0, scale: 0.9 }}
             >
                <div style={{ padding: '2rem' }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '2rem' }}>
                  <h2 style={{ margin: 0, fontSize: '1.5rem' }}>Review Application</h2>
                  <button onClick={() => setSelectedApp(null)} style={{ background: 'transparent', border: 'none', color: '#94a3b8', cursor: 'pointer' }}>Close</button>
                </div>
                
                <div className="grid-2">
                  {/* Left Column */}
                  <div>
                    <h5 style={sectionHeaderStyle}>Applicant Identity</h5>
                    <div style={infoGridStyle}>
                      <p><strong>Full Name:</strong> {selectedApp.personal?.fullName}</p>
                      <p><strong>NIC:</strong> {selectedApp.personal?.nic}</p>
                      <p><strong>Address:</strong> {selectedApp.personal?.address}</p>
                    </div>

                    <h5 style={sectionHeaderStyle}>Business Validity</h5>
                    <div style={infoGridStyle}>
                      <p><strong>Sector:</strong> {selectedApp.business?.sector}</p>
                      <p><strong>Est. Income:</strong> LKR {(selectedApp.production?.estimatedIncome || 0).toLocaleString()}</p>
                      <p><strong>Production Cost:</strong> LKR {(selectedApp.production?.productionCost || 0).toLocaleString()}</p>
                    </div>
                  </div>

                  {/* Right Column */}
                  <div>
                    <h5 style={sectionHeaderStyle}>Scoring Breakdown</h5>
                    <div style={{ padding: '1.5rem', background: 'rgba(59, 130, 246, 0.05)', borderRadius: '12px', border: '1px solid rgba(59, 130, 246, 0.1)', marginBottom: '1.5rem' }}>
                       <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '0.5rem' }}>
                         <span>Eligibility Score:</span>
                         <span style={{ fontWeight: 700, color: '#3b82f6' }}>{selectedApp.score || 0} Points</span>
                       </div>
                       <div style={{ display: 'flex', justifyContent: 'space-between' }}>
                         <span>Recommended Grant:</span>
                         <span style={{ fontWeight: 700, color: '#10b981' }}>LKR {(selectedApp.equipment?.totalGrant || 0).toLocaleString()}</span>
                       </div>
                    </div>

                    <h5 style={sectionHeaderStyle}>Required Equipment</h5>
                    <div style={{ maxHeight: '200px', overflowY: 'auto', paddingRight: '0.5rem' }}>
                      {(selectedApp.equipment?.items || []).map((item, idx) => (
                        <div key={idx} style={{ padding: '0.8rem', background: 'rgba(255,255,255,0.02)', borderRadius: '8px', marginBottom: '0.5rem', fontSize: '0.85rem' }}>
                          <p style={{ margin: 0 }}><strong>{item.name}</strong> ({item.qty} units)</p>
                          <p style={{ margin: 0, opacity: 0.6 }}>Total: LKR {(item.qty * item.unitPrice).toLocaleString()}</p>
                        </div>
                      ))}
                    </div>
                  </div>
                </div>
                
                <div style={{ marginTop: '3rem', paddingTop: '2rem', borderTop: '1px solid rgba(255,255,255,0.05)', display: 'flex', flexWrap: 'wrap', gap: '1rem' }}>
                  <button 
                    onClick={() => handleAction(selectedApp.id, 'approved')}
                    style={{ flexGrow: 1, padding: '1rem', background: '#10b981', border: 'none', borderRadius: '10px', color: '#fff', fontWeight: 700, cursor: 'pointer', fontSize: '1rem', minWidth: '200px' }}
                  >
                    RECOMMEND TO DIRECTOR
                  </button>
                  <button 
                    onClick={() => handleAction(selectedApp.id, 'rejected')}
                    style={{ flexGrow: 1, padding: '1rem', background: '#f43f5e', border: 'none', borderRadius: '10px', color: '#fff', fontWeight: 700, cursor: 'pointer', fontSize: '1rem', minWidth: '200px' }}
                  >
                    REJECT APPLICATION
                  </button>
                </div>
              </div>
             </motion.div>
          </div>
        )}
      </AnimatePresence>
    </div>
  );
}

const modalOverlayStyle = {
  position: 'fixed',
  inset: 0,
  background: 'rgba(0,0,0,0.8)',
  backdropFilter: 'blur(8px)',
  display: 'flex',
  alignItems: 'center',
  justifyContent: 'center',
  zIndex: 1000,
  padding: '2rem'
};

const modalContentStyle = {
  width: '100%',
  maxWidth: '1000px',
  maxHeight: '90vh',
  overflowY: 'auto',
  padding: '3rem',
  background: '#0c111d',
  border: '1px solid rgba(255,255,255,0.1)'
};

const sectionHeaderStyle = {
  fontSize: '0.75rem',
  textTransform: 'uppercase',
  letterSpacing: '0.1em',
  color: '#64748b',
  marginBottom: '1rem'
};

const infoGridStyle = {
  display: 'flex',
  flexDirection: 'column',
  gap: '0.5rem',
  marginBottom: '2rem',
  fontSize: '0.9rem'
};

export default DSModule;
