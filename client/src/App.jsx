import React, { useState } from 'react';
import { LayoutDashboard, Package, TrendingUp, Truck, Sparkles } from 'lucide-react';
import { useSocket } from './hooks/useSocket';
import OverviewTab from './components/OverviewTab';
import InventoryTab from './components/InventoryTab';
import DemandTab from './components/DemandTab';
import LogisticsTab from './components/LogisticsTab';
import ChatbotTab from './components/ChatbotTab';

export default function App() {
  const [activeTab, setActiveTab] = useState('overview');

  // Global real-time socket connection — feeds live data to all tabs
  const { isConnected, liveAlerts, liveOrders, stockUpdates, kpiDelta } = useSocket();

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
    <div className="app-container">
      {/* Sidebar Navigation */}
      <aside className="sidebar">
        <div className="logo-container">
          <div className="logo-icon">S</div>
          <h1 className="logo-text">SupplySense</h1>
        </div>

        <nav>
          <ul className="nav-links">
            <li
              className={`nav-item ${activeTab === 'overview' ? 'active' : ''}`}
              onClick={() => setActiveTab('overview')}
            >
              <LayoutDashboard size={18} />
              <span>Overview</span>
            </li>
            <li
              className={`nav-item ${activeTab === 'inventory' ? 'active' : ''}`}
              onClick={() => setActiveTab('inventory')}
            >
              <Package size={18} />
              <span>Inventory Optimization</span>
            </li>
            <li
              className={`nav-item ${activeTab === 'demand' ? 'active' : ''}`}
              onClick={() => setActiveTab('demand')}
            >
              <TrendingUp size={18} />
              <span>Demand Prediction</span>
            </li>
            <li
              className={`nav-item ${activeTab === 'logistics' ? 'active' : ''}`}
              onClick={() => setActiveTab('logistics')}
            >
              <Truck size={18} />
              <span>Logistics & Suppliers</span>
            </li>
            <li
              className={`nav-item ${activeTab === 'chatbot' ? 'active' : ''}`}
              onClick={() => setActiveTab('chatbot')}
            >
              <Sparkles size={18} />
              <span>SupplyAI Assistant</span>
            </li>
          </ul>
        </nav>

        <footer className="sidebar-footer">
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
