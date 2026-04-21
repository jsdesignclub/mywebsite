import React, { useEffect, useState } from 'react';
import { db, auth } from '../firebase';
import { collection, getDocs, getDoc, doc, updateDoc, setDoc, addDoc, serverTimestamp, query, orderBy, where } from 'firebase/firestore';
import { createUserWithEmailAndPassword } from 'firebase/auth';
import { UserPlus, Shield, MapPin, Search, Trash2, Mail, X, CheckCircle, Settings, Eye, FileText, ArrowUpDown, ExternalLink } from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';
import jsPDF from 'jspdf';
import autoTable from 'jspdf-autotable';
import { Download, Filter } from 'lucide-react';

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

function AdminModule({ activeTab: externalTab }) {
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

  const [approvedApps, setApprovedApps] = useState([]);
  const [appsLoading, setAppsLoading] = useState(false);
  const [selectedApp, setSelectedApp] = useState(null);
  
  // Filters
  const [recordSearch, setRecordSearch] = useState('');
  const [divisionFilter, setDivisionFilter] = useState('all');
  const [scoreSort, setScoreSort] = useState('desc'); 

  useEffect(() => {
    fetchUsers();
    fetchGrantPolicy();
    fetchDivisions();
    fetchScoringPolicy();
    fetchApprovedApps();
  }, []);

  const exportCSV = () => {
    const filtered = getFilteredRecords();
    if (filtered.length === 0) return alert("No records to export");

    const headers = [
      "No", "Application ID", "Applicant Name", "Business Name", "Phone", 
      "Address", "Divisional Secretariat", "GS Division", "Development Officer", 
      "Equipment Requested", "Model No", "Brand", "Process Status", "Viability Score", "Total Asset Cost", "Approved Grant Amount"
    ];
    
    const csvData = filtered.map((app, i) => {
      const equip = app.equipment?.items?.[0] || {};
      return [
        i + 1,
        `"${app.id}"`,
        `"${app.personal?.fullName || ''}"`,
        `"${app.business?.businessName || ''}"`,
        `"${app.personal?.phone || ''}"`,
        `"${app.personal?.address || ''}"`,
        `"${app.division || ''}"`,
        `"${app.personal?.gsDivision || ''}"`,
        `"${app.officer?.email || ''}"`,
        `"${equip.name || ''}"`,
        `"${equip.model || ''}"`,
        `"${equip.brand || ''}"`,
        `"${app.status === 'approved' ? 'Authorized' : app.status}"`,
        app.score || 0,
        app.equipment?.totalGrant * 2 || 0,
        app.equipment?.totalGrant || 0
      ];
    });

    let csvContent = "data:text/csv;charset=utf-8," 
      + headers.join(",") + "\n"
      + csvData.map(e => e.join(",")).join("\n");

    const encodedUri = encodeURI(csvContent);
    const link = document.createElement("a");
    link.setAttribute("href", encodedUri);
    link.setAttribute("download", `full_report_${new Date().toISOString().split('T')[0]}.csv`);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  const exportPDF = () => {
    const filtered = getFilteredRecords();
    if (filtered.length === 0) return alert("No records to export");

    try {
      const doc = new jsPDF('l', 'mm', 'a3'); // Use A3 for extra width since many columns
      
      // Header
      doc.setFontSize(22);
      doc.setTextColor(31, 78, 121);
      doc.text("SME Grant Management System - Comprehensive Master Records", 14, 22);
      
      doc.setFontSize(10);
      doc.setTextColor(100);
      doc.text(`District/Province: Uva Provincial Government`, 14, 28);
      doc.text(`Report Date: ${new Date().toLocaleString()}`, 14, 33);
      doc.text(`Record Count: ${filtered.length} Applications`, 14, 38);

      const tableData = filtered.map((app, i) => {
        const equip = app.equipment?.items?.[0] || {};
        return [
          (i + 1).toString(),
          app.id.substring(0,6),
          app.personal?.fullName || "N/A",
          app.business?.businessName || "N/A",
          app.personal?.phone || "-",
          app.division || "-",
          app.personal?.gsDivision || "-",
          app.officer?.email?.split('@')[0] || "-",
          equip.name || "-",
          app.status === 'approved' ? 'Authorized' : app.status,
          (app.score || 0).toString(),
          (app.equipment?.totalGrant * 2 || 0).toLocaleString(),
          (app.equipment?.totalGrant || 0).toLocaleString()
        ];
      });

      autoTable(doc, {
        startY: 45,
        head: [["#", "ID", "Name", "Business", "Phone", "Division", "GS Div", "DO", "Equipment", "Phase", "Score", "Total Cost", "Grant"]],
        body: tableData,
        theme: 'grid',
        headStyles: { fillColor: [31, 78, 121], textColor: [255, 255, 255], fontSize: 8 },
        styles: { fontSize: 7, cellPadding: 2 },
        columnStyles: {
          0: { cellWidth: 10 },
          1: { cellWidth: 15 },
          10: { fontStyle: 'bold' },
          12: { fontStyle: 'bold', textColor: [16, 185, 129] }
        }
      });

      doc.save(`master_report_${new Date().toISOString().split('T')[0]}.pdf`);
    } catch (err) {
      console.error("PDF Export Error:", err);
      alert("Error generating comprehensive PDF.");
    }
  };


  const getFilteredRecords = () => {
    let filtered = approvedApps.filter(app => {
      const search = recordSearch.toLowerCase();
      const matchesSearch = 
        (app.personal?.fullName || "").toLowerCase().includes(search) ||
        (app.business?.businessName || "").toLowerCase().includes(search) ||
        (app.id || "").toLowerCase().includes(search);
      
      const matchesDivision = divisionFilter === 'all' || app.division === divisionFilter;
      
      return matchesSearch && matchesDivision;
    });

    // Apply Sorting
    if (scoreSort === 'asc') {
      filtered.sort((a, b) => (a.score || 0) - (b.score || 0));
    } else if (scoreSort === 'desc') {
      filtered.sort((a, b) => (b.score || 0) - (a.score || 0));
    }

    return filtered;
  };

  // Sync with external sidebar tab
  useEffect(() => {
    if (externalTab && externalTab !== 'overview' && externalTab !== 'admin-tools') {
      setActiveSubTab(externalTab);
    } else if (externalTab === 'overview') {
      setActiveSubTab('users');
    }
  }, [externalTab]);

  const fetchApprovedApps = async () => {
    setAppsLoading(true);
    try {
      // Fetch all applications that are Approved and beyond (Ordered, Completed)
      const q = query(
        collection(db, 'applications'), 
        where('status', 'in', ['approved', 'ordered', 'completed'])
      );
      const snap = await getDocs(q);
      setApprovedApps(snap.docs.map(d => ({ id: d.id, ...d.data() })));
    } catch (err) { console.error(err); }
    finally { setAppsLoading(false); }
  };

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
      <div style={{ marginBottom: '3rem', display: 'flex', justifyContent: 'space-between', alignItems: 'flex-end', flexWrap: 'wrap', gap: '1.5rem' }}>
        <div>
          <h2 style={{ fontSize: 'clamp(1.8rem, 5vw, 2.5rem)', margin: 0 }}>System Governance</h2>
          <p style={{ color: '#94a3b8', fontSize: '1rem', marginTop: '0.4rem' }}>
            {activeSubTab === 'users' ? 'Staff Directory & Access Control' : 
             activeSubTab === 'records' ? 'Approved Grant Master Records' :
             activeSubTab === 'sectors' ? 'Regional Sector & Division Management' :
             activeSubTab === 'policy' ? 'Financial Granting Policies' : 'Scoring Rubric Configuration'}
          </p>
        </div>
        {activeSubTab === 'users' && (
          <button onClick={() => setIsModalOpen(true)} style={addBtnStyle}>
            <UserPlus size={20} /> Add Staff Member
          </button>
        )}
      </div>

      {activeSubTab === 'records' && (
        <div className="animate-fade-in">
          <div className="glass" style={{ padding: '2rem', borderRadius: '20px', overflowX: 'auto' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '2rem', gap: '2rem', flexWrap: 'wrap' }}>
               <h3 style={{ margin: 0 }}>Approved Grant Applications</h3>
               <div style={{ display: 'flex', gap: '1rem', flexWrap: 'wrap' }}>
                 <button onClick={exportCSV} className="btn-secondary" style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', background: 'rgba(59, 130, 246, 0.1)', color: '#3b82f6', border: '1px solid rgba(59, 130, 246, 0.2)', padding: '0.6rem 1rem', borderRadius: '10px', cursor: 'pointer', fontWeight: 600 }}>
                   <Download size={18} /> Export CSV
                 </button>
                 <button onClick={exportPDF} className="btn-secondary" style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', background: 'rgba(168, 85, 247, 0.1)', color: '#a855f7', border: '1px solid rgba(168, 85, 247, 0.2)', padding: '0.6rem 1rem', borderRadius: '10px', cursor: 'pointer', fontWeight: 600 }}>
                   <FileText size={18} /> Export PDF
                 </button>
               </div>
            </div>

            {/* Filter Bar */}
            <div style={{ display: 'flex', gap: '1.5rem', marginBottom: '2rem', flexWrap: 'wrap', background: 'rgba(255,255,255,0.02)', padding: '1.5rem', borderRadius: '15px', border: '1px solid rgba(255,255,255,0.05)' }}>
               <div style={{ position: 'relative', flexGrow: 1, minWidth: '250px' }}>
                 <Search size={18} style={{ position: 'absolute', left: '12px', top: '50%', transform: 'translateY(-50%)', color: '#475569' }} />
                 <input 
                   type="text" 
                   placeholder="Search name, business or ID..." 
                   value={recordSearch} 
                   onChange={e => setRecordSearch(e.target.value)} 
                   style={{ ...searchStyle, background: 'rgba(0,0,0,0.2)' }} 
                 />
               </div>
               <div style={{ display: 'flex', alignItems: 'center', gap: '1rem', minWidth: '200px' }}>
                 <Filter size={18} color="#94a3b8" />
                 <select 
                   value={divisionFilter} 
                   onChange={e => setDivisionFilter(e.target.value)}
                   style={{ ...selectStyle, width: '100%', height: '45px' }}
                 >
                   <option value="all">All Divisions</option>
                   {divisions.map(d => <option key={d} value={d}>{d}</option>)}
                 </select>
               </div>
               
               <div style={{ display: 'flex', alignItems: 'center', gap: '1rem', minWidth: '180px' }}>
                 <ArrowUpDown size={18} color="#94a3b8" />
                 <select 
                   value={scoreSort} 
                   onChange={e => setScoreSort(e.target.value)}
                   style={{ ...selectStyle, width: '100%', height: '45px' }}
                 >
                   <option value="desc">Score: High to Low</option>
                   <option value="asc">Score: Low to High</option>
                   <option value="none">Default (Latest)</option>
                 </select>
               </div>

               <div style={{ background: 'rgba(16, 185, 129, 0.1)', color: '#10b981', padding: '0.4rem 1.5rem', borderRadius: '10px', fontSize: '0.9rem', fontWeight: 700, display: 'flex', alignItems: 'center' }}>
                 {getFilteredRecords().length} MATCHES
               </div>
            </div>
            
            <table style={{ width: '100%', borderCollapse: 'collapse', minWidth: '1800px' }}>
              <thead>
                <tr style={{ background: 'rgba(255,255,255,0.02)', borderBottom: '1px solid rgba(255,255,255,0.05)' }}>
                  <th style={thStyle}>No</th>
                  <th style={thStyle}>ID No</th>
                  <th style={thStyle}>Full Name</th>
                  <th style={thStyle}>Business Name</th>
                  <th style={thStyle}>Phone</th>
                  <th style={thStyle}>Address</th>
                  <th style={thStyle}>Divisional</th>
                  <th style={thStyle}>GS Division</th>
                  <th style={thStyle}>DO Name</th>
                  <th style={thStyle}>Equipment</th>
                  <th style={thStyle}>Model</th>
                  <th style={thStyle}>Brand</th>
                  <th style={thStyle}>Grant Phase</th>
                  <th style={thStyle}>Score</th>
                  <th style={thStyle}>Total Cost</th>
                  <th style={thStyle}>Grant</th>
                  <th style={thStyle}>Quotation</th>
                  <th style={thStyle}>Actions</th>
                </tr>
              </thead>
              <tbody>
                {getFilteredRecords().map((app, idx) => {
                  const firstItem = app.equipment?.items?.[0] || {};
                  return (
                    <tr key={app.id} style={{ borderBottom: '1px solid rgba(255,255,255,0.03)', transition: 'background 0.2s' }} className="row-hover">
                      <td style={tdStyle}>{idx + 1}</td>
                      <td style={tdStyle}><code style={{ fontSize: '0.75rem', color: '#3b82f6' }}>{app.id.substring(0, 8)}</code></td>
                      <td style={tdStyle}><div style={{ fontWeight: 600 }}>{app.personal?.fullName}</div></td>
                      <td style={tdStyle}>{app.business?.businessName}</td>
                      <td style={tdStyle}>{app.personal?.phone}</td>
                      <td style={tdStyle} title={app.personal?.address}>
                        <div style={{ maxWidth: '150px', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                          {app.personal?.address}
                        </div>
                      </td>
                      <td style={tdStyle}>{app.division}</td>
                      <td style={tdStyle}>{app.personal?.gsDivision}</td>
                      <td style={tdStyle}><div style={{ fontSize: '0.8rem', opacity: 0.7 }}>{app.officer?.email?.split('@')[0] || 'System'}</div></td>
                      <td style={tdStyle}>{firstItem.name || 'N/A'}</td>
                      <td style={tdStyle}>{firstItem.model || '-'}</td>
                      <td style={tdStyle}>{firstItem.brand || '-'}</td>
                      <td style={tdStyle}>
                        <div style={{ 
                          padding: '4px 10px', 
                          borderRadius: '20px', 
                          fontSize: '0.65rem', 
                          fontWeight: 700,
                          textAlign: 'center',
                          background: app.status === 'completed' ? 'rgba(16, 185, 129, 0.1)' : app.status === 'ordered' ? 'rgba(59, 130, 246, 0.1)' : 'rgba(245, 158, 11, 0.1)',
                          color: app.status === 'completed' ? '#10b981' : app.status === 'ordered' ? '#3b82f6' : '#f59e0b',
                          border: `1px solid ${app.status === 'completed' ? 'rgba(16, 185, 129, 0.2)' : app.status === 'ordered' ? 'rgba(59, 130, 246, 0.2)' : 'rgba(245, 158, 11, 0.2)'}`,
                          textTransform: 'uppercase'
                        }}>
                          {app.status === 'approved' ? 'Authorization' : app.status}
                        </div>
                      </td>
                      <td style={tdStyle}>
                        <span style={{ fontWeight: 800, color: '#10b981' }}>{app.score}</span>
                      </td>
                      <td style={tdStyle}>LKR {(app.equipment?.totalGrant * 2 || 0).toLocaleString()}</td>
                      <td style={tdStyle}><div style={{ fontWeight: 800, color: '#10b981' }}>LKR {(app.equipment?.totalGrant || 0).toLocaleString()}</div></td>
                      <td style={tdStyle}>
                        { (app.equipment?.items?.[0]?.quotationUrl || app.equipment?.items?.[0]?.quotationData) ? (
                          <a 
                            href={app.equipment.items[0].quotationUrl || app.equipment.items[0].quotationData} 
                            target="_blank" 
                            rel="noopener noreferrer"
                            style={{ color: '#3b82f6', display: 'flex', alignItems: 'center', gap: '0.3rem', fontSize: '0.8rem', textDecoration: 'none' }}
                          >
                            <FileText size={14} /> View
                          </a>
                        ) : <span style={{ opacity: 0.3 }}>-</span>}
                      </td>
                      <td style={tdStyle}>
                        <button 
                          onClick={() => setSelectedApp(app)}
                          style={{ background: 'rgba(59, 130, 246, 0.1)', border: 'none', color: '#3b82f6', padding: '0.4rem', borderRadius: '6px', cursor: 'pointer', display: 'flex', alignItems: 'center', gap: '0.3rem' }}
                        >
                          <Eye size={16} /> View
                        </button>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>

            {getFilteredRecords().length === 0 && !appsLoading && (
              <div style={{ padding: '6rem 2rem', textAlign: 'center', color: '#64748b', background: 'rgba(255,255,255,0.01)', borderRadius: '15px' }}>
                <Search size={48} style={{ opacity: 0.1, marginBottom: '1rem' }} />
                <h3 style={{ margin: '0 0 0.5rem', color: '#94a3b8' }}>No Records Found</h3>
                <p style={{ margin: 0, fontSize: '0.9rem' }}>
                  {approvedApps.length === 0 
                    ? "Currently, there are no applications that have reached the approval or procurement phase." 
                    : "No records match your selected search criteria or division filter."}
                </p>
              </div>
            )}

            {appsLoading && (
              <div style={{ padding: '4rem', textAlign: 'center', color: '#3b82f6' }}>
                <div className="spinning" style={{ marginBottom: '1rem' }}>⌛</div>
                Fetching master grant records...
              </div>
            )}
          </div>
        </div>
      )}

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

      {/* Admin App Preview Modal */}
      <AnimatePresence>
        {selectedApp && (
          <div style={modalOverlayStyle} onClick={() => setSelectedApp(null)}>
            <motion.div 
               className="glass" 
               style={{ ...modalContentStyle, maxWidth: '800px', padding: '2.5rem' }} 
               onClick={e => e.stopPropagation()} 
               initial={{ opacity: 0, y: 30 }} 
               animate={{ opacity: 1, y: 0 }} 
               exit={{ opacity: 0, y: 30 }}
            >
               <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '2rem' }}>
                  <div>
                    <h3 style={{ margin: 0 }}>Application Dossier</h3>
                    <p style={{ margin: '0.4rem 0 0', fontSize: '0.8rem', opacity: 0.6 }}>ID: {selectedApp.id}</p>
                  </div>
                  <button onClick={() => setSelectedApp(null)} style={{ background: 'transparent', border: 'none', color: '#64748b', cursor: 'pointer' }}><X /></button>
               </div>

               <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '2rem' }}>
                  <div>
                    <h4 style={{ color: '#3b82f6', borderBottom: '1px solid rgba(59, 130, 246, 0.2)', paddingBottom: '0.5rem', marginBottom: '1rem' }}>Applicant Information</h4>
                    <p style={{ fontSize: '0.85rem', marginBottom: '0.5rem' }}><strong>Name:</strong> {selectedApp.personal?.fullName}</p>
                    <p style={{ fontSize: '0.85rem', marginBottom: '0.5rem' }}><strong>NIC:</strong> {selectedApp.personal?.nic}</p>
                    <p style={{ fontSize: '0.85rem', marginBottom: '0.5rem' }}><strong>Phone:</strong> {selectedApp.personal?.phone}</p>
                    <p style={{ fontSize: '0.85rem', marginBottom: '0.5rem' }}><strong>Address:</strong> {selectedApp.personal?.address}</p>
                    <p style={{ fontSize: '0.85rem', marginBottom: '0.5rem' }}><strong>DS Division:</strong> {selectedApp.personal?.dsDivision || 'N/A'}</p>
                    <p style={{ fontSize: '0.85rem', marginBottom: '0.5rem' }}><strong>GS Division:</strong> {selectedApp.personal?.gsDivision || 'N/A'}</p>
                  </div>
                  <div>
                    <h4 style={{ color: '#3b82f6', borderBottom: '1px solid rgba(59, 130, 246, 0.2)', paddingBottom: '0.5rem', marginBottom: '1rem' }}>Business & Scoring</h4>
                    <p style={{ fontSize: '0.85rem', marginBottom: '0.5rem' }}><strong>Business:</strong> {selectedApp.business?.businessName}</p>
                    <p style={{ fontSize: '0.85rem', marginBottom: '0.5rem' }}><strong>Sector:</strong> {selectedApp.business?.sector}</p>
                    <p style={{ fontSize: '0.85rem', marginBottom: '0.5rem' }}><strong>Final Score:</strong> <span style={{ color: '#10b981', fontWeight: 800 }}>{selectedApp.score} Pts</span></p>
                    <p style={{ fontSize: '0.85rem', marginBottom: '0.5rem' }}><strong>Division:</strong> {selectedApp.division}</p>
                  </div>
               </div>

                <div style={{ marginTop: '2rem' }}>
                   <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', borderBottom: '1px solid rgba(59, 130, 246, 0.2)', paddingBottom: '0.5rem', marginBottom: '1rem' }}>
                      <h4 style={{ color: '#3b82f6', margin: 0 }}>Equipment & Grant Details</h4>
                      {(selectedApp.equipment?.quotationUrl || selectedApp.equipment?.items?.[0]?.quotationUrl || selectedApp.equipment?.items?.[0]?.quotationData) && (
                        <a 
                          href={selectedApp.equipment.quotationUrl || selectedApp.equipment.items[0].quotationUrl || selectedApp.equipment.items[0].quotationData} 
                          target="_blank" 
                          rel="noopener noreferrer"
                          style={{ fontSize: '0.8rem', color: '#10b981', display: 'flex', alignItems: 'center', gap: '0.4rem', textDecoration: 'none', background: 'rgba(16, 185, 129, 0.1)', padding: '0.3rem 0.8rem', borderRadius: '6px' }}
                        >
                          <ExternalLink size={14} /> View Quotation
                        </a>
                      )}
                   </div>
                  <div style={{ background: 'rgba(255,255,255,0.02)', padding: '1rem', borderRadius: '10px' }}>
                    {(selectedApp.equipment?.items || []).map((item, idx) => (
                      <div key={idx} style={{ display: 'flex', justifyContent: 'space-between', fontSize: '0.85rem', marginBottom: '0.5rem' }}>
                        <span>
                          {item.name} ({item.brand} {item.model}) x {item.qty}
                          {(item.quotationUrl || item.quotationData) && (
                            <a href={item.quotationUrl || item.quotationData} target="_blank" rel="noopener noreferrer" style={{ color: '#3b82f6', marginLeft: '10px', fontSize: '0.75rem' }}>[View Attachment]</a>
                          )}
                        </span>
                        <span>LKR {(item.qty * item.unitPrice).toLocaleString()}</span>
                      </div>
                    ))}
                    <div style={{ marginTop: '1rem', borderTop: '1px solid rgba(255,255,255,0.05)', paddingTop: '1rem', display: 'flex', justifyContent: 'space-between', fontWeight: 800 }}>
                      <span>APPROVED GRANT AMOUNT:</span>
                      <span style={{ color: '#10b981' }}>LKR {(selectedApp.equipment?.totalGrant || 0).toLocaleString()}</span>
                    </div>
                  </div>
               </div>

               <button 
                  onClick={() => setSelectedApp(null)}
                  style={{ width: '100%', marginTop: '2rem', padding: '0.8rem', background: 'rgba(255,255,255,0.05)', border: '1px solid rgba(255,255,255,0.1)', borderRadius: '10px', color: '#fff', cursor: 'pointer' }}
               >
                 Close Preview
               </button>
            </motion.div>
          </div>
        )}
      </AnimatePresence>
    </div>
  );
}


export default AdminModule;
