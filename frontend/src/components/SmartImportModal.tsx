import React, { useState } from 'react';
import { Mail, CheckCircle, RefreshCw, AlertCircle } from 'lucide-react';
import { syncEmail, getGoogleAuthUrl } from '../api';

const SmartImportModal: React.FC<{ onClose: () => void, onComplete: () => void }> = ({ onClose, onComplete }) => {
  const [step, setStep] = useState<number>(0);
  const [syncedCount, setSyncedCount] = useState<number>(0);
  const [authRequired, setAuthRequired] = useState<boolean>(false);
  const [progress, setProgress] = useState<number>(0);

  const handleSync = () => {
    setStep(1); // Connecting
    
    try {
      const token = localStorage.getItem('token');
      const eventSource = new EventSource(`http://localhost:5163/api/sync/stream?token=${token}`);

      eventSource.onopen = () => {
        setStep(2); // Parsing started
      };

      eventSource.onmessage = (event) => {
        const data = JSON.parse(event.data);
        if (data.error) {
          eventSource.close();
          if (data.error.includes("connect your Gmail account")) {
            setStep(0);
            setAuthRequired(true);
          } else {
            setStep(0);
            alert('Failed to sync emails. Please try again.');
          }
        } else if (data.done) {
          eventSource.close();
          setSyncedCount(data.count);
          setStep(3); // Success
        } else if (data.total) {
          const percent = Math.round((data.current / data.total) * 100);
          setProgress(percent);
        }
      };

      eventSource.onerror = () => {
        eventSource.close();
        setStep(0);
        alert('Connection lost during sync.');
      };

    } catch (e: any) {
      console.error(e);
      setStep(0);
      alert('Failed to initialize sync stream. Please try again.');
    }
  };

  const handleConnectGmail = async () => {
    try {
      const url = await getGoogleAuthUrl();
      window.location.href = url;
    } catch (e) {
      console.error(e);
      alert("Failed to get Google Auth URL.");
    }
  };

  return (
    <div style={{ position: 'fixed', top: 0, left: 0, right: 0, bottom: 0, backgroundColor: 'rgba(0,0,0,0.7)', zIndex: 100, display: 'flex', alignItems: 'center', justifyContent: 'center', backdropFilter: 'blur(5px)' }}>
      <div className="glass-panel" style={{ width: '450px', padding: '2.5rem', textAlign: 'center' }}>
        
        {step === 0 && !authRequired && (
          <>
            <div style={{ background: 'rgba(56, 189, 248, 0.1)', width: '80px', height: '80px', borderRadius: '50%', display: 'flex', alignItems: 'center', justifyContent: 'center', margin: '0 auto 1.5rem', color: 'var(--accent)' }}>
              <Mail size={40} />
            </div>
            <h2 className="mb-4">Sync Transactions</h2>
            <p style={{ color: 'var(--text-muted)', marginBottom: '2rem' }}>
              Securely connect to your Gmail inbox. Cents AI will automatically scan your receipts, categorize your transactions, and find hidden subscriptions.
            </p>
            <button className="btn" style={{ width: '100%', marginBottom: '1rem' }} onClick={handleSync}>
              Sync Now
            </button>
            <button className="btn" style={{ width: '100%', background: 'transparent', border: 'none', color: 'var(--text-muted)' }} onClick={onClose}>
              Cancel
            </button>
          </>
        )}

        {step === 0 && authRequired && (
          <>
            <div style={{ background: 'rgba(239, 68, 68, 0.1)', width: '80px', height: '80px', borderRadius: '50%', display: 'flex', alignItems: 'center', justifyContent: 'center', margin: '0 auto 1.5rem', color: '#ef4444' }}>
              <AlertCircle size={40} />
            </div>
            <h2 className="mb-4">Gmail Not Connected</h2>
            <p style={{ color: 'var(--text-muted)', marginBottom: '2rem' }}>
              You need to authorize Cents to securely read your receipts via the official Google API.
            </p>
            <button className="btn" style={{ width: '100%', marginBottom: '1rem', background: '#fff', color: '#000' }} onClick={handleConnectGmail}>
              <img src="https://upload.wikimedia.org/wikipedia/commons/5/53/Google_%22G%22_Logo.svg" alt="Google" style={{ width: '18px', marginRight: '10px', verticalAlign: 'middle' }} />
              Connect with Google
            </button>
            <button className="btn" style={{ width: '100%', background: 'transparent', border: 'none', color: 'var(--text-muted)' }} onClick={onClose}>
              Cancel
            </button>
          </>
        )}

        {(step === 1 || step === 2) && (
          <div style={{ padding: '2rem 0' }}>
            {step === 1 ? (
              <RefreshCw size={50} className="mb-4" style={{ color: 'var(--accent)', animation: 'spin 2s linear infinite', margin: '0 auto' }} />
            ) : (
              <div className="progress-bar-container">
                <div className="progress-bar-fill" style={{ width: `${progress}%` }}></div>
              </div>
            )}
            <h3 style={{ marginBottom: '1rem' }}>
              {step === 1 ? 'Connecting to Gmail API...' : `Extracting merchants & amounts... ${progress}%`}
            </h3>
            <p style={{ color: 'var(--text-muted)' }}>Our AI is parsing your receipts.</p>
          </div>
        )}

        {step === 3 && (
          <div style={{ padding: '1rem 0' }}>
            <CheckCircle size={60} className="mb-4" style={{ color: 'var(--success)', margin: '0 auto' }} />
            <h2 className="mb-4" style={{ color: 'var(--success)' }}>Sync Complete!</h2>
            <p style={{ color: 'var(--text-muted)', marginBottom: '2rem' }}>
              Successfully synced {syncedCount} recent receipts from your Gmail account.
            </p>
            <button className="btn" style={{ width: '100%', background: 'var(--success)', border: 'none' }} onClick={() => { onClose(); onComplete(); }}>
              Awesome
            </button>
          </div>
        )}

      </div>
    </div>
  );
};

export default SmartImportModal;
