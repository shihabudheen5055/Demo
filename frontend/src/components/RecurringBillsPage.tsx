import React, { useEffect, useState } from 'react';
import { getRecurringBills, addRecurringBill, deleteRecurringBill } from '../api';
import { CalendarClock, Trash2, Plus } from 'lucide-react';

interface RecurringBill {
  id: number;
  title: string;
  amount: number;
  dueDayOfMonth: number;
}

const RecurringBillsPage: React.FC = () => {
  const [bills, setBills] = useState<RecurringBill[]>([]);
  const [loading, setLoading] = useState(true);
  
  const [formTitle, setFormTitle] = useState('');
  const [formAmount, setFormAmount] = useState('');
  const [formDay, setFormDay] = useState('1');

  useEffect(() => {
    loadBills();
  }, []);

  const loadBills = async () => {
    try {
      setLoading(true);
      const data = await getRecurringBills();
      setBills(data);
    } catch (err) {
      console.error('Failed to load recurring bills', err);
    } finally {
      setLoading(false);
    }
  };

  const handleAddBill = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!formTitle || !formAmount || !formDay) return;
    
    try {
      await addRecurringBill({
        title: formTitle,
        amount: parseFloat(formAmount),
        dueDayOfMonth: parseInt(formDay)
      });
      setFormTitle('');
      setFormAmount('');
      setFormDay('1');
      loadBills();
    } catch (err) {
      console.error('Failed to add bill', err);
    }
  };

  const handleDelete = async (id: number) => {
    if (window.confirm("Delete this recurring bill?")) {
      try {
        await deleteRecurringBill(id);
        loadBills();
      } catch (err) {
        console.error('Failed to delete bill', err);
      }
    }
  };

  return (
    <div style={{ maxWidth: '800px', margin: '0 auto' }}>
      <header style={{ display: 'flex', alignItems: 'center', gap: '1rem', marginBottom: '2rem' }}>
        <CalendarClock size={32} color="#818cf8" />
        <h1 style={{ fontSize: '2rem', fontWeight: 600 }}>Recurring Bills</h1>
      </header>

      <div className="glass-panel" style={{ padding: '2rem', marginBottom: '2rem' }}>
        <h2 style={{ fontSize: '1.2rem', marginBottom: '1rem' }}>Add New Bill</h2>
        <form onSubmit={handleAddBill} style={{ display: 'flex', gap: '1rem', alignItems: 'flex-end', flexWrap: 'wrap' }}>
          <div style={{ flex: '1 1 200px' }}>
            <label style={{ display: 'block', marginBottom: '0.5rem', fontSize: '0.9rem', color: '#a1a1aa' }}>Bill Title (e.g. Rent, Netflix)</label>
            <input 
              type="text" 
              className="input-field" 
              value={formTitle}
              onChange={e => setFormTitle(e.target.value)}
              placeholder="Netflix"
              required
            />
          </div>
          <div style={{ flex: '1 1 120px' }}>
            <label style={{ display: 'block', marginBottom: '0.5rem', fontSize: '0.9rem', color: '#a1a1aa' }}>Amount ($)</label>
            <input 
              type="number" 
              step="0.01"
              className="input-field" 
              value={formAmount}
              onChange={e => setFormAmount(e.target.value)}
              placeholder="15.99"
              required
            />
          </div>
          <div style={{ flex: '0 1 120px' }}>
            <label style={{ display: 'block', marginBottom: '0.5rem', fontSize: '0.9rem', color: '#a1a1aa' }}>Due Day (1-31)</label>
            <input 
              type="number" 
              min="1" 
              max="31"
              className="input-field" 
              value={formDay}
              onChange={e => setFormDay(e.target.value)}
              required
            />
          </div>
          <button type="submit" className="primary-btn" style={{ padding: '0.8rem 1.5rem', display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
            <Plus size={18} /> Add
          </button>
        </form>
      </div>

      <div className="glass-panel" style={{ padding: '2rem' }}>
        <h2 style={{ fontSize: '1.2rem', marginBottom: '1rem' }}>Your Active Bills</h2>
        
        {loading ? (
          <p style={{ color: '#a1a1aa' }}>Loading...</p>
        ) : bills.length === 0 ? (
          <p style={{ color: '#a1a1aa', textAlign: 'center', padding: '2rem 0' }}>No recurring bills added yet. Add one above to improve your 14-day cash flow forecast!</p>
        ) : (
          <div style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>
            {bills.map(bill => (
              <div key={bill.id} style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '1rem', background: 'rgba(255,255,255,0.03)', borderRadius: '12px' }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: '1.5rem' }}>
                  <div style={{ background: 'rgba(129, 140, 248, 0.1)', color: '#818cf8', width: '48px', height: '48px', borderRadius: '12px', display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', fontWeight: 600 }}>
                    <span style={{ fontSize: '0.7rem', textTransform: 'uppercase' }}>Day</span>
                    <span style={{ fontSize: '1.1rem' }}>{bill.dueDayOfMonth}</span>
                  </div>
                  <div>
                    <div style={{ fontWeight: 500, fontSize: '1.1rem', marginBottom: '0.2rem' }}>{bill.title}</div>
                    <div style={{ color: '#a1a1aa', fontSize: '0.9rem' }}>Repeats monthly</div>
                  </div>
                </div>
                <div style={{ display: 'flex', alignItems: 'center', gap: '1.5rem' }}>
                  <div style={{ fontWeight: 600, fontSize: '1.2rem' }}>
                    ${bill.amount.toFixed(2)}
                  </div>
                  <button 
                    onClick={() => handleDelete(bill.id)}
                    style={{ background: 'rgba(239, 68, 68, 0.1)', color: '#ef4444', border: 'none', padding: '0.6rem', borderRadius: '8px', cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center', transition: 'all 0.2s' }}
                    title="Delete Bill"
                  >
                    <Trash2 size={18} />
                  </button>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
};

export default RecurringBillsPage;
