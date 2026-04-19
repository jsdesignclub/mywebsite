import React, { useEffect, useState } from 'react';
import { db, auth } from '../../firebase';
import { collection, query, where, getDocs, orderBy, updateDoc, doc, serverTimestamp, deleteDoc } from 'firebase/firestore';
import { FileText, Clock, CheckCircle, AlertCircle, Eye, Search, Filter, Trash2, Edit3, X, Download, User as UserIcon, Briefcase, GraduationCap, Factory, PenTool, XCircle } from 'lucide-react';

import { useAuth } from '../../context/AuthContext';

function ApplicationsList({ statusFilter = 'all', onEdit }) {
  const { userRole, userDivision } = useAuth();
  const normalizedRole = userRole?.toLowerCase();
  const [applications, setApplications] = useState([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState('');
  const [selectedApp, setSelectedApp] = useState(null);

  useEffect(() => {
    const fetchApplications = async () => {
      try {
        // Fetch applications (Simplified query to avoid Index requirements)
        let q;
        const appRef = collection(db, 'applications');
        
        // Dynamic filtering based on role
        if (normalizedRole === 'divisional_secretary') {
          // DS only sees apps for their assigned division
          if (statusFilter === 'all') {
            q = query(appRef, where('division', '==', userDivision));
          } else {
            q = query(appRef, where('division', '==', userDivision), where('status', '==', statusFilter));
          }
        } else if (normalizedRole === 'director') {
          // Director sees all applications
          if (statusFilter === 'all') {
            q = query(appRef);
          } else {
            q = query(appRef, where('status', '==', statusFilter));
          }
        } else {
          // DO and others only see their own submissions
          const officerQuery = where('officer.uid', '==', auth.currentUser.uid);
          if (statusFilter === 'all') {
            q = query(appRef, officerQuery);
          } else {
            q = query(appRef, officerQuery, where('status', '==', statusFilter));
          }
        }

        const querySnapshot = await getDocs(q);
        const docs = querySnapshot.docs.map(doc => ({
          id: doc.id,
          ...doc.data()
        })).sort((a, b) => {
          // Sort by creation date (newest first)
          const timeA = a.createdAt?.seconds || 0;
          const timeB = b.createdAt?.seconds || 0;
          return timeB - timeA;
        });
        setApplications(docs);
      } catch (error) {
        console.error("Error fetching applications:", error);
      } finally {
        setLoading(false);
      }
    };

    fetchApplications();
  }, [statusFilter]);

  const handleAction = async (e, appId, newStatus) => {
    e.stopPropagation();
    const reason = newStatus === 'rejected' ? window.prompt('Enter reason for rejection:') : null;
    if (newStatus === 'rejected' && reason === null) return;
    
    // Use the core update logic
    try {
      const appRef = doc(db, 'applications', appId);
      const updateData = {
        status: newStatus === 'approved' && userRole === 'divisional_secretary' ? 'pending_director' : newStatus,
        lastUpdated: serverTimestamp()
      };

      if (normalizedRole === 'divisional_secretary') {
        updateData.dsReview = {
          reviewedBy: auth.currentUser.email,
          reviewedAt: serverTimestamp(),
          comments: reason
        };
      } else if (normalizedRole === 'director') {
        updateData.directorReview = {
          reviewedBy: auth.currentUser.email,
          reviewedAt: serverTimestamp(),
          comments: reason
        };
      }

      await updateDoc(appRef, updateData);
      setApplications(prev => prev.map(app => app.id === appId ? { ...app, status: updateData.status } : app));
      alert(`Application ${updateData.status === 'pending_director' ? 'Forwarded to Director' : (newStatus === 'approved' ? 'Approved' : 'Rejected')}!`);
    } catch (err) {
      alert('Action failed: ' + err.message);
    }
  };

  const handleDelete = async (e, appId) => {
    e.stopPropagation();
    if (window.confirm('Are you sure you want to delete this application? This action cannot be undone.')) {
      try {
        await deleteDoc(doc(db, 'applications', appId));
        setApplications(prev => prev.filter(app => app.id !== appId));
        alert('Application deleted successfully.');
      } catch (error) {
        console.error("Error deleting application:", error);
        alert('Failed to delete: ' + error.message);
      }
    }
  };

  const getStatusBadge = (status) => {
    switch (status) {
      case 'pending_ds':
        return <span style={{ ...badgeStyle, background: 'rgba(245, 158, 11, 0.1)', color: '#f59e0b' }}>DS Review</span>;
      case 'pending_director':
        return <span style={{ ...badgeStyle, background: 'rgba(59, 130, 246, 0.1)', color: '#3b82f6' }}>Director Review</span>;
      case 'approved':
        return <span style={{ ...badgeStyle, background: 'rgba(16, 185, 129, 0.1)', color: '#10b981' }}>Approved</span>;
      case 'rejected':
        return <span style={{ ...badgeStyle, background: 'rgba(244, 63, 94, 0.1)', color: '#f43f5e' }}>Rejected</span>;
      default:
        return <span style={{ ...badgeStyle }}>{status}</span>;
    }
  };

  const filteredApps = applications.filter(app => 
    app.personal?.fullName?.toLowerCase().includes(searchTerm.toLowerCase()) ||
    app.personal?.nic?.toLowerCase().includes(searchTerm.toLowerCase())
  );

  if (loading) {
    return (
      <div style={{ display: 'flex', justifyContent: 'center', padding: '4rem' }}>
        <p style={{ color: '#64748b' }}>Loading applications...</p>
      </div>
    );
  }

  return (
    <div className="animate-fade-in">
      <div style={{ marginBottom: '2rem', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
        <div>
          <h2 style={{ margin: 0, fontSize: '1.8rem' }}>
            {statusFilter === 'approved' ? 'Approved Grants' : 
             statusFilter === 'pending_ds' ? 'DS Pending Review' :
             statusFilter === 'pending_director' ? 'Director Pending Review' :
             statusFilter === 'rejected' ? 'Rejected Applications' : 'All Applications'}
          </h2>
          <p style={{ color: '#64748b', margin: '0.5rem 0 0' }}>
            {statusFilter === 'approved' ? 'Official list of approved SME grants.' : 
             'Track and manage applications across different stages.'}
          </p>
        </div>
        <div style={{ position: 'relative' }}>
          <Search size={18} style={{ position: 'absolute', left: '12px', top: '50%', transform: 'translateY(-50%)', color: '#475569' }} />
          <input 
            type="text" 
            placeholder="Search by name or NIC..." 
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            style={searchStyle}
          />
        </div>
      </div>

      {filteredApps.length === 0 ? (
        <div className="glass" style={{ padding: '4rem', textAlign: 'center', color: '#64748b' }}>
          <FileText size={48} style={{ marginBottom: '1rem', opacity: 0.2 }} />
          <p>No applications found.</p>
        </div>
      ) : (
        <div style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>
          {filteredApps.map(app => (
            <div key={app.id} className="glass" style={{ ...cardStyle, marginBottom: '0.5rem' }}>
              <div style={{ display: 'flex', flexWrap: 'wrap', justifyContent: 'space-between', alignItems: 'center', gap: '1rem' }}>
                <div style={{ display: 'flex', gap: '1rem', alignItems: 'center', minWidth: '200px', flexGrow: 1 }}>
                  <div style={iconBoxStyle}>
                    <FileText size={20} color="#3b82f6" />
                  </div>
                  <div>
                    <h4 style={{ margin: 0, fontSize: '1rem' }}>{app.personal?.fullName || 'Unnamed Applicant'}</h4>
                    <p style={{ margin: '0.1rem 0 0', fontSize: '0.8rem', color: '#64748b' }}>
                      NIC: {app.personal?.nic} • {app.business?.businessName}
                    </p>
                  </div>
                </div>
                
                <div style={{ display: 'flex', flexWrap: 'wrap', alignItems: 'center', gap: '1rem', justifyContent: 'flex-start' }}>
                  <div style={{ minWidth: '80px' }}>
                    <p style={{ margin: 0, fontSize: '0.7rem', color: '#64748b', textTransform: 'uppercase' }}>Status</p>
                    {getStatusBadge(app.status)}
                  </div>
                  
                  <div style={{ minWidth: '80px' }}>
                    <p style={{ margin: 0, fontSize: '0.7rem', color: '#64748b', textTransform: 'uppercase' }}>Points</p>
                    <p style={{ margin: 0, fontWeight: 800, color: app.score > 30 ? '#10b981' : '#3b82f6', fontSize: '1rem' }}>
                      {app.score || 0}
                    </p>
                  </div>

                  <div style={{ minWidth: '100px' }}>
                    <p style={{ margin: 0, fontSize: '0.7rem', color: '#64748b', textTransform: 'uppercase' }}>Grant</p>
                    <p style={{ margin: 0, fontWeight: 700, color: '#fff', fontSize: '0.9rem' }}>
                      LKR {(app.equipment?.totalGrant || 0).toLocaleString()}
                    </p>
                  </div>

                  <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', marginLeft: 'auto' }}>
                    <button 
                      onClick={() => setSelectedApp(app)}
                      style={{ ...iconBtnStyle, width: '36px', height: '36px', color: '#3b82f6', background: 'rgba(59, 130, 246, 0.1)' }}
                      title="View Details"
                    >
                      <Eye size={16} />
                    </button>
                    
                    {normalizedRole === 'development_officer' && (
                      <button 
                        onClick={(e) => { e.stopPropagation(); onEdit(app); }}
                        style={{ ...iconBtnStyle, width: '36px', height: '36px', color: '#f59e0b', background: 'rgba(245, 158, 11, 0.1)' }}
                        title="Edit"
                      >
                        <Edit3 size={16} />
                      </button>
                    )}

                    {normalizedRole === 'divisional_secretary' && app.status === 'pending_ds' && (
                      <div style={{ display: 'flex', gap: '0.5rem' }}>
                        <button 
                          onClick={(e) => handleAction(e, app.id, 'approved')}
                          style={{ ...iconBtnStyle, width: '36px', height: '36px', color: '#10b981', background: 'rgba(16, 185, 129, 0.1)' }}
                          title="Forward to Director"
                        >
                          <CheckCircle size={16} />
                        </button>
                        <button 
                          onClick={(e) => handleAction(e, app.id, 'rejected')}
                          style={{ ...iconBtnStyle, width: '36px', height: '36px', color: '#f43f5e', background: 'rgba(244, 63, 94, 0.1)' }}
                          title="Reject"
                        >
                          <XCircle size={16} />
                        </button>
                      </div>
                    )}

                    {normalizedRole === 'director' && app.status === 'pending_director' && (
                      <div style={{ display: 'flex', gap: '0.5rem' }}>
                        <button 
                          onClick={(e) => handleAction(e, app.id, 'approved')}
                          style={{ ...iconBtnStyle, width: '36px', height: '36px', color: '#10b981', background: 'rgba(16, 185, 129, 0.1)' }}
                          title="Final Approve"
                        >
                          <CheckCircle size={16} />
                        </button>
                        <button 
                          onClick={(e) => handleAction(e, app.id, 'rejected')}
                          style={{ ...iconBtnStyle, width: '36px', height: '36px', color: '#f43f5e', background: 'rgba(244, 63, 94, 0.1)' }}
                          title="Reject"
                        >
                          <XCircle size={16} />
                        </button>
                      </div>
                    )}
                  </div>
                </div>
              </div>
            </div>
          ))}
        </div>
      )}

      {/* Detail Modal */}
      {selectedApp && (
        <div style={modalOverlayStyle} onClick={() => setSelectedApp(null)}>
          <div className="glass animate-fade-in" style={modalContentStyle} onClick={e => e.stopPropagation()}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '2rem' }}>
              <h2 style={{ margin: 0 }}>Application Details</h2>
              <button onClick={() => setSelectedApp(null)} style={{ background: 'transparent', border: 'none', color: '#94a3b8', cursor: 'pointer' }}>
                <X size={24} />
              </button>
            </div>

            <div className="grid-2">
              <div>
                <DetailSection icon={<UserIcon size={18}/>} title="Personal Info">
                  <p><strong>Name:</strong> {selectedApp.personal?.fullName}</p>
                  <p><strong>NIC:</strong> {selectedApp.personal?.nic}</p>
                  <p><strong>Address:</strong> {selectedApp.personal?.address}</p>
                  <p><strong>Phone:</strong> {selectedApp.personal?.phone}</p>
                </DetailSection>

                <DetailSection icon={<Briefcase size={18}/>} title="Business Details">
                  <p><strong>Business Name:</strong> {selectedApp.business?.businessName}</p>
                  <p><strong>Registration No:</strong> {selectedApp.business?.regNo}</p>
                  <p><strong>Grant Requested:</strong> LKR {(selectedApp.equipment?.totalGrant || 0).toLocaleString()}</p>
                </DetailSection>
              </div>

              <div>
                <DetailSection icon={<GraduationCap size={18}/>} title="Qualifications">
                  <p><strong>NVQ Level:</strong> {selectedApp.training?.nvqLevel || 'N/A'}</p>
                  <p><strong>Degree:</strong> {selectedApp.training?.degree || 'N/A'}</p>
                  <p><strong>Eligibility Score:</strong> <span style={{ color: '#10b981', fontWeight: 800 }}>{selectedApp.score || 0} pts</span></p>
                </DetailSection>

                <DetailSection icon={<PenTool size={18}/>} title="Requested Equipment">
                  {(selectedApp.equipment?.items || []).map((item, idx) => (
                    <div key={idx} style={{ marginBottom: '0.8rem', padding: '0.5rem', background: 'rgba(255,255,255,0.03)', borderRadius: '8px' }}>
                      <p style={{ margin: 0 }}><strong>{item.name}</strong> ({item.brand})</p>
                      <p style={{ margin: 0, fontSize: '0.8rem', opacity: 0.7 }}>LKR {item.unitPrice.toLocaleString()} x {item.qty}</p>
                      {item.quotationData && (
                        <button 
                          onClick={() => {
                            const link = document.createElement('a');
                            link.href = item.quotationData;
                            link.download = `quotation_${item.name}.png`;
                            link.click();
                          }}
                          style={{ marginTop: '0.5rem', display: 'flex', alignItems: 'center', gap: '0.4rem', background: 'transparent', border: 'none', color: '#3b82f6', cursor: 'pointer', fontSize: '0.8rem' }}
                        >
                          <Download size={14} /> Download Quotation
                        </button>
                      )}
                    </div>
                  ))}
                </DetailSection>
              </div>
            </div>

            {normalizedRole === 'divisional_secretary' && selectedApp.status === 'pending_ds' && (
              <div style={{ marginTop: '3rem', paddingTop: '2rem', borderTop: '1px solid rgba(255,255,255,0.05)', display: 'flex', gap: '1rem' }}>
                <button 
                  onClick={(e) => { handleAction(e, selectedApp.id, 'approved'); setSelectedApp(null); }}
                  style={{ flexGrow: 1, padding: '1rem', background: '#10b981', border: 'none', borderRadius: '10px', color: '#fff', fontWeight: 700, cursor: 'pointer', fontSize: '1.1rem' }}
                >
                  APPROVE NOW
                </button>
                <button 
                  onClick={(e) => { handleAction(e, selectedApp.id, 'rejected'); setSelectedApp(null); }}
                  style={{ flexGrow: 1, padding: '1rem', background: '#f43f5e', border: 'none', borderRadius: '10px', color: '#fff', fontWeight: 700, cursor: 'pointer', fontSize: '1.1rem' }}
                >
                  REJECT & ADD REASON
                </button>
              </div>
            )}
            
            {selectedApp.status === 'rejected' && selectedApp.dsReview?.comments && (
              <div style={{ marginTop: '2rem', padding: '1.5rem', background: 'rgba(244, 63, 94, 0.1)', borderRadius: '12px', border: '1px solid rgba(244, 63, 94, 0.2)' }}>
                <p style={{ margin: 0, color: '#f43f5e', fontSize: '0.8rem', textTransform: 'uppercase', marginBottom: '0.5rem' }}>Rejection Reason:</p>
                <p style={{ margin: 0, color: '#fff' }}>{selectedApp.dsReview.comments}</p>
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  );
}

function DetailSection({ icon, title, children }) {
  return (
    <div style={{ marginBottom: '2rem' }}>
      <div style={{ display: 'flex', alignItems: 'center', gap: '0.8rem', marginBottom: '1rem', color: '#10b981' }}>
        {icon}
        <h3 style={{ margin: 0, fontSize: '1rem', textTransform: 'uppercase', letterSpacing: '0.05em' }}>{title}</h3>
      </div>
      <div style={{ paddingLeft: '2.5rem', fontSize: '0.95rem', color: '#cbd5e1' }}>
        {children}
      </div>
    </div>
  );
}

const iconBtnStyle = {
  width: '40px',
  height: '40px',
  borderRadius: '8px',
  border: 'none',
  display: 'flex',
  alignItems: 'center',
  justifyContent: 'center',
  cursor: 'pointer',
  transition: 'all 0.2s'
};

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
  maxWidth: '900px',
  maxHeight: '90vh',
  overflowY: 'auto',
  padding: '3rem',
  background: '#0c111d',
  border: '1px solid rgba(255,255,255,0.1)'
};

const cardStyle = {
  padding: '1.5rem 2rem',
  transition: 'transform 0.2s',
  cursor: 'pointer'
};

const iconBoxStyle = {
  width: '48px',
  height: '48px',
  borderRadius: '12px',
  background: 'rgba(59, 130, 246, 0.1)',
  display: 'flex',
  alignItems: 'center',
  justifyContent: 'center'
};

const badgeStyle = {
  display: 'inline-block',
  padding: '0.25rem 0.75rem',
  borderRadius: '99px',
  fontSize: '0.75rem',
  fontWeight: 600,
  marginTop: '0.2rem'
};

const viewBtnStyle = {
  display: 'flex',
  alignItems: 'center',
  gap: '0.5rem',
  padding: '0.6rem 1.2rem',
  background: 'rgba(255,255,255,0.05)',
  border: '1px solid rgba(255,255,255,0.1)',
  borderRadius: '8px',
  color: '#cbd5e1',
  cursor: 'pointer'
};

const searchStyle = {
  padding: '0.7rem 1rem 0.7rem 2.8rem',
  background: 'rgba(255,255,255,0.03)',
  border: '1px solid rgba(255,255,255,0.1)',
  borderRadius: '10px',
  color: '#fff',
  width: '300px',
  outline: 'none'
};

export default ApplicationsList;
