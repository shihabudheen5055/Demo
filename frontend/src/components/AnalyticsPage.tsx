import React, { useEffect, useState } from 'react';
import { getAnalytics, getCategoryAnalytics } from '../api';
import { AreaChart, Area, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, Legend, PieChart, Pie, Cell } from 'recharts';

const COLORS = ['#ef4444', '#f97316', '#f59e0b', '#eab308', '#84cc16', '#22c55e', '#06b6d4', '#3b82f6'];

const AnalyticsPage: React.FC = () => {
  const [data, setData] = useState<any[]>([]);
  const [pieData, setPieData] = useState<any[]>([]);
  const [period, setPeriod] = useState<'daily' | 'monthly' | 'yearly'>('monthly');
  const [loading, setLoading] = useState(true);

  const loadData = async () => {
    try {
      setLoading(true);
      const [analyticsResult, categoryResult] = await Promise.all([
        getAnalytics(period),
        getCategoryAnalytics()
      ]);
      setData(analyticsResult);
      setPieData(categoryResult);
    } catch (error) {
      console.error('Failed to load analytics', error);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadData();
  }, [period]);

  const CustomTooltip = ({ active, payload, label }: any) => {
    if (active && payload && payload.length) {
      return (
        <div className="glass-panel" style={{ padding: '1rem' }}>
          <p style={{ fontWeight: 'bold', marginBottom: '0.5rem' }}>{label}</p>
          <p style={{ color: 'var(--success)' }}>Income: ₹{payload[0]?.value?.toFixed(2)}</p>
          <p style={{ color: 'var(--danger)' }}>Expense: ₹{payload[1]?.value?.toFixed(2)}</p>
        </div>
      );
    }
    return null;
  };

  const PieTooltip = ({ active, payload }: any) => {
    if (active && payload && payload.length) {
      return (
        <div className="glass-panel" style={{ padding: '1rem' }}>
          <p style={{ fontWeight: 'bold' }}>{payload[0].name}</p>
          <p style={{ color: payload[0].payload.fill }}>₹{payload[0].value.toFixed(2)}</p>
        </div>
      );
    }
    return null;
  };

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '2rem' }}>
      
      {/* Top Section: Continuous Graph */}
      <div className="glass-panel">
        <div className="flex" style={{ justifyContent: 'space-between', alignItems: 'center', marginBottom: '2rem' }}>
          <h2>Historical Cash Flow</h2>
          <div className="flex gap-4">
            <button 
              className={`btn ${period === 'daily' ? 'active' : ''}`} 
              style={{ background: period === 'daily' ? 'var(--accent)' : 'transparent', border: '1px solid var(--accent)' }}
              onClick={() => setPeriod('daily')}
            >
              Daily
            </button>
            <button 
              className={`btn ${period === 'monthly' ? 'active' : ''}`} 
              style={{ background: period === 'monthly' ? 'var(--accent)' : 'transparent', border: '1px solid var(--accent)' }}
              onClick={() => setPeriod('monthly')}
            >
              Monthly
            </button>
            <button 
              className={`btn ${period === 'yearly' ? 'active' : ''}`} 
              style={{ background: period === 'yearly' ? 'var(--accent)' : 'transparent', border: '1px solid var(--accent)' }}
              onClick={() => setPeriod('yearly')}
            >
              Yearly
            </button>
          </div>
        </div>

        {loading ? (
          <div style={{ textAlign: 'center', padding: '5rem' }}>Loading chart...</div>
        ) : data.length === 0 ? (
          <div style={{ textAlign: 'center', padding: '5rem', color: 'var(--text-muted)' }}>No data available for this period.</div>
        ) : (
          <div className="chart-container" style={{ height: '350px' }}>
            <ResponsiveContainer width="100%" height="100%">
              <AreaChart data={data} margin={{ top: 20, right: 30, left: 20, bottom: 5 }}>
                <defs>
                  <linearGradient id="colorIncome" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="5%" stopColor="var(--success)" stopOpacity={0.8}/>
                    <stop offset="95%" stopColor="var(--success)" stopOpacity={0}/>
                  </linearGradient>
                  <linearGradient id="colorExpense" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="5%" stopColor="var(--danger)" stopOpacity={0.8}/>
                    <stop offset="95%" stopColor="var(--danger)" stopOpacity={0}/>
                  </linearGradient>
                </defs>
                <CartesianGrid strokeDasharray="3 3" stroke="var(--glass-border)" vertical={false} />
                <XAxis dataKey="label" stroke="var(--text-muted)" />
                <YAxis stroke="var(--text-muted)" />
                <Tooltip content={<CustomTooltip />} />
                <Legend wrapperStyle={{ paddingTop: '20px' }} />
                <Area type="monotone" dataKey="income" name="Income" stroke="var(--success)" fillOpacity={1} fill="url(#colorIncome)" strokeWidth={2} />
                <Area type="monotone" dataKey="expense" name="Expense" stroke="var(--danger)" fillOpacity={1} fill="url(#colorExpense)" strokeWidth={2} />
              </AreaChart>
            </ResponsiveContainer>
          </div>
        )}
      </div>

      {/* Bottom Section: Pie Chart & Stats */}
      <div className="grid" style={{ gridTemplateColumns: '1fr 1fr', gap: '2rem' }}>
        <div className="glass-panel">
          <h2 className="mb-4">Expense Breakdown</h2>
          <div style={{ height: '300px' }}>
            <ResponsiveContainer width="100%" height="100%">
              <PieChart>
                <Pie
                  data={pieData}
                  cx="50%"
                  cy="50%"
                  innerRadius={60}
                  outerRadius={100}
                  paddingAngle={5}
                  dataKey="value"
                >
                  {pieData.map((entry, index) => (
                    <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
                  ))}
                </Pie>
                <Tooltip content={<PieTooltip />} />
                <Legend layout="vertical" verticalAlign="middle" align="right" />
              </PieChart>
            </ResponsiveContainer>
          </div>
        </div>

        <div className="glass-panel" style={{ display: 'flex', flexDirection: 'column', justifyContent: 'center' }}>
          <h2 className="mb-4" style={{ textAlign: 'center' }}>Total Spending</h2>
          <div style={{ fontSize: '3rem', fontWeight: 700, color: 'var(--danger)', textAlign: 'center', marginBottom: '1rem' }}>
            ₹{pieData.reduce((acc, curr) => acc + curr.value, 0).toFixed(2)}
          </div>
          <p style={{ textAlign: 'center', color: 'var(--text-muted)' }}>Across {pieData.length} active categories over the lifespan of your account.</p>
        </div>
      </div>

    </div>
  );
};

export default AnalyticsPage;
