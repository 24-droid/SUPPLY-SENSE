const dns = require('dns');
dns.setServers(['8.8.8.8', '8.8.4.4']); // Override local DNS to resolve MongoDB Atlas SRV records

const fs = require('fs');
const path = require('path');
const mongoose = require('mongoose');

const csv = require('csv-parser');
const iconv = require('iconv-lite');
const dotenv = require('dotenv');

// Load environment variables
dotenv.config({ path: path.join(__dirname, '../.env') });

const { Product, Order, SalesHistory } = require('../models');

const MONGO_URI = process.env.MONGO_URI || 'mongodb+srv://omsingh06102005_db_user:K1hzhHj513XYPLqC@cluster0.dadeuan.mongodb.net/';
const CSV_FILE_PATH = path.join(__dirname, '../data/DataCoSupplyChainDataset.csv');

async function main() {
  console.log('Connecting to MongoDB...');
  await mongoose.connect(MONGO_URI);
  console.log('Connected to MongoDB successfully.');

  // Check if CSV exists
  if (!fs.existsSync(CSV_FILE_PATH)) {
    console.error(`\nError: CSV file not found at: ${CSV_FILE_PATH}`);
    console.error('Please download "DataCoSupplyChainDataset.csv" from Kaggle and place it in the "server/data" folder.\n');
    process.exit(1);
  }

  console.log('Clearing existing database collections...');
  await Promise.all([
    Product.deleteMany({}),
    Order.deleteMany({}),
    SalesHistory.deleteMany({})
  ]);
  console.log('Database collections cleared.');

  console.log('Starting stream import of CSV dataset...');

  let orderCount = 0;
  let batchBuffer = [];
  const BATCH_SIZE = 2000;

  // In-memory aggregations for Products and SalesHistory
  const productAggregates = {}; // key: productId
  const salesHistoryAggregates = {}; // key: productId_year_month

  // Time tracking
  const startTime = Date.now();

  const readStream = fs.createReadStream(CSV_FILE_PATH)
    .pipe(iconv.decodeStream('latin1')) // decode characters correctly
    .pipe(csv());

  for await (const row of readStream) {
    const productId = row['Product Card Id'];
    const orderId = row['Order Id'];
    const orderItemId = row['Order Item Id'];
    const qty = parseInt(row['Order Item Quantity']) || 1;
    const itemPrice = parseFloat(row['Product Price']) || 0;
    const realDays = parseInt(row['Days for shipping (real)']) || 0;
    const scheduledDays = parseInt(row['Days for shipment (scheduled)']) || 0;
    const profit = parseFloat(row['Benefit per order']) || 0;
    const sales = parseFloat(row['Sales per customer']) || (itemPrice * qty);

    // Parsing Dates
    const orderDateStr = row['order date (DateOrders)'];
    const shippingDateStr = row['shipping date (DateOrders)'];
    const orderDate = orderDateStr ? new Date(orderDateStr) : new Date();
    const shippingDate = shippingDateStr ? new Date(shippingDateStr) : null;

    if (!productId || !orderId || !orderItemId) continue;

    // 1. Process Order Document for Batch Insert
    const orderDoc = {
      orderId,
      orderItemId,
      customerId: row['Customer Id'],
      customerCity: row['Customer City'],
      customerCountry: row['Customer Country'],
      orderDate,
      shippingDate,
      scheduledDays,
      realDays,
      deliveryStatus: row['Delivery Status'],
      lateRisk: row['Late_delivery_risk'] === '1',
      shippingMode: row['Shipping Mode'],
      sales,
      profit,
      productId,
      quantity: qty
    };

    batchBuffer.push(orderDoc);
    orderCount++;

    if (batchBuffer.length >= BATCH_SIZE) {
      await Order.insertMany(batchBuffer, { ordered: false });
      batchBuffer = [];
      process.stdout.write(`Imported ${orderCount} orders...\r`);
    }

    // 2. Aggregate Product Info in-memory
    if (!productAggregates[productId]) {
      productAggregates[productId] = {
        productId,
        name: row['Product Name'] || 'Unknown Product',
        category: row['Category Name'] || 'General',
        price: itemPrice,
        totalSalesVolume: 0,
        totalSalesValue: 0,
        leadTimeDaysSum: 0,
        leadTimeDaysCount: 0
      };
    }
    const prod = productAggregates[productId];
    prod.totalSalesVolume += qty;
    prod.totalSalesValue += sales;
    prod.leadTimeDaysSum += scheduledDays;
    prod.leadTimeDaysCount += 1;

    // 3. Aggregate Monthly Sales History in-memory
    if (orderDate && !isNaN(orderDate.getTime())) {
      const year = orderDate.getFullYear();
      const month = orderDate.getMonth() + 1; // 1-12
      const historyKey = `${productId}_${year}_${month}`;

      if (!salesHistoryAggregates[historyKey]) {
        salesHistoryAggregates[historyKey] = {
          productId,
          year,
          month,
          totalSales: 0,
          quantitySold: 0
        };
      }
      salesHistoryAggregates[historyKey].totalSales += sales;
      salesHistoryAggregates[historyKey].quantitySold += qty;
    }
  }

  // Insert any remaining orders in the buffer
  if (batchBuffer.length > 0) {
    await Order.insertMany(batchBuffer, { ordered: false });
  }
  console.log(`\nImported total of ${orderCount} orders to Database.`);

  // 4. ABC Classification and Inventory Metrics Calculations
  console.log('Calculating Product inventory parameters and classification...');
  const productsList = Object.values(productAggregates);

  // Sort products by total sales value descending for ABC classification
  productsList.sort((a, b) => b.totalSalesValue - a.totalSalesValue);
  const grandTotalSalesValue = productsList.reduce((acc, curr) => acc + curr.totalSalesValue, 0);

  let cumulativeValue = 0;
  const productsToInsert = [];

  // Determine span of years for annual demand calculation (e.g. 2015 - 2018 is about 3 years)
  // Let's look at order count timestamps or just use 3 years as standard divisor
  const totalYears = 3;

  for (const p of productsList) {
    cumulativeValue += p.totalSalesValue;
    const valueRatio = cumulativeValue / grandTotalSalesValue;

    let abcClass = 'C';
    if (valueRatio <= 0.70) {
      abcClass = 'A';
    } else if (valueRatio <= 0.90) {
      abcClass = 'B';
    }

    const avgLeadTime = p.leadTimeDaysCount > 0 ? Math.round(p.leadTimeDaysSum / p.leadTimeDaysCount) : 4;
    const annualDemand = Math.round(p.totalSalesVolume / totalYears);

    // Dynamic holding and setup cost metrics
    const setupCost = 50; // S
    const holdingCostRate = 0.20; // H = holdingCostRate * price
    const holdingCost = Math.max(holdingCostRate * p.price, 1); // min $1/unit/year holding cost

    // Calculations
    const eoq = Math.round(Math.sqrt((2 * annualDemand * setupCost) / holdingCost)) || 10;
    const avgMonthlyDemand = annualDemand / 12;
    const safetyStock = Math.round(avgMonthlyDemand * 0.25) || 5; // buffer stock for 1 week
    const dailyDemand = annualDemand / 365;
    const reorderPoint = Math.round((dailyDemand * avgLeadTime) + safetyStock);

    // Determine simulated status from arbitrary formula (to make UI interesting)
    let status = 'Healthy';
    const simulatedRandom = Math.random();
    if (simulatedRandom < 0.08) {
      status = 'Out of Stock';
    } else if (simulatedRandom < 0.22) {
      status = 'Low Stock';
    } else if (simulatedRandom > 0.92) {
      status = 'Overstocked';
    }

    productsToInsert.push({
      productId: p.productId,
      name: p.name,
      category: p.category,
      price: p.price,
      status,
      leadTimeDays: avgLeadTime,
      safetyStock,
      reorderPoint,
      eoq,
      abcClass,
      annualDemand
    });
  }

  console.log(`Inserting ${productsToInsert.length} unique products...`);
  await Product.insertMany(productsToInsert);

  // 5. Insert Sales History records
  const salesHistoryList = Object.values(salesHistoryAggregates);
  console.log(`Inserting ${salesHistoryList.length} monthly Sales History records...`);

  // Insert in batches of 5000 for safety
  let historyBuffer = [];
  for (const record of salesHistoryList) {
    historyBuffer.push(record);
    if (historyBuffer.length >= BATCH_SIZE) {
      await SalesHistory.insertMany(historyBuffer);
      historyBuffer = [];
    }
  }
  if (historyBuffer.length > 0) {
    await SalesHistory.insertMany(historyBuffer);
  }

  const duration = ((Date.now() - startTime) / 1000).toFixed(2);
  console.log('\nData Import Complete!');
  console.log(`- Orders: ${orderCount}`);
  console.log(`- Products: ${productsToInsert.length}`);
  console.log(`- Sales History Records: ${salesHistoryList.length}`);
  console.log(`Time taken: ${duration}s`);

  await mongoose.disconnect();
  console.log('MongoDB connection closed.');
  process.exit(0);
}

main().catch(err => {
  console.error('Error during data import:', err);
  process.exit(1);
});
