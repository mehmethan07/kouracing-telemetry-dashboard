'use client';

import { useState, useCallback } from 'react';
import { Code, Play, Copy, Check, ChevronDown, ChevronRight } from 'lucide-react';
import styles from './page.module.css';

interface Endpoint {
  method: 'GET' | 'POST';
  path: string;
  description: string;
  params?: { name: string; type: string; desc: string }[];
  example: string;
  response: string;
}

const endpoints: Endpoint[] = [
  {
    method: 'GET',
    path: '/api/telemetry',
    description: 'Get the latest telemetry data point',
    example: 'curl http://localhost:3002/api/telemetry',
    response: `{
  "rpm": 8500,
  "speed": 95,
  "motor_temp": 72.3,
  "battery_voltage": 385.2,
  "throttle": 65,
  "vehicle_state": "Drive",
  "inverter_status": "Active",
  "fault": false,
  "fault_type": "None",
  "timestamp": 1711389600000
}`,
  },
  {
    method: 'GET',
    path: '/api/telemetry?mode=history',
    description: 'Get telemetry history (up to 500 points)',
    params: [
      { name: 'mode', type: 'string', desc: '"history" to get array of past data' },
      { name: 'limit', type: 'number', desc: 'Max points to return (default 100, max 500)' },
      { name: 'format', type: 'string', desc: '"json" (default) or "csv"' },
    ],
    example: 'curl "http://localhost:3002/api/telemetry?mode=history&limit=50"',
    response: `{
  "count": 50,
  "data": [
    { "rpm": 8500, "speed": 95, ... },
    { "rpm": 8200, "speed": 92, ... }
  ]
}`,
  },
  {
    method: 'GET',
    path: '/api/telemetry?mode=history&format=csv',
    description: 'Export telemetry history as CSV',
    example: 'curl "http://localhost:3002/api/telemetry?mode=history&format=csv" -o data.csv',
    response: `timestamp,speed,rpm,motor_temp,battery_voltage,throttle,...
1711389600000,95,8500,72.3,385.2,65,...`,
  },
  {
    method: 'POST',
    path: '/api/telemetry',
    description: 'Push new telemetry data (for external integrations)',
    example: `curl -X POST http://localhost:3002/api/telemetry \\
  -H "Content-Type: application/json" \\
  -d '{"speed": 95, "rpm": 8500, "motor_temp": 72}'`,
    response: `{
  "success": true,
  "data": { ... }
}`,
  },
];

function EndpointCard({ ep }: { ep: Endpoint }) {
  const [expanded, setExpanded] = useState(false);
  const [copied, setCopied] = useState(false);
  const [testResult, setTestResult] = useState<string | null>(null);
  const [testing, setTesting] = useState(false);

  const copyToClipboard = useCallback(async (text: string) => {
    await navigator.clipboard.writeText(text);
    setCopied(true);
    setTimeout(() => setCopied(false), 1500);
  }, []);

  const testEndpoint = useCallback(async () => {
    setTesting(true);
    try {
      const url = `${window.location.origin}${ep.path.split('?')[0]}${ep.path.includes('?') ? '?' + ep.path.split('?')[1] : ''}`;
      const res = await fetch(url);
      const contentType = res.headers.get('content-type') || '';
      let text: string;
      if (contentType.includes('json')) {
        const json = await res.json();
        text = JSON.stringify(json, null, 2);
      } else {
        text = await res.text();
      }
      setTestResult(text.substring(0, 1000));
    } catch (e) {
      setTestResult(`Error: ${e}`);
    } finally {
      setTesting(false);
    }
  }, [ep]);

  return (
    <div className={styles.card}>
      <div className={styles.cardHeader} onClick={() => setExpanded(!expanded)}>
        <div className={styles.cardLeft}>
          <span className={`${styles.method} ${styles[ep.method.toLowerCase()]}`}>{ep.method}</span>
          <code className={styles.path}>{ep.path}</code>
        </div>
        <div className={styles.cardRight}>
          <span className={styles.desc}>{ep.description}</span>
          {expanded ? <ChevronDown size={16} /> : <ChevronRight size={16} />}
        </div>
      </div>

      {expanded && (
        <div className={styles.cardBody}>
          {ep.params && (
            <div className={styles.paramsSection}>
              <h4 className={styles.sectionLabel}>Parameters</h4>
              <table className={styles.paramsTable}>
                <thead>
                  <tr><th>Name</th><th>Type</th><th>Description</th></tr>
                </thead>
                <tbody>
                  {ep.params.map((p) => (
                    <tr key={p.name}>
                      <td><code>{p.name}</code></td>
                      <td>{p.type}</td>
                      <td>{p.desc}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}

          <div className={styles.section}>
            <h4 className={styles.sectionLabel}>Example</h4>
            <div className={styles.codeBlock}>
              <code>{ep.example}</code>
              <button className={styles.copyBtn} onClick={() => copyToClipboard(ep.example)}>
                {copied ? <Check size={12} /> : <Copy size={12} />}
              </button>
            </div>
          </div>

          <div className={styles.section}>
            <h4 className={styles.sectionLabel}>Response</h4>
            <pre className={styles.codeBlock}>{ep.response}</pre>
          </div>

          {ep.method === 'GET' && (
            <div className={styles.section}>
              <button className={styles.testBtn} onClick={testEndpoint} disabled={testing}>
                <Play size={14} />
                {testing ? 'Testing...' : 'Test Endpoint'}
              </button>
              {testResult && (
                <pre className={styles.testResult}>{testResult}</pre>
              )}
            </div>
          )}
        </div>
      )}
    </div>
  );
}

export default function ApiPage() {
  return (
    <main className={styles.page}>
      <header className={styles.header}>
        <div>
          <h1 className={styles.title}>
            <Code size={24} /> REST API
          </h1>
          <p className={styles.subtitle}>HTTP endpoints for telemetry data access</p>
        </div>
        <div className={styles.baseBadge}>
          Base URL: <code>http://localhost:3002</code>
        </div>
      </header>

      <div className={styles.endpoints}>
        {endpoints.map((ep, i) => (
          <EndpointCard key={i} ep={ep} />
        ))}
      </div>

      <div className={styles.infoSection}>
        <h3>Integration Examples</h3>
        <div className={styles.infoGrid}>
          <div className={styles.infoCard}>
            <h4>Python</h4>
            <pre className={styles.codeBlock}>{`import requests\ndata = requests.get("http://localhost:3002/api/telemetry").json()\nprint(f"Speed: {data['speed']} km/h")`}</pre>
          </div>
          <div className={styles.infoCard}>
            <h4>JavaScript</h4>
            <pre className={styles.codeBlock}>{`const res = await fetch("/api/telemetry");\nconst data = await res.json();\nconsole.log(\`Speed: \${data.speed} km/h\`);`}</pre>
          </div>
          <div className={styles.infoCard}>
            <h4>Grafana</h4>
            <pre className={styles.codeBlock}>{`Data source: JSON API\nURL: http://localhost:3002/api/telemetry?mode=history`}</pre>
          </div>
        </div>
      </div>
    </main>
  );
}
