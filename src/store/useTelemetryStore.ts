import { create, StoreApi } from 'zustand';
import { parseTelemetryPacket } from '../utils/telemetryParser';
import { saveSessionData, getSessionData } from '../utils/idb';

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------

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
  lap: number;
}

export interface FaultLogEntry {
  timestamp: number;
  type: string;
  message: string;
}

// History arrays are Float64Array for O(1) ring-buffer access (no GC, no shift())
interface TelemetryHistory {
  time: Float64Array;
  speed: Float64Array;
  rpm: Float64Array;
  motor_temp: Float64Array;
  battery_voltage: Float64Array;
  throttle: Float64Array;
  laps: Float64Array;
  lastUpdated: number;
}

interface TelemetryStore {
  data: TelemetryData;
  history: TelemetryHistory;
  faultLog: FaultLogEntry[];
  isConnected: boolean;
  ws: WebSocket | null;
  uiRefreshRate: number;
  setUiRefreshRate: (ms: number) => void;
  connect: () => void;
  disconnect: () => void;
  clearFaultLog: () => void;
  hydrateFromInflux: () => Promise<void>;
  restoreFromBlackbox: () => Promise<void>;
}

// ---------------------------------------------------------------------------
// Constants
// ---------------------------------------------------------------------------

const MAX_HISTORY_POINTS = 54_000; // ~15 min at 60 Hz
const MAX_FAULT_LOG      = 50;
const MAX_SOA            = 512;    // max incoming packets between flushes

const getWsUrl = (): string => {
  if (process.env.NEXT_PUBLIC_WS_URL) return process.env.NEXT_PUBLIC_WS_URL;
  if (typeof window === 'undefined') return 'ws://localhost:3005';
  if (window.location.protocol === 'https:') return `wss://${window.location.host}`;
  return `ws://${window.location.hostname}:3005`;
};

const WS_URL = getWsUrl();

const HISTORY_WINDOW_SEC = Math.min(
  Math.max(parseInt(process.env.NEXT_PUBLIC_HISTORY_WINDOW_SEC || '28800', 10) || 28800, 60),
  86400
);

// ---------------------------------------------------------------------------
// ⚡ Optimisation #1 — Pre-allocated TypedArray Ring Buffer
//
// Replaces the old Array.shift() pattern (O(N)) with a circular write pointer (O(1)).
// The underlying buffers are allocated ONCE at module load time — zero GC pressure
// during a live session.
//
// Fast-path read (not wrapped)  → O(1) subarray() view, no copy
// Slow-path read (wrapped, i.e. buffer full after ~3.75 hrs at 250 ms flush rate)
//   → one-time O(N) TypedArray.set() copy, still much faster than repeated shift()
// ---------------------------------------------------------------------------

const RING = MAX_HISTORY_POINTS;

const ringTime            = new Float64Array(RING);
const ringSpeed           = new Float64Array(RING);
const ringRpm             = new Float64Array(RING);
const ringMotorTemp       = new Float64Array(RING);
const ringBatteryVoltage  = new Float64Array(RING);
const ringThrottle        = new Float64Array(RING);
const ringLaps            = new Float64Array(RING);

let ringHead  = 0; // index of the oldest element
let ringCount = 0; // number of valid elements (0 … RING)

/** O(1) — writes one point; evicts oldest when buffer is full */
function ringPush(
  t: number, s: number, r: number, mt: number,
  bv: number, th: number, lap: number
) {
  const idx = (ringHead + ringCount) % RING;
  ringTime[idx]           = t;
  ringSpeed[idx]          = s;
  ringRpm[idx]            = r;
  ringMotorTemp[idx]      = mt;
  ringBatteryVoltage[idx] = bv;
  ringThrottle[idx]       = th;
  ringLaps[idx]           = lap;

  if (ringCount < RING) {
    ringCount++;
  } else {
    // Buffer full → advance head, implicitly evicts the oldest element
    ringHead = (ringHead + 1) % RING;
  }
}

