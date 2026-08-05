import React, { useState, useEffect } from 'react';
import { Line, Doughnut } from 'react-chartjs-2';
import { DollarSign, ShieldAlert, Truck, Timer, TrendingUp, AlertTriangle, Zap, CheckCircle2 } from 'lucide-react';
import {
  Chart as ChartJS,
  CategoryScale,
  LinearScale,
  PointElement,
  LineElement,
  ArcElement,
  Title,
  Tooltip,
  Legend,
  Filler
} from 'chart.js';

ChartJS.register(
  CategoryScale,
  LinearScale,
  PointElement,
  LineElement,
  ArcElement,
  Title,
  Tooltip,
  Legend,
  Filler
);

const API_BASE = import.meta.env.VITE_API_BASE || 'http://localhost:5000/api';

export default function OverviewTab({ liveAlerts = [], kpiDelta = {}, isConnected = false }) {
  const [kpis, setKpis] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  useEffect(() => {
    fetch(`${API_BASE}/kpis`)
      .then(res => {
        if (!res.ok) throw new Error('Failed to load KPIs');
        return res.json();
      })
      .then(data => {
        setKpis(data);
        setLoading(false);
      })
      .catch(err => {
        console.error(err);
        setError(err.message);
        setLoading(false);
      });
  }, []);

  if (loading) {
    return (
      <div style={{ display: 'flex', justifyContent: 'center', alignItems: 'center', height: '60vh' }}>
        <div className="spinner"></div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="glass-panel fade-in-up" style={{ padding: '24px', borderLeft: '4px solid var(--color-rose)', margin: '20px 0' }}>
        <div style={{ display: 'flex', gap: '12px', alignItems: 'center' }}>
          <AlertTriangle color="var(--color-rose)" size={24} />
          <div>
            <h4 style={{ fontWeight: 600 }}>Error loading KPI dashboard</h4>
            <p style={{ color: 'var(--text-secondary)', fontSize: '13px', marginTop: '4px' }}>
              Ensure your backend Express server is running and the database ingestion script has been run.
            </p>
          </div>
        </div>
      </div>
    );
  }

  const formatCurrency = (val) =>
    new Intl.NumberFormat('en-US', { style: 'currency', currency: 'USD', maximumFractionDigits: 0 }).format(val);

  // Merge base KPIs with live deltas from socket
  const liveTotalSales = kpis.totalSales + (kpiDelta.additionalSales || 0);
  const liveTotalProfit = kpis.totalProfit + (kpiDelta.additionalProfit || 0);
  const liveTotalOrders = kpis.orderCount + (kpiDelta.additionalOrders || 0);
  const liveLateOrders = (kpis.lateDeliveryRate / 100 * kpis.orderCount) + (kpiDelta.additionalLateOrders || 0);
  const liveLateRate = liveTotalOrders > 0
    ? parseFloat(((liveLateOrders / liveTotalOrders) * 100).toFixed(2))
    : kpis.lateDeliveryRate;

  // Donut Chart Data
  const donutData = {
    labels: ['Apparel & Shoes', 'Electronics & Tech', 'Sports & Outdoors', 'Fitness & Health', 'Toys & Goods'],
    datasets: [{
      data: [
        kpis.stockStatusCount.healthy * 0.4,
        kpis.stockStatusCount.lowStock * 0.35,
        kpis.stockStatusCount.healthy * 0.3,
        kpis.stockStatusCount.overstocked * 0.5,
        kpis.stockStatusCount.healthy * 0.15
      ].map(v => Math.round(v + 10)),
      backgroundColor: [
        'rgba(0, 242, 254, 0.75)',
        'rgba(79, 172, 254, 0.75)',
        'rgba(139, 92, 246, 0.75)',
        'rgba(16, 185, 129, 0.75)',
        'rgba(245, 158, 11, 0.75)'
      ],
      borderColor: 'rgba(9, 12, 26, 1)',
      borderWidth: 2,
      hoverOffset: 8
    }]
  };

  const donutOptions = {
    plugins: {
      legend: {
        position: 'right',
        labels: { color: '#94a3b8', font: { family: 'Plus Jakarta Sans', size: 11 } }
      }
    },
    cutout: '70%',
    maintainAspectRatio: false
  };

  const lineData = {
    labels: ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'],
    datasets: [
      {
        label: 'Historical Sales ($)',
        data: [180000, 192000, 175000, 210000, 230000, 220000, 245000, 235000, 260000, 280000, 0, 0],
        borderColor: 'rgba(0, 242, 254, 1)',
        backgroundColor: 'rgba(0, 242, 254, 0.05)',
        tension: 0.4,
        fill: true,
        pointBackgroundColor: 'rgba(0, 242, 254, 1)',
        pointHoverRadius: 6
      },
      {
        label: 'AI Predictive Forecast ($)',
        data: [0, 0, 0, 0, 0, 0, 0, 0, 0, 280000, 310000, 345000],
        borderColor: 'rgba(139, 92, 246, 1)',
        borderDash: [5, 5],
        backgroundColor: 'rgba(139, 92, 246, 0.05)',
        tension: 0.4,
        fill: false,
        pointBackgroundColor: 'rgba(139, 92, 246, 1)'
      }
    ]
  };

  const lineOptions = {
    responsive: true,
    maintainAspectRatio: false,
    plugins: {
      legend: { labels: { color: '#94a3b8', font: { family: 'Plus Jakarta Sans' } } }
    },
    scales: {
      x: { grid: { color: 'rgba(255, 255, 255, 0.03)' }, ticks: { color: '#94a3b8' } },
      y: { grid: { color: 'rgba(255, 255, 255, 0.03)' }, ticks: { color: '#94a3b8', callback: v => '$' + (v / 1000) + 'k' } }
    }
  };

  const getSeverityColor = (severity) => {
    switch (severity) {
      case 'critical': return 'var(--color-rose)';
      case 'warning': return 'var(--color-amber)';
      default: return 'var(--color-cyan)';
    }
  };

  const getSeverityBg = (severity) => {
    switch (severity) {
      case 'critical': return 'rgba(244, 63, 94, 0.07)';
      case 'warning': return 'rgba(245, 158, 11, 0.07)';
      default: return 'rgba(0, 242, 254, 0.05)';
    }
  };

  const formatTime = (iso) => {
    const d = new Date(iso);
    return d.toLocaleTimeString('en-IN', { hour: '2-digit', minute: '2-digit', second: '2-digit' });
  };

  return (
    <div className="fade-in-up">
      <div className="page-header">
        <div>
          <h2 className="page-title">Supply Chain Overview</h2>
          <p className="page-subtitle">Real-time diagnostic insights and predictive analytics indicators.</p>
        </div>
        {/* Live status badge */}
        <div style={{ display: 'flex', alignItems: 'center', gap: '8px', background: isConnected ? 'rgba(16,185,129,0.08)' : 'rgba(244,63,94,0.08)', border: `1px solid ${isConnected ? 'rgba(16,185,129,0.25)' : 'rgba(244,63,94,0.25)'}`, padding: '6px 14px', borderRadius: '20px' }}>
          <div style={{ width: 7, height: 7, borderRadius: '50%', background: isConnected ? 'var(--color-emerald)' : 'var(--color-rose)', boxShadow: isConnected ? '0 0 8px var(--color-emerald)' : 'none' }} />
          <span style={{ fontSize: '12px', fontWeight: 600, color: isConnected ? 'var(--color-emerald)' : 'var(--color-rose)' }}>
            {isConnected ? 'LIVE' : 'OFFLINE'}
          </span>
          {kpiDelta.additionalOrders > 0 && (
            <span style={{ fontSize: '11px', color: 'var(--text-secondary)' }}>
              +{kpiDelta.additionalOrders} orders
            </span>
          )}
        </div>
      </div>

      {/* KPI Cards Grid */}
      <div className="dashboard-grid">
        <div className="glass-panel kpi-card">
          <div className="kpi-icon-container" style={{ color: 'var(--color-cyan)' }}>
            <DollarSign size={24} />
          </div>
          <div className="kpi-info">
            <h3>Total Sales</h3>
            <div className="kpi-value" style={{ transition: 'all 0.4s ease' }}>{formatCurrency(liveTotalSales)}</div>
            {kpiDelta.additionalSales > 0 && (
              <div style={{ fontSize: '11px', color: 'var(--color-emerald)', marginTop: '2px' }}>
                +{formatCurrency(kpiDelta.additionalSales)} live
              </div>
            )}
          </div>
        </div>

        <div className="glass-panel kpi-card">
          <div className="kpi-icon-container" style={{ color: 'var(--color-emerald)' }}>
            <TrendingUp size={24} />
          </div>
          <div className="kpi-info">
            <h3>Gross Profit</h3>
            <div className="kpi-value" style={{ transition: 'all 0.4s ease' }}>{formatCurrency(liveTotalProfit)}</div>
            {kpiDelta.additionalProfit > 0 && (
              <div style={{ fontSize: '11px', color: 'var(--color-emerald)', marginTop: '2px' }}>
                +{formatCurrency(kpiDelta.additionalProfit)} live
              </div>
            )}
          </div>
        </div>

        <div className="glass-panel kpi-card">
          <div className="kpi-icon-container" style={{ color: 'var(--color-rose)' }}>
            <Truck size={24} />
          </div>
          <div className="kpi-info">
            <h3>Late Delivery Rate</h3>
            <div className="kpi-value" style={{ color: liveLateRate > 40 ? 'var(--color-rose)' : 'inherit', transition: 'all 0.4s ease' }}>
              {liveLateRate}%
            </div>
          </div>
        </div>

        <div className="glass-panel kpi-card">
          <div className="kpi-icon-container" style={{ color: 'var(--color-amber)' }}>
            <Timer size={24} />
          </div>
          <div className="kpi-info">
            <h3>Average Lead Time</h3>
            <div className="kpi-value">{kpis.averageLeadTime} Days</div>
          </div>
        </div>
      </div>

      {/* Charts */}
      <div className="charts-grid">
        <div className="glass-panel chart-container">
          <div className="chart-title">
            <span>Demand Timeline & AI Predictive Horizon</span>
            <span style={{ fontSize: '11px', color: 'var(--color-cyan)', background: 'rgba(0,242,254,0.1)', padding: '2px 8px', borderRadius: '4px' }}>
              Triple-Exponential Decomposition
            </span>
          </div>
          <div style={{ height: '300px' }}>
            <Line data={lineData} options={lineOptions} />
          </div>
        </div>

        <div className="glass-panel chart-container">
          <div className="chart-title">Inventory Categories</div>
          <div style={{ height: '240px', position: 'relative' }}>
            <Doughnut data={donutData} options={donutOptions} />
          </div>
          <div style={{ display: 'flex', justifyContent: 'space-around', fontSize: '12px', color: 'var(--text-secondary)', marginTop: '20px', borderTop: '1px solid var(--border-color)', paddingTop: '12px' }}>
            <div><span style={{ color: 'var(--color-rose)', fontWeight: 600 }}>{kpis.stockStatusCount.outOfStock}</span> Out of Stock</div>
            <div><span style={{ color: 'var(--color-amber)', fontWeight: 600 }}>{kpis.stockStatusCount.lowStock}</span> Low Stock</div>
            <div><span style={{ color: 'var(--color-emerald)', fontWeight: 600 }}>{kpis.stockStatusCount.healthy}</span> Healthy</div>
          </div>
        </div>
      </div>

      {/* Live Alerts Feed */}
      <div className="glass-panel" style={{ padding: '24px' }}>
        <h3 style={{ fontSize: '16px', fontWeight: 600, marginBottom: '16px', display: 'flex', alignItems: 'center', gap: '8px' }}>
          <Zap color="var(--color-amber)" size={18} />
          Live Operations Alert Feed
          {isConnected && (
            <span style={{ fontSize: '11px', background: 'rgba(16,185,129,0.1)', color: 'var(--color-emerald)', padding: '2px 8px', borderRadius: '10px', marginLeft: '4px' }}>
              ● LIVE
            </span>
          )}
          <span style={{ fontSize: '12px', color: 'var(--text-muted)', marginLeft: 'auto' }}>
            {liveAlerts.length} events
          </span>
        </h3>

        <div style={{ display: 'flex', flexDirection: 'column', gap: '10px', maxHeight: '320px', overflowY: 'auto', paddingRight: '4px' }}>
          {liveAlerts.length === 0 && (
            <div style={{ background: 'rgba(16, 185, 129, 0.05)', border: '1px solid rgba(16, 185, 129, 0.15)', borderRadius: '10px', padding: '12px 16px', display: 'flex', gap: '12px', alignItems: 'center' }}>
              <CheckCircle2 size={18} color="var(--color-emerald)" />
              <div style={{ fontSize: '13px', color: 'var(--text-secondary)' }}>
                Waiting for live events from the simulation engine...
              </div>
            </div>
          )}
          {liveAlerts.map((alert) => (
            <div
              key={alert.id}
              className="fade-in-up"
              style={{
                background: getSeverityBg(alert.severity),
                border: `1px solid ${getSeverityColor(alert.severity)}33`,
                borderLeft: `4px solid ${getSeverityColor(alert.severity)}`,
                borderRadius: '10px',
                padding: '10px 14px',
                display: 'flex',
                gap: '10px',
                alignItems: 'flex-start'
              }}
            >
              <AlertTriangle color={getSeverityColor(alert.severity)} size={15} style={{ marginTop: '2px', flexShrink: 0 }} />
              <div style={{ flexGrow: 1, fontSize: '12px', lineHeight: '1.5' }}>
                {alert.message}
              </div>
              <span style={{ fontSize: '10px', color: 'var(--text-muted)', flexShrink: 0, marginTop: '2px' }}>
                {formatTime(alert.timestamp)}
              </span>
            </div>
          ))}

          {/* Static system health message at the bottom */}
          {kpis.stockStatusCount.outOfStock > 0 && (
            <div style={{ background: 'rgba(244, 63, 94, 0.05)', border: '1px solid rgba(244, 63, 94, 0.15)', borderRadius: '10px', padding: '12px 16px', display: 'flex', gap: '12px', alignItems: 'center' }}>
              <AlertTriangle color="var(--color-rose)" size={18} />
              <div style={{ fontSize: '13px' }}>
                <strong style={{ color: 'var(--color-rose)' }}>Critical: </strong>
                {kpis.stockStatusCount.outOfStock} items are completely out of stock. Immediate replenishment needed.
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
