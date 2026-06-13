import React from 'react';
import TelegramSettings from './TelegramSettings';

const SettingsPage: React.FC = () => {
  return (
    <div>
      <h1 className="page-title">Settings</h1>
      
      <div style={{ display: 'grid', gridTemplateColumns: '1fr', gap: '2rem', maxWidth: '800px' }}>
        <TelegramSettings />
      </div>
    </div>
  );
};

export default SettingsPage;
