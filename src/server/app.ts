import express, { Request, Response } from 'express';
import { GoogleGenAI } from '@google/genai';

export interface TelemetryMetric {
  device_id: string;
  hostname: string;
  ip_address: string;
  cpu_usage: number;
  ram_usage: number;
  ram_total: number;
  ram_used: number;
  disk_usage: number;
  disk_total: number;
  disk_used: number;
  temperature?: number | null;
  timestamp: string;
}

export interface DeviceRecord {
  device_id: string;
  hostname: string;
  ip_address: string;
  status: 'online' | 'offline' | 'idle' | 'maintenance';
  last_seen: string;
  latest_metrics?: TelemetryMetric;
}

// In-memory store for device telemetry and active workstation metrics
const devicesStore = new Map<string, DeviceRecord>();
const metricsStore: TelemetryMetric[] = [];

// Lazy Gemini client helper
let aiClient: GoogleGenAI | null = null;
function getGeminiClient(): GoogleGenAI | null {
  if (!aiClient && process.env.GEMINI_API_KEY) {
    aiClient = new GoogleGenAI({ apiKey: process.env.GEMINI_API_KEY });
  }
  return aiClient;
}

const app = express();

app.use(express.json());

// CORS middleware for telemetry agents and client access
app.use((_req, res, next) => {
  res.header('Access-Control-Allow-Origin', '*');
  res.header('Access-Control-Allow-Methods', 'GET, POST, PUT, DELETE, OPTIONS');
  res.header('Access-Control-Allow-Headers', 'Origin, X-Requested-With, Content-Type, Accept, Authorization');
  if (_req.method === 'OPTIONS') {
    return res.sendStatus(200);
  }
  next();
});

// Health and Root endpoints (supports both with and without /api prefix for Vercel serverless rewrites)
app.get(['/health', '/api/health'], (_req: Request, res: Response) => {
  res.status(200).json({ status: 'healthy' });
});

app.get(['/info', '/api/info'], (_req: Request, res: Response) => {
  res.status(200).json({
    status: 'online',
    service: 'Laboratory Monitoring Backend',
    version: '1.0.0',
    devicesTracked: devicesStore.size,
    totalMetricsLogged: metricsStore.length,
  });
});

// Query in-memory registered devices
app.get(['/devices', '/api/devices'], (_req: Request, res: Response) => {
  const devices = Array.from(devicesStore.values());
  res.status(200).json(devices);
});

// Query recent telemetry metrics
app.get(['/metrics', '/api/metrics'], (req: Request, res: Response) => {
  const deviceId = req.query.device_id as string | undefined;
  const limit = Math.min(parseInt((req.query.limit as string) || '50', 10), 200);

  let results = metricsStore;
  if (deviceId) {
    results = results.filter((m) => m.device_id === deviceId);
  }
  res.status(200).json(results.slice(-limit));
});

// Ingest hardware telemetry from laboratory workstation agents
app.post(['/metrics', '/api/metrics'], (req: Request, res: Response) => {
  const payload = req.body as Partial<TelemetryMetric>;

  // Validate payload
  if (!payload.device_id || !payload.hostname || !payload.ip_address) {
    return res.status(422).json({
      status: 'error',
      message: 'device_id, hostname, and ip_address are required fields',
    });
  }

  const cpu = Number(payload.cpu_usage ?? 0);
  const ram = Number(payload.ram_usage ?? 0);
  const disk = Number(payload.disk_usage ?? 0);

  if (
    isNaN(cpu) || cpu < 0 || cpu > 100 ||
    isNaN(ram) || ram < 0 || ram > 100 ||
    isNaN(disk) || disk < 0 || disk > 100
  ) {
    return res.status(422).json({
      status: 'error',
      message: 'CPU, RAM, and Disk metrics must be numeric percentages between 0 and 100',
    });
  }

  const metric: TelemetryMetric = {
    device_id: String(payload.device_id),
    hostname: String(payload.hostname),
    ip_address: String(payload.ip_address),
    cpu_usage: cpu,
    ram_usage: ram,
    ram_total: Number(payload.ram_total || 17179869184),
    ram_used: Number(payload.ram_used || 0),
    disk_usage: disk,
    disk_total: Number(payload.disk_total || 512110190592),
    disk_used: Number(payload.disk_used || 0),
    temperature: payload.temperature !== undefined ? Number(payload.temperature) : null,
    timestamp: payload.timestamp || new Date().toISOString(),
  };

  // Update in-memory device table
  devicesStore.set(metric.device_id, {
    device_id: metric.device_id,
    hostname: metric.hostname,
    ip_address: metric.ip_address,
    status: 'online',
    last_seen: metric.timestamp,
    latest_metrics: metric,
  });

  // Append to metrics history (cap at 500 items)
  metricsStore.push(metric);
  if (metricsStore.length > 500) {
    metricsStore.shift();
  }

  return res.status(201).json({
    status: 'received',
    message: 'Telemetry metrics successfully validated and accepted',
    data: metric,
    received_at: new Date().toISOString(),
  });
});

// Optional AI Health Telemetry Analysis (Server-side Gemini)
app.post(['/ai/analyze', '/api/ai/analyze'], async (req: Request, res: Response) => {
  try {
    const ai = getGeminiClient();
    if (!ai) {
      return res.status(503).json({
        error: 'GEMINI_API_KEY is not configured on the server',
      });
    }

    const { telemetryData } = req.body;
    const prompt = `Analyze the following laboratory workstation telemetry snapshot and provide a concise 2-sentence diagnostic assessment with any potential anomalies:\n\n${JSON.stringify(
      telemetryData || Array.from(devicesStore.values()).slice(0, 5),
      null,
      2
    )}`;

    const response = await ai.models.generateContent({
      model: 'gemini-2.5-flash',
      contents: prompt,
    });

    return res.status(200).json({
      analysis: response.text,
    });
  } catch (err: any) {
    console.error('Gemini telemetry analysis error:', err);
    return res.status(500).json({ error: err.message || 'Analysis failed' });
  }
});

export default app;
