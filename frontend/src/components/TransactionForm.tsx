import React, { useState } from 'react';
import { addTransaction } from '../api';

interface TransactionFormProps {
  onTransactionAdded: () => void;
}

const TransactionForm: React.FC<TransactionFormProps> = ({ onTransactionAdded }) => {
  const [title, setTitle] = useState('');
  const [amount, setAmount] = useState('');
  const [isExpense, setIsExpense] = useState(true);
  const [loading, setLoading] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!title || !amount) return;

    try {
      setLoading(true);
      await addTransaction({
        title,
        amount: parseFloat(amount),
        isExpense,
      });
      setTitle('');
      setAmount('');
      onTransactionAdded();
    } catch (error) {
      console.error('Failed to add transaction', error);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="glass-panel">
      <h2 className="mb-4">Add Transaction</h2>
      <form onSubmit={handleSubmit}>
        <div className="form-group">
          <label>Title</label>
          <input 
            type="text" 
            className="form-control" 
            value={title}
            onChange={(e) => setTitle(e.target.value)}
            placeholder="e.g. Coffee"
            required
          />
        </div>
        <div className="form-group">
          <label>Amount</label>
          <input 
            type="number" 
            step="0.01"
            className="form-control" 
            value={amount}
            onChange={(e) => setAmount(e.target.value)}
            placeholder="0.00"
            required
          />
        </div>
        <div className="form-group flex gap-4" style={{ flexDirection: 'row', alignItems: 'center' }}>
          <label className="flex gap-4" style={{ alignItems: 'center', cursor: 'pointer' }}>
            <input 
              type="radio" 
              name="type" 
              checked={isExpense} 
              onChange={() => setIsExpense(true)} 
            />
            Expense
          </label>
          <label className="flex gap-4" style={{ alignItems: 'center', cursor: 'pointer' }}>
            <input 
              type="radio" 
              name="type" 
              checked={!isExpense} 
              onChange={() => setIsExpense(false)} 
            />
            Income
          </label>
        </div>
        <button type="submit" className="btn" style={{ width: '100%', marginTop: '1rem' }} disabled={loading}>
          {loading ? 'Adding...' : 'Add Transaction'}
        </button>
      </form>
    </div>
  );
};

export default TransactionForm;
