import { create } from 'zustand';
import { io, Socket } from 'socket.io-client';

export interface TelemetryData {
  rpm: number;
  speed: number;
  motor_temp: number;
  battery_voltage: number;
  throttle: number;
  vehicle_state: string;
  inverter_status: string;
  fault: boolean;
  fault_type: string;
}

export interface FaultLogEntry {
  timestamp: number;
  type: string;
  message: string;
}

// Historical data buffer structure for charts
interface TelemetryHistory {
  time: number[];
  speed: number[];
  rpm: number[];
  motor_temp: number[];
  battery_voltage: number[];
  throttle: number[];
}

interface TelemetryStore {
  data: TelemetryData;
  history: TelemetryHistory;
  faultLog: FaultLogEntry[];
  isConnected: boolean;
  socket: Socket | null;
  connect: () => void;
  disconnect: () => void;
  clearFaultLog: () => void;
}

const initialData: TelemetryData = {
  rpm: 0, speed: 0, motor_temp: 20, battery_voltage: 0,
  throttle: 0, vehicle_state: 'Offline', inverter_status: 'Offline',
  fault: false, fault_type: 'None'
};

const emptyHistory: TelemetryHistory = {
  time: [], speed: [], rpm: [], motor_temp: [], battery_voltage: [], throttle: []
};

const MAX_HISTORY_POINTS = 1200; // 10 Laps (120 points per lap)
const POINTS_PER_LAP = 120;
const MAX_FAULT_LOG = 50;

const SOCKET_URL = process.env.NEXT_PUBLIC_SOCKET_URL || 'http://localhost:3001';

export const useTelemetryStore = create<TelemetryStore>((set, get) => ({
  data: initialData,
  history: { ...emptyHistory },
  faultLog: [],
  isConnected: false,
  socket: null,

  connect: () => {
    if (get().socket) return;

    const socket = io(SOCKET_URL, {
      transports: ['websocket'],
      reconnection: true,
      reconnectionDelay: 1000,
      reconnectionDelayMax: 5000,
      reconnectionAttempts: Infinity,
    });

    socket.on('connect', () => {
      set({ isConnected: true, socket });
    });

    socket.on('disconnect', () => {
      set({ isConnected: false });
    });

    socket.on('telemetry_update', (newData: TelemetryData) => {
      const now = Math.floor(Date.now() / 1000);

      set((state) => {
        const h = state.history;
        const newHistory: TelemetryHistory = {
          time: [...h.time, now].slice(-MAX_HISTORY_POINTS),
          speed: [...h.speed, newData.speed].slice(-MAX_HISTORY_POINTS),
          rpm: [...h.rpm, newData.rpm].slice(-MAX_HISTORY_POINTS),
          motor_temp: [...h.motor_temp, newData.motor_temp].slice(-MAX_HISTORY_POINTS),
          battery_voltage: [...h.battery_voltage, newData.battery_voltage].slice(-MAX_HISTORY_POINTS),
          throttle: [...h.throttle, newData.throttle].slice(-MAX_HISTORY_POINTS),
        };

        // Fault management: append new faults if detected
        let newFaultLog = state.faultLog;
        if (newData.fault && newData.fault_type !== 'None') {
          const lastFault = state.faultLog[0];
          // Prevent duplicate logs for the same continuous fault
          if (!lastFault || lastFault.type !== newData.fault_type || (now - lastFault.timestamp) > 5) {
            newFaultLog = [
              { timestamp: now, type: newData.fault_type, message: `${newData.fault_type} detected` },
              ...state.faultLog
            ].slice(0, MAX_FAULT_LOG);
          }
        }

        return {
          data: newData,
          history: newHistory,
          faultLog: newFaultLog,
        };
      });
    });
  },

  disconnect: () => {
    const { socket } = get();
    if (socket) {
      socket.disconnect();
      set({
        socket: null,
        isConnected: false,
        // Keep telemetry history in memory to persist data across route transitions
      });
    }
  },

  clearFaultLog: () => {
    set({ faultLog: [] });
  },
}));