/** Returns sorted (time-ordered) Float64Array views.
 *  Fast path (not wrapped): O(1) subarray — zero allocation.
 *  Slow path (wrapped, buffer full): O(N) copy — happens only after hours of data. */
function ringSnapshot(): Omit<TelemetryHistory, 'lastUpdated'> {
  if (ringCount === 0) {
    const e = new Float64Array(0);
    return { time: e, speed: e, rpm: e, motor_temp: e, battery_voltage: e, throttle: e, laps: e };
  }

  const tail = (ringHead + ringCount) % RING;

  // Fast path: data is contiguous (buffer not yet full, or perfectly aligned)
  if (ringHead < tail) {
    return {
      time:            ringTime.subarray(ringHead, tail),
      speed:           ringSpeed.subarray(ringHead, tail),
      rpm:             ringRpm.subarray(ringHead, tail),
      motor_temp:      ringMotorTemp.subarray(ringHead, tail),
      battery_voltage: ringBatteryVoltage.subarray(ringHead, tail),
      throttle:        ringThrottle.subarray(ringHead, tail),
      laps:            ringLaps.subarray(ringHead, tail),
    };
  }

  // Slow path: buffer has wrapped — produce a sorted copy
  const firstLen = RING - ringHead;
  const out = {
    time:            new Float64Array(RING),
    speed:           new Float64Array(RING),
    rpm:             new Float64Array(RING),
    motor_temp:      new Float64Array(RING),
    battery_voltage: new Float64Array(RING),
    throttle:        new Float64Array(RING),
    laps:            new Float64Array(RING),
  };
  out.time.set(ringTime.subarray(ringHead), 0);            out.time.set(ringTime.subarray(0, tail), firstLen);
  out.speed.set(ringSpeed.subarray(ringHead), 0);          out.speed.set(ringSpeed.subarray(0, tail), firstLen);
  out.rpm.set(ringRpm.subarray(ringHead), 0);              out.rpm.set(ringRpm.subarray(0, tail), firstLen);
  out.motor_temp.set(ringMotorTemp.subarray(ringHead), 0); out.motor_temp.set(ringMotorTemp.subarray(0, tail), firstLen);
  out.battery_voltage.set(ringBatteryVoltage.subarray(ringHead), 0); out.battery_voltage.set(ringBatteryVoltage.subarray(0, tail), firstLen);
  out.throttle.set(ringThrottle.subarray(ringHead), 0);    out.throttle.set(ringThrottle.subarray(0, tail), firstLen);
  out.laps.set(ringLaps.subarray(ringHead), 0);            out.laps.set(ringLaps.subarray(0, tail), firstLen);
  return out;
}

/** Clears the ring buffer (used when loading fresh data from Influx or Blackbox) */
function ringReset() {
  ringHead  = 0;
  ringCount = 0;
}

// ---------------------------------------------------------------------------
// ⚡ Optimisation #5 — Struct-of-Arrays (SoA) Incoming Buffer
//
// Old approach: each packet created a new JS object → heap allocation + GC pressure.
//   `incomingBuffer.push({ rpm, speed, ... })` → 60 objects/sec
//
// New approach: pre-allocated TypedArrays indexed by a length counter.
//   Writing one packet = 6 typed array writes + 1 integer increment → ZERO allocation.
//   Clearing = resetting one integer → O(1).
// ---------------------------------------------------------------------------

const soaRpm            = new Float64Array(MAX_SOA);
const soaSpeed          = new Float64Array(MAX_SOA);
const soaMotorTemp      = new Float64Array(MAX_SOA);
const soaBatteryVoltage = new Float64Array(MAX_SOA);
const soaThrottle       = new Float64Array(MAX_SOA);
const soaFaultCode      = new Uint32Array(MAX_SOA);  // raw fault code, 0 = no fault
let soaLen              = 0;

let rafId: number | null = null;
let lastFlushTime        = 0;
let reconnectDelay       = 500;
let reconnectTimer: ReturnType<typeof setTimeout> | null = null;

// ---------------------------------------------------------------------------
// Buffer flush
// ---------------------------------------------------------------------------

