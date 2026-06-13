import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { login, register } from '../api';
import { MailCheck } from 'lucide-react';

const Login: React.FC = () => {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [error, setError] = useState('');
  const [isRegisterMode, setIsRegisterMode] = useState(false);
  const [verificationStep, setVerificationStep] = useState(false);
  const [verificationCode, setVerificationCode] = useState('');
  const navigate = useNavigate();

  const handleInitialSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    
    if (!email || !email.includes('@')) {
      setError('Please enter a valid email address.');
      return;
    }

    if (isRegisterMode) {
      if (password.length < 6) {
        setError('Password must be at least 6 characters.');
        return;
      }
      if (password !== confirmPassword) {
        setError('Passwords do not match.');
        return;
      }
      
      try {
        await register(email.trim(), password);
        setVerificationStep(true);
      } catch (err: any) {
        setError(typeof err.response?.data === 'string' ? err.response?.data : 'Failed to register. Email might already be taken.');
      }
    } else {
      // Normal Login Flow
      try {
        await login(email.trim(), password);
        navigate('/');
      } catch (err: any) {
        if (err.response?.status === 403) {
           setError('Please verify your email first.');
           setVerificationStep(true);
        } else {
           setError('Invalid email or password.');
        }
      }
    }
  };

  const handleVerificationSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');

    if (verificationCode.length !== 6) {
      setError('Please enter the 6-digit code.');
      return;
    }

    try {
      await import('../api').then(m => m.verifyEmail(email, verificationCode));
      navigate('/');
    } catch (err: any) {
      setError(typeof err.response?.data === 'string' ? err.response?.data : 'Invalid or expired verification code.');
    }
  };

  return (
    <div style={{ display: 'flex', height: '100vh', alignItems: 'center', justifyContent: 'center' }}>
      <div className="glass-panel" style={{ width: '400px', padding: '3rem 2rem' }}>
        
        {verificationStep ? (
          // Verification UI
          <>
            <div style={{ background: 'rgba(34, 197, 94, 0.1)', width: '60px', height: '60px', borderRadius: '50%', display: 'flex', alignItems: 'center', justifyContent: 'center', margin: '0 auto 1.5rem', color: 'var(--success)' }}>
              <MailCheck size={30} />
            </div>
            <h1 style={{ textAlign: 'center', marginBottom: '0.5rem', fontSize: '2rem' }}>Verify Email</h1>
            <p style={{ textAlign: 'center', color: 'var(--text-muted)', marginBottom: '2rem', fontSize: '0.95rem' }}>
              We've sent a 6-digit code to <strong>{email}</strong>. Please enter it below to confirm your account.
            </p>

            {error && (
              <div style={{ background: 'rgba(239, 68, 68, 0.1)', color: 'var(--danger)', padding: '0.75rem', borderRadius: '8px', marginBottom: '1.5rem', textAlign: 'center', fontSize: '0.9rem' }}>
                {error}
              </div>
            )}

            <form onSubmit={handleVerificationSubmit} style={{ display: 'flex', flexDirection: 'column', gap: '1.5rem' }}>
              <div>
                <label style={{ display: 'block', marginBottom: '0.5rem', fontSize: '0.9rem', color: 'var(--text-muted)', textAlign: 'center' }}>Verification Code (Demo: Type any 6 digits)</label>
                <input 
                  type="text" 
                  className="input-field"
                  style={{ textAlign: 'center', fontSize: '1.5rem', letterSpacing: '0.5rem' }}
                  value={verificationCode} 
                  onChange={e => setVerificationCode(e.target.value.replace(/\D/g, '').slice(0, 6))} 
                  placeholder="000000"
                  required 
                />
              </div>
              <button type="submit" className="btn" style={{ width: '100%', fontSize: '1rem', padding: '0.8rem' }}>
                Verify & Create Account
              </button>
              <button 
                type="button" 
                className="btn" 
                style={{ background: 'transparent', border: '1px solid var(--glass-border)', width: '100%' }}
                onClick={() => setVerificationStep(false)}
              >
                Go Back
              </button>
            </form>
          </>
        ) : (
          // Standard Login/Register UI
          <>
            <h1 style={{ textAlign: 'center', marginBottom: '0.5rem', fontSize: '2.5rem' }}>
              {isRegisterMode ? 'Join Cents' : 'Cents'}
            </h1>
            <p style={{ textAlign: 'center', color: 'var(--text-muted)', marginBottom: '2rem' }}>
              {isRegisterMode ? 'Create your account to get started' : 'Sign in to your account'}
            </p>

            {error && (
              <div style={{ background: 'rgba(239, 68, 68, 0.1)', color: 'var(--danger)', padding: '0.75rem', borderRadius: '8px', marginBottom: '1.5rem', textAlign: 'center', fontSize: '0.9rem' }}>
                {error}
              </div>
            )}

            <form onSubmit={handleInitialSubmit} style={{ display: 'flex', flexDirection: 'column', gap: '1.5rem' }}>
              <div>
                <label style={{ display: 'block', marginBottom: '0.5rem', fontSize: '0.9rem', color: 'var(--text-muted)' }}>Email Address</label>
                <input 
                  type="email" 
                  className="input-field"
                  value={email} 
                  onChange={e => setEmail(e.target.value)} 
                  placeholder="you@example.com"
                  required 
                />
              </div>
              <div>
                <label style={{ display: 'block', marginBottom: '0.5rem', fontSize: '0.9rem', color: 'var(--text-muted)' }}>Password</label>
                <input 
                  type="password" 
                  className="input-field"
                  value={password} 
                  onChange={e => setPassword(e.target.value)} 
                  placeholder="••••••••"
                  required 
                />
                {isRegisterMode && (
                  <div style={{ marginTop: '0.5rem', fontSize: '0.8rem', color: 'var(--text-muted)' }}>
                    Password must be at least 6 characters.
                  </div>
                )}
              </div>
              {isRegisterMode && (
                <div>
                  <label style={{ display: 'block', marginBottom: '0.5rem', fontSize: '0.9rem', color: 'var(--text-muted)' }}>Confirm Password</label>
                  <input 
                    type="password" 
                    className="input-field"
                    value={confirmPassword} 
                    onChange={e => setConfirmPassword(e.target.value)} 
                    placeholder="••••••••"
                    required={isRegisterMode}
                  />
                </div>
              )}
              <button type="submit" className="btn" style={{ marginTop: '0.5rem', width: '100%', fontSize: '1rem', padding: '0.8rem' }}>
                {isRegisterMode ? 'Sign Up' : 'Log In'}
              </button>
            </form>

            <div style={{ marginTop: '2rem', textAlign: 'center', fontSize: '0.9rem', color: 'var(--text-muted)' }}>
              {isRegisterMode ? 'Already have an account?' : "Don't have an account?"}
              <button 
                type="button" 
                style={{ background: 'transparent', border: 'none', color: 'var(--accent)', marginLeft: '0.5rem', cursor: 'pointer', fontWeight: 600 }}
                onClick={() => {
                  setIsRegisterMode(!isRegisterMode);
                  setError('');
                  setConfirmPassword('');
                }}
              >
                {isRegisterMode ? 'Log In' : 'Sign Up'}
              </button>
            </div>
          </>
        )}

      </div>
    </div>
  );
};

export default Login;
