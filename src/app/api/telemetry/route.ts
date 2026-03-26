import { NextResponse } from 'next/server';

// In-memory telemetry store for the REST API
// This holds the latest telemetry data received via the API
let latestTelemetry = {
  rpm: 0,
  speed: 0,
  motor_temp: 20,
  battery_voltage: 0,
  throttle: 0,
  vehicle_state: 'Offline',
  inverter_status: 'Offline',
  fault: false,
  fault_type: 'None',
  timestamp: Date.now(),
};

const telemetryHistory: Array<typeof latestTelemetry> = [];
const MAX_HISTORY = 500;

// GET /api/telemetry — Get latest telemetry data or history
export async function GET(request: Request) {
  const { searchParams } = new URL(request.url);
  const mode = searchParams.get('mode') || 'latest';
  const limit = Math.min(parseInt(searchParams.get('limit') || '100'), MAX_HISTORY);
  const format = searchParams.get('format') || 'json';

  if (mode === 'history') {
    const data = telemetryHistory.slice(-limit);

    if (format === 'csv') {
      const headers = 'timestamp,speed,rpm,motor_temp,battery_voltage,throttle,vehicle_state,inverter_status,fault,fault_type\n';
      const rows = data.map(d =>
        `${d.timestamp},${d.speed},${d.rpm},${d.motor_temp},${d.battery_voltage},${d.throttle},${d.vehicle_state},${d.inverter_status},${d.fault},${d.fault_type}`
      ).join('\n');
      return new NextResponse(headers + rows, {
        headers: {
          'Content-Type': 'text/csv',
          'Access-Control-Allow-Origin': '*',
        },
      });
    }

    return NextResponse.json({
      count: data.length,
      data,
    }, {
      headers: { 'Access-Control-Allow-Origin': '*' },
    });
  }

  // Default: latest
  return NextResponse.json(latestTelemetry, {
    headers: { 'Access-Control-Allow-Origin': '*' },
  });
}

// POST /api/telemetry — Push new telemetry data
export async function POST(request: Request) {
  try {
    const body = await request.json();
    latestTelemetry = {
      rpm: body.rpm ?? latestTelemetry.rpm,
      speed: body.speed ?? latestTelemetry.speed,
      motor_temp: body.motor_temp ?? latestTelemetry.motor_temp,
      battery_voltage: body.battery_voltage ?? latestTelemetry.battery_voltage,
      throttle: body.throttle ?? latestTelemetry.throttle,
      vehicle_state: body.vehicle_state ?? latestTelemetry.vehicle_state,
      inverter_status: body.inverter_status ?? latestTelemetry.inverter_status,
      fault: body.fault ?? latestTelemetry.fault,
      fault_type: body.fault_type ?? latestTelemetry.fault_type,
      timestamp: Date.now(),
    };

    telemetryHistory.push({ ...latestTelemetry });
    if (telemetryHistory.length > MAX_HISTORY) {
      telemetryHistory.shift();
    }

    return NextResponse.json({ success: true, data: latestTelemetry }, {
      headers: { 'Access-Control-Allow-Origin': '*' },
    });
  } catch {
    return NextResponse.json({ error: 'Invalid JSON body' }, {
      status: 400,
      headers: { 'Access-Control-Allow-Origin': '*' },
    });
  }
}

// OPTIONS for CORS
export async function OPTIONS() {
  return new NextResponse(null, {
    status: 204,
    headers: {
      'Access-Control-Allow-Origin': '*',
      'Access-Control-Allow-Methods': 'GET, POST, OPTIONS',
      'Access-Control-Allow-Headers': 'Content-Type',
    },
  });
}
