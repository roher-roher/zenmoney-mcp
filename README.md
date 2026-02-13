# ZenMoney MCP Server

A read-only [Model Context Protocol](https://modelcontextprotocol.io) (MCP) server for the [ZenMoney](https://zenmoney.ru) personal finance service. Provides AI assistants with access to your financial data: accounts, transactions, budgets, categories, and more.

## Features

- **Accounts** — balances, credit limits, account types (cards, cash, loans, deposits)
- **Transactions** — full history with filtering by date, account, and category
- **Budgets** — monthly spending limits by category
- **Tags** — hierarchical transaction categories
- **Merchants** — payees and payers
- **Reminders** — recurring transaction templates and planned instances
- **Currencies** — all instruments with exchange rates
- **Caching** — data is fetched once and served from memory; refresh on demand
- **ID resolution** — raw IDs are resolved to human-readable names (account titles, currency codes, tag names, merchant names)

## Getting a Token

This server requires a ZenMoney OAuth2 access token. You can obtain one from [Zerro.app](https://zerro.app):

1. Open Zerro.app and log in with your ZenMoney account
2. Open browser DevTools (F12) → Application → Local Storage
3. Find the `token` key and copy its value

Alternatively, register your own OAuth2 application via the [ZenMoney API](https://github.com/zenmoney/ZenPlugins/wiki/ZenMoney-API).

## Installation

```bash
git clone <repository-url>
cd zenmoney-mcp
npm install
npm run build
```

## Configuration

### Claude Desktop

Add to your `claude_desktop_config.json`:

```json
{
  "mcpServers": {
    "zenmoney": {
      "command": "node",
      "args": ["/absolute/path/to/zenmoney-mcp/build/index.js"],
      "env": {
        "ZENMONEY_TOKEN": "your-token-here"
      }
    }
  }
}
```

### Claude Code

Add to `~/.claude/settings.json` under `mcpServers`:

```json
{
  "zenmoney": {
    "command": "node",
    "args": ["/absolute/path/to/zenmoney-mcp/build/index.js"],
    "env": {
      "ZENMONEY_TOKEN": "your-token-here"
    }
  }
}
```

Then run `/mcp` in Claude Code to reconnect MCP servers.

### VS Code

Add to your `.vscode/mcp.json`:

```json
{
  "servers": {
    "zenmoney": {
      "command": "node",
      "args": ["/absolute/path/to/zenmoney-mcp/build/index.js"],
      "env": {
        "ZENMONEY_TOKEN": "your-token-here"
      }
    }
  }
}
```

## Tools

| Tool | Description | Parameters |
|------|-------------|------------|
| `get_accounts` | List all accounts with balances | `include_archived?` |
| `get_transactions` | Get transactions with filtering and pagination | `date_from?`, `date_to?`, `account_id?`, `tag_id?`, `include_deleted?`, `limit?`, `offset?` |
| `get_tags` | List all categories/tags with hierarchy | — |
| `get_merchants` | List all merchants | — |
| `get_instruments` | List currencies with exchange rates | — |
| `get_budgets` | Get monthly budget entries | `date?`, `tag_id?` |
| `get_reminders` | List recurring transaction templates | — |
| `get_reminder_markers` | Get planned transaction instances | `state?`, `date_from?`, `date_to?` |
| `get_user` | Get user information | — |
| `refresh_data` | Invalidate cache and re-fetch from API | — |

### Tool Details

#### get_accounts

Returns all user accounts (bank cards, cash, loans, deposits, e-wallets, debt trackers) with current balances and currency codes.

#### get_transactions

Returns transactions sorted by date (newest first). Supports filtering:

- **date_from / date_to** — date range in `yyyy-MM-dd` format
- **account_id** — filter by income or outcome account UUID
- **tag_id** — filter by category UUID
- **include_deleted** — include soft-deleted transactions (default: `false`)
- **limit / offset** — pagination (default: 1000 / 0)

Response includes `total` count for pagination.

#### get_budgets

Returns budget entries (monthly spending/income limits per category). Filter by:

- **date** — month start date in `yyyy-MM-dd` format (e.g. `2025-01-01`)
- **tag_id** — specific category UUID

#### get_reminder_markers

Returns planned transaction instances generated from reminders. Filter by:

- **state** — `planned`, `processed`, or `deleted`
- **date_from / date_to** — date range in `yyyy-MM-dd` format

## How It Works

The server uses the ZenMoney `/v8/diff/` API endpoint — the only read mechanism available. On the first tool call, it performs a full sync (`serverTimestamp: 0`) and caches all data in memory. Subsequent calls serve from cache. Use `refresh_data` to force a re-fetch.

All internal IDs are automatically resolved to human-readable values: account names, currency codes (e.g. `RUB`, `USD`), tag titles, and merchant names.

## Build

```bash
npm run build
```

Output is written to the `build/` directory.

## License

MIT
