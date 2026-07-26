/**
 * AI Engine for SupplySense - Handles inventory optimizations and forecasting computations.
 */

/**
 * Calculates the Economic Order Quantity (EOQ) and total cost variables
 * Formula: EOQ = sqrt( (2 * D * S) / H )
 * D = Annual Demand (units)
 * S = Setup/Order Cost ($ per order)
 * H = Holding/Carrying Cost ($ per unit per year)
 */
function calculateEOQ(annualDemand, setupCost, holdingCostUnit) {
  const d = Math.max(annualDemand, 0);
  const s = Math.max(setupCost, 0);
  const h = Math.max(holdingCostUnit, 0.01); // Avoid division by zero

  const eoq = Math.round(Math.sqrt((2 * d * s) / h)) || 1;
  
  // Return extra details for plotting cost curves
  const orderFrequencies = [];
  const holdingCosts = [];
  const orderingCosts = [];
  const totalCosts = [];

  // Generate range of order sizes around the EOQ to plot curves
  const minOrderSize = Math.max(Math.round(eoq * 0.2), 1);
  const maxOrderSize = Math.round(eoq * 2);
  const step = Math.max(Math.round((maxOrderSize - minOrderSize) / 20), 1);

  for (let q = minOrderSize; q <= maxOrderSize; q += step) {
    const ordersPerYear = d / q;
    const annualOrderingCost = ordersPerYear * s;
    const annualHoldingCost = (q / 2) * h;
    const totalCost = annualOrderingCost + annualHoldingCost;

    orderFrequencies.push(q);
    orderingCosts.push(Math.round(annualOrderingCost));
    holdingCosts.push(Math.round(annualHoldingCost));
    totalCosts.push(Math.round(totalCost));
  }

  return {
    eoq,
    curve: {
      orderSizes: orderFrequencies,
      orderingCost: orderingCosts,
      holdingCost: holdingCosts,
      totalCost: totalCosts
    }
  };
}

/**
 * Calculates Safety Stock and Reorder Point (ROP)
 * Formula: ROP = (Average Daily Demand * Lead Time) + Safety Stock
 * Safety Stock = Z-score * StdDev of Demand * sqrt(Lead Time)
 */
function calculateROP(dailyDemand, leadTimeDays, monthlySalesHistory = []) {
  const L = Math.max(leadTimeDays, 1);
  
  // Calculate demand variance if history is provided, else fallback to a rule of thumb
  let demandStdDev = dailyDemand * 0.2; // default: 20% volatility
  if (monthlySalesHistory.length > 1) {
    const quantities = monthlySalesHistory.map(h => h.quantitySold / 30); // approximate daily
    const mean = quantities.reduce((a, b) => a + b, 0) / quantities.length;
    const variance = quantities.reduce((a, b) => a + Math.pow(b - mean, 2), 0) / (quantities.length - 1);
    demandStdDev = Math.sqrt(variance) || (dailyDemand * 0.2);
  }

  // Z-Score for a 95% service level is typically 1.65
  const Z = 1.65;
  const safetyStock = Math.round(Z * demandStdDev * Math.sqrt(L)) || 5;
  const reorderPoint = Math.round((dailyDemand * L) + safetyStock);

  return {
    safetyStock,
    reorderPoint
  };
}

/**
 * Forecasts monthly sales demand for the next N months using Decomposition Method
 * (Linear Trend + Monthly Seasonality)
 * 
 * @param {Array} history - Array of historical sales: { year, month, totalSales, quantitySold }
 * @param {Number} forecastMonths - How many months into the future to predict (default: 6)
 * @param {Object} modifiers - Scenario sliders: seasonalityBoost (1.0 default), marketingLift (0.0 default), marketTrend (0.0 default)
 */
