import { NextResponse } from 'next/server';

const GATEWAY_URL = process.env.GATEWAY_URL || '';
const GATEWAY_API_KEY = process.env.GATEWAY_API_KEY || '';

async function gatewayFetch(path: string, options: RequestInit = {}): Promise<Response> {
  const headers: Record<string, string> = {
    ...((options.headers as Record<string, string>) || {})
  };
  if (GATEWAY_API_KEY) {
    headers['x-api-key'] = GATEWAY_API_KEY;
  }
  return fetch(`${GATEWAY_URL}${path}`, {
    ...options,
    headers,
    cache: 'no-store',
    signal: AbortSignal.timeout(5000),
  });
}

export async function GET() {
  try {
    const res = await gatewayFetch('/api/team');
    if (!res.ok) {
      return NextResponse.json({ drivers: [], notes: [] });
    }
    const data = await res.json();
    return NextResponse.json(data);
  } catch (err) {
    return NextResponse.json({ drivers: [], notes: [] });
  }
}

export async function POST(request: Request) {
  try {
    const body = await request.json();
    const res = await gatewayFetch('/api/team', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(body),
    });
    if (!res.ok) {
      return NextResponse.json({ error: 'Failed to save' }, { status: 502 });
    }
    return NextResponse.json({ success: true });
  } catch (err) {
    return NextResponse.json({ error: 'Gateway connection failed' }, { status: 502 });
  }
}
