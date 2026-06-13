import React, { useEffect, useState } from 'react';
import axios from 'axios';
import TransactionForm from './TransactionForm';
import SmartImportModal from './SmartImportModal';
import { Sparkles, Trash2, Edit2, Check, X } from 'lucide-react';
import { deleteTransaction, updateTransaction, clearTransactions } from '../api';

const TransactionsPage: React.FC = () => {
  const [transactions, setTransactions] = useState<any[]>([]);
  const [showImport, setShowImport] = useState(false);
  const [editingId, setEditingId] = useState<number | null>(null);
  const [editForm, setEditForm] = useState({ title: '', amount: 0, isExpense: true, date: '' });

  const handleEditClick = (t: any) => {
    setEditingId(t.id);
    setEditForm({
      title: t.title,
      amount: t.amount,
      isExpense: t.isExpense,
      date: new Date(t.date).toISOString().split('T')[0]
    });
  };

  const handleSaveEdit = async () => {
    if (editingId) {
      try {
        await updateTransaction(editingId, editForm);
        setEditingId(null);
        loadTransactions();
      } catch (err) {
        console.error("Failed to update", err);
      }
    }
  };

  const handleDelete = async (id: number) => {
    if (window.confirm("Are you sure you want to remove this transaction?")) {
      try {
        await deleteTransaction(id);
        loadTransactions();
      } catch (err) {
        console.error("Failed to delete", err);
      }
    }
  };

  const handleClearAll = async () => {
    if (transactions.length === 0) return;
    if (window.confirm("Are you sure you want to permanently delete ALL your transactions? This cannot be undone.")) {
      try {
        await clearTransactions();
        loadTransactions();
      } catch (err) {
        console.error("Failed to clear transactions", err);
      }
    }
  };

  const loadTransactions = async () => {
    try {
      const response = await axios.get('http://localhost:5163/api/transactions');
      setTransactions(response.data);
    } catch (error) {
      console.error('Failed to load transactions', error);
    }
  };

  useEffect(() => {
    loadTransactions();
    
    // Check if returning from Google Auth
    if (window.location.search.includes('googleSync=success')) {
      setShowImport(true);
      // Clean up URL
      window.history.replaceState({}, document.title, window.location.pathname);
    }
  }, []);

  return (
    <>
      {showImport && <SmartImportModal onClose={() => setShowImport(false)} onComplete={loadTransactions} />}
      <div className="grid" style={{ gridTemplateColumns: '1fr 350px', gap: '1.5rem' }}>
        <div className="glass-panel">
          <div className="flex" style={{ justifyContent: 'space-between', alignItems: 'center', marginBottom: '1.5rem' }}>
            <h2>Recent Transactions</h2>
            <div style={{ display: 'flex', gap: '0.5rem' }}>
              <button className="btn" style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', background: 'var(--surface-light)', border: 'none', color: 'var(--danger)' }} onClick={handleClearAll} disabled={transactions.length === 0}>
                <Trash2 size={16} /> Clear All
              </button>
              <button className="btn" style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', background: 'var(--accent)', border: 'none' }} onClick={() => setShowImport(true)}>
                <Sparkles size={16} /> Smart Import
              </button>
            </div>
          </div>
          {transactions.length === 0 ? (
            <p style={{ color: 'var(--text-muted)' }}>No transactions found.</p>
          ) : (
          <div style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>
            {transactions.map(t => (
              <div key={t.id} style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '1rem', background: 'rgba(15, 23, 42, 0.4)', borderRadius: '8px' }}>
                {editingId === t.id ? (
                  <div style={{ flex: 1, display: 'flex', gap: '1rem', alignItems: 'center' }}>
                    <input type="text" className="input" value={editForm.title} onChange={e => setEditForm({ ...editForm, title: e.target.value })} style={{ flex: 1 }} />
                    <input type="number" className="input" value={editForm.amount} onChange={e => setEditForm({ ...editForm, amount: parseFloat(e.target.value) })} style={{ width: '100px' }} />
                    <input type="date" className="input" value={editForm.date} onChange={e => setEditForm({ ...editForm, date: e.target.value })} style={{ width: '130px' }} />
                    <select className="input" value={editForm.isExpense ? "expense" : "income"} onChange={e => setEditForm({ ...editForm, isExpense: e.target.value === "expense" })} style={{ width: '100px' }}>
                      <option value="expense">Expense</option>
                      <option value="income">Income</option>
                    </select>
                    <button className="btn" style={{ padding: '0.5rem', background: 'var(--success)' }} onClick={handleSaveEdit}><Check size={16} /></button>
                    <button className="btn" style={{ padding: '0.5rem', background: 'var(--surface-light)' }} onClick={() => setEditingId(null)}><X size={16} /></button>
                  </div>
                ) : (
                  <>
                    <div style={{ flex: 1 }}>
                      <div style={{ fontWeight: 600 }}>{t.title}</div>
                      <div style={{ fontSize: '0.85rem', color: 'var(--text-muted)' }}>{new Date(t.date).toLocaleDateString()}</div>
                      {t.sourceUrl && (
                        <a href={t.sourceUrl} target="_blank" rel="noreferrer" style={{ fontSize: '0.8rem', color: 'var(--accent)', textDecoration: 'none', display: 'inline-block', marginTop: '0.25rem' }}>
                          View Receipt
                        </a>
                      )}
                    </div>
                    <div style={{ textAlign: 'right', display: 'flex', flexDirection: 'column', alignItems: 'flex-end', gap: '0.5rem' }}>
                      <div style={{ fontWeight: 700, color: t.isExpense ? 'var(--danger)' : 'var(--success)' }}>
                        {t.isExpense ? '-' : '+'}₹{t.amount.toFixed(2)}
                      </div>
                      <div style={{ display: 'flex', gap: '0.5rem' }}>
                        <button onClick={() => handleEditClick(t)} style={{ background: 'transparent', border: 'none', color: 'var(--text-muted)', cursor: 'pointer' }}><Edit2 size={16} /></button>
                        <button onClick={() => handleDelete(t.id)} style={{ background: 'transparent', border: 'none', color: 'var(--danger)', cursor: 'pointer' }}><Trash2 size={16} /></button>
                      </div>
                    </div>
                  </>
                )}
              </div>
            ))}
          </div>
        )}
      </div>

      <div>
        <TransactionForm onTransactionAdded={loadTransactions} />
      </div>
    </div>
    </>
  );
};

export default TransactionsPage;
