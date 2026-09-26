import { NextResponse } from 'next/server';

/* eslint-disable @typescript-eslint/no-explicit-any */

/**
 * Gateway API Proxy — Vercel SSR layer.
 * Instead of connecting to InfluxDB directly, the Dashboard
 * proxies requests through the Raspberry Pi Gateway's REST API.
 * This keeps InfluxDB completely private (never exposed to the internet).
 */

const GATEWAY_URL = process.env.GATEWAY_URL || '';
const GATEWAY_API_KEY = process.env.GATEWAY_API_KEY || '';

async function gatewayFetch(path: string): Promise<Response> {
  const headers: Record<string, string> = {};
  if (GATEWAY_API_KEY) {
    headers['x-api-key'] = GATEWAY_API_KEY;
  }
  return fetch(`${GATEWAY_URL}${path}`, {
    headers,
    cache: 'no-store',
    signal: AbortSignal.timeout(10000), // 4G timeout tolerance
  });
}

export async function GET(request: Request) {
  const { searchParams } = new URL(request.url);
  const mode = searchParams.get('mode') || 'latest';

  try {
    if (mode === 'history') {
      const seconds = searchParams.get('seconds') || '3600';
      const minutes = Math.ceil(
        Math.min(Math.max(parseInt(seconds, 10) || 3600, 10), 86400) / 60
      );

      const res = await gatewayFetch(`/api/telemetry/history?minutes=${minutes}`);
      if (!res.ok) {
        return NextResponse.json(
          { error: 'Gateway unreachable', status: res.status },
          { status: 502 }
        );
      }

      const rows = await res.json();

      // Gateway format → Dashboard format transformation
      const data = Array.isArray(rows)
        ? rows.map((r: Record<string, any>) => ({
            timestamp: r._time ? new Date(r._time as string).getTime() : Date.now(),
            speed: Number(r.speed || 0),
            rpm: Number(r.rpm || 0),
            motor_temp: Number(r.motor_temp || 0),
            battery_voltage: Number(r.battery_voltage || 0),
            throttle: Number(r.throttle || 0),
            vehicle_state: (r.vehicle_state as string) || 'Offline',
            inverter_status: (r.inverter_status as string) || 'Offline',
            fault: r.fault === 'true' || r.fault === true,
            fault_type: (r.fault_type as string) || 'None',
          }))
        : [];

      return NextResponse.json({ count: data.length, data });
    }

    // mode === 'latest'
    const res = await gatewayFetch('/api/telemetry/latest');
    if (!res.ok) {
      // 404 = no data yet, normal state
      if (res.status === 404) {
        return NextResponse.json({
          vehicle_state: 'Offline',
          info: 'No telemetry data available yet',
        });
      }
      return NextResponse.json(
        { error: 'Gateway unreachable', status: res.status },
        { status: 502 }
      );
    }

    const latestData = await res.json();
    return NextResponse.json({
      ...latestData,
      timestamp: Date.now(),
    });
  } catch (err) {
    const msg = err instanceof Error ? err.message : String(err);
    // 4G timeout or network error — dashboard continues in offline mode
    return NextResponse.json(
      { error: 'Gateway connection failed', detail: msg, vehicle_state: 'Offline' },
      { status: 502 }
    );
  }
}

export async function POST() {
  return NextResponse.json(
    {
      error:
        'POST method via REST API is disabled. Telemetry Gateway streams directly to InfluxDB and Socket.io for performance reasons.',
    },
    { status: 405 }
  );
}
