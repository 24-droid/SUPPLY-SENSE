import React, { useState } from 'react';
import { Routes, Route, useNavigate } from 'react-router-dom';
import { LayoutDashboard, Package, TrendingUp, Truck, Sparkles, Home, Menu, X } from 'lucide-react';
import { useSocket } from './hooks/useSocket';
import OverviewTab from './components/OverviewTab';
import InventoryTab from './components/InventoryTab';
import DemandTab from './components/DemandTab';
import LogisticsTab from './components/LogisticsTab';
import ChatbotTab from './components/ChatbotTab';
import LandingPage from './components/LandingPage';

function DashboardLayout({ isConnected, liveAlerts, liveOrders, stockUpdates, kpiDelta }) {
  const [activeTab, setActiveTab] = useState('overview');
  const [isMenuOpen, setIsMenuOpen] = useState(false);
  const navigate = useNavigate();

  const handleTabChange = (tabName) => {
    setActiveTab(tabName);
    setIsMenuOpen(false); // Close menu on selection
  };

  const renderActiveTab = () => {
    switch (activeTab) {
      case 'overview':
        return <OverviewTab liveAlerts={liveAlerts} kpiDelta={kpiDelta} isConnected={isConnected} />;
      case 'inventory':
        return <InventoryTab stockUpdates={stockUpdates} />;
      case 'demand':
        return <DemandTab />;
      case 'logistics':
        return <LogisticsTab liveOrders={liveOrders} isConnected={isConnected} />;
      case 'chatbot':
        return <ChatbotTab />;
      default:
        return <OverviewTab liveAlerts={liveAlerts} kpiDelta={kpiDelta} isConnected={isConnected} />;
    }
  };

  return (
    <div className="app-container fade-in-up">
      {/* Sidebar Navigation */}
      <aside className={`sidebar ${isMenuOpen ? 'menu-open' : ''}`}>
        {/* Click logo to go back to Landing Page */}
        <div 
          className="logo-container" 
          onClick={() => navigate('/')} 
          style={{ cursor: 'pointer', transition: 'opacity 0.2s' }}
          onMouseEnter={(e) => e.currentTarget.style.opacity = 0.8}
          onMouseLeave={(e) => e.currentTarget.style.opacity = 1}
        >
          <div className="logo-icon">S</div>
          <h1 className="logo-text">SupplySense</h1>
        </div>

        {/* Mobile menu toggle */}
        <button className="mobile-nav-toggle" onClick={() => setIsMenuOpen(!isMenuOpen)}>
          {isMenuOpen ? <X size={20} /> : <Menu size={20} />}
        </button>

        <nav>
          <ul className="nav-links">
            <li
              className={`nav-item ${activeTab === 'overview' ? 'active' : ''}`}
              onClick={() => handleTabChange('overview')}
            >
              <LayoutDashboard size={18} />
              <span>Overview</span>
            </li>
            <li
              className={`nav-item ${activeTab === 'inventory' ? 'active' : ''}`}
              onClick={() => handleTabChange('inventory')}
            >
              <Package size={18} />
              <span>Inventory Optimization</span>
            </li>
            <li
              className={`nav-item ${activeTab === 'demand' ? 'active' : ''}`}
              onClick={() => handleTabChange('demand')}
            >
              <TrendingUp size={18} />
              <span>Demand Prediction</span>
            </li>
            <li
              className={`nav-item ${activeTab === 'logistics' ? 'active' : ''}`}
              onClick={() => handleTabChange('logistics')}
            >
              <Truck size={18} />
              <span>Logistics & Suppliers</span>
            </li>
            <li
              className={`nav-item ${activeTab === 'chatbot' ? 'active' : ''}`}
              onClick={() => handleTabChange('chatbot')}
            >
              <Sparkles size={18} />
              <span>SupplyAI Assistant</span>
            </li>
          </ul>
        </nav>


        <footer className="sidebar-footer">
          {/* Quick link back to landing page */}
          <div 
            onClick={() => navigate('/')}
            style={{ 
              display: 'flex', 
              alignItems: 'center', 
              gap: '6px', 
              marginBottom: '12px', 
              color: 'var(--text-secondary)',
              cursor: 'pointer'
            }}
          >
            <Home size={12} />
            <span style={{ fontSize: '11px', textDecoration: 'underline' }}>Back to Home Screen</span>
          </div>

          {/* Live connection status indicator */}
          <div style={{ display: 'flex', alignItems: 'center', gap: '6px', marginBottom: '8px' }}>
            <div style={{
              width: 7,
              height: 7,
              borderRadius: '50%',
              background: isConnected ? 'var(--color-emerald)' : 'var(--color-rose)',
              boxShadow: isConnected ? '0 0 6px var(--color-emerald)' : 'none',
              animation: isConnected ? 'pulse 2s infinite' : 'none'
            }} />
            <span style={{ fontSize: '11px', color: isConnected ? 'var(--color-emerald)' : 'var(--color-rose)' }}>
              {isConnected ? 'Live Feed Active' : 'Connecting...'}
            </span>
          </div>
          <div>SupplySense Dashboard</div>
          <div style={{ marginTop: '4px', fontSize: '10px' }}>Final Year Project v1.0</div>
        </footer>
      </aside>

      {/* Main Panel Area */}
      <main className="main-content">
        {renderActiveTab()}
      </main>

      <style>{`
        @keyframes pulse {
          0%, 100% { opacity: 1; }
          50% { opacity: 0.4; }
        }
      `}</style>
    </div>
  );
}

export default function App() {
  const navigate = useNavigate();

  // Global real-time socket connection — feeds live data to all tabs
  const { isConnected, liveAlerts, liveOrders, stockUpdates, kpiDelta } = useSocket();

  return (
    <Routes>
      <Route path="/" element={<LandingPage onLaunch={() => navigate('/dashboard')} />} />
      <Route 
        path="/dashboard" 
        element={
          <DashboardLayout 
            isConnected={isConnected} 
            liveAlerts={liveAlerts} 
            liveOrders={liveOrders} 
            stockUpdates={stockUpdates} 
            kpiDelta={kpiDelta} 
          />
        } 
      />
    </Routes>
  );
}
