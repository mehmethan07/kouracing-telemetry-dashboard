import { NextResponse } from 'next/server';
import { InfluxDB } from '@influxdata/influxdb-client';

/* eslint-disable @typescript-eslint/no-explicit-any */

const token = process.env.INFLUX_TOKEN || '';
const org = process.env.INFLUX_ORG || 'KOURACING';
const bucket = process.env.INFLUX_BUCKET || 'telemetry_data';
const url = process.env.INFLUX_URL || 'http://localhost:8086';

const client = new InfluxDB({ url, token });
const queryApi = client.getQueryApi(org);

export async function GET(request: Request) {
  const { searchParams } = new URL(request.url);
  const mode = searchParams.get('mode') || 'latest';
  const limit = Math.min(parseInt(searchParams.get('limit') || '100'), 500);

  try {
    if (mode === 'history') {
      const fluxQuery = `
        from(bucket: "${bucket}")
          |> range(start: -${limit}s)
          |> filter(fn: (r) => r._measurement == "telemetry")
          |> pivot(rowKey:["_time"], columnKey: ["_field"], valueColumn: "_value")
          |> sort(columns: ["_time"], desc: false)
      `;

      const data: any[] = [];
      await new Promise<void>((resolve, reject) => {
        queryApi.queryRows(fluxQuery, {
          next(row: any, tableMeta: any) {
            const o = tableMeta.toObject(row);
            data.push({
              timestamp: new Date(o._time).getTime(),
              speed: Number(o.speed || 0),
              rpm: Number(o.rpm || 0),
              motor_temp: Number(o.motor_temp || 0),
              battery_voltage: Number(o.battery_voltage || 0),
              throttle: Number(o.throttle || 0),
              vehicle_state: o.vehicle_state || 'Offline',
              inverter_status: o.inverter_status || 'Offline',
              fault: o.fault === "true" || o.fault === true,
              fault_type: o.fault_type || 'None'
            });
          },
          error(error: any) { reject(error); },
          complete() { resolve(); }
        });
      });

      return NextResponse.json({ count: data.length, data }, { headers: { 'Access-Control-Allow-Origin': '*' } });
    }

    // Default: latest
    const fluxQueryLatest = `
      from(bucket: "${bucket}")
        |> range(start: -10s)
        |> filter(fn: (r) => r._measurement == "telemetry")
        |> last()
        |> pivot(rowKey:["_time"], columnKey: ["_field"], valueColumn: "_value")
    `;
    const data: any[] = [];
    await new Promise<void>((resolve, reject) => {
      queryApi.queryRows(fluxQueryLatest, {
        next(row: any, tableMeta: any) {
          data.push(tableMeta.toObject(row));
        },
        error(error: any) { reject(error); },
        complete() { resolve(); }
      });
    });

    if (data.length === 0) {
       return NextResponse.json({ vehicle_state: 'Offline', info: 'No recent data in InfluxDB' }, { headers: { 'Access-Control-Allow-Origin': '*' } });
    }

    const o = data[0];
    const latestTelemetry = {
      timestamp: new Date(o._time).getTime(),
      speed: Number(o.speed || 0),
      rpm: Number(o.rpm || 0),
      motor_temp: Number(o.motor_temp || 0),
      battery_voltage: Number(o.battery_voltage || 0),
      throttle: Number(o.throttle || 0),
      vehicle_state: o.vehicle_state || 'Online',
      inverter_status: o.inverter_status || 'Active',
      fault: o.fault === "true" || o.fault === true,
      fault_type: o.fault_type || 'None'
    };

    return NextResponse.json(latestTelemetry, { headers: { 'Access-Control-Allow-Origin': '*' } });

  } catch (err) {
    console.error('InfluxDB Query Error:', err);
    return NextResponse.json({ error: 'Database connection failed' }, { status: 500, headers: { 'Access-Control-Allow-Origin': '*' } });
  }
}

export async function POST() {
  return NextResponse.json(
    { error: 'POST method via REST API is disabled. Telemetry Gateway streams directly to InfluxDB and Socket.io for performance reasons.' },
    { status: 405, headers: { 'Access-Control-Allow-Origin': '*' } }
  );
}

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
