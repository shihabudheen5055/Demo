import React from 'react';

interface IosWidgetProps {
  title: string;
  value: string | number;
  icon: React.ReactNode;
  subtitle?: string;
  color?: 'blue' | 'green' | 'red' | 'purple' | 'orange' | 'dark';
  size?: 'small' | 'medium';
}

const IosWidget: React.FC<IosWidgetProps> = ({ title, value, icon, subtitle, color = 'dark', size = 'small' }) => {
  const getBackground = () => {
    switch(color) {
      case 'blue': return 'linear-gradient(135deg, #4facfe 0%, #00f2fe 100%)';
      case 'green': return 'linear-gradient(135deg, #43e97b 0%, #38f9d7 100%)';
      case 'red': return 'linear-gradient(135deg, #ff0844 0%, #ffb199 100%)';
      case 'purple': return 'linear-gradient(135deg, #667eea 0%, #764ba2 100%)';
      case 'orange': return 'linear-gradient(135deg, #f83600 0%, #f9d423 100%)';
      case 'dark': default: return 'rgba(30, 30, 40, 0.6)';
    }
  };

  const isDarkBg = color === 'dark';
  const textColor = isDarkBg ? 'var(--text)' : '#fff';
  const subTextColor = isDarkBg ? 'var(--text-muted)' : 'rgba(255,255,255,0.9)';

  return (
    <div style={{
      background: getBackground(),
      backdropFilter: isDarkBg ? 'blur(20px)' : 'none',
      border: isDarkBg ? '1px solid rgba(255, 255, 255, 0.1)' : 'none',
      borderRadius: '28px',
      padding: '20px',
      display: 'flex',
      flexDirection: 'column',
      justifyContent: 'space-between',
      aspectRatio: size === 'small' ? '1 / 1' : 'auto',
      boxShadow: '0 10px 30px rgba(0,0,0,0.2), inset 0 1px 0 rgba(255,255,255,0.2)',
      color: textColor,
      transition: 'transform 0.2s cubic-bezier(0.175, 0.885, 0.32, 1.275)',
      cursor: 'pointer',
      height: '100%',
    }}
    onMouseEnter={(e) => e.currentTarget.style.transform = 'scale(1.03)'}
    onMouseLeave={(e) => e.currentTarget.style.transform = 'scale(1)'}
    >
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
        <div style={{
          background: isDarkBg ? 'rgba(255,255,255,0.08)' : 'rgba(0,0,0,0.15)',
          padding: '12px',
          borderRadius: '50%',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          boxShadow: 'inset 0 1px 0 rgba(255,255,255,0.1)'
        }}>
          {icon}
        </div>
      </div>
      
      <div style={{ marginTop: size === 'medium' ? '1rem' : '0' }}>
        <h3 style={{ fontSize: '0.95rem', fontWeight: 600, margin: '0 0 6px 0', opacity: 0.9 }}>
          {title}
        </h3>
        <div style={{ fontSize: size === 'small' ? '1.8rem' : '2.2rem', fontWeight: 700, letterSpacing: '-0.5px', lineHeight: 1.1 }}>
          {value}
        </div>
        {subtitle && (
          <div style={{ fontSize: '0.85rem', color: subTextColor, marginTop: '6px', fontWeight: 500 }}>
            {subtitle}
          </div>
        )}
      </div>
    </div>
  );
};

export default IosWidget;
