import React, { useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { User, Briefcase, GraduationCap, Factory, PenTool, History, CheckCircle2, Send, Loader2 } from 'lucide-react';
import PersonalDetailsForm from './PersonalDetailsForm';
import BusinessDetailsForm from './BusinessDetailsForm';
import TrainingForm from './TrainingForm';
import ProductionForm from './ProductionForm';
import EquipmentForm from './EquipmentForm';
import { db, auth, storage } from '../../firebase';
import { collection, addDoc, serverTimestamp, updateDoc, doc, getDoc, setDoc } from 'firebase/firestore';
import { ref, uploadBytesResumable, getDownloadURL } from 'firebase/storage';

import { useAuth } from '../../context/AuthContext';

const steps = [
  { id: 'personal', title: 'Personal info', icon: <User size={20} /> },
  { id: 'business', title: 'Business Details', icon: <Briefcase size={20} /> },
  { id: 'training', title: 'Training & Qualifications', icon: <GraduationCap size={20} /> },
  { id: 'production', title: 'Production & Income', icon: <Factory size={20} /> },
  { id: 'equipment', title: 'Equipment Request', icon: <PenTool size={20} /> },
  { id: 'history', title: 'Previous Grants', icon: <History size={20} /> }
];

function DOModule({ initialData, onComplete }) {
  const { userDivision } = useAuth();
  const [activeStep, setActiveStep] = useState('personal');
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [submissionStatus, setSubmissionStatus] = useState('');
  const [formData, setFormData] = useState(initialData || {
    personal: {},
    business: {},
    training: {},
    production: {},
    equipment: {},
    history: {}
  });

  // Auto-populate DS Division and District based on user's assigned division
  React.useEffect(() => {
    if (!initialData && userDivision && !formData.personal.dsDivision) {
      const badullaDivs = [
        'Badulla', 'Bandarawela', 'Ella', 'Haldummulla', 'Hali-Ela', 
        'Haputale', 'Kandaketiya', 'Lunugala', 'Mahiyanganaya', 
        'Meegahakivula', 'Passara', 'Rideemaliyadda', 'Soranathota', 
        'Uva Paranagama', 'Welimada'
      ];
      const monaragalaDivs = [
        'Badalkumbura', 'Bibile', 'Buttala', 'Kataragama', 'Madulla', 
        'Medagama', 'Moneragala', 'Sevanagala', 'Siyambalanduwa', 
        'Thanamalwila', 'Wellawaya'
      ];
      
      let detectedDistrict = '';
      if (badullaDivs.includes(userDivision)) {
        detectedDistrict = 'Badulla';
      } else if (monaragalaDivs.includes(userDivision)) {
        detectedDistrict = 'Monaragala';
      }

      if (detectedDistrict) {
        setFormData(prev => ({
          ...prev,
          personal: {
            ...prev.personal,
            dsDivision: userDivision,
            district: detectedDistrict
          }
        }));
      }
    }
  }, [userDivision, initialData]);

  const updateFormData = (step, data) => {
    setFormData(prev => ({
      ...prev,
      [step]: data
    }));
  };

  const fileToBase64 = (file) => {
    return new Promise((resolve, reject) => {
      const reader = new FileReader();
      reader.readAsDataURL(file);
      reader.onload = () => resolve(reader.result);
      reader.onerror = error => reject(error);
    });
  };

  const calculateScore = async (data) => {
    if (!data.personal || !data.business || !data.training || !data.production) return 0;
    
    // Fetch dynamic scoring policy
    let policy = {
      occupationWeights: { government: 0, semi_government: 1, ngo: 3, private: 4, self_employment: 5, other: 5 },
      businessWeights: { namePoints: 10, licensePoints: 5, pointsPerEmployee: 1 },
      eduWeights: { nvqPerLevel: 1, diploma: 5, bachelor: 10, masters: 15 },
      expWeights: { pointsPerYear: 1 },
      profitWeights: { bracket1: 1, bracket2: 2, bracket3: 3, bracket4: 4, bracket5: 5 }
    };
    
    try {
      const snap = await getDoc(doc(db, 'settings', 'scoring_policy'));
      if (snap.exists()) policy = snap.data();
    } catch (e) { console.error("Using default scoring rubric"); }

    let score = 0;
    
    // 1. Occupation Points
    const occ = data.personal.occupation;
    if (occ) score += (policy.occupationWeights[occ] || 0);

    // 2. Business Setup
    if (data.business.businessName) score += policy.businessWeights.namePoints;
    if (data.business.licenseNo) score += policy.businessWeights.licensePoints;
    const employees = Number(data.business.employeeCount || 0);
    score += (employees * policy.businessWeights.pointsPerEmployee);

    // 3. Education & NVQ
    if (data.training.nvqLevel && data.training.nvqLevel !== 'none') {
      score += (Number(data.training.nvqLevel) * policy.eduWeights.nvqPerLevel);
    }
    
    const deg = data.training.degree;
    if (deg && policy.eduWeights[deg]) score += policy.eduWeights[deg];

    // 4. Experience
    const exp = Number(data.training.experienceYears || 0);
    score += (exp * policy.expWeights.pointsPerYear);

    // 5. Monthly Profit
    const income = Number(data.production.estimatedIncome || 0);
    const cost = Number(data.production.productionCost || 0);
    const profit = income - cost;

    if (profit > 100000) score += policy.profitWeights.bracket5;
    else if (profit >= 75000) score += policy.profitWeights.bracket4;
    else if (profit >= 50000) score += policy.profitWeights.bracket3;
    else if (profit >= 25000) score += policy.profitWeights.bracket2;
    else if (profit > 0) score += policy.profitWeights.bracket1;

    return Math.round(score);
  };

  const handleSubmit = async () => {
    if (!auth.currentUser) {
      alert("You must be logged in to submit an application.");
      return;
    }

    setIsSubmitting(true);
    setSubmissionStatus('Initializing...');

    try {
      // 1. Prepare Document Reference to get ID early for storage path
      const appRef = initialData ? doc(db, 'applications', initialData.id) : doc(collection(db, 'applications'));
      const appId = appRef.id;

      setSubmissionStatus('Processing documents...');
      const updatedItems = [];
      const items = formData.equipment.items || [];
      
      for (let i = 0; i < items.length; i++) {
        const item = items[i];
        if (item.quotationFile instanceof File) {
          // Check file size (Now we can support 2MB+ with Storage)
          if (item.quotationFile.size > 5000000) { // 5MB limit
            alert(`File "${item.quotationFile.name}" is too large. Please use a file smaller than 5MB.`);
            setIsSubmitting(false);
            return;
          }

          setSubmissionStatus(`Connecting to Storage...`);
          
          try {
            const fileName = `${appId}_${Date.now()}_${item.name.replace(/[^a-z0-9]/gi, '_')}`;
            const storageRef = ref(storage, `quotations/${fileName}`);
            
            // Use a Promise to handle the resumable upload
            const downloadURL = await new Promise((resolve, reject) => {
              const uploadTask = uploadBytesResumable(storageRef, item.quotationFile);
              
              // Diagnostic timeout: if no progress after 15s, it's likely a Permissions/Rules issue
              const timeout = setTimeout(() => {
                uploadTask.cancel();
                reject(new Error("Upload timed out. This usually happens if 'Firebase Storage Rules' are not set to 'allow write'. Please check your Firebase Console."));
              }, 15000);

              uploadTask.on('state_changed', 
                (snapshot) => {
                  const progress = (snapshot.bytesTransferred / snapshot.totalBytes) * 100;
                  setSubmissionStatus(`Uploading ${item.name}: ${Math.round(progress)}%`);
                  if (progress > 0) clearTimeout(timeout);
                }, 
                (error) => {
                  clearTimeout(timeout);
                  console.error("Firebase Storage Error:", error.code, error.message);
                  let friendlyMsg = "Storage Upload Failed.";
                  if (error.code === 'storage/unauthorized') friendlyMsg = "Permission Denied: Ensure Storage Rules are set to 'allow write'.";
                  reject(new Error(friendlyMsg));
                }, 
                () => {
                  clearTimeout(timeout);
                  getDownloadURL(uploadTask.snapshot.ref).then(resolve).catch(reject);
                }
              );
            });
            
            updatedItems.push({ 
              ...item, 
              quotationUrl: downloadURL,
              quotationFile: null,
              quotationData: null
            });
          } catch (err) {
            console.error("Storage upload error:", err);
            throw err; // Propagate the descriptive error
          }
        } else {
          // If it's not a new file, ensure quotationFile is null to avoid Firestore errors
          const { quotationFile, ...rest } = item;
          updatedItems.push({ ...rest, quotationFile: null });
        }
      }

      // 2. Sanitize and Prepare Final Data
      setSubmissionStatus('Calculating eligibility score...');
      const applicationScore = await calculateScore(formData);
      
      // Fetch dynamic grant policy
      setSubmissionStatus('Retrieving grant policy...');
      let policy = { percentage: 50, maxAmount: 100000 };
      try {
        const policySnap = await getDoc(doc(db, 'settings', 'grant_policy'));
        if (policySnap.exists()) {
          policy = policySnap.data();
        }
      } catch (err) {
        console.warn("Using default policy due to fetch error:", err);
      }

      setSubmissionStatus('Saving to Database...');
      const sanitizedData = JSON.parse(JSON.stringify({
        ...formData,
        equipment: {
          ...formData.equipment,
          items: updatedItems,
          totalGrant: Math.min((updatedItems).reduce((sum, i) => sum + (Number(i.qty) * Number(i.unitPrice)), 0) * (policy.percentage / 100), policy.maxAmount)
        }
      }));

      const finalSubmission = {
        ...sanitizedData,
        score: applicationScore,
        status: 'pending_ds',
        division: userDivision || 'General',
        officer: {
          uid: auth.currentUser.uid,
          email: auth.currentUser.email
        },
        dsReview: null,
        lastUpdated: serverTimestamp()
      };

      if (!initialData) {
        finalSubmission.createdAt = serverTimestamp();
        await setDoc(appRef, finalSubmission);

        // 4. Save new sector globally if applicable
        if (formData.business.isNewSector && formData.business.sector) {
          try {
            await addDoc(collection(db, 'settings_sectors'), {
              name: formData.business.sector,
              addedBy: auth.currentUser.email,
              createdAt: serverTimestamp()
            });
          } catch (sectorErr) {
            console.warn("Could not save new sector globally:", sectorErr);
          }
        }

        alert('Application submitted successfully!');
      } else {
        await updateDoc(doc(db, 'applications', initialData.id), finalSubmission);
        alert('Application updated successfully!');
        if (onComplete) onComplete();
      }
      
      window.location.reload(); 
    } catch (error) {
      console.error("Detailed Submission Error:", error);
      alert('Submission Failed: ' + error.message);
    } finally {
      setIsSubmitting(false);
      setSubmissionStatus('');
    }
  };

  const renderStep = () => {
    switch (activeStep) {
      case 'personal':
        return <PersonalDetailsForm data={formData.personal} onUpdate={(data) => updateFormData('personal', data)} onNext={() => setActiveStep('business')} />;
      case 'business':
        return <BusinessDetailsForm data={formData.business} onUpdate={(data) => updateFormData('business', data)} onPrev={() => setActiveStep('personal')} onNext={() => setActiveStep('training')} />;
      case 'training':
        return <TrainingForm data={formData.training} onUpdate={(data) => updateFormData('training', data)} onPrev={() => setActiveStep('business')} onNext={() => setActiveStep('production')} />;
      case 'production':
        return <ProductionForm data={formData.production} onUpdate={(data) => updateFormData('production', data)} onPrev={() => setActiveStep('training')} onNext={() => setActiveStep('equipment')} />;
      case 'equipment':
        return <EquipmentForm data={formData.equipment} onUpdate={(data) => updateFormData('equipment', data)} onPrev={() => setActiveStep('production')} onNext={() => setActiveStep('history')} />;
      case 'history':
        return (
          <div style={{ textAlign: 'left' }}>
            <h2 style={{ fontSize: 'clamp(1.4rem, 5vw, 1.8rem)', marginBottom: '1rem' }}>Final Review & Submission</h2>
            <p style={{ color: '#64748b', marginBottom: '2rem', fontSize: '0.9rem', lineHeight: '1.5' }}>Please verify all entries before submitting to the Divisional Secretary. This action creates a permanent audit log.</p>
            
            <div className="glass" style={{ padding: '1.5rem', marginBottom: '2.5rem', border: '1px dashed rgba(16, 185, 129, 0.3)' }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: '1rem', color: '#10b981' }}>
                <CheckCircle2 size={32} style={{ flexShrink: 0 }} />
                <div>
                  <h4 style={{ margin: 0, fontSize: '1.1rem' }}>Ready for Processing</h4>
                  <p style={{ margin: 0, fontSize: '0.85rem', opacity: 0.8 }}>All mandatory sections have been completed.</p>
                </div>
              </div>
            </div>

            <button 
              style={{
                width: '100%',
                padding: '1.2rem',
                background: isSubmitting ? 'rgba(255,255,255,0.1)' : 'linear-gradient(135deg, #059669 0%, #10b981 100%)',
                border: 'none',
                borderRadius: '12px',
                color: '#fff',
                fontSize: 'clamp(1rem, 4vw, 1.2rem)',
                fontWeight: 700,
                cursor: isSubmitting ? 'not-allowed' : 'pointer',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                gap: '1rem',
                boxShadow: '0 10px 25px rgba(16, 185, 129, 0.2)',
                marginBottom: '2rem'
              }}
              onClick={handleSubmit}
              disabled={isSubmitting}
            >
              {isSubmitting ? (
                <>
                  <Loader2 className="animate-spin" size={24} />
                  <span style={{ fontSize: '0.9rem' }}>{submissionStatus}</span>
                </>
              ) : (
                <>
                  <Send size={24} />
                  SUBMIT APPLICATION
                </>
              )}
            </button>
          </div>
        );
      default:
        return (
          <div style={{ padding: '4rem', textAlign: 'center', color: '#64748b' }}>
            <p>Module section "{activeStep}" implementation in progress...</p>
          </div>
        );
    }
  };

  return (
    <div className="animate-fade-in">
      {/* Mobile Step Navigation */}
      <div className="mobile-only steps-container" style={{ marginBottom: '1.5rem', padding: '0.5rem' }}>
        {steps.map(step => (
          <button
            key={step.id}
            onClick={() => setActiveStep(step.id)}
            style={{
              padding: '0.6rem 1.2rem',
              borderRadius: '20px',
              background: activeStep === step.id ? 'rgba(59, 130, 246, 0.2)' : 'rgba(255,255,255,0.05)',
              color: activeStep === step.id ? '#3b82f6' : '#94a3b8',
              border: `1px solid ${activeStep === step.id ? '#3b82f6' : 'rgba(255,255,255,0.1)'}`,
              fontSize: '0.85rem',
              fontWeight: 600,
              display: 'flex',
              alignItems: 'center',
              gap: '0.5rem',
              cursor: 'pointer'
            }}
          >
            {step.icon}
            {step.title}
          </button>
        ))}
      </div>

      <div className="do-container" style={{ display: 'flex', gap: '2rem', marginTop: '2rem' }}>
        {/* Sidebar Navigation - only visible on desktop/tablet usually */}
        <aside 
          className="desktop-only"
          style={{ width: '280px', flexShrink: 0 }}
        >
          <div className="glass" style={{ padding: '1rem', position: 'sticky', top: '2rem' }}>
            <h3 style={{ padding: '0 1rem', marginBottom: '1.5rem', fontSize: '0.9rem', color: '#64748b', textTransform: 'uppercase', letterSpacing: '0.05em' }}>Application Steps</h3>
            <div style={{ display: 'flex', flexDirection: 'column', gap: '0.5rem' }}>
              {steps.map(step => (
                <button
                  key={step.id}
                  onClick={() => setActiveStep(step.id)}
                  style={{
                    display: 'flex',
                    alignItems: 'center',
                    gap: '1rem',
                    padding: '0.8rem 1rem',
                    border: 'none',
                    borderRadius: '8px',
                    background: activeStep === step.id ? 'rgba(46, 117, 182, 0.15)' : 'transparent',
                    color: activeStep === step.id ? '#3b82f6' : '#94a3b8',
                    cursor: 'pointer',
                    textAlign: 'left',
                    transition: 'all 0.2s',
                    fontWeight: activeStep === step.id ? 600 : 400
                  }}
                >
                  <span style={{ 
                    display: 'flex', 
                    alignItems: 'center', 
                    justifyContent: 'center',
                    width: '32px',
                    height: '32px',
                    borderRadius: '8px',
                    background: activeStep === step.id ? 'rgba(59, 130, 246, 0.2)' : 'rgba(255,255,255,0.03)',
                    color: activeStep === step.id ? '#3b82f6' : '#475569'
                  }}>
                    {step.icon}
                  </span>
                  {step.title}
                  {formData[step.id] && Object.keys(formData[step.id]).length > 0 && (
                    <CheckCircle2 size={16} style={{ marginLeft: 'auto', color: '#10b981' }} />
                  )}
                </button>
              ))}
            </div>
          </div>
        </aside>

        {/* Main Form Area */}
        <main style={{ flexGrow: 1 }}>
          <AnimatePresence mode="wait">
            <motion.div
              key={activeStep}
              initial={{ opacity: 0, x: 10 }}
              animate={{ opacity: 1, x: 0 }}
              exit={{ opacity: 0, x: -10 }}
              transition={{ duration: 0.3 }}
              className="glass"
              style={{ padding: '2.5rem', minHeight: '600px' }}
            >
              {renderStep()}
            </motion.div>
          </AnimatePresence>
        </main>
      </div>
    </div>
  );
}

export default DOModule;
