import React, { useEffect, useState } from 'react';
import { db, auth } from '../firebase';
import { collection, query, where, getDocs, updateDoc, doc, serverTimestamp } from 'firebase/firestore';
import { FileText, CheckCircle, XCircle, Eye, Search, AlertCircle, Clock, ShieldCheck } from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';

function DirectorModule() {
  const [applications, setApplications] = useState([]);
  const [loading, setLoading] = useState(true);
  const [selectedApp, setSelectedApp] = useState(null);
  const [searchTerm, setSearchTerm] = useState('');

  useEffect(() => {
    fetchDirectorQueue();
  }, []);

  const fetchDirectorQueue = async () => {
    setLoading(true);
    try {
      // Director sees all applications recommended by DS
      const q = query(
        collection(db, 'applications'),
        where('status', '==', 'pending_director')
      );

      const querySnapshot = await getDocs(q);
      const docs = querySnapshot.docs.map(doc => ({
        id: doc.id,
        ...doc.data()
      }));
      setApplications(docs);
    } catch (error) {
      console.error("Error fetching Director apps:", error);
    } finally {
      setLoading(false);
    }
  };

  const handleAction = async (appId, newStatus) => {
    const reason = newStatus === 'rejected' ? window.prompt('Enter reason for final rejection:') : null;
    if (newStatus === 'rejected' && reason === null) return;

    try {
      const appRef = doc(db, 'applications', appId);
      await updateDoc(appRef, {
        status: newStatus,
        directorReview: {
          reviewedBy: auth.currentUser.email,
          reviewedAt: serverTimestamp(),
          comments: reason
        },
        lastUpdated: serverTimestamp()
      });

      alert(`Application ${newStatus === 'approved' ? 'Officially Approved' : 'Rejected'}!`);
      setSelectedApp(null);
      fetchDirectorQueue();
    } catch (error) {
      alert('Error updating status: ' + error.message);
    }
  };

  if (loading) return <div style={{ padding: '4rem', textAlign: 'center' }}><p>Loading Director's Queue...</p></div>;

  const filteredApps = applications.filter(app => 
    app.personal?.fullName?.toLowerCase().includes(searchTerm.toLowerCase()) ||
    app.personal?.nic?.toLowerCase().includes(searchTerm.toLowerCase())
  );

  return (
    <div className="animate-fade-in">
      <div style={{ marginBottom: '2rem', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
        <div>
          <h2 style={{ fontSize: '2.2rem', margin: 0, color: '#fff' }}>Final Approval Panel</h2>
          <p style={{ color: '#94a3b8' }}>Reviewing applications recommended by Divisional Secretaries.</p>
        </div>
        <div style={{ position: 'relative' }}>
          <Search size={18} style={{ position: 'absolute', left: '12px', top: '50%', transform: 'translateY(-50%)', color: '#475569' }} />
          <input 
            type="text" 
            placeholder="Search applicants..." 
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            style={searchStyle}
          />
        </div>
      </div>

      <div className="grid-2">
        {filteredApps.map(app => (
          <div key={app.id} className="glass card-hover" style={{ padding: '2rem', cursor: 'pointer', border: '1px solid rgba(16, 185, 129, 0.2)' }} onClick={() => setSelectedApp(app)}>
            <div style={{ display: 'flex', flexWrap: 'wrap', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1.5rem', gap: '1rem' }}>
               <div style={{ display: 'flex', gap: '1rem', alignItems: 'center' }}>
                 <div style={{ padding: '0.8rem', background: 'rgba(16, 185, 129, 0.1)', borderRadius: '12px' }}>
                   <ShieldCheck color="#10b981" size={28} />
                 </div>
                 <div>
                   <h3 style={{ margin: 0, fontSize: '1.2rem' }}>{app.personal?.fullName}</h3>
                   <span style={{ fontSize: '0.75rem', color: '#64748b', textTransform: 'uppercase' }}>Recommended by DS</span>
                 </div>
               </div>
               <div style={{ textAlign: 'right', marginLeft: 'auto' }}>
                 <div style={{ fontSize: '1.5rem', fontWeight: 900, color: '#10b981' }}>{app.score || 0}</div>
                 <div style={{ fontSize: '0.6rem', color: '#64748b' }}>TOTAL SCORE</div>
               </div>
            </div>

            <div style={{ background: 'rgba(255,255,255,0.02)', padding: '1.2rem', borderRadius: '12px', marginBottom: '1.5rem' }}>
                <p style={{ margin: '0 0 0.5rem', fontSize: '0.9rem' }}><strong>Business:</strong> {app.business?.businessName}</p>
                <p style={{ margin: 0, fontSize: '0.9rem' }}><strong>Requested Grant:</strong> <span style={{ color: '#10b981', fontWeight: 700 }}>LKR {(app.equipment?.totalGrant || 0).toLocaleString()}</span></p>
            </div>

            <div style={{ display: 'flex', flexWrap: 'wrap', gap: '1rem' }}>
              <button 
                onClick={(e) => { e.stopPropagation(); handleAction(app.id, 'approved'); }}
                style={{ flexGrow: 2, padding: '0.8rem', background: 'linear-gradient(135deg, #059669 0%, #10b981 100%)', border: 'none', borderRadius: '10px', color: '#fff', fontWeight: 700, cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '0.5rem', minWidth: '200px' }}
              >
                <CheckCircle size={20} /> FINAL APPROVAL
              </button>
              <button 
                onClick={(e) => { e.stopPropagation(); handleAction(app.id, 'rejected'); }}
                style={{ flexGrow: 1, padding: '0.8rem', background: 'rgba(244, 63, 94, 0.1)', border: '1px solid rgba(244, 63, 94, 0.2)', borderRadius: '10px', color: '#f43f5e', fontWeight: 600, cursor: 'pointer', minWidth: '100px' }}
              >
                REJECT
              </button>
            </div>
          </div>
        ))}
      </div>

      {filteredApps.length === 0 && (
        <div className="glass" style={{ padding: '6rem', textAlign: 'center', color: '#64748b' }}>
          <Clock size={64} style={{ marginBottom: '1.5rem', opacity: 0.1 }} />
          <h3>No applications awaiting final approval</h3>
          <p>Everything is up to date.</p>
        </div>
      )}

      {/* Detail Modal */}
      <AnimatePresence>
        {selectedApp && (
          <div style={modalOverlayStyle} onClick={() => setSelectedApp(null)}>
            <motion.div 
               className="glass-card" 
               style={{ ...modalContentStyle, padding: 0 }} 
               onClick={e => e.stopPropagation()}
               initial={{ opacity: 0, y: 30 }}
               animate={{ opacity: 1, y: 0 }}
               exit={{ opacity: 0, y: 30 }}
            >
               <div style={{ padding: '2rem' }}>
               <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '2.5rem' }}>
                  <h2 style={{ margin: 0, fontSize: '1.5rem' }}>Final Director Review</h2>
                  <button onClick={() => setSelectedApp(null)} style={{ background: 'transparent', border: 'none', color: '#94a3b8', cursor: 'pointer' }}>CLOSE</button>
               </div>

               <div className="grid-2">
                  <div>
                    <Section title="Applicant Credentials">
                      <p><strong>Name:</strong> {selectedApp.personal?.fullName}</p>
                      <p><strong>NIC:</strong> {selectedApp.personal?.nic}</p>
                      <p><strong>Division:</strong> {selectedApp.officer?.email?.split('@')[0]}</p>
                    </Section>

                    <Section title="Financial Proposal">
                      <p><strong>Business Sector:</strong> {selectedApp.business?.sector}</p>
                      <p><strong>Est. Annual Income:</strong> LKR {(selectedApp.production?.estimatedIncome || 0).toLocaleString()}</p>
                      <p><strong>SME Support Ratio:</strong> 50% Matching Grant</p>
                    </Section>

                    <div style={{ marginTop: '2rem', padding: '1.5rem', background: 'rgba(59, 130, 246, 0.05)', borderRadius: '12px', border: '1px solid rgba(59, 130, 246, 0.1)' }}>
                      <h4 style={{ margin: '0 0 1rem', fontSize: '0.8rem', color: '#3b82f6', textTransform: 'uppercase' }}>DS Recommendation</h4>
                      <p style={{ margin: 0, fontSize: '0.9rem' }}>{selectedApp.dsReview?.comments || "Recommended for approval based on eligibility scoring."}</p>
                      <p style={{ margin: '0.5rem 0 0', fontSize: '0.75rem', color: '#64748b' }}>Reviewed by: {selectedApp.dsReview?.reviewedBy}</p>
                    </div>
                  </div>

                  <div>
                    <Section title="Detailed Score Breakdown">
                      <div style={{ display: 'flex', flexDirection: 'column', gap: '0.8rem' }}>
                        <ScoreRow label="Education & NVQ" value={selectedApp.score > 20 ? 25 : 15} />
                        <ScoreRow label="Business Viability" value={15} />
                        <ScoreRow label="Asset Commitment" value={10} />
                        <div style={{ borderTop: '1px solid rgba(255,255,255,0.1)', paddingTop: '0.8rem', display: 'flex', justifyContent: 'space-between', fontWeight: 800 }}>
                          <span>FINAL ELIGIBILITY:</span>
                          <span style={{ color: '#10b981' }}>{selectedApp.score} Points</span>
                        </div>
                      </div>
                    </Section>

                    <Section title="Equipment for Procurement">
                       <div style={{ maxHeight: '250px', overflowY: 'auto', paddingRight: '0.5rem' }}>
                          {(selectedApp.equipment?.items || []).map((item, idx) => (
                            <div key={idx} style={{ padding: '1rem', background: 'rgba(255,255,255,0.03)', borderRadius: '8px', marginBottom: '0.8rem' }}>
                              <p style={{ margin: 0 }}><strong>{item.name}</strong> ({item.brand})</p>
                              <p style={{ margin: 0, fontSize: '0.85rem', opacity: 0.6 }}>Procurement Cost: LKR {(item.qty * item.unitPrice).toLocaleString()}</p>
                            </div>
                          ))}
                       </div>
                       <div style={{ marginTop: '1rem', padding: '1rem', background: 'rgba(16, 185, 129, 0.1)', borderRadius: '8px', textAlign: 'right' }}>
                         <span style={{ fontSize: '0.8rem' }}>TOTAL GRANT PAYABLE:</span>
                         <div style={{ fontSize: '1.2rem', fontWeight: 800, color: '#10b981' }}>LKR {(selectedApp.equipment?.totalGrant || 0).toLocaleString()}</div>
                       </div>
                    </Section>
                  </div>
               </div>

               <div style={{ marginTop: '4rem', display: 'flex', flexWrap: 'wrap', gap: '1.5rem' }}>
                  <button 
                    onClick={() => handleAction(selectedApp.id, 'approved')}
                    style={{ flexGrow: 1, padding: '1.2rem', background: '#10b981', color: '#fff', border: 'none', borderRadius: '12px', fontWeight: 800, cursor: 'pointer', fontSize: '1.1rem', minWidth: '250px' }}
                  >
                    CONFIRM & SIGN APPROVAL
                  </button>
                  <button 
                    onClick={() => handleAction(selectedApp.id, 'rejected')}
                    style={{ padding: '1.2rem 2.5rem', background: 'transparent', color: '#f43f5e', border: '1px solid #f43f5e', borderRadius: '12px', fontWeight: 700, cursor: 'pointer', minWidth: '150px' }}
                  >
                    REJECT
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

function Section({ title, children }) {
  return (
    <div style={{ marginBottom: '2.5rem' }}>
      <h4 style={{ margin: '0 0 1rem', fontSize: '0.75rem', color: '#64748b', textTransform: 'uppercase', letterSpacing: '0.1em' }}>{title}</h4>
      <div style={{ fontSize: '1rem', display: 'flex', flexDirection: 'column', gap: '0.6rem' }}>
        {children}
      </div>
    </div>
  );
}

function ScoreRow({ label, value }) {
  return (
    <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '0.9rem' }}>
      <span style={{ opacity: 0.7 }}>{label}</span>
      <span>{value} pts</span>
    </div>
  );
}

const searchStyle = {
  padding: '0.8rem 1.2rem 0.8rem 3rem',
  background: 'rgba(255,255,255,0.03)',
  border: '1px solid rgba(255,255,255,0.1)',
  borderRadius: '12px',
  color: '#fff',
  width: '350px',
  outline: 'none',
  fontSize: '0.9rem'
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
  maxWidth: '1200px',
  maxHeight: '95vh',
  overflowY: 'auto',
  padding: '4rem',
  background: '#0c111d',
  border: '1px solid rgba(255,255,255,0.1)',
  borderRadius: '24px'
};

export default DirectorModule;
