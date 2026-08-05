import { useState, useEffect, useRef } from 'react';
import { io } from 'socket.io-client';

const SOCKET_URL = import.meta.env.VITE_SOCKET_URL || 'http://localhost:5000';
const MAX_ALERTS = 20;
const MAX_LIVE_ORDERS = 15;

export function useSocket() {
  const socketRef = useRef(null);
  const [isConnected, setIsConnected] = useState(false);
  const [liveAlerts, setLiveAlerts] = useState([]);
  const [liveOrders, setLiveOrders] = useState([]);
  const [stockUpdates, setStockUpdates] = useState({});

  // Running KPI delta totals (accumulated from live events)
  const [kpiDelta, setKpiDelta] = useState({
    additionalSales: 0,
    additionalProfit: 0,
    additionalOrders: 0,
    additionalLateOrders: 0
  });

  useEffect(() => {
    // Create Socket.io connection with polling fallback for serverless environments
    const socket = io(SOCKET_URL, {
      transports: ['polling', 'websocket'],
      reconnection: true,
      reconnectionDelay: 5000,
      reconnectionAttempts: 3,
      timeout: 10000
    });
    socketRef.current = socket;

    socket.on('connect', () => {
      console.log('Socket.io connected:', socket.id);
      setIsConnected(true);
    });

    socket.on('connect_error', (err) => {
      // Gracefully handle serverless environments where persistent sockets are restricted
      setIsConnected(false);
      socket.disconnect(); // Stop continuous console error logs
    });

    socket.on('disconnect', () => {
      setIsConnected(false);
    });

    // Initial stock snapshot from server on first connect
    socket.on('stock_snapshot', (snapshot) => {
      const snapshotMap = {};
      snapshot.forEach(item => {
        snapshotMap[item.productId] = item;
      });
      setStockUpdates(snapshotMap);
    });

    // Live individual stock level updates
    socket.on('stock_update', (update) => {
      setStockUpdates(prev => ({
        ...prev,
        [update.productId]: {
          ...prev[update.productId],
          ...update
        }
      }));
    });

    // Live new order arriving
    socket.on('new_order', (order) => {
      setLiveOrders(prev => {
        const updated = [order, ...prev];
        return updated.slice(0, MAX_LIVE_ORDERS); // Keep only latest N orders
      });
    });

    // Live supply chain alerts
    socket.on('supply_alert', (alert) => {
      setLiveAlerts(prev => {
        const updated = [alert, ...prev];
        return updated.slice(0, MAX_ALERTS); // Keep only latest N alerts
      });
    });

    // Live KPI pulse updates
    socket.on('kpi_update', (update) => {
      setKpiDelta(prev => ({
        additionalSales: prev.additionalSales + update.newOrderSales,
        additionalProfit: prev.additionalProfit + update.newOrderProfit,
        additionalOrders: prev.additionalOrders + 1,
        additionalLateOrders: prev.additionalLateOrders + (update.isLate ? 1 : 0)
      }));
    });

    // Cleanup on unmount
    return () => {
      socket.disconnect();
    };
  }, []);

  return {
    isConnected,
    liveAlerts,
    liveOrders,
    stockUpdates,
    kpiDelta
  };
}
