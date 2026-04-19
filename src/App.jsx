import React from 'react';
import { AuthProvider, useAuth } from './context/AuthContext';
import Login from './components/Login';
import Dashboard from './components/Dashboard';
import { motion } from 'framer-motion';

function AppContent() {
  const { currentUser, loading } = useAuth();

  if (loading) {
    return (
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', height: '80vh' }}>
        <div className="animate-fade-in" style={{ color: '#2e75b6', fontWeight: 600 }}>Loading Security Context...</div>
      </div>
    );
  }

  return (
    <div className="animate-fade-in" style={{ 
      minHeight: '100vh',
      display: !currentUser ? 'flex' : 'block',
      flexDirection: 'column',
      justifyContent: !currentUser ? 'center' : 'stretch'
    }}>
      {!currentUser ? (
        <div style={{ padding: '2rem', width: '100%', maxWidth: '1200px', margin: '0 auto', textAlign: 'center' }}>
          <header style={{ marginBottom: '3rem' }}>
            <motion.div
              initial={{ opacity: 0, y: -20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.6 }}
            >
              <span style={{ color: '#2e75b6', fontWeight: 600, letterSpacing: '0.1em' }}>UVA PROVINCIAL INDUSTRIES DEPARTMENT</span>
              <h1 style={{ marginTop: '0.5rem' }}>SME Grant Management System</h1>
              <p className="subtitle">Official Portal for Automated Beneficiary Grant Processing</p>
            </motion.div>
          </header>
          <Login />
          <footer style={{ marginTop: '5rem', color: '#475569', fontSize: '0.9rem' }}>
            <p>© 2026 Uva Provincial Industries Department | Secure Authentication v1.0</p>
          </footer>
        </div>
      ) : (
        <Dashboard />
      )}
    </div>
  );
}

function App() {
  return (
    <AuthProvider>
      <AppContent />
    </AuthProvider>
  );
}

export default App;
