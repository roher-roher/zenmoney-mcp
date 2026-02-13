import * as fs from 'fs';
import * as path from 'path';
import * as os from 'os';
import { DiffRequest, DiffResponse, Deletion } from './types.js';

const API_BASE = 'https://api.zenmoney.ru/v8';
const CACHE_DIR = path.join(os.homedir(), '.zenmoney-mcp');
const CACHE_FILE = path.join(CACHE_DIR, 'cache.json');

const ENTITY_KEYS = [
  'instrument', 'company', 'user', 'account', 'tag',
  'merchant', 'budget', 'reminder', 'reminderMarker', 'transaction',
] as const;

type EntityKey = typeof ENTITY_KEYS[number];

// Budget has no `id`, keyed by tag+date
function budgetKey(b: { tag: string | null; date: string }): string {
  return `${b.tag ?? ''}:${b.date}`;
}

function mergeEntities<T extends { id: string | number }>(existing: T[], incoming: T[]): T[] {
  const map = new Map<string | number, T>();
  for (const e of existing) map.set(e.id, e);
  for (const e of incoming) map.set(e.id, e);
  return Array.from(map.values());
}

function mergeBudgets(existing: { tag: string | null; date: string }[], incoming: { tag: string | null; date: string }[]): any[] {
  const map = new Map<string, any>();
  for (const b of existing) map.set(budgetKey(b), b);
  for (const b of incoming) map.set(budgetKey(b), b);
  return Array.from(map.values());
}

function applyDeletions(data: DiffResponse, deletions: Deletion[]): void {
  const byType = new Map<string, Set<string>>();
  for (const d of deletions) {
    if (!byType.has(d.object)) byType.set(d.object, new Set());
    byType.get(d.object)!.add(String(d.id));
  }

  for (const [objectType, ids] of byType) {
    const key = objectType as EntityKey;
    if (key === 'budget' || !data[key]) continue;
    (data as any)[key] = (data[key] as any[]).filter((e: any) => !ids.has(String(e.id)));
  }
}

export class ZenMoneyAPI {
  private token: string;
  private cache: DiffResponse | null = null;

  constructor(token: string) {
    this.token = token;
  }

  private async fetchDiff(serverTimestamp: number): Promise<DiffResponse> {
    const body: DiffRequest = {
      currentClientTimestamp: Math.floor(Date.now() / 1000),
      serverTimestamp,
    };

    const response = await fetch(`${API_BASE}/diff/`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${this.token}`,
      },
      body: JSON.stringify(body),
    });

    if (!response.ok) {
      const text = await response.text();
      throw new Error(`ZenMoney API error ${response.status}: ${text}`);
    }

    return response.json() as Promise<DiffResponse>;
  }

  private loadFromDisk(): DiffResponse | null {
    try {
      if (fs.existsSync(CACHE_FILE)) {
        const raw = fs.readFileSync(CACHE_FILE, 'utf-8');
        return JSON.parse(raw) as DiffResponse;
      }
    } catch {
      // corrupted cache — ignore
    }
    return null;
  }

  private saveToDisk(data: DiffResponse): void {
    try {
      fs.mkdirSync(CACHE_DIR, { recursive: true });
      fs.writeFileSync(CACHE_FILE, JSON.stringify(data));
    } catch {
      // non-critical — continue without disk cache
    }
  }

  private deleteDiskCache(): void {
    try {
      if (fs.existsSync(CACHE_FILE)) fs.unlinkSync(CACHE_FILE);
    } catch {
      // ignore
    }
  }

  private merge(existing: DiffResponse, diff: DiffResponse): DiffResponse {
    const result = { ...existing, serverTimestamp: diff.serverTimestamp };

    for (const key of ENTITY_KEYS) {
      const incoming = diff[key];
      if (!incoming || incoming.length === 0) continue;

      if (key === 'budget') {
        (result as any)[key] = mergeBudgets((existing[key] ?? []) as any[], incoming as any[]);
      } else {
        (result as any)[key] = mergeEntities((existing[key] ?? []) as any[], incoming as any[]);
      }
    }

    if (diff.deletion && diff.deletion.length > 0) {
      applyDeletions(result, diff.deletion);
    }

    return result;
  }

  async getData(): Promise<DiffResponse> {
    if (this.cache) return this.cache;

    const diskCache = this.loadFromDisk();

    if (diskCache) {
      // incremental sync
      const diff = await this.fetchDiff(diskCache.serverTimestamp);
      this.cache = this.merge(diskCache, diff);
    } else {
      // full sync
      this.cache = await this.fetchDiff(0);
    }

    this.saveToDisk(this.cache);
    return this.cache;
  }

  invalidateCache(): void {
    this.cache = null;
    this.deleteDiskCache();
  }
}
