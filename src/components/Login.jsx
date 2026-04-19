import React, { useState } from 'react';
import { motion } from 'framer-motion';
import { LogIn, Mail, Lock, AlertCircle } from 'lucide-react';
import { auth, db } from '../firebase';
import { signInWithEmailAndPassword, createUserWithEmailAndPassword } from 'firebase/auth';
import { doc, setDoc } from 'firebase/firestore';

function Login() {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError('');
    setLoading(true);

    try {
      await signInWithEmailAndPassword(auth, email, password);
    } catch (err) {
      setError('Failed to login. Please check your credentials or Firebase configuration.');
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div style={{
      display: 'flex',
      alignItems: 'center',
      justifyContent: 'center',
      minHeight: '60vh'
    }}>
      <motion.div
        initial={{ opacity: 0, scale: 0.95 }}
        animate={{ opacity: 1, scale: 1 }}
        className="glass"
        style={{
          width: '100%',
          maxWidth: '400px',
          padding: '3rem',
          textAlign: 'left'
        }}
      >
        <div style={{ textAlign: 'center', marginBottom: '2rem' }}>
          <div style={{
            width: '64px',
            height: '64px',
            background: 'rgba(31, 78, 121, 0.2)',
            color: '#2e75b6',
            borderRadius: '16px',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            margin: '0 auto 1rem'
          }}>
            <LogIn size={32} />
          </div>
          <h2 style={{ fontSize: '1.8rem', margin: '0 0 0.5rem' }}>Officer Login</h2>
          <p style={{ color: '#94a3b8', fontSize: '0.9rem' }}>Enter your credentials to access the SME Grant portal</p>
        </div>

        {error && (
          <div style={{
            background: 'rgba(239, 68, 68, 0.1)',
            border: '1px solid rgba(239, 68, 68, 0.2)',
            color: '#f87171',
            padding: '1rem',
            borderRadius: '8px',
            marginBottom: '1.5rem',
            display: 'flex',
            alignItems: 'center',
            gap: '0.5rem',
            fontSize: '0.85rem'
          }}>
            <AlertCircle size={18} />
            {error}
          </div>
        )}

        <form onSubmit={handleSubmit}>
          <div style={{ marginBottom: '1.5rem' }}>
            <label style={{ display: 'block', marginBottom: '0.5rem', fontSize: '0.9rem', color: '#cbd5e1' }}>Email Address</label>
            <div style={{ position: 'relative' }}>
              <Mail size={18} style={{ position: 'absolute', left: '12px', top: '50%', transform: 'translateY(-50%)', color: '#64748b' }} />
              <input
                type="email"
                required
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                style={{
                  width: '100%',
                  padding: '0.8rem 0.8rem 0.8rem 2.8rem',
                  background: 'rgba(255, 255, 255, 0.03)',
                  border: '1px solid rgba(255, 255, 255, 0.1)',
                  borderRadius: '8px',
                  color: '#fff',
                  outline: 'none',
                  boxSizing: 'border-box'
                }}
                placeholder="officer@uva.gov.lk"
              />
            </div>
          </div>

          <div style={{ marginBottom: '2rem' }}>
            <label style={{ display: 'block', marginBottom: '0.5rem', fontSize: '0.9rem', color: '#cbd5e1' }}>Password</label>
            <div style={{ position: 'relative' }}>
              <Lock size={18} style={{ position: 'absolute', left: '12px', top: '50%', transform: 'translateY(-50%)', color: '#64748b' }} />
              <input
                type="password"
                required
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                style={{
                  width: '100%',
                  padding: '0.8rem 0.8rem 0.8rem 2.8rem',
                  background: 'rgba(255, 255, 255, 0.03)',
                  border: '1px solid rgba(255, 255, 255, 0.1)',
                  borderRadius: '8px',
                  color: '#fff',
                  outline: 'none',
                  boxSizing: 'border-box'
                }}
                placeholder="••••••••"
              />
            </div>
          </div>

          <button
            type="submit"
            disabled={loading}
            style={{
              width: '100%',
              padding: '1rem',
              background: 'linear-gradient(135deg, #1f4e79 0%, #2e75b6 100%)',
              border: 'none',
              borderRadius: '8px',
              color: '#fff',
              fontWeight: 600,
              cursor: 'pointer',
              transition: 'transform 0.2s',
              opacity: loading ? 0.7 : 1,
              marginBottom: '1rem'
            }}
          >
            {loading ? 'Logging in...' : 'Sign In'}
          </button>


        </form>

        <div style={{ marginTop: '1.5rem', textAlign: 'center' }}>
          <p style={{ fontSize: '0.8rem', color: '#64748b' }}>
            Secure login for Uva Provincial Staff only.
          </p>
        </div>
      </motion.div>
    </div>
  );
}

export default Login;