const flushBuffer = (
  set: StoreApi<TelemetryStore>['setState'],
  get: StoreApi<TelemetryStore>['getState']
) => {
  if (soaLen === 0) return;

  const state = get() as TelemetryStore;
  const len   = soaLen;
  soaLen      = 0; // ⚡ O(1) clear — just reset the length counter

  let sumSpeed = 0, sumRpm = 0, maxTemp = -Infinity, sumBatt = 0, sumThrottle = 0;
  let hasFault = false, maxFaultCode = 0;

  for (let i = 0; i < len; i++) {
    sumSpeed    += soaSpeed[i];
    sumRpm      += soaRpm[i];
    if (soaMotorTemp[i] > maxTemp) maxTemp = soaMotorTemp[i];
    sumBatt     += soaBatteryVoltage[i];
    sumThrottle += soaThrottle[i];
    if (soaFaultCode[i] > 0) {
      hasFault = true;
      if (soaFaultCode[i] > maxFaultCode) maxFaultCode = soaFaultCode[i];
    }
  }

  const avgSpeed    = sumSpeed    / len;
  const avgRpm      = sumRpm      / len;
  const avgTemp     = maxTemp === -Infinity ? state.data.motor_temp : maxTemp;
  const avgBatt     = sumBatt     / len;
  const avgThrottle = sumThrottle / len;
  const faultType   = hasFault ? `FAULT_${maxFaultCode}` : 'None';

  // Push ONE downsampled point into the ring buffer (O(1)!)
  const now          = Date.now() / 1000;
  const lastTime     = ringCount > 0 ? ringTime[(ringHead + ringCount - 1) % RING] : 0;
  const finalTime    = now <= lastTime ? lastTime + 0.001 : now;

  ringPush(finalTime, avgSpeed, avgRpm, avgTemp, avgBatt, avgThrottle, state.data.lap);
  const snap = ringSnapshot();

  const latestData: TelemetryData = {
    ...state.data,
    speed:           avgSpeed,
    rpm:             avgRpm,
    motor_temp:      avgTemp,
    battery_voltage: avgBatt,
    throttle:        avgThrottle,
    fault:           hasFault,
    fault_type:      faultType,
  };

  // Fault log management
  let newFaultLog    = state.faultLog;
  const prevFaultType = state.data.fault_type;

  if (hasFault && faultType !== 'None' && prevFaultType !== faultType) {
    newFaultLog = [
      { timestamp: now, type: faultType, message: `${faultType} detected` },
      ...newFaultLog,
    ].slice(0, MAX_FAULT_LOG);
  } else if (!hasFault && prevFaultType !== 'None') {
    newFaultLog = [
      { timestamp: now, type: 'RESOLVED', message: `${prevFaultType} cleared` },
      ...newFaultLog,
    ].slice(0, MAX_FAULT_LOG);
  }

  set({
    data:     latestData,
    history:  { ...snap, lastUpdated: now },
    faultLog: newFaultLog,
  });
};

// ---------------------------------------------------------------------------
// rAF render loop
// ---------------------------------------------------------------------------

const startRenderLoop = (
  set: StoreApi<TelemetryStore>['setState'],
  get: StoreApi<TelemetryStore>['getState']
) => {
  if (rafId) return;

  const loop = () => {
    const now  = Date.now();
    const rate = get().uiRefreshRate;
    if (now - lastFlushTime >= rate) {
      flushBuffer(set, get);
      lastFlushTime = now;
    }
    rafId = requestAnimationFrame(loop);
  };
  rafId = requestAnimationFrame(loop);

  // Blackbox auto-save (every 10 s) — persists to IndexedDB
  if (!(window as any).__blackboxInterval) {
    (window as any).__blackboxInterval = setInterval(async () => {
      const state = get();
      if (state.history.time.length > 0) {
        try {
          // Convert to regular arrays for broad IndexedDB compatibility
          await saveSessionData('blackbox_recovery', {
            time:            Array.from(state.history.time),
            speed:           Array.from(state.history.speed),
            rpm:             Array.from(state.history.rpm),
            motor_temp:      Array.from(state.history.motor_temp),
            battery_voltage: Array.from(state.history.battery_voltage),
            throttle:        Array.from(state.history.throttle),
            laps:            Array.from(state.history.laps),
          });
        } catch (e) {
          console.error('[Blackbox] Auto-save failed', e);
        }
      }
    }, 10_000);
  }
};

