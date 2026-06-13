import React, { useEffect, useState } from 'react';
import { getForecast, ForecastResponse } from '../api';
import { XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, Area, AreaChart } from 'recharts';
import { Wallet, TrendingDown, ShieldCheck } from 'lucide-react';
import TransactionForm from './TransactionForm';
import IosWidget from './IosWidget';

const Dashboard: React.FC = () => {
  const [data, setData] = useState<ForecastResponse | null>(null);
  const [loading, setLoading] = useState(true);

  const loadData = async () => {
    try {
      setLoading(true);
      const result = await getForecast();
      setData(result);
    } catch (error) {
      console.error('Failed to load forecast', error);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadData();
  }, []);

  if (loading && !data) {
    return <div style={{ textAlign: 'center', padding: '5rem' }}>Loading forecast...</div>;
  }

  const chartData = data?.forecast.map(day => {
    const date = new Date(day.date);
    return {
      name: `${date.getDate()}/${date.getMonth() + 1}`,
      Balance: day.balance,
      billsCount: day.billsDue.length,
      billsDetails: day.billsDue.map(b => `${b.title} (₹${b.amount})`).join(', ')
    };
  }) || [];

  const lowestBalance = Math.min(...chartData.map(d => d.Balance));
  const safeToSpend = Math.max(0, lowestBalance - 100); // Buffer of ₹100

  const CustomTooltip = ({ active, payload, label }: any) => {
    if (active && payload && payload.length) {
      const data = payload[0].payload;
      return (
        <div className="glass-panel" style={{ padding: '1rem' }}>
          <p style={{ fontWeight: 'bold', marginBottom: '0.5rem' }}>{label}</p>
          <p style={{ color: 'var(--accent)' }}>Balance: ₹{data.Balance.toFixed(2)}</p>
          {data.billsCount > 0 && (
            <p style={{ fontSize: '0.8rem', color: 'var(--danger)', marginTop: '0.5rem' }}>
              Bills Due: {data.billsDetails}
            </p>
          )}
        </div>
      );
    }
    return null;
  };

  return (
    <>
      <div className="grid grid-cols-3" style={{ gap: '1.5rem', marginBottom: '2rem' }}>
        <IosWidget 
          title="Current Balance"
          value={`₹${data?.currentBalance.toFixed(2) || '0.00'}`}
          icon={<Wallet size={24} />}
          color="blue"
          subtitle="Available Cash"
        />
        <IosWidget 
          title="14-Day Lowest"
          value={`₹${lowestBalance.toFixed(2)}`}
          icon={<TrendingDown size={24} />}
          color={lowestBalance < 0 ? 'red' : 'dark'}
          subtitle={lowestBalance < 0 ? 'Warning: Negative Balance' : 'Forecasted Minimum'}
        />
        <IosWidget 
          title="Safe to Spend"
          value={`₹${safeToSpend.toFixed(2)}`}
          icon={<ShieldCheck size={24} />}
          color="green"
          subtitle="After upcoming bills"
        />
      </div>

      <div className="grid" style={{ gridTemplateColumns: '1fr 350px', gap: '1.5rem', marginTop: '1.5rem' }}>
        <div className="glass-panel">
          <h2 className="mb-4">14-Day Cash-Flow Timeline ⭐</h2>
          <div className="chart-container">
            <ResponsiveContainer width="100%" height="100%">
              <AreaChart data={chartData} margin={{ top: 10, right: 30, left: 0, bottom: 0 }}>
                <defs>
                  <linearGradient id="colorBalance" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="5%" stopColor="var(--accent)" stopOpacity={0.8}/>
                    <stop offset="95%" stopColor="var(--accent)" stopOpacity={0}/>
                  </linearGradient>
                </defs>
                <XAxis dataKey="name" stroke="var(--text-muted)" />
                <YAxis stroke="var(--text-muted)" />
                <CartesianGrid strokeDasharray="3 3" stroke="var(--glass-border)" vertical={false} />
                <Tooltip content={<CustomTooltip />} />
                <Area type="monotone" dataKey="Balance" stroke="var(--accent)" strokeWidth={3} fillOpacity={1} fill="url(#colorBalance)" />
              </AreaChart>
            </ResponsiveContainer>
          </div>
        </div>

        <div>
          <TransactionForm onTransactionAdded={loadData} />
        </div>
      </div>
    </>
  );
};

export default Dashboard;
