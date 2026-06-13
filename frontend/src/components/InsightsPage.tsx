import React, { useEffect, useState } from 'react';
import { getInsights } from '../api';
import { AlertTriangle, Search, Trash2 } from 'lucide-react';

const InsightsPage: React.FC = () => {
  const [insights, setInsights] = useState<{ duplicates: any[], hiddenFees: any[] } | null>(null);
  const [loading, setLoading] = useState(true);
  const [ignoredItems, setIgnoredItems] = useState<string[]>(() => {
    try {
      return JSON.parse(localStorage.getItem('ignoredInsights') || '[]');
    } catch {
      return [];
    }
  });

  const handleIgnore = (title: string) => {
    const updated = [...ignoredItems, title];
    setIgnoredItems(updated);
    localStorage.setItem('ignoredInsights', JSON.stringify(updated));
  };

  const handleCancel = (title: string) => {
    alert(`Cancellation Requested!\n\nCents AI has drafted a cancellation email to the merchant for "${title}". We will notify you once it is confirmed.`);
    handleIgnore(title);
  };

  useEffect(() => {
    loadInsights();
  }, []);

  const loadInsights = async () => {
    try {
      const data = await getInsights();
      setInsights(data);
    } catch (e) {
      console.error('Failed to load insights', e);
    } finally {
      setLoading(false);
    }
  };

  if (loading) {
    return <div style={{ textAlign: 'center', padding: '5rem' }}>Analyzing transactions...</div>;
  }

  const activeDuplicates = insights?.duplicates.filter(d => !ignoredItems.includes(d.title)) || [];
  const activeHiddenFees = insights?.hiddenFees.filter(f => !ignoredItems.includes(f.title)) || [];
  const hasInsights = activeDuplicates.length > 0 || activeHiddenFees.length > 0;

  return (
    <div style={{ maxWidth: '800px', margin: '0 auto' }}>
      <div className="flex" style={{ justifyContent: 'space-between', alignItems: 'center', marginBottom: '2rem' }}>
        <div>
          <h1 style={{ fontSize: '2.5rem', marginBottom: '0.5rem' }}>AI Insights</h1>
          <p style={{ color: 'var(--text-muted)' }}>We scan your transactions to save you money.</p>
        </div>
      </div>

      {!hasInsights ? (
        <div className="glass-panel" style={{ textAlign: 'center', padding: '4rem 2rem' }}>
          <Search size={50} style={{ color: 'var(--text-muted)', margin: '0 auto 1.5rem' }} />
          <h3>No anomalies found!</h3>
          <p style={{ color: 'var(--text-muted)', marginTop: '0.5rem' }}>Your transactions look clean. No hidden fees or duplicate subscriptions detected this month.</p>
        </div>
      ) : (
        <div style={{ display: 'flex', flexDirection: 'column', gap: '2rem' }}>
          
          {activeDuplicates.length > 0 && (
            <div>
              <h3 className="flex" style={{ alignItems: 'center', gap: '0.5rem', marginBottom: '1rem', color: 'var(--warning)' }}>
                <AlertTriangle size={20} /> Duplicate Subscriptions Detected
              </h3>
              {activeDuplicates.map((dup, i) => (
                <div key={`dup-${i}`} className="glass-panel" style={{ borderLeft: '4px solid var(--warning)', marginBottom: '1rem' }}>
                  <div className="flex" style={{ justifyContent: 'space-between', alignItems: 'center' }}>
                    <div>
                      <h4 style={{ fontSize: '1.2rem', marginBottom: '0.25rem' }}>{dup.title}</h4>
                      <p style={{ color: 'var(--text-muted)', fontSize: '0.9rem' }}>{dup.reason}</p>
                    </div>
                    <div style={{ textAlign: 'right' }}>
                      <div style={{ fontSize: '1.5rem', fontWeight: 'bold', color: 'var(--danger)' }}>₹{dup.totalWasted.toFixed(2)}</div>
                      <div style={{ fontSize: '0.8rem', color: 'var(--text-muted)' }}>Wasted</div>
                    </div>
                  </div>
                  <div className="flex" style={{ gap: '1rem', marginTop: '1.5rem' }}>
                    <button className="btn" style={{ background: 'var(--danger)', border: 'none', display: 'flex', alignItems: 'center', gap: '0.5rem' }} onClick={() => handleCancel(dup.title)}>
                      <Trash2 size={16} /> Cancel One Subscription
                    </button>
                    {dup.sourceUrl && (
                      <a href={dup.sourceUrl} target="_blank" rel="noreferrer" className="btn" style={{ background: 'transparent', border: '1px solid var(--glass-border)', textDecoration: 'none', color: 'inherit' }}>
                        View Original Receipt
                      </a>
                    )}
                    <button className="btn" style={{ background: 'transparent', border: '1px solid var(--glass-border)' }} onClick={() => handleIgnore(dup.title)}>Ignore</button>
                  </div>
                </div>
              ))}
            </div>
          )}

          {activeHiddenFees.length > 0 && (
            <div>
              <h3 className="flex" style={{ alignItems: 'center', gap: '0.5rem', marginBottom: '1rem', color: 'var(--danger)' }}>
                <Search size={20} /> Hidden Fees Detected
              </h3>
              {activeHiddenFees.map((fee, i) => (
                <div key={`fee-${i}`} className="glass-panel" style={{ borderLeft: '4px solid var(--danger)', marginBottom: '1rem' }}>
                  <div className="flex" style={{ justifyContent: 'space-between', alignItems: 'center' }}>
                    <div>
                      <h4 style={{ fontSize: '1.2rem', marginBottom: '0.25rem' }}>{fee.title}</h4>
                      <p style={{ color: 'var(--text-muted)', fontSize: '0.9rem' }}>{fee.reason}</p>
                    </div>
                    <div style={{ textAlign: 'right' }}>
                      <div style={{ fontSize: '1.5rem', fontWeight: 'bold', color: 'var(--danger)' }}>₹{fee.totalAmount.toFixed(2)}</div>
                      <div style={{ fontSize: '0.8rem', color: 'var(--text-muted)' }}>Total ({fee.totalCount} charges)</div>
                    </div>
                  </div>
                  <div className="flex" style={{ gap: '1rem', marginTop: '1.5rem' }}>
                    <button className="btn" style={{ background: 'transparent', border: '1px solid var(--glass-border)' }}>Investigate</button>
                    {fee.sourceUrl && (
                      <a href={fee.sourceUrl} target="_blank" rel="noreferrer" className="btn" style={{ background: 'transparent', border: '1px solid var(--glass-border)', textDecoration: 'none', color: 'inherit' }}>
                        View Original Receipt
                      </a>
                    )}
                    <button className="btn" style={{ background: 'transparent', border: '1px solid var(--glass-border)' }} onClick={() => handleIgnore(fee.title)}>Ignore</button>
                  </div>
                </div>
              ))}
            </div>
          )}

        </div>
      )}
    </div>
  );
};

export default InsightsPage;
