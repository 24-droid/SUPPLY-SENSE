import React, { useEffect, useState, useRef } from 'react';
import { LayoutDashboard, ShieldCheck, TrendingUp, Sparkles, ArrowRight, Activity, Terminal, Factory, Warehouse, Store, Ship, Truck, Drill } from 'lucide-react';

export default function LandingPage({ onLaunch }) {
  const [stats, setStats] = useState({
    ordersProcessed: 180519,
    modelAccuracy: 98.7,
    analyzedSales: 1818,
    replenishmentRuns: 42
  });

  const cardsRef = useRef([]);

  // Slowly increment some stats over time to simulate a live system
  useEffect(() => {
    const timer = setInterval(() => {
      setStats(prev => ({
        ...prev,
        ordersProcessed: prev.ordersProcessed + Math.floor(Math.random() * 2),
        analyzedSales: prev.analyzedSales + (Math.random() < 0.2 ? 1 : 0),
        replenishmentRuns: prev.replenishmentRuns + (Math.random() < 0.1 ? 1 : 0)
      }));
    }, 4000);

    return () => clearInterval(timer);
  }, []);

  // Track mouse coordinates on cards to do a cool spotlight hover effect
  const handleMouseMove = (e, index) => {
    const card = cardsRef.current[index];
    if (!card) return;
    const rect = card.getBoundingClientRect();
    const x = e.clientX - rect.left;
    const y = e.clientY - rect.top;
    card.style.setProperty('--mouse-x', `${x}px`);
    card.style.setProperty('--mouse-y', `${y}px`);
  };

  return (
    <div className="landing-container">
      {/* Background grids and glowing blobs */}
      <div className="landing-grid-bg" />
      <div className="landing-glow-blob" />

      {/* Landing Header */}
      <header className="landing-header">
        <div className="logo-container" style={{ margin: 0 }}>
          <div className="logo-icon">S</div>
          <h1 className="logo-text">SupplySense</h1>
        </div>
        <div style={{ display: 'flex', alignItems: 'center', gap: '8px', fontSize: '12px', color: 'var(--text-secondary)' }}>
          <Activity size={14} className="spinner" style={{ animationDuration: '4s', color: 'var(--color-cyan)' }} />
          <span>Active Simulation Mesh</span>
        </div>
      </header>

      {/* Split Hero Section */}
      <section className="landing-hero-split">
        {/* Left Hand: Hero Pitch & CTA */}
        <div className="landing-hero-left fade-in-up">
          <div className="landing-badge">
            <Sparkles size={14} /> AI-Powered Supply Optimization
          </div>
          <h2 className="landing-title" style={{ fontSize: '50px' }}>
            Next-Gen Supply Chain<br />Predictive Intelligence
          </h2>
          <p className="landing-subtitle" style={{ margin: '0 0 36px 0', textAlign: 'left' }}>
            An enterprise-grade orchestration platform simulating live orders, predicting seasonal demand trends, and automating stock replenishment points using advanced mathematical models.
          </p>

          <button onClick={onLaunch} className="landing-cta-btn">
            <span>Launch Intelligent Control Center</span>
            <ArrowRight size={18} />
          </button>
        </div>

        {/* Right Hand: Interactive SVG Supply Network Map */}
        <div className="landing-hero-right fade-in-up" style={{ animationDelay: '0.15s' }}>
          <svg className="supply-network-svg" viewBox="0 0 550 400">
            {/* SVG Path definitions (curves & linear connections) */}
            <path id="path-supplier1-factory" d="M 50,80 Q 125,120 200,200" className="supply-path" />
            <path id="path-supplier2-factory" d="M 50,320 Q 125,280 200,200" className="supply-path" />
            <path id="path-factory-warehouse" d="M 200,200 L 360,200" className="supply-path" />
            <path id="path-warehouse-market1" d="M 360,200 Q 430,140 500,80" className="supply-path" />
            <path id="path-warehouse-market2" d="M 360,200 Q 430,260 500,320" className="supply-path" />

            {/* Glowing moving particles representing flowing inventory packages */}
            <circle r="5" className="supply-pulse">
              <animateMotion dur="3.5s" repeatCount="indefinite">
                <mpath href="#path-supplier1-factory" />
              </animateMotion>
            </circle>

            <circle r="5" className="supply-pulse" style={{ fill: 'var(--color-violet)' }}>
              <animateMotion dur="4.5s" repeatCount="indefinite">
                <mpath href="#path-supplier2-factory" />
              </animateMotion>
            </circle>

            <circle r="6" className="supply-pulse" style={{ fill: 'var(--color-emerald)' }}>
              <animateMotion dur="2.2s" repeatCount="indefinite">
                <mpath href="#path-factory-warehouse" />
              </animateMotion>
            </circle>

            <circle r="5" className="supply-pulse">
              <animateMotion dur="3s" repeatCount="indefinite">
                <mpath href="#path-warehouse-market1" />
              </animateMotion>
            </circle>

            <circle r="5" className="supply-pulse" style={{ fill: 'var(--color-amber)' }}>
              <animateMotion dur="4s" repeatCount="indefinite">
                <mpath href="#path-warehouse-market2" />
              </animateMotion>
            </circle>

            {/* Nodes Group - Supplier 1 */}
            <g className="supply-node-g" transform="translate(0,0)">
              <circle cx="50" cy="80" r="30" className="supply-node-circle" />
              <foreignObject x="35" y="65" width="30" height="30">
                <div style={{ color: 'var(--color-cyan)', display: 'flex', justifyContent: 'center', alignItems: 'center', height: '100%' }}>
                  <Drill size={16} />
                </div>
              </foreignObject>
              <text x="50" y="125" className="supply-node-label">Suppliers</text>
              <text x="50" y="137" className="supply-node-sublabel">Raw Materials</text>
            </g>

            {/* Nodes Group - Supplier 2 */}
            <g className="supply-node-g">
              <circle cx="50" cy="320" r="30" className="supply-node-circle" />
              <foreignObject x="35" y="305" width="30" height="30">
                <div style={{ color: 'var(--color-violet)', display: 'flex', justifyContent: 'center', alignItems: 'center', height: '100%' }}>
                  <Ship size={16} />
                </div>
              </foreignObject>
              <text x="50" y="365" className="supply-node-label">Import Harbor</text>
              <text x="50" y="377" className="supply-node-sublabel">Overseas Inflow</text>
            </g>

            {/* Nodes Group - Manufacturing Plant */}
            <g className="supply-node-g">
              <circle cx="200" cy="200" r="35" className="supply-node-circle" style={{ stroke: 'var(--color-cyan)' }} />
              <foreignObject x="180" y="180" width="40" height="40">
                <div style={{ color: '#fff', display: 'flex', justifyContent: 'center', alignItems: 'center', height: '100%' }}>
                  <Factory size={22} className="glow-glow" />
                </div>
              </foreignObject>
              <text x="200" y="250" className="supply-node-label">Manufacturing Plant</text>
              <text x="200" y="262" className="supply-node-sublabel">Production Center</text>
            </g>

            {/* Nodes Group - Distribution Hub */}
            <g className="supply-node-g">
              <circle cx="360" cy="200" r="35" className="supply-node-circle" style={{ stroke: 'var(--color-emerald)' }} />
              <foreignObject x="340" y="180" width="40" height="40">
                <div style={{ color: 'var(--color-emerald)', display: 'flex', justifyContent: 'center', alignItems: 'center', height: '100%' }}>
                  <Warehouse size={22} />
                </div>
              </foreignObject>
              <text x="360" y="250" className="supply-node-label">Distribution Center</text>
              <text x="360" y="262" className="supply-node-sublabel">Simulated Stockpile</text>
            </g>

            {/* Nodes Group - Retail Markets */}
            <g className="supply-node-g">
              <circle cx="500" cy="80" r="30" className="supply-node-circle" />
              <foreignObject x="485" y="65" width="30" height="30">
                <div style={{ color: '#fff', display: 'flex', justifyContent: 'center', alignItems: 'center', height: '100%' }}>
                  <Store size={16} />
                </div>
              </foreignObject>
              <text x="500" y="125" className="supply-node-label">Retail Markets</text>
              <text x="500" y="137" className="supply-node-sublabel">End Consumers</text>
            </g>

            {/* Nodes Group - Logistics fleet */}
            <g className="supply-node-g">
              <circle cx="500" cy="320" r="30" className="supply-node-circle" />
              <foreignObject x="485" y="305" width="30" height="30">
                <div style={{ color: 'var(--color-amber)', display: 'flex', justifyContent: 'center', alignItems: 'center', height: '100%' }}>
                  <Truck size={16} />
                </div>
              </foreignObject>
              <text x="500" y="365" className="supply-node-label">Logistics Fleet</text>
              <text x="500" y="377" className="supply-node-sublabel">Dispatch Carriers</text>
            </g>
          </svg>
        </div>
      </section>

      {/* Features Grid */}
      <div className="landing-features-grid">
        {/* Card 1: Overview */}
        <div
          className="landing-card fade-in-up"
          style={{ animationDelay: '0.1s' }}
          ref={el => cardsRef.current[0] = el}
          onMouseMove={(e) => handleMouseMove(e, 0)}
        >
          <div className="landing-card-icon">
            <LayoutDashboard size={22} />
          </div>
          <h3>Simulated Live Operations</h3>
          <p>Real-time order arrivals, stock level drops, and supply chain updates streamed over a persistent Socket.io connection.</p>
        </div>

        {/* Card 2: Inventory */}
        <div
          className="landing-card fade-in-up"
          style={{ animationDelay: '0.2s' }}
          ref={el => cardsRef.current[1] = el}
          onMouseMove={(e) => handleMouseMove(e, 1)}
        >
          <div className="landing-card-icon">
            <ShieldCheck size={22} />
          </div>
          <h3>Inventory Optimization</h3>
          <p>Automatic calculation of Economic Order Quantity (EOQ) and Safety Stock points to minimize carrying costs and stockouts.</p>
        </div>

        {/* Card 3: Demand */}
        <div
          className="landing-card fade-in-up"
          style={{ animationDelay: '0.3s' }}
          ref={el => cardsRef.current[2] = el}
          onMouseMove={(e) => handleMouseMove(e, 2)}
        >
          <div className="landing-card-icon">
            <TrendingUp size={22} />
          </div>
          <h3>Predictive Forecasting</h3>
          <p>Utilizes Triple-Exponential smoothing and regression models to project annual sales trends and seasonal demand variations.</p>
        </div>

        {/* Card 4: Assistant */}
        <div
          className="landing-card fade-in-up"
          style={{ animationDelay: '0.4s' }}
          ref={el => cardsRef.current[3] = el}
          onMouseMove={(e) => handleMouseMove(e, 3)}
        >
          <div className="landing-card-icon">
            <Terminal size={22} />
          </div>
          <h3>SupplyAI Copilot</h3>
          <p>An intelligent chatbot leveraging retrieval-augmented heuristics to answer queries about supplier metrics, lead times, and forecasts.</p>
        </div>
      </div>

      {/* Platform Live Stats */}
      <div className="landing-stats fade-in-up" style={{ animationDelay: '0.5s' }}>
        <div className="landing-stat-item">
          <div className="landing-stat-value">{stats.ordersProcessed.toLocaleString()}</div>
          <div className="landing-stat-label">Orders Ingested</div>
        </div>
        <div className="landing-stat-item">
          <div className="landing-stat-value">{stats.modelAccuracy}%</div>
          <div className="landing-stat-label">Prediction Accuracy</div>
        </div>
        <div className="landing-stat-item">
          <div className="landing-stat-value">{stats.analyzedSales}</div>
          <div className="landing-stat-label">Sales Logs Analyzed</div>
        </div>
        <div className="landing-stat-item">
          <div className="landing-stat-value">{stats.replenishmentRuns}</div>
          <div className="landing-stat-label">Replenishment Optimizations</div>
        </div>
      </div>
    </div>
  );
}
