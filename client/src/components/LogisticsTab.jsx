import React, { useState, useEffect } from 'react';
import { Bar } from 'react-chartjs-2';
import { ShieldCheck, Truck, MapPin, AlertCircle, AlertTriangle, Ship, Calendar, RefreshCw } from 'lucide-react';
import {
  Chart as ChartJS,
  CategoryScale,
  LinearScale,
  BarElement,
  Title,
  Tooltip,
  Legend
} from 'chart.js';

ChartJS.register(
  CategoryScale,
  LinearScale,
  BarElement,
  Title,
  Tooltip,
  Legend
);

const API_BASE = 'http://localhost:5000/api';

export default function LogisticsTab({ liveOrders = [], isConnected = false }) {
  const [logisticsData, setLogisticsData] = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetchLogistics();
  }, []);

  const fetchLogistics = () => {
    setLoading(true);
    fetch(`${API_BASE}/shipments`)
      .then(res => res.json())
      .then(data => {
        setLogisticsData(data);
        setLoading(false);
      })
      .catch(err => {
        console.error(err);
        setLoading(false);
      });
  };

  const getStatusIcon = (status) => {
    switch (status) {
      case 'Late delivery':
        return <AlertTriangle size={18} color="var(--color-rose)" />;
      case 'Shipping on time':
      case 'Advance shipping':
        return <ShieldCheck size={18} color="var(--color-emerald)" />;
      default:
        return <Truck size={18} color="var(--color-cyan)" />;
    }
  };

  const getStatusColor = (status) => {
    switch (status) {
      case 'Late delivery': return 'var(--color-rose)';
      case 'Shipping on time':
      case 'Advance shipping': return 'var(--color-emerald)';
      default: return 'var(--color-cyan)';
    }
  };

  // Supplier Scorecard Chart Setup
  let chartData = null;
  let chartOptions = null;

  if (logisticsData && logisticsData.suppliers) {
    const suppliers = logisticsData.suppliers;

    chartData = {
      labels: suppliers.map(s => s.supplierName),
      datasets: [
        {
          label: 'On-Time Rate (%)',
          data: suppliers.map(s => s.onTimeRate),
          backgroundColor: 'rgba(0, 242, 254, 0.75)',
          borderColor: 'var(--color-cyan)',
          borderWidth: 1
        },
        {
          label: 'Efficiency Rating (Max 100)',
          data: suppliers.map(s => s.efficiencyScore),
          backgroundColor: 'rgba(139, 92, 246, 0.75)',
          borderColor: 'var(--color-violet)',
          borderWidth: 1
        }
      ]
    };

    chartOptions = {
      responsive: true,
      maintainAspectRatio: false,
      plugins: {
        legend: {
          labels: { color: '#94a3b8', font: { family: 'Plus Jakarta Sans', size: 11 } }
        }
      },
      scales: {
        x: {
          grid: { color: 'rgba(255, 255, 255, 0.02)' },
          ticks: { color: '#94a3b8' }
        },
        y: {
          grid: { color: 'rgba(255, 255, 255, 0.02)' },
          ticks: { color: '#94a3b8' },
          max: 100
        }
      }
    };
  }

  if (loading) {
    return (
      <div style={{ display: 'flex', justifyContent: 'center', alignItems: 'center', height: '60vh' }}>
        <div className="spinner"></div>
      </div>
    );
  }

  return (
    <div className="fade-in-up">
      <div className="page-header">
        <div>
          <h2 className="page-title">Logistics & Supply Chains</h2>
          <p className="page-subtitle">Track active orders, shipping lead-times, and benchmark supplier metrics.</p>
        </div>
        <button onClick={fetchLogistics} className="chat-send-btn" style={{ padding: '8px 16px', display: 'flex', alignItems: 'center', gap: '8px', fontSize: '13px' }}>
          <RefreshCw size={14} /> Refresh Logs
        </button>
      </div>

      <div style={{ display: 'grid', gridTemplateColumns: '1.2fr 1fr', gap: '24px', alignItems: 'start' }}>
        {/* Left Side: Shipments List */}
        <div className="glass-panel" style={{ padding: '24px' }}>
          <h3 style={{ fontSize: '16px', fontWeight: 600, marginBottom: '20px', display: 'flex', alignItems: 'center', gap: '8px' }}>
            <Ship size={18} color="var(--color-cyan)" /> Live Shipping Ledger
            {isConnected && (
              <span style={{ fontSize: '11px', background: 'rgba(16,185,129,0.1)', color: 'var(--color-emerald)', padding: '2px 8px', borderRadius: '10px', marginLeft: '4px' }}>
                ● LIVE
              </span>
            )}
            {liveOrders.length > 0 && (
              <span style={{ fontSize: '11px', color: 'var(--text-muted)', marginLeft: 'auto' }}>
                +{liveOrders.length} live orders
              </span>
            )}
          </h3>

          <div style={{ display: 'flex', flexDirection: 'column', gap: '16px', maxHeight: '560px', overflowY: 'auto', paddingRight: '4px' }}>
            {/* Live orders from Socket.io — shown at the top with NEW badge */}
            {liveOrders.map((s) => (
              <div
                key={s.orderId}
                className="glass-panel fade-in-up"
                style={{
                  padding: '16px',
                  background: 'rgba(0, 242, 254, 0.02)',
                  borderLeft: `4px solid ${s.lateRisk ? 'var(--color-rose)' : 'var(--color-cyan)'}`
                }}
              >
                <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '10px' }}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                    <span style={{ fontSize: '10px', background: 'rgba(0,242,254,0.15)', color: 'var(--color-cyan)', padding: '2px 6px', borderRadius: '4px', fontWeight: 700, letterSpacing: '0.05em' }}>NEW</span>
                    <span style={{ fontSize: '12px', color: 'var(--text-secondary)', fontFamily: 'monospace' }}>{s.orderId}</span>
                  </div>
                  <div style={{ display: 'flex', alignItems: 'center', gap: '6px', fontSize: '12px', fontWeight: 600, color: s.lateRisk ? 'var(--color-rose)' : 'var(--color-emerald)' }}>
                    {s.lateRisk ? <AlertTriangle size={14} /> : <ShieldCheck size={14} />}
                    {s.deliveryStatus}
                  </div>
                </div>
                <h4 style={{ fontSize: '14px', fontWeight: 600, marginBottom: '6px' }}>{s.productName}</h4>
                <div style={{ display: 'flex', flexWrap: 'wrap', gap: '16px', fontSize: '12px', color: 'var(--text-secondary)' }}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: '4px' }}><MapPin size={12} /> {s.destination}</div>
                  <div>Qty: <strong style={{ color: '#fff' }}>{s.quantity}</strong></div>
                </div>
                <div style={{ display: 'flex', justifyContent: 'space-between', borderTop: '1px solid var(--border-color)', marginTop: '12px', paddingTop: '10px', fontSize: '12px' }}>
                  <div>Mode: <span style={{ color: '#fff', fontWeight: 500 }}>{s.shippingMode}</span></div>
                  <div>Scheduled: <span style={{ color: '#fff', fontWeight: 500 }}>{s.scheduledDays}d</span> | Actual: <span style={{ color: s.lateRisk ? 'var(--color-rose)' : 'var(--color-emerald)', fontWeight: 600 }}> {s.realDays}d</span></div>
                </div>
              </div>
            ))}

            {/* Static historical shipments from database */}
            {logisticsData && logisticsData.shipments.slice(0, 15).map((s) => (
              <div 
                key={s.orderItemId} 
                className="glass-panel" 
                style={{ 
                  padding: '16px', 
                  background: 'rgba(255,255,255,0.01)', 
                  borderLeft: `4px solid ${getStatusColor(s.deliveryStatus)}` 
                }}
              >
                <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '10px' }}>
                  <span style={{ fontSize: '12px', color: 'var(--text-secondary)', fontFamily: 'monospace' }}>
                    Order ID: {s.orderId}
                  </span>
                  <div style={{ display: 'flex', alignItems: 'center', gap: '6px', fontSize: '12px', fontWeight: 600, color: getStatusColor(s.deliveryStatus) }}>
                    {getStatusIcon(s.deliveryStatus)}
                    {s.deliveryStatus}
                  </div>
                </div>

                <h4 style={{ fontSize: '14px', fontWeight: 600, marginBottom: '6px' }}>{s.productName}</h4>
                
                <div style={{ display: 'flex', flexWrap: 'wrap', gap: '16px', fontSize: '12px', color: 'var(--text-secondary)' }}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: '4px' }}>
                    <MapPin size={12} /> {s.destination}
                  </div>
                  <div style={{ display: 'flex', alignItems: 'center', gap: '4px' }}>
                    <Calendar size={12} /> Ordered: {new Date(s.orderDate).toLocaleDateString()}
                  </div>
                </div>

                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', borderTop: '1px solid var(--border-color)', marginTop: '12px', paddingTop: '10px', fontSize: '12px' }}>
                  <div>
                    Mode: <span style={{ color: '#fff', fontWeight: 500 }}>{s.shippingMode}</span>
                  </div>
                  <div>
                    Scheduled: <span style={{ color: '#fff', fontWeight: 500 }}>{s.scheduledDays}d</span> | 
                    Actual: <span style={{ color: s.lateRisk ? 'var(--color-rose)' : 'var(--color-emerald)', fontWeight: 600 }}> {s.realDays}d</span>
                  </div>
                </div>
              </div>
            ))}
          </div>
        </div>

        {/* Right Side: Supplier Scorecard */}
        <div style={{ display: 'flex', flexDirection: 'column', gap: '20px' }}>
          <div className="glass-panel" style={{ padding: '24px' }}>
            <h3 style={{ fontSize: '16px', fontWeight: 600, marginBottom: '20px' }}>Carrier & Supplier Scorecard</h3>
            <div style={{ height: '240px', marginBottom: '24px' }}>
              {chartData && <Bar data={chartData} options={chartOptions} />}
            </div>

            <div style={{ borderTop: '1px solid var(--border-color)', paddingTop: '20px' }}>
              <h4 style={{ fontSize: '13px', fontWeight: 600, color: 'var(--text-secondary)', marginBottom: '12px' }}>
                Supplier Detailed Metrics
              </h4>
              <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
                {logisticsData && logisticsData.suppliers.map(sup => (
                  <div 
                    key={sup.id} 
                    style={{ 
                      display: 'flex', 
                      justifyContent: 'space-between', 
                      alignItems: 'center',
                      background: 'rgba(255,255,255,0.01)', 
                      padding: '10px 14px', 
                      borderRadius: '8px',
                      border: '1px solid var(--border-color)'
                    }}
                  >
                    <div>
                      <div style={{ fontWeight: 600, fontSize: '13px' }}>{sup.supplierName}</div>
                      <span style={{ fontSize: '11px', color: 'var(--text-secondary)' }}>Route: {sup.shippingMode}</span>
                    </div>
                    
                    <div style={{ display: 'flex', gap: '16px', fontSize: '12px', textAlign: 'right' }}>
                      <div>
                        <span style={{ display: 'block', color: 'var(--text-secondary)', fontSize: '10px' }}>Defects</span>
                        <strong style={{ color: sup.defectRate > 2 ? 'var(--color-rose)' : '#fff' }}>{sup.defectRate}%</strong>
                      </div>
                      <div>
                        <span style={{ display: 'block', color: 'var(--text-secondary)', fontSize: '10px' }}>Avg Delay</span>
                        <strong style={{ color: '#fff' }}>{sup.avgLeadTimeDays}d</strong>
                      </div>
                      <div>
                        <span style={{ display: 'block', color: 'var(--text-secondary)', fontSize: '10px' }}>Score</span>
                        <strong style={{ color: 'var(--color-cyan)', fontWeight: 700 }}>{sup.efficiencyScore}</strong>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          </div>

          <div className="glass-panel" style={{ padding: '20px', background: 'rgba(0, 242, 254, 0.02)' }}>
            <h4 style={{ fontSize: '13px', fontWeight: 600, display: 'flex', alignItems: 'center', gap: '6px', marginBottom: '8px' }}>
              <AlertCircle size={14} color="var(--color-cyan)" /> Late Delivery Risk Rule
            </h4>
            <p style={{ fontSize: '11px', color: 'var(--text-secondary)', lineHeight: '1.4' }}>
              The logistics tracking system uses historical actual vs scheduled shipping gaps to predict late deliveries. Same-day routes show higher operational efficiency but have higher default costs.
            </p>
          </div>
        </div>
      </div>
    </div>
  );
}
