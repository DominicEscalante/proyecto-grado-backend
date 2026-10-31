import { Response } from 'express';
import type { PoolClient, Notification } from 'pg';
import { sql } from 'drizzle-orm';
import { db } from '../db/index.js';
import { pool } from '../config/db.js';

const subscribers = new Set<{ response: Response; institution: string }>();
let listening = false;

async function listen(): Promise<void> {
  if (listening) return;
  listening = true;
  let client: PoolClient | null = null;
  try {
    client = await pool.connect();
    await client.query('LISTEN ampar_reportes');
    client.on('notification', (event: Notification) => {
      if (event.channel !== 'ampar_reportes') return;
      for (const subscriber of subscribers) {
        if (subscriber.institution === event.payload || subscriber.institution === 'TODAS') {
          subscriber.response.write(`data: ${event.payload}\n\n`);
        }
      }
    });
    const reconnect = () => {
      if (!listening) return;
      listening = false;
      client?.release();
      setTimeout(() => void listen(), 2000);
    };
    client.on('error', reconnect);
    client.on('end', reconnect);
  } catch (error) {
    client?.release();
    listening = false;
    console.error('No se pudo escuchar cambios de reportes:', error);
    setTimeout(() => void listen(), 2000);
  }
}

export function subscribeToReports(response: Response, institution: string): void {
  response.setHeader('Content-Type', 'text/event-stream');
  response.setHeader('Cache-Control', 'no-cache, no-transform');
  response.setHeader('Connection', 'keep-alive');
  response.setHeader('X-Accel-Buffering', 'no');
  response.flushHeaders();
  response.write(': conectado\n\n');
  const subscriber = { response, institution };
  subscribers.add(subscriber);
  void listen();
  const heartbeat = setInterval(() => response.write(': activo\n\n'), 25000);
  response.on('close', () => { clearInterval(heartbeat); subscribers.delete(subscriber); });
}

export async function publishReportEvent(institution: string): Promise<void> {
  await db.execute(sql`SELECT pg_notify('ampar_reportes', ${institution})`);
}
