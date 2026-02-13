import { DiffRequest, DiffResponse } from './types.js';

const API_BASE = 'https://api.zenmoney.ru/v8';

export class ZenMoneyAPI {
  private token: string;
  private cache: DiffResponse | null = null;

  constructor(token: string) {
    this.token = token;
  }

  async fetchDiff(forceFetch?: string[]): Promise<DiffResponse> {
    const body: DiffRequest = {
      currentClientTimestamp: Math.floor(Date.now() / 1000),
      serverTimestamp: 0,
      ...(forceFetch ? { forceFetch } : {}),
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

  async getData(): Promise<DiffResponse> {
    if (!this.cache) {
      this.cache = await this.fetchDiff();
    }
    return this.cache;
  }

  invalidateCache(): void {
    this.cache = null;
  }
}
