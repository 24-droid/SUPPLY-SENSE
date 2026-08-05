const dns = require('dns');
dns.setServers(['8.8.8.8', '8.8.4.4']); // Override local DNS to resolve MongoDB Atlas SRV records

const express = require('express');
const http = require('http');
const { Server } = require('socket.io');
const cors = require('cors');
const mongoose = require('mongoose');
const dotenv = require('dotenv');
const path = require('path');
const { startLiveEngine } = require('./liveEngine');

// Load environment variables
dotenv.config();

const { Product, Order, SalesHistory } = require('./models');
const { calculateEOQ, calculateROP, predictDemand } = require('./aiEngine');

const app = express();
const httpServer = http.createServer(app);
const PORT = process.env.PORT || 5000;
const MONGO_URI = process.env.MONGO_URI || 'mongodb://localhost:27017/supply_chain_db';

// Initialize Socket.io with CORS for the Vite dev server
const io = new Server(httpServer, {
  cors: {
    origin: ['http://localhost:5173', 'http://localhost:5174'],
    methods: ['GET', 'POST']
  }
});

app.use(cors({ origin: '*' }));
app.use(express.json());

// Serverless-friendly MongoDB Connection Caching
let isDbConnected = false;
async function connectDB() {
  if (isDbConnected && mongoose.connection.readyState === 1) return;
  try {
    await mongoose.connect(MONGO_URI);
    isDbConnected = true;
    console.log('Connected to MongoDB database.');
    // Start live simulation engine if socket.io server is listening
    startLiveEngine(io, Product);
  } catch (err) {
    console.error('MongoDB database connection error:', err);
  }
}

// Middleware to ensure DB connection on every request
app.use(async (req, res, next) => {
  await connectDB();
  next();
});

// Root & Health Check endpoints
app.get('/', (req, res) => {
  res.json({ message: 'SupplySense API Server is running live!', status: 'online' });
});

app.get('/api', (req, res) => {
  res.json({ message: 'SupplySense API endpoint active.', endpoints: ['/api/kpis', '/api/inventory', '/api/forecast', '/api/shipments', '/api/chatbot'] });
});

// KPI Caching
let cachedKPIs = null;
let kpisLastUpdated = null;
const CACHE_TTL = 1000 * 60 * 10; // 10 minutes cache

async function getKPIs() {
  const now = Date.now();
  if (cachedKPIs && kpisLastUpdated && (now - kpisLastUpdated < CACHE_TTL)) {
    return cachedKPIs;
  }

  console.log('Calculating fresh KPI aggregations from database...');
  // 1. Total Sales and Total Profit
  const financials = await Order.aggregate([
    {
      $group: {
        _id: null,
        totalSales: { $sum: '$sales' },
        totalProfit: { $sum: '$profit' },
        totalCount: { $sum: 1 },
        lateCount: {
          $sum: { $cond: [{ $eq: ['$deliveryStatus', 'Late delivery'] }, 1, 0] }
        }
      }
    }
  ]);

  const stats = financials[0] || { totalSales: 0, totalProfit: 0, totalCount: 0, lateCount: 0 };

  // 2. Out of Stock / Low Stock count
  const stockoutCount = await Product.countDocuments({ status: 'Out of Stock' });
  const lowStockCount = await Product.countDocuments({ status: 'Low Stock' });
  const healthyStockCount = await Product.countDocuments({ status: 'Healthy' });
  const overstockedCount = await Product.countDocuments({ status: 'Overstocked' });

  // 3. Average lead time
  const avgLeadTimeRaw = await Product.aggregate([
    { $group: { _id: null, avgLeadTime: { $avg: '$leadTimeDays' } } }
  ]);
  const avgLeadTime = avgLeadTimeRaw[0] ? Math.round(avgLeadTimeRaw[0].avgLeadTime * 10) / 10 : 4.2;

  const result = {
    totalSales: Math.round(stats.totalSales),
    totalProfit: Math.round(stats.totalProfit),
    orderCount: stats.totalCount,
    lateDeliveryRate: stats.totalCount > 0 ? parseFloat(((stats.lateCount / stats.totalCount) * 100).toFixed(2)) : 0,
    stockStatusCount: {
      outOfStock: stockoutCount,
      lowStock: lowStockCount,
      healthy: healthyStockCount,
      overstocked: overstockedCount
    },
    averageLeadTime: avgLeadTime
  };

  // Only cache if database actually returned records
  if (stats.totalCount > 0) {
    cachedKPIs = result;
    kpisLastUpdated = now;
  }

  return result;
}

// 1. KPIs endpoint
app.get('/api/kpis', async (req, res) => {
  try {
    const kpis = await getKPIs();
    res.json(kpis);
  } catch (error) {
    console.error('Error fetching KPIs:', error);
    res.status(500).json({ error: 'Server error calculating KPIs' });
  }
});