function predictDemand(history = [], forecastMonths = 6, modifiers = {}) {
  const seasonalityBoost = parseFloat(modifiers.seasonalityBoost) ?? 1.0;
  const marketingLift = parseFloat(modifiers.marketingLift) ?? 0.0;
  const marketTrend = parseFloat(modifiers.marketTrend) ?? 0.0; // annual market growth percentage (e.g. 0.05 = +5%)

  // Sort history chronologically
  const sortedHistory = [...history].sort((a, b) => {
    if (a.year !== b.year) return a.year - b.year;
    return a.month - b.month;
  });

  if (sortedHistory.length < 3) {
    // Fallback: not enough data to forecast, return flat values with minor variance
    const defaultQty = sortedHistory.length > 0 ? sortedHistory[0].quantitySold : 50;
    const defaultSales = sortedHistory.length > 0 ? sortedHistory[0].totalSales : 1000;
    
    const results = [];
    let currentMonth = sortedHistory.length > 0 ? sortedHistory[sortedHistory.length - 1].month : 1;
    let currentYear = sortedHistory.length > 0 ? sortedHistory[sortedHistory.length - 1].year : 2018;

    for (let i = 1; i <= forecastMonths; i++) {
      currentMonth++;
      if (currentMonth > 12) {
        currentMonth = 1;
        currentYear++;
      }
      results.push({
        year: currentYear,
        month: currentMonth,
        quantitySold: Math.round(defaultQty * (1 + marketingLift)),
        totalSales: Math.round(defaultSales * (1 + marketingLift)),
        isForecast: true,
        lowerQty: Math.round(defaultQty * 0.7),
        upperQty: Math.round(defaultQty * 1.3)
      });
    }
    return results;
  }

  // 1. Compute Linear Trend: Sales = a + b * t
  // t is time index (1, 2, ..., N)
  const n = sortedHistory.length;
  let sumT = 0;
  let sumY = 0;
  let sumTT = 0;
  let sumTY = 0;

  for (let i = 0; i < n; i++) {
    const t = i + 1;
    const y = sortedHistory[i].quantitySold;
    sumT += t;
    sumY += y;
    sumTT += t * t;
    sumTY += t * y;
  }

  const b = (n * sumTY - sumT * sumY) / (n * sumTT - sumT * sumT);
  const a = (sumY - b * sumT) / n;

  // 2. Compute Seasonality Factors (12-month)
  const monthlyRatios = {};
  for (let m = 1; m <= 12; m++) {
    monthlyRatios[m] = [];
  }

  for (let i = 0; i < n; i++) {
    const t = i + 1;
    const trendValue = a + b * t;
    const actualValue = sortedHistory[i].quantitySold;
    const ratio = trendValue > 0 ? actualValue / trendValue : 1;
    
    const month = sortedHistory[i].month;
    monthlyRatios[month].push(ratio);
  }

  // Average seasonal factor for each month
  const seasonalIndices = {};
  for (let m = 1; m <= 12; m++) {
    const ratios = monthlyRatios[m];
    if (ratios.length > 0) {
      const avg = ratios.reduce((sum, r) => sum + r, 0) / ratios.length;
      seasonalIndices[m] = avg;
    } else {
      seasonalIndices[m] = 1.0;
    }
  }

  // Normalize seasonal indices so they sum to 12
  const sumIndices = Object.values(seasonalIndices).reduce((sum, idx) => sum + idx, 0);
  for (let m = 1; m <= 12; m++) {
    seasonalIndices[m] = (seasonalIndices[m] / sumIndices) * 12;
  }

  // Calculate standard deviation of historical residuals to build confidence intervals
  let residualsSumSq = 0;
  for (let i = 0; i < n; i++) {
    const t = i + 1;
    const month = sortedHistory[i].month;
    const predicted = (a + b * t) * seasonalIndices[month];
    residualsSumSq += Math.pow(sortedHistory[i].quantitySold - predicted, 2);
  }
  const stdDev = Math.sqrt(residualsSumSq / (n - 2)) || 10;

  // 3. Project Future Months
  const forecasts = [];
  let lastRecord = sortedHistory[n - 1];
  let currentYear = lastRecord.year;
  let currentMonth = lastRecord.month;

  for (let i = 1; i <= forecastMonths; i++) {
    currentMonth++;
    if (currentMonth > 12) {
      currentMonth = 1;
      currentYear++;
    }

    const t = n + i;
    // Base linear trend projection
    let baseQty = a + b * t;
    
    // Apply market growth trend modifier (yearly compound, e.g. marketTrend = 0.05)
    const yearsAhead = i / 12;
    baseQty = baseQty * (1 + marketTrend * yearsAhead);

    // Apply seasonality component with boost slider
    const sIndex = seasonalIndices[currentMonth];
    // Boost shifts index further away from 1.0 (mean)
    // sIndex = 1.2, boost = 1.5 -> newSIndex = 1 + (1.2 - 1) * 1.5 = 1 + 0.2 * 1.5 = 1.3
    const boostedSIndex = 1 + (sIndex - 1) * seasonalityBoost;

    // Projected quantity (combining baseline, seasonality and marketing promotions lift)
    let predictedQty = baseQty * boostedSIndex * (1 + marketingLift);
    predictedQty = Math.max(Math.round(predictedQty), 0);

    // Standard error margins grow as we forecast further out (square root of time elapsed)
    const zScore = 1.65; // 90% confidence interval
    const forecastError = stdDev * Math.sqrt(i);
    const upperQty = Math.max(Math.round(predictedQty + zScore * forecastError), 0);
    const lowerQty = Math.max(Math.round(predictedQty - zScore * forecastError), 0);

    // Estimate total monetary sales (assume same average price/unit in history)
    const avgUnitPrice = lastRecord.totalSales / lastRecord.quantitySold || 10;
    const predictedSales = Math.round(predictedQty * avgUnitPrice);

    forecasts.push({
      year: currentYear,
      month: currentMonth,
      quantitySold: predictedQty,
      totalSales: predictedSales,
      isForecast: true,
      lowerQty,
      upperQty
    });
  }

  return forecasts;
}

module.exports = {
  calculateEOQ,
  calculateROP,
  predictDemand
};
