import React, { useState } from 'react';
import { MessageCircle, Check, Copy } from 'lucide-react';
import { getTelegramLinkToken } from '../api';

const TelegramSettings: React.FC = () => {
  const [linkData, setLinkData] = useState<{ token: string; botUsername: string } | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [copied, setCopied] = useState(false);

  const handleGenerateLink = async () => {
    try {
      setLoading(true);
      setError('');
      const data = await getTelegramLinkToken();
      setLinkData(data);
    } catch (err: any) {
      setError(err.response?.data?.message || 'Failed to generate linking token.');
    } finally {
      setLoading(false);
    }
  };

  const copyToClipboard = () => {
    if (linkData?.token) {
      navigator.clipboard.writeText(`/link ${linkData.token}`);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    }
  };

  return (
    <div className="glass-panel" style={{ padding: '2rem' }}>
      <div style={{ display: 'flex', alignItems: 'center', gap: '1rem', marginBottom: '1.5rem' }}>
        <div style={{ background: 'rgba(56, 189, 248, 0.1)', color: '#38bdf8', padding: '0.75rem', borderRadius: '12px' }}>
          <MessageCircle size={24} />
        </div>
        <div>
          <h2 style={{ fontSize: '1.25rem', marginBottom: '0.25rem' }}>Telegram Integration</h2>
          <p style={{ color: 'var(--text-muted)', fontSize: '0.9rem' }}>Add expenses directly by messaging our bot.</p>
        </div>
      </div>

      {error && (
        <div style={{ background: 'rgba(239, 68, 68, 0.1)', color: 'var(--danger)', padding: '0.75rem', borderRadius: '8px', marginBottom: '1rem', fontSize: '0.9rem' }}>
          {error}
        </div>
      )}

      {!linkData ? (
        <button 
          className="btn" 
          onClick={handleGenerateLink} 
          disabled={loading}
          style={{ width: '100%', display: 'flex', justifyContent: 'center', alignItems: 'center', gap: '0.5rem' }}
        >
          {loading ? 'Generating...' : 'Connect Telegram'}
        </button>
      ) : (
        <div style={{ background: 'rgba(255, 255, 255, 0.03)', border: '1px solid var(--glass-border)', borderRadius: '12px', padding: '1.5rem' }}>
          <p style={{ fontSize: '0.95rem', marginBottom: '1rem', lineHeight: '1.5' }}>
            <strong>Step 1:</strong> Open Telegram and message our bot: <br />
            <a href={`https://t.me/${linkData.botUsername}`} target="_blank" rel="noopener noreferrer" style={{ color: 'var(--accent)', fontWeight: 600 }}>@{linkData.botUsername}</a>
          </p>
          <p style={{ fontSize: '0.95rem', marginBottom: '0.5rem' }}>
            <strong>Step 2:</strong> Send the following command to link your account:
          </p>
          <div style={{ display: 'flex', gap: '0.5rem' }}>
            <code style={{ flex: 1, background: 'rgba(0,0,0,0.2)', padding: '0.75rem', borderRadius: '8px', fontSize: '1.1rem', textAlign: 'center', letterSpacing: '2px' }}>
              /link {linkData.token}
            </code>
            <button 
              className="btn" 
              onClick={copyToClipboard}
              style={{ padding: '0 1rem', background: 'rgba(255,255,255,0.1)' }}
              title="Copy to clipboard"
            >
              {copied ? <Check size={20} color="var(--success)" /> : <Copy size={20} />}
            </button>
          </div>
          <p style={{ fontSize: '0.85rem', color: 'var(--text-muted)', marginTop: '1rem', textAlign: 'center' }}>
            This code expires in 15 minutes. Once linked, you can send messages like "Lunch 15.50" to log expenses.
          </p>
        </div>
      )}
    </div>
  );
};

export default TelegramSettings;
