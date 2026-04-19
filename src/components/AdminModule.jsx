import React, { useEffect, useState } from 'react';
import { db, auth } from '../firebase';
import { collection, getDocs, getDoc, doc, updateDoc, setDoc, addDoc, serverTimestamp, query, orderBy } from 'firebase/firestore';
import { createUserWithEmailAndPassword } from 'firebase/auth';
import { UserPlus, Shield, MapPin, Search, Trash2, Mail, X, CheckCircle, Settings } from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';

function AdminModule() {
  const [users, setUsers] = useState([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState('');
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [newUser, setNewUser] = useState({ email: '', password: '', role: 'development_officer', division: '' });
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [scoringPolicy, setScoringPolicy] = useState({
    occupationWeights: { government: 0, semi_government: 1, ngo: 3, private: 4, self_employment: 5, other: 5 },
    businessWeights: { namePoints: 10, licensePoints: 5, pointsPerEmployee: 1 },
    eduWeights: { nvqPerLevel: 1, diploma: 5, bachelor: 10, masters: 15 },
    expWeights: { pointsPerYear: 1 },
    profitWeights: { bracket1: 1, bracket2: 2, bracket3: 3, bracket4: 4, bracket5: 5 }
  });
  const [activeSubTab, setActiveSubTab] = useState('users'); 
  const [grantPolicy, setGrantPolicy] = useState({ percentage: 50, maxAmount: 100000 });
  const [policyLoading, setPolicyLoading] = useState(false);
  const [scoringLoading, setScoringLoading] = useState(false);
  const [newDivName, setNewDivName] = useState('');
  const [divisions, setDivisions] = useState(['Badulla', 'Bandarawela', 'Hali-Ela', 'Ella', 'Passara', 'Lunugala', 'Welimada', 'Uva-Paranagama', 'Atampitiya']);

  const roles = [
    { id: 'development_officer', label: 'Development Officer' },
    { id: 'divisional_secretary', label: 'Divisional Secretary' },
    { id: 'director', label: 'Director' },
    { id: 'accountant', label: 'Accountant' },
    { id: 'admin', label: 'System Admin' }
  ];

  useEffect(() => {
    fetchUsers();
    fetchGrantPolicy();
    fetchDivisions();
    fetchScoringPolicy();
  }, []);

  const fetchScoringPolicy = async () => {
    try {
      const docSnap = await getDoc(doc(db, 'settings', 'scoring_policy'));
      if (docSnap.exists()) {
        const data = docSnap.data();
        // MERGE with defaults to prevent crashes if certain keys are missing from DB
        setScoringPolicy(prev => ({
          ...prev,
          ...data,
          occupationWeights: { ...prev.occupationWeights, ...data.occupationWeights },
          businessWeights: { ...prev.businessWeights, ...data.businessWeights },
          eduWeights: { ...prev.eduWeights, ...data.eduWeights },
          expWeights: { ...prev.expWeights, ...data.expWeights },
          profitWeights: { ...prev.profitWeights, ...data.profitWeights }
        }));
      }
    } catch (err) { console.error(err); }
  };

  const updateScoringPolicy = async () => {
    // Basic validation check
    setScoringLoading(true);
    try {
      await setDoc(doc(db, 'settings', 'scoring_policy'), {
        ...scoringPolicy,
        updatedAt: serverTimestamp()
      });
      alert("Scoring rubric updated successfully!");
    } catch (err) { alert(err.message); }
    finally { setScoringLoading(false); }
  };

  const fetchDivisions = async () => {
     try {
       const snap = await getDocs(collection(db, 'settings_divisions'));
       if (!snap.empty) {
         setDivisions(snap.docs.map(d => d.data().name));
       }
     } catch (err) {
       console.error(err);
     }
  };

  const handleAddDivision = async () => {
    if (!newDivName) return;
    try {
      await addDoc(collection(db, 'settings_divisions'), { name: newDivName, createdAt: serverTimestamp() });
      setDivisions(prev => [...prev, newDivName]);
      setNewDivName('');
      alert("Division added successfully");
    } catch (err) { alert(err.message); }
  };

  const fetchGrantPolicy = async () => {
    try {
      const docRef = doc(db, 'settings', 'grant_policy');
      const docSnap = await getDoc(docRef);
      if (docSnap.exists()) {
        setGrantPolicy(docSnap.data());
      }
    } catch (error) {
      console.error("Error fetching policy:", error);
    }
  };

  const updateGrantPolicy = async () => {
    setPolicyLoading(true);
    try {
      await setDoc(doc(db, 'settings', 'grant_policy'), {
        ...grantPolicy,
        lastUpdated: serverTimestamp(),
        updatedBy: auth.currentUser?.email
      });
      alert("Grant policy updated successfully!");
    } catch (error) {
      alert("Error updating policy: " + error.message);
    } finally {
      setPolicyLoading(false);
    }
  };

  const fetchUsers = async () => {
    setLoading(true);
    try {
      const querySnapshot = await getDocs(collection(db, 'users'));
      const userList = querySnapshot.docs.map(doc => ({
        uid: doc.id,
        ...doc.data()
      }));
      setUsers(userList);
    } catch (error) {
      console.error("Error fetching users:", error);
    } finally {
      setLoading(false);
    }
  };

  const handleCreateUser = async (e) => {
    e.preventDefault();
    setIsSubmitting(true);
    try {
      const res = await createUserWithEmailAndPassword(auth, newUser.email, newUser.password);
      await setDoc(doc(db, 'users', res.user.uid), {
        email: newUser.email,
        role: newUser.role,
        division: newUser.division,
        status: 'active',
        createdAt: serverTimestamp()
      });
      alert(`User created! System will reload.`);
      setIsModalOpen(false);
      window.location.reload(); 
    } catch (error) {
      alert("Creation Error: " + error.message);
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleUpdateRole = async (uid, newRole) => {
    try {
      await updateDoc(doc(db, 'users', uid), { role: newRole });
      setUsers(prev => prev.map(u => u.uid === uid ? { ...u, role: newRole } : u));
      alert("Role updated");
    } catch (error) { alert(error.message); }
  };

  const handleUpdateDivision = async (uid, newDiv) => {
    try {
      await updateDoc(doc(db, 'users', uid), { division: newDiv });
      setUsers(prev => prev.map(u => u.uid === uid ? { ...u, division: newDiv } : u));
      alert("Division updated");
    } catch (error) { alert(error.message); }
  };

  const handleToggleUserStatus = async (uid, currentStatus) => {
    const newStatus = currentStatus === 'active' ? 'deactivated' : 'active';
    const confirmMsg = newStatus === 'deactivated' 
      ? "Deactivating this user will block their system access but preserve all their previous records (applications, approvals, etc.). Proceed?"
      : "Reactivate this user?";
    
    if (!window.confirm(confirmMsg)) return;

    try {
      await updateDoc(doc(db, 'users', uid), { status: newStatus });
      setUsers(prev => prev.map(u => u.uid === uid ? { ...u, status: newStatus } : u));
      alert(`User account ${newStatus} successfully.`);
    } catch (error) { alert(error.message); }
  };

  if (loading) return <div style={{ padding: '4rem', textAlign: 'center' }}>Loading Governance Console...</div>;

  const filteredUsers = users.filter(u => 
    u.email?.toLowerCase().includes(searchTerm.toLowerCase()) ||
    u.role?.toLowerCase().includes(searchTerm.toLowerCase())
  );

  return (
    <div className="animate-fade-in">
      <div style={{ marginBottom: '3rem', display: 'flex', justifyContent: 'space-between', alignItems: 'flex-end' }}>
        <div>
          <h2 style={{ fontSize: '2.5rem', margin: 0 }}>System Governance</h2>
          <p style={{ color: '#94a3b8' }}>Manage identities, sectors, and financial policies.</p>
        </div>
        <button onClick={() => setIsModalOpen(true)} style={addBtnStyle}>
          <UserPlus size={20} /> Add Staff Member
        </button>
      </div>

      <div style={{ display: 'flex', gap: '2rem', marginBottom: '3rem', borderBottom: '1px solid rgba(255,255,255,0.05)' }}>
        {['users', 'sectors', 'policy', 'scoring'].map(tab => (
          <button 
            key={tab}
            onClick={() => setActiveSubTab(tab)} 
            style={{ 
              background: 'transparent', border: 'none', padding: '1rem 0', fontWeight: 600, cursor: 'pointer',
              borderBottom: activeSubTab === tab ? '2px solid #3b82f6' : '2px solid transparent',
              color: activeSubTab === tab ? '#3b82f6' : '#94a3b8',
              textTransform: 'capitalize'
            }}
          >
            {tab === 'users' ? 'Staff Directory' : tab === 'sectors' ? 'Divisional Sectors' : tab === 'policy' ? 'Grant Policy' : 'Scoring Engine'}
          </button>
        ))}
      </div>

      {activeSubTab === 'users' && (
        <div className="animate-fade-in">
          <div style={{ marginBottom: '2rem' }}>
            <div style={{ position: 'relative', maxWidth: '500px' }}>
              <Search size={18} style={{ position: 'absolute', left: '12px', top: '50%', transform: 'translateY(-50%)', color: '#475569' }} />
              <input type="text" placeholder="Search staff..." value={searchTerm} onChange={e => setSearchTerm(e.target.value)} style={searchStyle} />
            </div>
          </div>
          <div className="glass" style={{ overflowX: 'auto', borderRadius: '20px' }}>
            <table style={{ width: '100%', borderCollapse: 'collapse' }}>
               <thead>
                 <tr style={{ background: 'rgba(255,255,255,0.02)', borderBottom: '1px solid rgba(255,255,255,0.05)' }}>
                   <th style={thStyle}>Staff Member</th>
                   <th style={thStyle}>System Role</th>
                   <th style={thStyle}>Assigned Sector</th>
                   <th style={thStyle}>Control</th>
                 </tr>
               </thead>
               <tbody>
                 {filteredUsers.map(user => (
                   <tr key={user.uid} style={{ borderBottom: '1px solid rgba(255,255,255,0.03)' }}>
                     <td style={tdStyle}>
                        <div style={{ display: 'flex', alignItems: 'center', gap: '1rem' }}>
                          <div style={avatarStyle}><Mail size={16} /></div>
                          <div><div style={{ fontWeight: 600 }}>{user.email}</div></div>
                        </div>
                     </td>
                     <td style={tdStyle}>
                       <select value={user.role || ''} onChange={e => handleUpdateRole(user.uid, e.target.value)} style={selectStyle}>
                         {roles.map(r => <option key={r.id} value={r.id}>{r.label}</option>)}
                       </select>
                     </td>
                     <td style={tdStyle}>
                       <select value={user.division || ''} onChange={e => handleUpdateDivision(user.uid, e.target.value)} style={selectStyle}>
                         <option value="">Global/None</option>
                         {divisions.map(d => <option key={d} value={d}>{d}</option>)}
                       </select>
                     </td>
                     <td style={tdStyle}>
                        <div style={{ display: 'flex', alignItems: 'center', gap: '1rem' }}>
                          <span style={{ 
                            padding: '4px 10px', 
                            borderRadius: '20px', 
                            fontSize: '0.65rem', 
                            fontWeight: 700,
                            letterSpacing: '0.05em',
                            background: user.status === 'deactivated' ? 'rgba(244, 63, 94, 0.1)' : 'rgba(16, 185, 129, 0.1)',
                            color: user.status === 'deactivated' ? '#f43f5e' : '#10b981',
                            border: `1px solid ${user.status === 'deactivated' ? 'rgba(244, 63, 94, 0.2)' : 'rgba(16, 185, 129, 0.2)'}`,
                            textTransform: 'uppercase'
                          }}>
                            {user.status || 'Active'}
                          </span>
                          <button 
                            onClick={() => handleToggleUserStatus(user.uid, user.status || 'active')}
                            style={{ 
                              background: 'transparent', 
                              border: 'none', 
                              color: user.status === 'deactivated' ? '#10b981' : '#f43f5e', 
                              cursor: 'pointer',
                              display: 'flex',
                              alignItems: 'center',
                              gap: '0.4rem',
                              fontSize: '0.75rem',
                              fontWeight: 600
                            }}
                          >
                            {user.status === 'deactivated' ? <CheckCircle size={14} /> : <X size={14} />} 
                            {user.status === 'deactivated' ? 'Reactivate' : 'Deactivate'}
                          </button>
                        </div>
                     </td>
                   </tr>
                 ))}
               </tbody>
            </table>
          </div>
        </div>
      )}

      {activeSubTab === 'sectors' && (
        <div className="animate-fade-in glass" style={{ padding: '3rem' }}>
           <h3>Regional Sector Management</h3>
           <div style={{ display: 'flex', gap: '1rem', marginBottom: '3rem' }}>
             <input type="text" style={{ ...inputStyle, flexGrow: 1 }} placeholder="New division name..." value={newDivName} onChange={e => setNewDivName(e.target.value)} />
             <button onClick={handleAddDivision} style={addBtnStyle}>Add Sector</button>
           </div>
           <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(220px, 1fr))', gap: '1.5rem' }}>
              {divisions.map(d => (
                <div key={d} className="glass" style={{ padding: '1.5rem', display: 'flex', justifyContent: 'space-between', alignItems: 'center', background: 'rgba(255,255,255,0.02)' }}>
                   <div style={{ display: 'flex', alignItems: 'center', gap: '0.8rem' }}>
                     <MapPin size={16} color="#3b82f6" />
                     <span style={{ fontWeight: 600 }}>{d}</span>
                   </div>
                   <button style={{ background: 'transparent', border: 'none', color: '#f43f5e', cursor: 'pointer', opacity: 0.5 }}><X size={16} /></button>
                </div>
              ))}
           </div>
        </div>
      )}

      {activeSubTab === 'policy' && (
        <div className="animate-fade-in">
          <div className="glass" style={{ padding: '2rem', borderRadius: '20px', border: '1px solid rgba(59, 130, 246, 0.2)' }}>
            <h3 style={{ marginTop: 0, marginBottom: '1.5rem', display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
              <Shield size={20} color="#3b82f6" /> Global Granting Policy
            </h3>
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr', gap: '2rem', alignItems: 'flex-end' }}>
              <div>
                <label style={labelStyle}>Grant Percentage (%)</label>
                <input 
                  type="number" 
                  style={inputStyle} 
                  value={grantPolicy.percentage} 
                  onChange={e => setGrantPolicy({...grantPolicy, percentage: Number(e.target.value)})} 
                />
              </div>
              <div>
                <label style={labelStyle}>Maximum Grant Amount (LKR)</label>
                <input 
                  type="number" 
                  style={inputStyle} 
                  value={grantPolicy.maxAmount} 
                  onChange={e => setGrantPolicy({...grantPolicy, maxAmount: Number(e.target.value)})} 
                />
              </div>
              <button 
                onClick={updateGrantPolicy} 
                disabled={policyLoading}
                style={{ ...addBtnStyle, background: 'linear-gradient(135deg, #059669 0%, #10b981 100%)', height: '45px', justifyContent: 'center' }}
              >
                {policyLoading ? 'Updating...' : 'Save Policy Changes'}
              </button>
            </div>
          </div>
        </div>
      )}

      {activeSubTab === 'scoring' && (
        <div className="animate-fade-in glass" style={{ padding: '3rem' }}>
           <h3 style={{ marginTop: 0, display: 'flex', alignItems: 'center', gap: '0.5rem' }}><Settings size={20} color="#a855f7" /> Detailed Scoring Rubric</h3>
           <p style={{ color: '#94a3b8', marginBottom: '2rem' }}>Configure the points awarded for each application component.</p>
           
           <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(300px, 1fr))', gap: '2.5rem' }}>
              {/* Occupation Weights */}
              <div className="glass" style={{ padding: '1.5rem', background: 'rgba(255,255,255,0.02)' }}>
                <h4 style={{ margin: '0 0 1rem' }}>Occupation Points</h4>
                {Object.keys(scoringPolicy.occupationWeights).map(key => (
                  <div key={key} style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '0.8rem' }}>
                    <label style={{ fontSize: '0.8rem', opacity: 0.7, textTransform: 'capitalize' }}>{key.replace('_', ' ')}</label>
                    <input type="number" style={{ width: '60px', padding: '0.4rem', background: 'rgba(0,0,0,0.2)', border: '1px solid rgba(255,255,255,0.1)', color: '#fff' }} 
                      value={scoringPolicy.occupationWeights[key]} 
                      onChange={e => setScoringPolicy({
                        ...scoringPolicy, 
                        occupationWeights: { ...scoringPolicy.occupationWeights, [key]: Number(e.target.value) }
                      })} 
                    />
                  </div>
                ))}
              </div>

              {/* Education Weights */}
              <div className="glass" style={{ padding: '1.5rem', background: 'rgba(255,255,255,0.02)' }}>
                <h4 style={{ margin: '0 0 1rem' }}>Education & Training</h4>
                <div style={{ marginBottom: '1rem' }}>
                   <label style={{ fontSize: '0.8rem', opacity: 0.7 }}>Points Per NVQ Level</label>
                   <input type="number" style={inputStyle} value={scoringPolicy.eduWeights.nvqPerLevel} onChange={e => setScoringPolicy({...scoringPolicy, eduWeights: {...scoringPolicy.eduWeights, nvqPerLevel: Number(e.target.value)}})} />
                </div>
                <div style={{ marginBottom: '1rem' }}>
                   <label style={{ fontSize: '0.8rem', opacity: 0.7 }}>Diploma Points</label>
                   <input type="number" style={inputStyle} value={scoringPolicy.eduWeights.diploma} onChange={e => setScoringPolicy({...scoringPolicy, eduWeights: {...scoringPolicy.eduWeights, diploma: Number(e.target.value)}})} />
                </div>
                <div style={{ marginBottom: '1rem' }}>
                   <label style={{ fontSize: '0.8rem', opacity: 0.7 }}>Bachelor Points</label>
                   <input type="number" style={inputStyle} value={scoringPolicy.eduWeights.bachelor} onChange={e => setScoringPolicy({...scoringPolicy, eduWeights: {...scoringPolicy.eduWeights, bachelor: Number(e.target.value)}})} />
                </div>
                <div style={{ marginBottom: '1rem' }}>
                   <label style={{ fontSize: '0.8rem', opacity: 0.7 }}>Master Points</label>
                   <input type="number" style={inputStyle} value={scoringPolicy.eduWeights.masters} onChange={e => setScoringPolicy({...scoringPolicy, eduWeights: {...scoringPolicy.eduWeights, masters: Number(e.target.value)}})} />
                </div>
              </div>

              {/* Business Setup Weights */}
              <div className="glass" style={{ padding: '1.5rem', background: 'rgba(255,255,255,0.02)' }}>
                <h4 style={{ margin: '0 0 1rem' }}>Business Setup</h4>
                <div style={{ marginBottom: '1rem' }}>
                   <label style={{ fontSize: '0.8rem', opacity: 0.7 }}>Reg. Name Points</label>
                   <input type="number" style={inputStyle} value={scoringPolicy.businessWeights.namePoints} onChange={e => setScoringPolicy({...scoringPolicy, businessWeights: {...scoringPolicy.businessWeights, namePoints: Number(e.target.value)}})} />
                </div>
                <div style={{ marginBottom: '1rem' }}>
                   <label style={{ fontSize: '0.8rem', opacity: 0.7 }}>Trade License Points</label>
                   <input type="number" style={inputStyle} value={scoringPolicy.businessWeights.licensePoints} onChange={e => setScoringPolicy({...scoringPolicy, businessWeights: {...scoringPolicy.businessWeights, licensePoints: Number(e.target.value)}})} />
                </div>
                <div style={{ marginBottom: '1rem' }}>
                   <label style={{ fontSize: '0.8rem', opacity: 0.7 }}>Points Per Employee</label>
                   <input type="number" style={inputStyle} value={scoringPolicy.businessWeights.pointsPerEmployee} onChange={e => setScoringPolicy({...scoringPolicy, businessWeights: {...scoringPolicy.businessWeights, pointsPerEmployee: Number(e.target.value)}})} />
                </div>
                <div style={{ marginBottom: '1rem' }}>
                   <label style={{ fontSize: '0.8rem', opacity: 0.7 }}>Experience (Pts/Year)</label>
                   <input type="number" style={inputStyle} value={scoringPolicy.expWeights.pointsPerYear} onChange={e => setScoringPolicy({...scoringPolicy, expWeights: {pointsPerYear: Number(e.target.value)}})} />
                </div>
              </div>

              {/* Profit Brackets */}
              <div className="glass" style={{ padding: '1.5rem', background: 'rgba(255,255,255,0.02)' }}>
                <h4 style={{ margin: '0 0 1rem' }}>Monthly Profit Points</h4>
                <div style={{ marginBottom: '0.5rem' }}>
                   <label style={{ fontSize: '0.7rem' }}>{'< 25k'}</label>
                   <input type="number" style={{ ...inputStyle, padding: '0.4rem' }} value={scoringPolicy.profitWeights.bracket1} onChange={e => setScoringPolicy({...scoringPolicy, profitWeights: {...scoringPolicy.profitWeights, bracket1: Number(e.target.value)}})} />
                </div>
                <div style={{ marginBottom: '0.5rem' }}>
                   <label style={{ fontSize: '0.7rem' }}>{'< 50k'}</label>
                   <input type="number" style={{ ...inputStyle, padding: '0.4rem' }} value={scoringPolicy.profitWeights.bracket2} onChange={e => setScoringPolicy({...scoringPolicy, profitWeights: {...scoringPolicy.profitWeights, bracket2: Number(e.target.value)}})} />
                </div>
                <div style={{ marginBottom: '0.5rem' }}>
                   <label style={{ fontSize: '0.7rem' }}>{'< 75k'}</label>
                   <input type="number" style={{ ...inputStyle, padding: '0.4rem' }} value={scoringPolicy.profitWeights.bracket3} onChange={e => setScoringPolicy({...scoringPolicy, profitWeights: {...scoringPolicy.profitWeights, bracket3: Number(e.target.value)}})} />
                </div>
                <div style={{ marginBottom: '0.5rem' }}>
                   <label style={{ fontSize: '0.7rem' }}>{'< 100k'}</label>
                   <input type="number" style={{ ...inputStyle, padding: '0.4rem' }} value={scoringPolicy.profitWeights.bracket4} onChange={e => setScoringPolicy({...scoringPolicy, profitWeights: {...scoringPolicy.profitWeights, bracket4: Number(e.target.value)}})} />
                </div>
                <div style={{ marginBottom: '0.5rem' }}>
                   <label style={{ fontSize: '0.7rem' }}>{'> 100k'}</label>
                   <input type="number" style={{ ...inputStyle, padding: '0.4rem' }} value={scoringPolicy.profitWeights.bracket5} onChange={e => setScoringPolicy({...scoringPolicy, profitWeights: {...scoringPolicy.profitWeights, bracket5: Number(e.target.value)}})} />
                </div>
              </div>
           </div>

           <div style={{ marginTop: '3rem', display: 'flex', justifyContent: 'flex-end' }}>
              <button 
                onClick={updateScoringPolicy} 
                disabled={scoringLoading}
                style={{ ...addBtnStyle, background: '#a855f7', padding: '1rem 3rem' }}
              >
                {scoringLoading ? 'Applying Changes...' : 'Save Scoring Statistics'}
              </button>
           </div>
        </div>
      )}

      {/* Modal */}
      <AnimatePresence>
        {isModalOpen && (
          <div style={modalOverlayStyle} onClick={() => setIsModalOpen(false)}>
            <motion.div className="glass" style={modalContentStyle} onClick={e => e.stopPropagation()} initial={{ opacity: 0, scale: 0.9 }} animate={{ opacity: 1, scale: 1 }} exit={{ opacity: 0, scale: 0.9 }}>
               <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '2rem' }}>
                  <h3 style={{ margin: 0 }}>Enroll New Staff</h3>
                  <button onClick={() => setIsModalOpen(false)} style={{ background: 'transparent', border: 'none', color: '#64748b', cursor: 'pointer' }}><X /></button>
               </div>
               <form onSubmit={handleCreateUser}>
                  <div style={{ marginBottom: '1.5rem' }}><label style={labelStyle}>Email</label><input type="email" required style={inputStyle} value={newUser.email} onChange={e => setNewUser({...newUser, email: e.target.value})} /></div>
                  <div style={{ marginBottom: '1.5rem' }}><label style={labelStyle}>Password</label><input type="password" required minLength={6} style={inputStyle} value={newUser.password} onChange={e => setNewUser({...newUser, password: e.target.value})} /></div>
                  <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '1rem', marginBottom: '2rem' }}>
                    <div><label style={labelStyle}>Role</label><select style={inputStyle} value={newUser.role} onChange={e => setNewUser({...newUser, role: e.target.value})}>{roles.map(r => <option key={r.id} value={r.id}>{r.label}</option>)}</select></div>
                    <div><label style={labelStyle}>Sector</label><select style={inputStyle} value={newUser.division} onChange={e => setNewUser({...newUser, division: e.target.value})}><option value="">Select Division</option>{divisions.map(d => <option key={d} value={d}>{d}</option>)}</select></div>
                  </div>
                  <button type="submit" disabled={isSubmitting} style={{ width: '100%', padding: '1rem', background: '#3b82f6', border: 'none', borderRadius: '10px', color: '#fff', fontWeight: 700, cursor: 'pointer' }}>{isSubmitting ? 'Processing...' : 'Create Account'}</button>
               </form>
            </motion.div>
          </div>
        )}
      </AnimatePresence>
    </div>
  );
}