// 2. Inventory (Products) list endpoint
app.get('/api/inventory', async (req, res) => {
  try {
    const products = await Product.find({}).sort({ abcClass: 1, name: 1 });
    res.json(products);
  } catch (error) {
    console.error('Error fetching inventory:', error);
    res.status(500).json({ error: 'Server error retrieving inventory' });
  }
});

// 3. Get detailed product with reactive calculations (EOQ, ROP)
app.get('/api/inventory/:productId', async (req, res) => {
  try {
    const { productId } = req.params;
    const product = await Product.findOne({ productId });

    if (!product) {
      return res.status(404).json({ error: 'Product not found' });
    }

    // Retrieve monthly sales history to run ROP statistics
    const history = await SalesHistory.find({ productId }).sort({ year: 1, month: 1 });

    // Retrieve query parameters for custom calculator overrides
    const setupCost = parseFloat(req.query.setupCost) || 50;
    const holdingCostRate = parseFloat(req.query.holdingCostRate) || 0.20;
    const leadTime = parseFloat(req.query.leadTime) || product.leadTimeDays;

    const unitHoldingCost = Math.max(holdingCostRate * product.price, 1);
    
    // Run calculator engines
    const eoqDetails = calculateEOQ(product.annualDemand, setupCost, unitHoldingCost);
    const dailyDemand = product.annualDemand / 365;
    const ropDetails = calculateROP(dailyDemand, leadTime, history);

    res.json({
      product,
      calculations: {
        eoq: eoqDetails.eoq,
        costCurve: eoqDetails.curve,
        safetyStock: ropDetails.safetyStock,
        reorderPoint: ropDetails.reorderPoint,
        setupCostUsed: setupCost,
        holdingCostRateUsed: holdingCostRate,
        leadTimeUsed: leadTime
      }
    });
  } catch (error) {
    console.error('Error fetching product details:', error);
    res.status(500).json({ error: 'Server error retrieving product calculations' });
  }
});

// 4. Demand Prediction endpoint
app.get('/api/forecast/:productId', async (req, res) => {
  try {
    const { productId } = req.params;
    
    // Sliders for dynamic scenarios
    const modifiers = {
      seasonalityBoost: parseFloat(req.query.seasonalityBoost) ?? 1.0,
      marketingLift: parseFloat(req.query.marketingLift) ?? 0.0,
      marketTrend: parseFloat(req.query.marketTrend) ?? 0.0
    };

    const product = await Product.findOne({ productId });
    if (!product) {
      return res.status(404).json({ error: 'Product not found' });
    }

    // Fetch history
    const history = await SalesHistory.find({ productId }).sort({ year: 1, month: 1 });

    // Generate forecast
    const forecast = predictDemand(history, 6, modifiers);

    res.json({
      productName: product.name,
      productId: product.productId,
      price: product.price,
      history,
      forecast
    });
  } catch (error) {
    console.error('Error forecasting demand:', error);
    res.status(500).json({ error: 'Server error calculating demand forecast' });
  }
});

// 5. Logistics Shipments and Supplier Scores
app.get('/api/shipments', async (req, res) => {
  try {
    // Return the 30 most recent shipments that were late or are active transit paths
    const activeShipments = await Order.find({})
      .sort({ orderDate: -1 })
      .limit(30);

    // Map active shipments with product names for UI clarity
    const productIds = activeShipments.map(s => s.productId);
    const products = await Product.find({ productId: { $in: productIds } });
    const productMap = products.reduce((acc, p) => {
      acc[p.productId] = p.name;
      return acc;
    }, {});

    const shipments = activeShipments.map(s => ({
      orderId: s.orderId,
      orderItemId: s.orderItemId,
      productName: productMap[s.productId] || 'E-Commerce Item',
      destination: `${s.customerCity}, ${s.customerCountry}`,
      orderDate: s.orderDate,
      shippingDate: s.shippingDate,
      realDays: s.realDays,
      scheduledDays: s.scheduledDays,
      deliveryStatus: s.deliveryStatus,
      lateRisk: s.lateRisk,
      shippingMode: s.shippingMode,
      sales: s.sales,
      quantity: s.quantity
    }));

    // Generate supplier scorecard aggregations based on shipping modes in the dataset
    // We treat shippingMode as representing different shipping networks/suppliers
    const supplierStats = await Order.aggregate([
      {
        $group: {
          _id: '$shippingMode',
          onTimeCount: {
            $sum: { $cond: [{ $ne: ['$deliveryStatus', 'Late delivery'] }, 1, 0] }
          },
          totalCount: { $sum: 1 },
          avgDelayDays: {
            $avg: {
              $subtract: [
                { $ifNull: ['$realDays', '$scheduledDays'] },
                '$scheduledDays'
              ]
            }
          },
          totalProfit: { $sum: '$profit' }
        }
      }
    ]);

    const suppliers = supplierStats.map((s, index) => {
      const names = ['Apex Logistics', 'Summit Logistics', 'Titan Air Cargo', 'Vanguard Express'];
      const defectRates = [1.2, 2.4, 0.8, 3.1];
      const name = names[index] || s._id;
      const defectRate = defectRates[index] || 1.5;
      const onTimeRate = parseFloat(((s.onTimeCount / s.totalCount) * 100).toFixed(2));
      const avgLeadTime = s._id === 'Same Day' ? 1.0 : s._id === 'First Class' ? 2.1 : s._id === 'Second Class' ? 3.2 : 5.1;

      return {
        id: s._id,
        supplierName: name,
        shippingMode: s._id,
        onTimeRate,
        defectRate,
        avgLeadTimeDays: avgLeadTime,
        shipmentVolume: s.totalCount,
        efficiencyScore: Math.round(onTimeRate * 0.7 + (10 - defectRate) * 3)
      };
    });

    res.json({
      shipments,
      suppliers: suppliers.sort((a, b) => b.efficiencyScore - a.efficiencyScore)
    });
  } catch (error) {
    console.error('Error fetching logistics data:', error);
    res.status(500).json({ error: 'Server error retrieving logistics data' });
  }
});

