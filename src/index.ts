import { McpServer } from '@modelcontextprotocol/sdk/server/mcp.js';
import { StdioServerTransport } from '@modelcontextprotocol/sdk/server/stdio.js';
import { z } from 'zod';
import { ZenMoneyAPI } from './api.js';
import { Account, Tag, Transaction } from './types.js';

const token = process.env.ZENMONEY_TOKEN;
if (!token) {
  console.error('ZENMONEY_TOKEN environment variable is required');
  process.exit(1);
}

const api = new ZenMoneyAPI(token);

const server = new McpServer({
  name: 'zenmoney',
  version: '1.0.0',
});

// Helper: resolve instrument title by id
function resolveInstrument(instruments: { id: number; shortTitle: string }[], id: number | null): string | null {
  if (id == null) return null;
  return instruments.find(i => i.id === id)?.shortTitle ?? null;
}

// Helper: resolve tag titles
function resolveTagTitles(tags: Tag[], ids: string[] | null): string[] | null {
  if (!ids) return null;
  return ids.map(id => tags.find(t => t.id === id)?.title ?? id);
}

// Helper: resolve merchant title
function resolveMerchant(merchants: { id: string; title: string }[], id: string | null): string | null {
  if (!id) return null;
  return merchants.find(m => m.id === id)?.title ?? id;
}

// Helper: resolve account title
function resolveAccount(accounts: Account[], id: string): string {
  return accounts.find(a => a.id === id)?.title ?? id;
}

// --- Tools ---

server.tool(
  'get_accounts',
  'Get all user accounts (bank accounts, cards, cash, etc.) with balances',
  {
    include_archived: z.boolean().optional().describe('Include archived accounts (default: false)'),
  },
  async ({ include_archived }) => {
    const data = await api.getData();
    const instruments = data.instrument ?? [];
    let accounts = data.account ?? [];

    if (!include_archived) {
      accounts = accounts.filter(a => !a.archive);
    }

    const result = accounts.map(a => ({
      id: a.id,
      title: a.title,
      type: a.type,
      balance: a.balance,
      currency: resolveInstrument(instruments, a.instrument),
      creditLimit: a.creditLimit,
      inBalance: a.inBalance,
      savings: a.savings,
      archive: a.archive,
    }));

    return {
      content: [{ type: 'text' as const, text: JSON.stringify(result, null, 2) }],
    };
  }
);

server.tool(
  'get_transactions',
  'Get transactions with optional filters. Returns up to 1000 most recent transactions by default.',
  {
    date_from: z.string().optional().describe('Start date filter (yyyy-MM-dd)'),
    date_to: z.string().optional().describe('End date filter (yyyy-MM-dd)'),
    account_id: z.string().optional().describe('Filter by account ID'),
    tag_id: z.string().optional().describe('Filter by tag/category ID'),
    include_deleted: z.boolean().optional().describe('Include deleted transactions (default: false)'),
    limit: z.number().optional().describe('Max number of transactions to return (default: 1000)'),
    offset: z.number().optional().describe('Number of transactions to skip (default: 0)'),
  },
  async ({ date_from, date_to, account_id, tag_id, include_deleted, limit, offset }) => {
    const data = await api.getData();
    const instruments = data.instrument ?? [];
    const tags = data.tag ?? [];
    const merchants = data.merchant ?? [];
    const accounts = data.account ?? [];
    let transactions = data.transaction ?? [];

    if (!include_deleted) {
      transactions = transactions.filter(t => !t.deleted);
    }
    if (date_from) {
      transactions = transactions.filter(t => t.date >= date_from);
    }
    if (date_to) {
      transactions = transactions.filter(t => t.date <= date_to);
    }
    if (account_id) {
      transactions = transactions.filter(
        t => t.incomeAccount === account_id || t.outcomeAccount === account_id
      );
    }
    if (tag_id) {
      transactions = transactions.filter(t => t.tag?.includes(tag_id));
    }

    // Sort by date descending, then by changed descending
    transactions.sort((a, b) => {
      const dateCmp = b.date.localeCompare(a.date);
      if (dateCmp !== 0) return dateCmp;
      return b.changed - a.changed;
    });

    const actualOffset = offset ?? 0;
    const actualLimit = limit ?? 1000;
    const total = transactions.length;
    transactions = transactions.slice(actualOffset, actualOffset + actualLimit);

    const result = transactions.map(t => ({
      id: t.id,
      date: t.date,
      income: t.income,
      incomeCurrency: resolveInstrument(instruments, t.incomeInstrument),
      incomeAccount: resolveAccount(accounts, t.incomeAccount),
      incomeAccountId: t.incomeAccount,
      outcome: t.outcome,
      outcomeCurrency: resolveInstrument(instruments, t.outcomeInstrument),
      outcomeAccount: resolveAccount(accounts, t.outcomeAccount),
      outcomeAccountId: t.outcomeAccount,
      tags: resolveTagTitles(tags, t.tag),
      merchant: resolveMerchant(merchants, t.merchant),
      payee: t.payee,
      comment: t.comment,
      hold: t.hold,
      deleted: t.deleted,
    }));

    return {
      content: [{
        type: 'text' as const,
        text: JSON.stringify({ total, offset: actualOffset, limit: actualLimit, transactions: result }, null, 2),
      }],
    };
  }
);

