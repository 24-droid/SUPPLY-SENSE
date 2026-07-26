import React, { useState, useEffect } from 'react';
import { Line } from 'react-chartjs-2';
import { Search, Sliders, RefreshCw, BarChart2, Calculator, Info, CheckCircle2, ChevronRight } from 'lucide-react';
import {
  Chart as ChartJS,
  CategoryScale,
  LinearScale,
  PointElement,
  LineElement,
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
  Title,
  Tooltip,
  Legend,
  Filler
);

const API_BASE = 'http://localhost:5000/api';

export default function InventoryTab() {
  const [products, setProducts] = useState([]);
  const [selectedProduct, setSelectedProduct] = useState(null);
  const [calcDetails, setCalcDetails] = useState(null);
  const [loading, setLoading] = useState(true);
  const [calcLoading, setCalcLoading] = useState(false);
  
  // Search & Filter States
  const [searchTerm, setSearchTerm] = useState('');
  const [selectedCategory, setSelectedCategory] = useState('All');
  const [selectedStatus, setSelectedStatus] = useState('All');

  // Slider States
  const [setupCost, setSetupCost] = useState(50);
  const [holdingCostRate, setHoldingCostRate] = useState(0.20);
  const [leadTime, setLeadTime] = useState(4);

  useEffect(() => {
    fetchProducts();
  }, []);

  const fetchProducts = () => {
    setLoading(true);
    fetch(`${API_BASE}/inventory`)
      .then(res => res.json())
      .then(data => {
        setProducts(data);
        setLoading(false);
        if (data.length > 0 && !selectedProduct) {
          handleSelectProduct(data[0]);
        }
      })
      .catch(err => {
        console.error(err);
        setLoading(false);
      });
  };

  const handleSelectProduct = (prod) => {
    setSelectedProduct(prod);
    setSetupCost(50);
    setHoldingCostRate(0.20);
    setLeadTime(prod.leadTimeDays);
    fetchCalculations(prod.productId, 50, 0.20, prod.leadTimeDays);
  };

  const fetchCalculations = (prodId, setup, holdRate, lt) => {
    setCalcLoading(true);
    fetch(`${API_BASE}/inventory/${prodId}?setupCost=${setup}&holdingCostRate=${holdRate}&leadTime=${lt}`)
      .then(res => res.json())
      .then(data => {
        setCalcDetails(data.calculations);
        setCalcLoading(false);
      })
      .catch(err => {
        console.error(err);
        setCalcLoading(false);
      });
  };

  // Triggered when sliders change
  const handleSliderChange = (type, val) => {
    let currentSetup = setupCost;
    let currentHold = holdingCostRate;
    let currentLt = leadTime;

    if (type === 'setup') {
      setSetupCost(val);
      currentSetup = val;
    } else if (type === 'holding') {
      setHoldingCostRate(val);
      currentHold = val;
    } else if (type === 'leadTime') {
      setLeadTime(val);
      currentLt = val;
    }

    if (selectedProduct) {
      fetchCalculations(selectedProduct.productId, currentSetup, currentHold, currentLt);
    }
  };

  const categories = ['All', ...new Set(products.map(p => p.category))];

  // Filtering products
  const filteredProducts = products.filter(p => {
    const matchesSearch = p.name.toLowerCase().includes(searchTerm.toLowerCase()) || 
                          p.productId.toLowerCase().includes(searchTerm.toLowerCase());
    const matchesCategory = selectedCategory === 'All' || p.category === selectedCategory;
    const matchesStatus = selectedStatus === 'All' || p.status === selectedStatus;
    return matchesSearch && matchesCategory && matchesStatus;
  });

  const getStatusBadge = (status) => {
    switch (status) {
      case 'Healthy': return <span className="badge badge-healthy">Healthy</span>;
      case 'Low Stock': return <span className="badge badge-low">Low Stock</span>;
      case 'Out of Stock': return <span className="badge badge-out">Out of Stock</span>;
      case 'Overstocked': return <span className="badge badge-overstock">Overstocked</span>;
      default: return <span className="badge">{status}</span>;
    }
  };

  // Cost Curve Plot Setup
  let chartData = null;
  let chartOptions = null;

  if (calcDetails && calcDetails.costCurve) {
    const { orderSizes, orderingCost, holdingCost, totalCost } = calcDetails.costCurve;

    chartData = {
      labels: orderSizes,
      datasets: [
        {
          label: 'Total Operations Cost ($)',
          data: totalCost,
          borderColor: 'rgba(0, 242, 254, 1)',
          borderWidth: 3,
          tension: 0.3,
          fill: false,
          pointRadius: orderSizes.map(sz => sz === calcDetails.eoq ? 6 : 0),
          pointBackgroundColor: 'rgba(0, 242, 254, 1)'
        },
        {
          label: 'Holding Cost ($)',
          data: holdingCost,
          borderColor: 'rgba(16, 185, 129, 0.65)',
          borderDash: [5, 5],
          borderWidth: 1.5,
          tension: 0.1,
          fill: false,
          pointRadius: 0
        },
        {
          label: 'Ordering Setup Cost ($)',
          data: orderingCost,
          borderColor: 'rgba(139, 92, 246, 0.65)',
          borderDash: [5, 5],
          borderWidth: 1.5,
          tension: 0.1,
          fill: false,
          pointRadius: 0
        }
      ]
    };

    chartOptions = {
      responsive: true,
      maintainAspectRatio: false,
      plugins: {
        legend: {
          labels: { color: '#94a3b8', font: { family: 'Plus Jakarta Sans', size: 11 } }
        },
        tooltip: {
          callbacks: {
            title: (items) => `Order Size: ${items[0].label} units`
          }
        }
      },
      scales: {
        x: {
          grid: { color: 'rgba(255, 255, 255, 0.02)' },
          ticks: { color: '#94a3b8' },
          title: { display: true, text: 'Order Quantity (Units)', color: '#94a3b8' }
        },
        y: {
          grid: { color: 'rgba(255, 255, 255, 0.02)' },
          ticks: { color: '#94a3b8' },
          title: { display: true, text: 'Annual Cost ($)', color: '#94a3b8' }
        }
      }
    };
  }

  return (
    <div className="fade-in-up">
      <div className="page-header">
        <div>
          <h2 className="page-title">Inventory Optimization Engine</h2>
          <p className="page-subtitle">Calculate Economic Order Quantity (EOQ), Safety Stocks, and ABC classifications.</p>
        </div>
        <button onClick={fetchProducts} className="chat-send-btn" style={{ padding: '8px 16px', display: 'flex', alignItems: 'center', gap: '8px', fontSize: '13px' }}>
          <RefreshCw size={14} /> Refresh Data
        </button>
      </div>

      <div className="responsive-split-grid">
        {/* Left Side: Product Table */}
        <div className="glass-panel table-panel">
          <div className="table-header-row">
            <h3 style={{ fontSize: '16px', fontWeight: 600 }}>SKU Directory</h3>
            <div style={{ display: 'flex', gap: '12px' }}>
              <select value={selectedCategory} onChange={(e) => setSelectedCategory(e.target.value)} style={{ padding: '6px 12px', fontSize: '12px' }}>
                {categories.map(c => <option key={c} value={c}>{c}</option>)}
              </select>
              <select value={selectedStatus} onChange={(e) => setSelectedStatus(e.target.value)} style={{ padding: '6px 12px', fontSize: '12px' }}>
                <option value="All">All Statuses</option>
                <option value="Healthy">Healthy</option>
                <option value="Low Stock">Low Stock</option>
                <option value="Out of Stock">Out of Stock</option>
                <option value="Overstocked">Overstocked</option>
              </select>
            </div>
          </div>

          <div style={{ position: 'relative', marginBottom: '16px' }}>
            <span style={{ position: 'absolute', left: '12px', top: '10px', color: 'var(--text-muted)' }}>
              <Search size={16} />
            </span>
            <input 
              type="text" 
              placeholder="Search by SKU Code or Product Name..." 
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              style={{ width: '100%', paddingLeft: '36px', height: '36px', fontSize: '13px' }}
            />
          </div>

          <div className="table-wrapper" style={{ maxHeight: '540px' }}>
            {loading ? (
              <div style={{ display: 'flex', justifyContent: 'center', padding: '40px' }}><div className="spinner"></div></div>
            ) : (
              <table>
                <thead>
                  <tr>
                    <th>SKU ID</th>
                    <th>Product</th>
                    <th>Class</th>
                    <th>Price</th>
                    <th>Status</th>
                    <th>Action</th>
                  </tr>
                </thead>
                <tbody>
                  {filteredProducts.map(p => (
                    <tr 
                      key={p.productId} 
                      onClick={() => handleSelectProduct(p)} 
                      style={{ cursor: 'pointer', background: selectedProduct?.productId === p.productId ? 'rgba(0, 242, 254, 0.05)' : 'transparent' }}
                    >
                      <td style={{ fontFamily: 'monospace', fontWeight: 600, color: 'var(--color-blue)' }}>{p.productId}</td>
                      <td>
                        <div style={{ fontWeight: 500, maxWidth: '160px', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }} title={p.name}>
                          {p.name}
                        </div>
                        <div style={{ fontSize: '11px', color: 'var(--text-secondary)' }}>{p.category}</div>
                      </td>
                      <td>
                        <span style={{ 
                          padding: '2px 6px', 
                          borderRadius: '4px', 
                          fontSize: '11px', 
                          fontWeight: 'bold',
                          background: p.abcClass === 'A' ? 'rgba(0, 242, 254, 0.15)' : p.abcClass === 'B' ? 'rgba(139, 92, 246, 0.15)' : 'rgba(255,255,255,0.05)',
                          color: p.abcClass === 'A' ? 'var(--color-cyan)' : p.abcClass === 'B' ? 'var(--color-violet)' : 'var(--text-secondary)'
                        }}>
                          {p.abcClass}
                        </span>
                      </td>
                      <td>${p.price}</td>
                      <td>{getStatusBadge(p.status)}</td>
                      <td>
                        <ChevronRight size={16} color="var(--text-secondary)" />
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            )}
          </div>
        </div>

        {/* Right Side: Interactive AI Calculator */}
        <div style={{ display: 'flex', flexDirection: 'column', gap: '20px' }}>
          {selectedProduct && (
            <div className="glass-panel" style={{ padding: '24px' }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: '20px', borderBottom: '1px solid var(--border-color)', paddingBottom: '16px' }}>
                <div>
                  <h3 style={{ fontSize: '18px', fontWeight: 700, color: 'var(--color-cyan)' }}>AI Optimization Engine</h3>
                  <span style={{ fontSize: '12px', color: 'var(--text-secondary)' }}>SKU: {selectedProduct.productId} — {selectedProduct.name}</span>
                </div>
                <div style={{ textAlign: 'right' }}>
                  <span style={{ fontSize: '11px', display: 'block', color: 'var(--text-secondary)' }}>Annual Demand</span>
                  <strong style={{ fontSize: '16px', color: '#fff', fontFamily: 'var(--font-heading)' }}>{selectedProduct.annualDemand} Units</strong>
                </div>
              </div>

              {/* Sliders Area */}
              <div style={{ background: 'rgba(255, 255, 255, 0.02)', padding: '16px', borderRadius: '12px', border: '1px solid rgba(255,255,255,0.04)', marginBottom: '20px' }}>
                <h4 style={{ fontSize: '13px', fontWeight: 600, color: 'var(--text-secondary)', marginBottom: '16px', display: 'flex', alignItems: 'center', gap: '6px' }}>
                  <Sliders size={14} color="var(--color-cyan)" /> Slider Variables
                </h4>
                
                <div className="slider-group">
                  <div className="slider-label">
                    <span>Order Setup Cost (S)</span>
                    <span className="slider-value">${setupCost}</span>
                  </div>
                  <input 
                    type="range" 
                    min="10" 
                    max="250" 
                    step="5"
                    value={setupCost} 
                    onChange={(e) => handleSliderChange('setup', parseInt(e.target.value))} 
                  />
                </div>

                <div className="slider-group">
                  <div className="slider-label">
                    <span>Annual Carrying Rate (I)</span>
                    <span className="slider-value">{Math.round(holdingCostRate * 100)}%</span>
                  </div>
                  <input 
                    type="range" 
                    min="0.05" 
                    max="0.50" 
                    step="0.01"
                    value={holdingCostRate} 
                    onChange={(e) => handleSliderChange('holding', parseFloat(e.target.value))} 
                  />
                </div>

                <div className="slider-group">
                  <div className="slider-label">
                    <span>Supplier Lead Time (L)</span>
                    <span className="slider-value">{leadTime} Days</span>
                  </div>
                  <input 
                    type="range" 
                    min="1" 
                    max="15" 
                    step="1"
                    value={leadTime} 
                    onChange={(e) => handleSliderChange('leadTime', parseInt(e.target.value))} 
                  />
                </div>
              </div>

              {/* Outputs Summary */}
              {calcDetails && (
                <div className="responsive-card-grid">
                  <div className="glass-panel" style={{ padding: '14px', background: 'rgba(0, 242, 254, 0.03)', border: '1px solid rgba(0, 242, 254, 0.12)' }}>
                    <div style={{ fontSize: '11px', color: 'var(--text-secondary)' }}>Economic Order Qty (EOQ)</div>
                    <div style={{ fontSize: '20px', fontWeight: 800, color: 'var(--color-cyan)', fontFamily: 'var(--font-heading)', marginTop: '4px' }}>
                      {calcLoading ? '...' : `${calcDetails.eoq} units`}
                    </div>
                  </div>

                  <div className="glass-panel" style={{ padding: '14px', background: 'rgba(139, 92, 246, 0.03)', border: '1px solid rgba(139, 92, 246, 0.12)' }}>
                    <div style={{ fontSize: '11px', color: 'var(--text-secondary)' }}>Safety Stock (SS)</div>
                    <div style={{ fontSize: '20px', fontWeight: 800, color: 'var(--color-violet)', fontFamily: 'var(--font-heading)', marginTop: '4px' }}>
                      {calcLoading ? '...' : `${calcDetails.safetyStock} units`}
                    </div>
                  </div>

                  <div className="glass-panel" style={{ padding: '14px', gridColumn: 'span 2', background: 'rgba(16, 185, 129, 0.03)', border: '1px solid rgba(16, 185, 129, 0.12)', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                    <div>
                      <div style={{ fontSize: '11px', color: 'var(--text-secondary)' }}>Reorder Point (ROP)</div>
                      <div style={{ fontSize: '13px', color: 'var(--text-secondary)', marginTop: '2px' }}>Order when stock drops to:</div>
                    </div>
                    <div style={{ fontSize: '24px', fontWeight: 800, color: 'var(--color-emerald)', fontFamily: 'var(--font-heading)' }}>
                      {calcLoading ? '...' : `${calcDetails.reorderPoint} units`}
                    </div>
                  </div>
                </div>
              )}

              {/* cost curve line chart */}
              {calcDetails && (
                <div style={{ height: '220px', marginTop: '10px' }}>
                  <Line data={chartData} options={chartOptions} />
                </div>
              )}

              {/* AI Recommendation Box */}
              {selectedProduct && calcDetails && (
                <div style={{ marginTop: '20px', borderTop: '1px solid var(--border-color)', paddingTop: '16px', display: 'flex', gap: '10px' }}>
                  <CheckCircle2 color="var(--color-emerald)" size={20} style={{ flexShrink: 0, marginTop: '2px' }} />
                  <div style={{ fontSize: '12px', lineHeight: '1.4', color: 'var(--text-secondary)' }}>
                    <strong style={{ color: '#fff' }}>AI Optimization Advisory: </strong>
                    For {selectedProduct.name}, order <span style={{ color: 'var(--color-cyan)', fontWeight: 600 }}>{calcDetails.eoq} units</span> when stock hits <span style={{ color: 'var(--color-emerald)', fontWeight: 600 }}>{calcDetails.reorderPoint} units</span>. This limits holding costs to ${Math.round((calcDetails.eoq/2)*(holdingCostRate*selectedProduct.price))} and setup fees to ${Math.round((selectedProduct.annualDemand/calcDetails.eoq)*setupCost)} annually.
                  </div>
                </div>
              )}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