const stopRenderLoop = () => {
  if (rafId) cancelAnimationFrame(rafId);
  rafId = null;
  if ((window as any).__blackboxInterval) {
    clearInterval((window as any).__blackboxInterval);
    (window as any).__blackboxInterval = null;
  }
};

// ---------------------------------------------------------------------------
// WebSocket factory with exponential-backoff reconnect
// ---------------------------------------------------------------------------

const createWebSocket = (
  set: StoreApi<TelemetryStore>['setState'],
  get: StoreApi<TelemetryStore>['getState']
): WebSocket => {
  if (process.env.NODE_ENV === 'development') {
    console.info(`[WS] Connecting to ${WS_URL}`);
  }

  const ws       = new WebSocket(WS_URL);
  ws.binaryType  = 'arraybuffer'; // CRITICAL — must be set before any message arrives

  ws.onopen = () => {
    reconnectDelay = 500;
    set({ isConnected: true, ws, data: { ...get().data, vehicle_state: 'Live', inverter_status: 'Live' } });
    get().hydrateFromInflux();
    startRenderLoop(set, get);
  };

  ws.onmessage = (event: MessageEvent<ArrayBuffer>) => {
    if (!(event.data instanceof ArrayBuffer) || soaLen >= MAX_SOA) return;

    const packet = parseTelemetryPacket(event.data);
    if (!packet) return;

    // ⚡ SoA write — zero heap allocation (packet object is immediately eligible for GC)
    soaRpm[soaLen]            = packet.rpm;
    soaSpeed[soaLen]          = packet.speed;
    soaMotorTemp[soaLen]      = packet.motor_temp;
    soaBatteryVoltage[soaLen] = packet.battery_voltage;
    soaThrottle[soaLen]       = packet.throttle;
    soaFaultCode[soaLen]      = packet.fault_code;
    soaLen++;
  };

  ws.onerror = (error) => console.error('[WS] Error', error);

  ws.onclose = (event) => {
    if (process.env.NODE_ENV === 'development') {
      console.warn(`[WS] Closed (code=${event.code}). Reconnecting in ${reconnectDelay}ms…`);
    }
    stopRenderLoop();
    set({ isConnected: false, ws: null, data: { ...get().data, vehicle_state: 'Offline', inverter_status: 'Offline' } });
    if (get().ws === null && event.code !== 1000) scheduleReconnect(set, get);
  };

  return ws;
};

const scheduleReconnect = (
  set: StoreApi<TelemetryStore>['setState'],
  get: StoreApi<TelemetryStore>['getState']
) => {
  if (reconnectTimer) clearTimeout(reconnectTimer);
  reconnectTimer = setTimeout(() => {
    reconnectTimer = null;
    const { ws, isConnected } = get();
    if (!ws && !isConnected) set({ ws: createWebSocket(set, get) });
  }, reconnectDelay);
  reconnectDelay = Math.min(reconnectDelay * 2, 8_000);
};

// ---------------------------------------------------------------------------
// Initial state
// ---------------------------------------------------------------------------

const EMPTY_F64 = new Float64Array(0);

const initialData: TelemetryData = {
  rpm: 0, speed: 0, motor_temp: 20, battery_voltage: 0,
  throttle: 0, vehicle_state: 'Offline', inverter_status: 'Offline',
  fault: false, fault_type: 'None', lap: 1,
};

const emptyHistory: TelemetryHistory = {
  time: EMPTY_F64, speed: EMPTY_F64, rpm: EMPTY_F64, motor_temp: EMPTY_F64,
  battery_voltage: EMPTY_F64, throttle: EMPTY_F64, laps: EMPTY_F64, lastUpdated: 0,
};

// ---------------------------------------------------------------------------
// Zustand store
// ---------------------------------------------------------------------------