server.tool(
  'get_tags',
  'Get all tags (categories). Tags support one level of nesting via parent field.',
  {},
  async () => {
    const data = await api.getData();
    const tags = data.tag ?? [];

    const result = tags.map(t => ({
      id: t.id,
      title: t.title,
      parent: t.parent ? tags.find(p => p.id === t.parent)?.title ?? t.parent : null,
      parentId: t.parent,
      icon: t.icon,
      showIncome: t.showIncome,
      showOutcome: t.showOutcome,
      budgetIncome: t.budgetIncome,
      budgetOutcome: t.budgetOutcome,
    }));

    return {
      content: [{ type: 'text' as const, text: JSON.stringify(result, null, 2) }],
    };
  }
);

server.tool(
  'get_merchants',
  'Get all merchants (payees/payers)',
  {},
  async () => {
    const data = await api.getData();
    const result = (data.merchant ?? []).map(m => ({
      id: m.id,
      title: m.title,
    }));

    return {
      content: [{ type: 'text' as const, text: JSON.stringify(result, null, 2) }],
    };
  }
);

server.tool(
  'get_instruments',
  'Get all available currencies (instruments) with exchange rates',
  {},
  async () => {
    const data = await api.getData();
    const result = (data.instrument ?? []).map(i => ({
      id: i.id,
      title: i.title,
      shortTitle: i.shortTitle,
      symbol: i.symbol,
      rate: i.rate,
    }));

    return {
      content: [{ type: 'text' as const, text: JSON.stringify(result, null, 2) }],
    };
  }
);

server.tool(
  'get_budgets',
  'Get budget entries (monthly spending limits by category)',
  {
    date: z.string().optional().describe('Filter by month (yyyy-MM-dd, first day of month)'),
    tag_id: z.string().optional().describe('Filter by tag/category ID'),
  },
  async ({ date, tag_id }) => {
    const data = await api.getData();
    const tags = data.tag ?? [];
    let budgets = data.budget ?? [];

    if (date) {
      budgets = budgets.filter(b => b.date === date);
    }
    if (tag_id) {
      budgets = budgets.filter(b => b.tag === tag_id);
    }

    const result = budgets.map(b => ({
      date: b.date,
      tag: b.tag ? tags.find(t => t.id === b.tag)?.title ?? b.tag : null,
      tagId: b.tag,
      income: b.income,
      incomeLock: b.incomeLock,
      outcome: b.outcome,
      outcomeLock: b.outcomeLock,
    }));

    return {
      content: [{ type: 'text' as const, text: JSON.stringify(result, null, 2) }],
    };
  }
);

