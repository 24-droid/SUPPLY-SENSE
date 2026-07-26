const mongoose = require('mongoose');

// Product (SKU) Schema
const ProductSchema = new mongoose.Schema({
  productId: { type: String, required: true, unique: true },
  name: { type: String, required: true },
  category: { type: String, required: true },
  price: { type: Number, required: true },
  status: { type: String, default: 'Healthy' }, // Healthy, Low Stock, Out of Stock, Overstocked
  leadTimeDays: { type: Number, default: 4 }, // Average lead time based on historical order schedules
  safetyStock: { type: Number, default: 0 },
  reorderPoint: { type: Number, default: 0 },
  eoq: { type: Number, default: 0 },
  abcClass: { type: String, default: 'C' }, // A, B, or C classification
  annualDemand: { type: Number, default: 0 }
}, { timestamps: true });

// Order / Shipment Schema
const OrderSchema = new mongoose.Schema({
  orderId: { type: String, required: true },
  orderItemId: { type: String, required: true, unique: true },
  customerId: { type: String },
  customerCity: { type: String },
  customerCountry: { type: String },
  orderDate: { type: Date, required: true },
  shippingDate: { type: Date },
  scheduledDays: { type: Number },
  realDays: { type: Number },
  deliveryStatus: { type: String }, // Late delivery, Advance shipping, Shipping on time, Shipping canceled
  lateRisk: { type: Boolean, default: false },
  shippingMode: { type: String }, // Standard Class, Second Class, First Class, Same Day
  sales: { type: Number },
  profit: { type: Number },
  productId: { type: String, required: true },
  quantity: { type: Number, default: 1 }
}, { timestamps: true });

// Sales History Schema (for forecasting aggregations)
const SalesHistorySchema = new mongoose.Schema({
  productId: { type: String, required: true },
  year: { type: Number, required: true },
  month: { type: Number, required: true }, // 1-indexed (1-12)
  totalSales: { type: Number, required: true },
  quantitySold: { type: Number, required: true }
}, { timestamps: true });

// Indexes for performance
OrderSchema.index({ orderId: 1 });
OrderSchema.index({ productId: 1 });
SalesHistorySchema.index({ productId: 1, year: 1, month: 1 }, { unique: true });
ProductSchema.index({ category: 1 });

const Product = mongoose.model('Product', ProductSchema);
const Order = mongoose.model('Order', OrderSchema);
const SalesHistory = mongoose.model('SalesHistory', SalesHistorySchema);

module.exports = { Product, Order, SalesHistory };
