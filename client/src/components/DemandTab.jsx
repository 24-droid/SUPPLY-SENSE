import React, { useState, useEffect } from 'react';
import { Line } from 'react-chartjs-2';
import { TrendingUp, Sliders, Play, AlertCircle, Calendar, RefreshCw } from 'lucide-react';
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

export default function DemandTab() {
  const [products, setProducts] = useState([]);
  const [selectedProductId, setSelectedProductId] = useState('');
  const [forecastData, setForecastData] = useState(null);
  const [loading, setLoading] = useState(true);
  const [forecastLoading, setForecastLoading] = useState(false);

  // Sliders for dynamic scenarios
  const [seasonalityBoost, setSeasonalityBoost] = useState(1.0);
  const [marketingLift, setMarketingLift] = useState(0.0);
  const [marketTrend, setMarketTrend] = useState(0.0);

  useEffect(() => {
    // Fetch unique products list to build dropdown
    fetch(`${API_BASE}/inventory`)
      .then(res => res.json())
      .then(data => {
        setProducts(data);
        if (data.length > 0) {
          setSelectedProductId(data[0].productId);
          fetchForecast(data[0].productId, 1.0, 0.0, 0.0);
        }
        setLoading(false);
      })
      .catch(err => {
        console.error(err);
        setLoading(false);
      });
  }, []);

  const fetchForecast = (prodId, sBoost, mLift, mTrend) => {
    setForecastLoading(true);
    fetch(`${API_BASE}/forecast/${prodId}?seasonalityBoost=${sBoost}&marketingLift=${mLift}&marketTrend=${mTrend}`)
      .then(res => res.json())
      .then(data => {
        setForecastData(data);
        setForecastLoading(false);
      })
      .catch(err => {
        console.error(err);
        setForecastLoading(false);
      });
  };

  const handleSliderChange = (type, value) => {
    let currentBoost = seasonalityBoost;
    let currentLift = marketingLift;
    let currentTrend = marketTrend;

    if (type === 'seasonality') {
      setSeasonalityBoost(value);
      currentBoost = value;
    } else if (type === 'marketing') {
      setMarketingLift(value);
      currentLift = value;
    } else if (type === 'trend') {
      setMarketTrend(value);
      currentTrend = value;
    }

    if (selectedProductId) {
      fetchForecast(selectedProductId, currentBoost, currentLift, currentTrend);
    }
  };

  const handleProductChange = (e) => {
    const prodId = e.target.value;
    setSelectedProductId(prodId);
    setSeasonalityBoost(1.0);
    setMarketingLift(0.0);
    setMarketTrend(0.0);
    fetchForecast(prodId, 1.0, 0.0, 0.0);
  };

  // Reset modifiers to baseline model
  const resetModifiers = () => {
    setSeasonalityBoost(1.0);
    setMarketingLift(0.0);
    setMarketTrend(0.0);
    if (selectedProductId) {
      fetchForecast(selectedProductId, 1.0, 0.0, 0.0);
    }
  };

  // Chart setup
  let chartData = null;
  let chartOptions = null;

  if (forecastData) {
    const history = forecastData.history || [];
    const forecast = forecastData.forecast || [];

    // Labels: historical months + future forecast months
    const historyLabels = history.map(h => `${h.month}/${String(h.year).substring(2)}`);
    const forecastLabels = forecast.map(f => `${f.month}/${String(f.year).substring(2)}`);
    const allLabels = [...historyLabels, ...forecastLabels];

    // Data values
    const historyValues = history.map(h => h.quantitySold);
    const forecastValues = forecast.map(f => f.quantitySold);
    const upperValues = forecast.map(f => f.upperQty);
    const lowerValues = forecast.map(f => f.lowerQty);

    // Padding historical values with nulls for forecast arrays and vice-versa
    const padHistory = Array(history.length).fill(null);
    const padForecast = Array(forecast.length).fill(null);

    // Connect historical end-point to forecast starting-point for line continuity
    const lastHistoryVal = historyValues[historyValues.length - 1];
    const fullHistory = [...historyValues, ...padForecast];
    const fullForecast = [...padHistory.slice(0, -1), lastHistoryVal, ...forecastValues];
    const fullUpper = [...padHistory.slice(0, -1), lastHistoryVal, ...upperValues];
    const fullLower = [...padHistory.slice(0, -1), lastHistoryVal, ...lowerValues];

    chartData = {
      labels: allLabels,
      datasets: [
        {
          label: 'Historical Sales (Qty)',
          data: fullHistory,
          borderColor: 'rgba(0, 242, 254, 1)',
          backgroundColor: 'rgba(0, 242, 254, 0.03)',
          borderWidth: 2,
          tension: 0.35,
          fill: false,
          pointRadius: 3
        },
        {
          label: 'AI Forecast (Qty)',
          data: fullForecast,
          borderColor: 'rgba(139, 92, 246, 1)',
          backgroundColor: 'rgba(139, 92, 246, 0.03)',
          borderWidth: 2,
          borderDash: [6, 4],
          tension: 0.35,
          fill: false,
          pointRadius: 4,
          pointBackgroundColor: 'rgba(139, 92, 246, 1)'
        },
        {
          label: 'Upper Confidence Limit (90%)',
          data: fullUpper,
          borderColor: 'rgba(244, 63, 94, 0.3)',
          borderWidth: 1,
          borderDash: [3, 3],
          tension: 0.35,
          fill: false,
          pointRadius: 0
        },
        {
          label: 'Lower Confidence Limit (90%)',
          data: fullLower,
          borderColor: 'rgba(244, 63, 94, 0.3)',
          borderWidth: 1,
          borderDash: [3, 3],
          tension: 0.35,
          fill: '-1', // Fill the area between lower limit and upper limit
          backgroundColor: 'rgba(244, 63, 94, 0.03)',
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
        }
      },
      scales: {
        x: {
          grid: { color: 'rgba(255, 255, 255, 0.02)' },
          ticks: { color: '#94a3b8' }
        },
        y: {
          grid: { color: 'rgba(255, 255, 255, 0.02)' },
          ticks: { color: '#94a3b8' }
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
          <h2 className="page-title">Demand Prediction Dashboard</h2>
          <p className="page-subtitle">Interactive AI forecasting simulator incorporating market growth and marketing lift.</p>
        </div>
      </div>

      <div className="charts-grid" style={{ gridTemplateColumns: '1fr 340px' }}>
        {/* Left Side: Prediction Line Chart */}
        <div className="glass-panel chart-container" style={{ minHeight: '480px', display: 'flex', flexDirection: 'column' }}>
          <div className="table-header-row" style={{ marginBottom: '20px' }}>
            <div>
              <span style={{ fontSize: '13px', color: 'var(--text-secondary)' }}>Selected SKU for Forecast Analysis:</span>
              <div style={{ marginTop: '8px' }}>
                <select 
                  value={selectedProductId} 
                  onChange={handleProductChange}
                  style={{ minWidth: '320px', height: '42px', fontSize: '14px' }}
                >
                  {products.map(p => (
                    <option key={p.productId} value={p.productId}>
                      [{p.productId}] {p.name}
                    </option>
                  ))}
                </select>
              </div>
            </div>
            {forecastLoading && <div className="spinner"></div>}
          </div>

          <div style={{ flexGrow: 1, position: 'relative', height: '320px' }}>
            {forecastData ? (
              <Line data={chartData} options={chartOptions} />
            ) : (
              <div style={{ display: 'flex', justifyContent: 'center', alignItems: 'center', height: '100%', color: 'var(--text-secondary)' }}>
                Select a product to fetch forecast data.
              </div>
            )}
          </div>
        </div>

        {/* Right Side: Scenario Simulator Sliders */}
        <div style={{ display: 'flex', flexDirection: 'column', gap: '20px' }}>
          <div className="glass-panel" style={{ padding: '24px' }}>
            <h3 style={{ fontSize: '16px', fontWeight: 700, marginBottom: '20px', display: 'flex', alignItems: 'center', gap: '8px', color: 'var(--color-cyan)' }}>
              <Sliders size={18} />
              Scenario Simulator
            </h3>
            
            <p style={{ fontSize: '12px', color: 'var(--text-secondary)', lineHeight: '1.5', marginBottom: '24px' }}>
              Adjust indicators below to simulate custom supply chain events. The AI model will recalculate the forecasting curve dynamically.
            </p>

            <div className="slider-group">
              <div className="slider-label">
                <span>Seasonality Boost</span>
                <span className="slider-value">{seasonalityBoost.toFixed(1)}x</span>
              </div>
              <input 
                type="range" 
                min="0.5" 
                max="2.5" 
                step="0.1"
                value={seasonalityBoost} 
                onChange={(e) => handleSliderChange('seasonality', parseFloat(e.target.value))} 
              />
              <span style={{ fontSize: '10px', color: 'var(--text-muted)' }}>Exaggerates or smooths seasonal demand cycles</span>
            </div>

            <div className="slider-group" style={{ marginTop: '12px' }}>
              <div className="slider-label">
                <span>Promotional Lift</span>
                <span className="slider-value">+{Math.round(marketingLift * 100)}%</span>
              </div>
              <input 
                type="range" 
                min="0.0" 
                max="0.6" 
                step="0.05"
                value={marketingLift} 
                onChange={(e) => handleSliderChange('marketing', parseFloat(e.target.value))} 
              />
              <span style={{ fontSize: '10px', color: 'var(--text-muted)' }}>Simulates sales increase from marketing efforts</span>
            </div>

            <div className="slider-group" style={{ marginTop: '12px' }}>
              <div className="slider-label">
                <span>Annual Market Growth</span>
                <span className="slider-value">{(marketTrend >= 0 ? '+' : '')}{Math.round(marketTrend * 100)}%</span>
              </div>
              <input 
                type="range" 
                min="-0.25" 
                max="0.25" 
                step="0.02"
                value={marketTrend} 
                onChange={(e) => handleSliderChange('trend', parseFloat(e.target.value))} 
              />
              <span style={{ fontSize: '10px', color: 'var(--text-muted)' }}>Simulates macroeconomic growth/recession trends</span>
            </div>

            <button 
              onClick={resetModifiers}
              className="nav-item" 
              style={{ width: '100%', border: '1px solid var(--border-color)', marginTop: '24px', justifyContent: 'center', gap: '8px', cursor: 'pointer', background: 'rgba(255,255,255,0.02)' }}
            >
              <RefreshCw size={14} /> Reset to Baseline Model
            </button>
          </div>

          <div className="glass-panel" style={{ padding: '20px', background: 'rgba(139, 92, 246, 0.02)' }}>
            <h4 style={{ fontSize: '13px', fontWeight: 600, display: 'flex', alignItems: 'center', gap: '6px', marginBottom: '8px' }}>
              <Calendar size={14} color="var(--color-violet)" /> Forecast Confidence
            </h4>
            <p style={{ fontSize: '11px', color: 'var(--text-secondary)', lineHeight: '1.4' }}>
              The shaded red area highlights the <strong style={{ color: 'var(--color-rose)' }}>90% confidence envelope</strong>. Forecasting uncertainty compounds over time as standard errors grow according to the formula: sigma * sqrt(time).
            </p>
          </div>

        </div>
      </div>
    </div>
  );
}
