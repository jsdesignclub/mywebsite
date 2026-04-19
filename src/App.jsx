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
        <div style={{ 
          padding: '1.5rem', 
          width: '100%', 
          maxWidth: '1200px', 
          margin: '0 auto', 
          textAlign: 'center',
          overflowX: 'hidden'
        }}>
          <header style={{ marginBottom: '2.5rem' }}>
            <motion.div
              initial={{ opacity: 0, y: -20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.6 }}
            >
              <span style={{ 
                color: '#2e75b6', 
                fontWeight: 600, 
                letterSpacing: '0.1em',
                fontSize: 'clamp(0.7rem, 3vw, 0.9rem)',
                display: 'block',
                marginBottom: '0.5rem'
              }}>UVA PROVINCIAL INDUSTRIES DEPARTMENT</span>
              <h1>SME Grant Management System</h1>
              <p className="subtitle">Official Portal for Automated Beneficiary Grant Processing</p>
            </motion.div>
          </header>
          <div style={{ display: 'flex', justifyContent: 'center', width: '100%' }}>
            <Login />
          </div>
          <footer style={{ marginTop: '4rem', color: '#475569', fontSize: '0.8rem', padding: '1rem' }}>
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
