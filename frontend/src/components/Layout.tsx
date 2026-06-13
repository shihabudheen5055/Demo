import React from 'react';
import { LayoutDashboard, Receipt, Settings, LogOut, BarChart2, Lightbulb, CalendarClock } from 'lucide-react';
import { Link, useLocation } from 'react-router-dom';

const Layout: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const location = useLocation();

  const handleLogout = () => {
    localStorage.removeItem('token');
    window.location.href = '/login';
  };

  return (
    <div className="flex" style={{ minHeight: '100vh', padding: '0 2rem' }}>
      {/* Sidebar Menu */}
      <aside className="glass-panel" style={{ width: '260px', margin: '2rem 0', display: 'flex', flexDirection: 'column', padding: '2.5rem 1.5rem', position: 'sticky', top: '2rem', height: 'calc(100vh - 4rem)' }}>
        <h1 style={{ fontSize: '2.2rem', fontWeight: 700, marginBottom: '3rem', background: '-webkit-linear-gradient(45deg, var(--accent), #818cf8)', WebkitBackgroundClip: 'text', WebkitTextFillColor: 'transparent', textAlign: 'center' }}>
          Cents
        </h1>
        
        <nav style={{ display: 'flex', flexDirection: 'column', gap: '0.5rem', flex: 1 }}>
          <Link to="/" className={`menu-item ${location.pathname === '/' ? 'active' : ''}`}>
            <LayoutDashboard size={20} /> Dashboard
          </Link>
          <Link to="/transactions" className={`menu-item ${location.pathname === '/transactions' ? 'active' : ''}`}>
            <Receipt size={20} /> Transactions
          </Link>
          <Link to="/analytics" className={`menu-item ${location.pathname === '/analytics' ? 'active' : ''}`}>
            <BarChart2 size={20} /> Analytics
          </Link>
          <Link to="/insights" className={`menu-item ${location.pathname === '/insights' ? 'active' : ''}`}>
            <Lightbulb size={20} /> Insights
          </Link>
          <Link to="/recurring-bills" className={`menu-item ${location.pathname === '/recurring-bills' ? 'active' : ''}`}>
            <CalendarClock size={20} /> Bills
          </Link>
          <Link to="/settings" className={`menu-item ${location.pathname === '/settings' ? 'active' : ''}`}>
            <Settings size={20} /> Settings
          </Link>
        </nav>

        <button onClick={handleLogout} className="menu-item logout-btn" style={{ background: 'transparent', border: 'none', textAlign: 'left', cursor: 'pointer', marginTop: 'auto', width: '100%' }}>
          <LogOut size={20} /> Logout
        </button>
      </aside>

      {/* Main Content */}
      <main className="app-container" style={{ flex: 1, paddingLeft: '2.5rem' }}>
        <header className="header" style={{ justifyContent: 'flex-end', marginTop: '1rem', marginBottom: '2rem' }}>
          <div className="glass-panel" style={{ padding: '0.5rem 1.5rem', borderRadius: '30px', fontWeight: 500 }}>
            Welcome back, User
          </div>
        </header>

        {children}
      </main>
    </div>
  );
};

export default Layout;
