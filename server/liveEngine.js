/**
 * SupplySense Live Simulation Engine
 * Simulates real-time supply chain events and broadcasts them via Socket.io
 */

const SIMULATION_INTERVAL_MS = 5000; // Push events every 5 seconds

const SHIPPING_MODES = ['Standard Class', 'Second Class', 'First Class', 'Same Day'];
const CUSTOMER_CITIES = ['New York', 'Los Angeles', 'Chicago', 'Houston', 'Mumbai', 'Delhi', 'London', 'Sydney', 'Toronto', 'Berlin'];
const CUSTOMER_COUNTRIES = ['United States', 'India', 'United Kingdom', 'Australia', 'Canada', 'Germany', 'France', 'Brazil'];

const ALERT_TEMPLATES = [
  { type: 'stockout', severity: 'critical', message: (name) => `CRITICAL: ${name} has reached 0 units — immediate reorder required.` },
  { type: 'low_stock', severity: 'warning', message: (name) => `WARNING: ${name} stock is below the reorder point. EOQ order recommended.` },
  { type: 'delay', severity: 'warning', message: (name) => `LOGISTICS: Shipment of ${name} delayed due to carrier congestion. ETA pushed by 2 days.` },
  { type: 'overstock', severity: 'info', message: (name) => `INFO: ${name} stock exceeds optimal levels. Consider promotional offload.` },
  { type: 'reorder', severity: 'info', message: (name) => `SYSTEM: Auto-reorder triggered for ${name} based on ROP threshold crossing.` },
];

// In-memory simulated stock levels per productId
const simulatedStock = {};

function getRandomInt(min, max) {
  return Math.floor(Math.random() * (max - min + 1)) + min;
}

function getRandomItem(arr) {
  return arr[Math.floor(Math.random() * arr.length)];
}

function getSimulatedStock(product) {
  if (simulatedStock[product.productId] === undefined) {
    // Initialize stock based on annual demand (roughly 2-3 weeks of supply)
    const weeklyDemand = Math.round(product.annualDemand / 52);
    simulatedStock[product.productId] = getRandomInt(weeklyDemand, weeklyDemand * 3);
  }
  return simulatedStock[product.productId];
}

function getStockStatus(stock, product) {
  const weeklyDemand = Math.round(product.annualDemand / 52);
  if (stock <= 0) return 'Out of Stock';
  if (stock < product.safetyStock) return 'Out of Stock';
  if (stock < product.reorderPoint) return 'Low Stock';
  if (stock > weeklyDemand * 4) return 'Overstocked';
  return 'Healthy';
}

let simulationTimer = null;
let cachedProducts = [];
let orderCounter = 0;