export const useTelemetryStore = create<TelemetryStore>((set, get) => ({
  data:        initialData,
  history:     { ...emptyHistory },
  faultLog:    [],
  isConnected: false,
  ws:          null,
  uiRefreshRate:
    typeof window !== 'undefined'
      ? Number(localStorage.getItem('kou_refresh_rate')) || 250
      : 250,

  setUiRefreshRate: (ms: number) => {
    if (typeof window !== 'undefined') localStorage.setItem('kou_refresh_rate', String(ms));
    set({ uiRefreshRate: ms });
  },

  // -------------------------------------------------------------------------
  // InfluxDB history hydration — fills ring buffer from REST API
  // -------------------------------------------------------------------------
  hydrateFromInflux: async () => {
    try {
      const res = await fetch(
        `/api/telemetry?mode=history&seconds=${HISTORY_WINDOW_SEC}`,
        { cache: 'no-store' }
      );
      if (!res.ok) return;

      const json = (await res.json()) as {
        data?: Array<{
          timestamp: number; speed: number; rpm: number;
          motor_temp: number; battery_voltage: number; throttle: number;
          vehicle_state: string; inverter_status: string;
          fault: boolean; fault_type: string;
        }>;
      };
      const rows = json.data;
      if (!rows?.length) return;

      rows.sort((a, b) => a.timestamp - b.timestamp);

      const lapVal = get().data.lap;
      ringReset();
      for (let i = 0; i < rows.length; i++) {
        const r = rows[i];
        ringPush(r.timestamp / 1000, r.speed, r.rpm, r.motor_temp, r.battery_voltage, r.throttle, lapVal);
      }
      const snap = ringSnapshot();
      const last  = rows[rows.length - 1];

      set({
        data: {
          rpm: last.rpm, speed: last.speed, motor_temp: last.motor_temp,
          battery_voltage: last.battery_voltage, throttle: last.throttle,
          vehicle_state: last.vehicle_state  || 'Offline',
          inverter_status: last.inverter_status || 'Offline',
          fault: !!last.fault, fault_type: last.fault_type || 'None', lap: lapVal,
        },
        history: { ...snap, lastUpdated: Date.now() / 1000 },
      });
    } catch {
      /* silent — live stream works without history */
    }
  },

  // -------------------------------------------------------------------------
  // Blackbox (IndexedDB) recovery
  // -------------------------------------------------------------------------
  restoreFromBlackbox: async () => {
    try {
      const saved = (await getSessionData('blackbox_recovery')) as any;
      if (!saved?.time?.length) return;

      const lastIdx = saved.time.length - 1;
      ringReset();
      for (let i = 0; i < saved.time.length; i++) {
        ringPush(
          saved.time[i], saved.speed[i], saved.rpm[i], saved.motor_temp[i],
          saved.battery_voltage[i], saved.throttle[i], saved.laps?.[i] ?? 1
        );
      }
      const snap = ringSnapshot();

      set({
        data: {
          ...get().data,
          speed:           saved.speed[lastIdx],
          rpm:             saved.rpm[lastIdx],
          motor_temp:      saved.motor_temp[lastIdx],
          battery_voltage: saved.battery_voltage[lastIdx],
          throttle:        saved.throttle[lastIdx],
          lap:             saved.laps?.[lastIdx] ?? get().data.lap,
        },
        history: { ...snap, lastUpdated: Date.now() / 1000 },
      });
    } catch {
      console.error('[Blackbox] Failed to restore from IndexedDB');
    }
  },

  // -------------------------------------------------------------------------
  // Connection lifecycle
  // -------------------------------------------------------------------------
  connect: () => {
    if (get().ws) return;
    set({ ws: createWebSocket(set, get) });
  },

  disconnect: () => {
    if (reconnectTimer) { clearTimeout(reconnectTimer); reconnectTimer = null; }
    reconnectDelay = 500;
    const { ws } = get();
    if (ws) ws.close(1000, 'User initiated disconnect');
    stopRenderLoop();
    set({ ws: null, isConnected: false });
  },

  clearFaultLog: () => set({ faultLog: [] }),
}));