const thStyle = { padding: '1.2rem 1.5rem', textAlign: 'left', color: '#94a3b8', fontSize: '0.8rem', fontWeight: 600, textTransform: 'uppercase' };
const tdStyle = { padding: '1.2rem 1.5rem' };
const labelStyle = { display: 'block', marginBottom: '0.5rem', fontSize: '0.85rem', color: '#94a3b8' };
const inputStyle = { width: '100%', padding: '0.8rem', background: 'rgba(255,255,255,0.03)', border: '1px solid rgba(255,255,255,0.1)', borderRadius: '8px', color: '#fff', boxSizing: 'border-box' };
const selectStyle = { padding: '0.5rem', background: 'rgba(255,255,255,0.05)', border: '1px solid rgba(255,255,255,0.1)', borderRadius: '6px', color: '#fff' };
const addBtnStyle = { background: 'linear-gradient(135deg, #1f4e79 0%, #2e75b6 100%)', color: '#fff', border: 'none', padding: '0.8rem 1.5rem', borderRadius: '10px', display: 'flex', alignItems: 'center', gap: '0.5rem', fontWeight: 600, cursor: 'pointer' };
const searchStyle = { width: '100%', padding: '1rem 1rem 1rem 3rem', background: 'rgba(255,255,255,0.03)', border: '1px solid rgba(255,255,255,0.1)', borderRadius: '12px', color: '#fff', outline: 'none' };
const avatarStyle = { width: '32px', height: '32px', borderRadius: '8px', background: 'rgba(59, 130, 246, 0.1)', display: 'flex', alignItems: 'center', justifyContent: 'center', color: '#3b82f6' };
const modalOverlayStyle = { position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.8)', backdropFilter: 'blur(8px)', display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 1000 };
const modalContentStyle = { width: '100%', maxWidth: '500px', padding: '3rem', background: '#0c111d', borderRadius: '24px', border: '1px solid rgba(255,255,255,0.1)' };

export default AdminModule;
