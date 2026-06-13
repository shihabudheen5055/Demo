import React from 'react';
import { BrowserRouter as Router, Routes, Route, Navigate } from 'react-router-dom';
import Dashboard from './components/Dashboard';
import Login from './components/Login';
import Layout from './components/Layout';
import TransactionsPage from './components/TransactionsPage';
import AnalyticsPage from './components/AnalyticsPage';
import InsightsPage from './components/InsightsPage';
import RecurringBillsPage from './components/RecurringBillsPage';
import SettingsPage from './components/SettingsPage';

const PrivateRoute = ({ children }: { children: JSX.Element }) => {
  const token = localStorage.getItem('token');
  return token ? children : <Navigate to="/login" />;
};

function App() {
  return (
    <Router>
      <div className="App">
        <Routes>
          <Route path="/login" element={<Login />} />
          
          <Route 
            path="/" 
            element={
              <PrivateRoute>
                <Layout>
                  <Dashboard />
                </Layout>
              </PrivateRoute>
            } 
          />
          
          <Route 
            path="/transactions" 
            element={
              <PrivateRoute>
                <Layout>
                  <TransactionsPage />
                </Layout>
              </PrivateRoute>
            } 
          />
          <Route 
            path="/analytics" 
            element={
              <PrivateRoute>
                <Layout>
                  <AnalyticsPage />
                </Layout>
              </PrivateRoute>
            } 
          />
          <Route 
            path="/insights" 
            element={
              <PrivateRoute>
                <Layout>
                  <InsightsPage />
                </Layout>
              </PrivateRoute>
            } 
          />
          <Route 
            path="/recurring-bills" 
            element={
              <PrivateRoute>
                <Layout>
                  <RecurringBillsPage />
                </Layout>
              </PrivateRoute>
            } 
          />
          <Route 
            path="/settings" 
            element={
              <PrivateRoute>
                <Layout>
                  <SettingsPage />
                </Layout>
              </PrivateRoute>
            } 
          />
        </Routes>
      </div>
    </Router>
  );
}

export default App;
