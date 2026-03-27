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
  lap: number; // For dynamic lap tracking
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
  laps: number[]; // Added lap tracking to history to segment charts dynamically
  lastUpdated: number; // React Compiler bypass tick
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
  fault: false, fault_type: 'None', lap: 1
};

const emptyHistory: TelemetryHistory = {
  time: [], speed: [], rpm: [], motor_temp: [], battery_voltage: [], throttle: [], laps: [], lastUpdated: 0
};

const MAX_HISTORY_POINTS = 1200; // 10 Laps (120 points per lap)
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

    socket.on('telemetry_update', (incomingData: Partial<TelemetryData> & { lap_trigger?: boolean }) => {
      const now = Math.floor(Date.now() / 1000);

      set((state) => {
        // Dynamic Lap Detection: If hardware sends a lap_trigger or lap counter
        let currentLap = state.data.lap;
        if (incomingData.lap_trigger === true) {
          currentLap++;
        } else if (incomingData.lap && incomingData.lap > currentLap) {
          currentLap = incomingData.lap;
        }

        const newData: TelemetryData = {
          ...state.data,
          ...incomingData,
          lap: currentLap
        };

        // 2. GARBAGE COLLECTION OPTIMIZATION: Ring Buffer / Mutable Arrays
        // Mutate array references directly instead of cloning with spread operator
        const h = state.history;
        h.time.push(now);
        h.speed.push(newData.speed);
        h.rpm.push(newData.rpm);
        h.motor_temp.push(newData.motor_temp);
        h.battery_voltage.push(newData.battery_voltage);
        h.throttle.push(newData.throttle);
        h.laps.push(currentLap);

        if (h.time.length > MAX_HISTORY_POINTS) {
          h.time.shift();
          h.speed.shift();
          h.rpm.shift();
          h.motor_temp.shift();
          h.battery_voltage.shift();
          h.throttle.shift();
          h.laps.shift();
        }
        
        h.lastUpdated = now; // Update primitive tick for components to know arrays mutated

        // Fault management
        let newFaultLog = state.faultLog;
        if (newData.fault && newData.fault_type !== 'None') {
          const lastFault = state.faultLog[0];
          if (!lastFault || lastFault.type !== newData.fault_type || (now - lastFault.timestamp) > 5) {
            newFaultLog = [
              { timestamp: now, type: newData.fault_type, message: `${newData.fault_type} detected` },
              ...state.faultLog
            ].slice(0, MAX_FAULT_LOG);
          }
        }

        return {
          data: newData,
          history: { ...h }, // Shallow clone the top-level object to notify React of updates
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