async function startLiveEngine(io, Product) {
  console.log('Starting SupplySense Live Simulation Engine...');

  // Pre-load all products once to avoid repeated DB calls
  try {
    cachedProducts = await Product.find({}).limit(50).lean();
    console.log(`Live Engine loaded ${cachedProducts.length} products into memory.`);
  } catch (err) {
    console.error('Live Engine failed to load products:', err.message);
    return;
  }

  // Initialize simulated stock levels for all products
  cachedProducts.forEach(p => getSimulatedStock(p));

  // Handle new client connections — send them the current snapshot
  io.on('connection', (socket) => {
    console.log(`Client connected: ${socket.id}`);

    // Send initial stock snapshot to newly connected client
    const stockSnapshot = cachedProducts.map(p => ({
      productId: p.productId,
      name: p.name,
      stock: getSimulatedStock(p),
      status: getStockStatus(getSimulatedStock(p), p),
      reorderPoint: p.reorderPoint,
      safetyStock: p.safetyStock
    }));
    socket.emit('stock_snapshot', stockSnapshot);

    socket.on('disconnect', () => {
      console.log(`Client disconnected: ${socket.id}`);
    });
  });

  // Start the live simulation interval
  simulationTimer = setInterval(() => {
    if (cachedProducts.length === 0) return;

    // 1. Pick a random product to sell some units to
    const product = getRandomItem(cachedProducts);
    const qtySold = getRandomInt(1, Math.max(1, Math.round(product.annualDemand / 365)));

    // 2. Deplete simulated stock
    simulatedStock[product.productId] = Math.max(0, (simulatedStock[product.productId] || 0) - qtySold);
    const currentStock = simulatedStock[product.productId];
    const newStatus = getStockStatus(currentStock, product);

    // 3. Build a synthetic new order event
    orderCounter++;
    const orderDate = new Date();
    const scheduledDays = getRandomInt(2, 7);
    const isLate = Math.random() < 0.35; // 35% chance of being late
    const realDays = isLate ? scheduledDays + getRandomInt(1, 4) : scheduledDays;
    const unitPrice = product.price || 50;
    const sales = parseFloat((qtySold * unitPrice).toFixed(2));
    const profit = parseFloat((sales * (0.1 + Math.random() * 0.25)).toFixed(2));

    const newOrder = {
      orderId: `LIVE-${Date.now()}-${orderCounter}`,
      productId: product.productId,
      productName: product.name,
      category: product.category,
      quantity: qtySold,
      shippingMode: getRandomItem(SHIPPING_MODES),
      destination: `${getRandomItem(CUSTOMER_CITIES)}, ${getRandomItem(CUSTOMER_COUNTRIES)}`,
      scheduledDays,
      realDays,
      lateRisk: isLate,
      deliveryStatus: isLate ? 'Late delivery' : 'Shipping on time',
      sales,
      profit,
      orderDate: orderDate.toISOString()
    };

    // 4. Broadcast new order to all connected clients
    io.emit('new_order', newOrder);

    // 5. Broadcast stock level update
    io.emit('stock_update', {
      productId: product.productId,
      name: product.name,
      category: product.category,
      currentStock,
      previousStatus: product._cachedStatus || 'Healthy',
      newStatus,
      reorderPoint: product.reorderPoint,
      safetyStock: product.safetyStock
    });
    product._cachedStatus = newStatus;

    // 6. Generate supply chain alert if stock status changed to critical
    if (newStatus === 'Out of Stock' || newStatus === 'Low Stock') {
      const alertTemplate = newStatus === 'Out of Stock'
        ? ALERT_TEMPLATES[0]
        : ALERT_TEMPLATES[1];

      io.emit('supply_alert', {
        id: `alert-${Date.now()}`,
        type: alertTemplate.type,
        severity: alertTemplate.severity,
        message: alertTemplate.message(product.name),
        productId: product.productId,
        productName: product.name,
        timestamp: new Date().toISOString()
      });
    }

    // 7. Occasionally emit a random logistics alert (delay, reorder, overstock)
    if (Math.random() < 0.3) {
      const randomTemplate = getRandomItem(ALERT_TEMPLATES.slice(2));
      const randomProduct = getRandomItem(cachedProducts);
      io.emit('supply_alert', {
        id: `alert-${Date.now()}-rand`,
        type: randomTemplate.type,
        severity: randomTemplate.severity,
        message: randomTemplate.message(randomProduct.name),
        productId: randomProduct.productId,
        productName: randomProduct.name,
        timestamp: new Date().toISOString()
      });
    }

    // 8. Emit a KPI pulse — aggregate live sales data
    io.emit('kpi_update', {
      newOrderSales: sales,
      newOrderProfit: profit,
      isLate,
      timestamp: new Date().toISOString()
    });

  }, SIMULATION_INTERVAL_MS);

  console.log(`Live Engine running — broadcasting events every ${SIMULATION_INTERVAL_MS / 1000}s.`);
}

function stopLiveEngine() {
  if (simulationTimer) {
    clearInterval(simulationTimer);
    simulationTimer = null;
    console.log('Live Engine stopped.');
  }
}

module.exports = { startLiveEngine, stopLiveEngine };