// 6. "SupplyAI" Chatbot NLP matching Endpoint
app.post('/api/chatbot', async (req, res) => {
  try {
    const { message } = req.body;
    if (!message) {
      return res.status(400).json({ error: 'Message content is required' });
    }

    const query = message.toLowerCase();
    let reply = "";
    let data = null;

    if (query.includes('late') || query.includes('delayed') || query.includes('transit') || query.includes('logistics')) {
      const delayKPI = await getKPIs();
      const lateOrders = await Order.find({ deliveryStatus: 'Late delivery' }).limit(3);
      const productIds = lateOrders.map(o => o.productId);
      const products = await Product.find({ productId: { $in: productIds } });
      const names = products.map(p => p.name).join(', ');

      reply = `According to our real-time logistics logs, the current late delivery rate is ${delayKPI.lateDeliveryRate}%. I found several items delayed in transit, notably: ${names || 'multiple orders'}. We should review supplier performance in the Logistics tab.`;
      data = { lateDeliveryRate: delayKPI.lateDeliveryRate, sampleDelays: products };
    } 
    else if (query.includes('stockout') || query.includes('low stock') || query.includes('out of stock') || query.includes('inventory')) {
      const stockKPI = await getKPIs();
      const lowStockItems = await Product.find({ status: { $in: ['Low Stock', 'Out of Stock'] } }).limit(4);
      const itemList = lowStockItems.map(i => `${i.name} (${i.status} - Current Stock: ${Math.round(i.annualDemand * 0.05)} units)`).join('\n - ');

      reply = `Inventory alerts highlight ${stockKPI.stockStatusCount.outOfStock} items out of stock and ${stockKPI.stockStatusCount.lowStock} items with critical low levels. The items requiring immediate reorder attention are:\n - ${itemList || 'None'}\n\nI recommend generating economic order orders (EOQ) using the Optimization tab.`;
      data = { lowStockItems };
    } 
    else if (query.includes('forecast') || query.includes('prediction') || query.includes('demand') || query.includes('future')) {
      const topProduct = await Product.findOne({ abcClass: 'A' }).sort({ annualDemand: -1 });
      reply = `Our Triple-Exponential AI decomposition forecast model predicts Q4 seasonality peaks. For our high-volume Class A product "${topProduct ? topProduct.name : 'electronics'}", demand is projected to increase by 14% over the next quarter. You can experiment with marketing budgets and growth multipliers in the Demand tab to see confidence curves.`;
      data = { topProduct };
    } 
    else if (query.includes('eoq') || query.includes('optimize') || query.includes('safety')) {
      reply = `Economic Order Quantity (EOQ) optimizes the trade-off between holding cost and ordering setup fee. To prevent stockouts, the safety stock is continuously adjusted using a 95% service level confidence coefficient ($Z = 1.65$). Check out the Inventory tab for active slider tuning.`;
    } 
    else if (query.includes('supplier') || query.includes('performance') || query.includes('carrier')) {
      reply = `Based on supplier records, Summit Logistics and Apex Logistics are our top carriers. Summit Logistics maintains an on-time performance of over 92%, while Apex is slightly delayed but offers cheaper shipping rates. Let's look at the Logistics tab to compare defect rates.`;
    } 
    else {
      reply = `Hello! I am SupplyAI, your logistics and inventory optimization advisor. I can help with queries regarding:\n\n1. "Show delayed shipments"\n2. "What products are out of stock?"\n3. "Demand forecast details"\n4. "How is EOQ computed?"\n5. "Compare supplier metrics"\n\nHow can I assist your supply chain optimization today?`;
    }

    res.json({ reply, data });
  } catch (error) {
    console.error('Chatbot API error:', error);
    res.status(500).json({ error: 'Server error processing chat message' });
  }
});

// Start HTTP Server when running standalone / locally
if (process.env.NODE_ENV !== 'production' || !process.env.VERCEL) {
  httpServer.listen(PORT, () => {
    console.log(`Express + Socket.io Server running on port ${PORT}`);
  });
}

// Export Express app for Vercel Serverless Functions
module.exports = app;
