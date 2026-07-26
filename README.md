# SupplySense: AI-Powered Supply Chain Dashboard

SupplySense is a real-time analytics dashboard and optimization engine for supply chain operations, specializing in **inventory optimization** and **demand prediction**. This project is built using the **MERN Stack** (MongoDB, Express, React, Node.js) and is designed for high-fidelity interactive analysis using actual data from the **Kaggle DataCo Smart Supply Chain** dataset.

## Key Features

1. **Supply Chain KPIs**: Live tracking of Gross Sales, Profit Margins, Late Delivery Rates (%), and Average Lead Times.
2. **AI-Powered Demand Predictor**: Fits a linear trend regression with seasonal indices (12-month decomposition) on historical sales to forecast monthly demand 6 months out. Includes interactive scenario sliders for Seasonality Boost, Marketing Lift, and Macro Growth.
3. **Inventory Optimizer (EOQ & ROP)**: Interactive Economic Order Quantity ($EOQ$) calculator and Safety Stock / Reorder Point ($ROP$) planner with dynamic sliders and cost-curve graph plotting.
4. **Logistics & Supplier Ledger**: Live shipment logs with status checks (In Transit, Delayed, Delivered) and a supplier scorecard rating carrier efficiency.
5. **SupplyAI chatbot**: Natural-language query interface returning inventory diagnostics and reorder recommendations directly from the MongoDB database.

---

## Tech Stack

*   **Frontend**: React (Vite), Chart.js (react-chartjs-2) for visualization, Lucide React for modern iconography, Custom Vanilla CSS Modules (Glassmorphism layout).
*   **Backend**: Node.js, Express.js API, Custom AI prediction models and formula engines.
*   **Database**: MongoDB, Mongoose ODM.
*   **Data Ingestion**: Stream-based CSV parser (`csv-parser`) and buffer batching to handle 180,000+ rows efficiently.

---

## Getting Started & Setup

### 1. Prerequisites
*   Ensure **Node.js** (v16+) is installed.
*   Ensure **MongoDB** is installed and running locally.
    *   *Default connection URL*: `mongodb://localhost:27017/supply_chain_db`
    *   If using MongoDB Atlas, modify the `MONGO_URI` in `server/.env`.

### 2. Download the Kaggle Dataset
1. Download the **DataCo Smart Supply Chain** dataset from Kaggle:
   [DataCo Smart Supply Chain for Big Data Analysis](https://www.kaggle.com/datasets/shashwatwork/dataco-smart-supply-chain-for-big-data-analysis)
2. Create a folder named `data` inside the `/server` directory.
3. Extract and place the file `DataCoSupplyChainDataset.csv` directly into `server/data/`:
   `server/data/DataCoSupplyChainDataset.csv`

### 3. Installation
From the root project directory, run the following command to install all dependencies for both the React client and Express server:
```bash
npm run install:all
```

### 4. Seed the Database
Run the ingestion script to parse the Kaggle CSV file, extract unique products, perform ABC classifications, calculate initial EOQ/ROP, group sales history, and load the collections into MongoDB:
```bash
npm run import
```
*Note: Due to stream-based chunking, this processes all 180,000 rows in less than 30 seconds with minimal memory overhead.*

### 5. Running the Application
Launch both the backend API server and the React dev environment concurrently:
```bash
npm run dev
```
*   **Frontend Client**: `http://localhost:5173`
*   **Backend Express Server**: `http://localhost:5000`

---

## Project Structure

```text
├── client/                     # Vite + React Frontend
│   ├── src/
│   │   ├── components/
│   │   │   ├── OverviewTab.jsx # KPIs, donut chart, high-level forecast, alert feed
│   │   │   ├── InventoryTab.jsx# SKU table & interactive EOQ cost-curve planner
│   │   │   ├── DemandTab.jsx   # Line charts with forecasting confidence envelopes
│   │   │   ├── LogisticsTab.jsx# Shipment timeline & supplier scores bar chart
│   │   │   ├── ChatbotTab.jsx  # SupplyAI chatbot chat UI
│   │   ├── App.jsx             # Shell sidebar routing
│   │   ├── index.css           # Premium glassmorphism dark stylesheet
│   │   └── main.jsx
├── server/                     # Node + Express Backend
│   ├── data/
│   │   └── (DataCoSupplyChainDataset.csv)
│   ├── scripts/
│   │   └── importData.js       # CSV stream data-loader pipeline
│   ├── .env                    # PORT and MONGO_URI setup
│   ├── aiEngine.js             # Statistical forecasting and inventory calculations
│   ├── models.js               # Product, Order, and SalesHistory mongoose models
│   ├── package.json
│   └── server.js               # Express routing
├── package.json                # Root orchestration scripts
└── README.md                   # Project documentation
```