server.tool(
  'get_reminders',
  'Get recurring transaction reminders',
  {},
  async () => {
    const data = await api.getData();
    const instruments = data.instrument ?? [];
    const tags = data.tag ?? [];
    const merchants = data.merchant ?? [];
    const accounts = data.account ?? [];
    const reminders = data.reminder ?? [];

    const result = reminders.map(r => ({
      id: r.id,
      income: r.income,
      incomeCurrency: resolveInstrument(instruments, r.incomeInstrument),
      incomeAccount: resolveAccount(accounts, r.incomeAccount),
      outcome: r.outcome,
      outcomeCurrency: resolveInstrument(instruments, r.outcomeInstrument),
      outcomeAccount: resolveAccount(accounts, r.outcomeAccount),
      tags: resolveTagTitles(tags, r.tag),
      merchant: resolveMerchant(merchants, r.merchant),
      payee: r.payee,
      comment: r.comment,
      interval: r.interval,
      step: r.step,
      points: r.points,
      startDate: r.startDate,
      endDate: r.endDate,
      notify: r.notify,
    }));

    return {
      content: [{ type: 'text' as const, text: JSON.stringify(result, null, 2) }],
    };
  }
);

server.tool(
  'get_reminder_markers',
  'Get specific planned transaction instances from reminders',
  {
    state: z.enum(['planned', 'processed', 'deleted']).optional().describe('Filter by state'),
    date_from: z.string().optional().describe('Start date filter (yyyy-MM-dd)'),
    date_to: z.string().optional().describe('End date filter (yyyy-MM-dd)'),
  },
  async ({ state, date_from, date_to }) => {
    const data = await api.getData();
    const instruments = data.instrument ?? [];
    const tags = data.tag ?? [];
    const merchants = data.merchant ?? [];
    const accounts = data.account ?? [];
    let markers = data.reminderMarker ?? [];

    if (state) {
      markers = markers.filter(m => m.state === state);
    }
    if (date_from) {
      markers = markers.filter(m => m.date >= date_from);
    }
    if (date_to) {
      markers = markers.filter(m => m.date <= date_to);
    }

    const result = markers.map(m => ({
      id: m.id,
      date: m.date,
      state: m.state,
      income: m.income,
      incomeCurrency: resolveInstrument(instruments, m.incomeInstrument),
      incomeAccount: resolveAccount(accounts, m.incomeAccount),
      outcome: m.outcome,
      outcomeCurrency: resolveInstrument(instruments, m.outcomeInstrument),
      outcomeAccount: resolveAccount(accounts, m.outcomeAccount),
      tags: resolveTagTitles(tags, m.tag),
      merchant: resolveMerchant(merchants, m.merchant),
      payee: m.payee,
      comment: m.comment,
      notify: m.notify,
    }));

    return {
      content: [{ type: 'text' as const, text: JSON.stringify(result, null, 2) }],
    };
  }
);

server.tool(
  'get_user',
  'Get user information',
  {},
  async () => {
    const data = await api.getData();
    const instruments = data.instrument ?? [];
    const users = data.user ?? [];

    const result = users.map(u => ({
      id: u.id,
      login: u.login,
      currency: resolveInstrument(instruments, u.currency),
      currencyId: u.currency,
      parent: u.parent,
    }));

    return {
      content: [{ type: 'text' as const, text: JSON.stringify(result, null, 2) }],
    };
  }
);

server.tool(
  'refresh_data',
  'Force refresh cached data from ZenMoney API. Call this if you suspect data is stale.',
  {},
  async () => {
    api.invalidateCache();
    await api.getData();
    return {
      content: [{ type: 'text' as const, text: 'Data refreshed successfully.' }],
    };
  }
);

async function main() {
  const transport = new StdioServerTransport();
  await server.connect(transport);
}

main().catch((error) => {
  console.error('Fatal error:', error);
  process.exit(1);
});
