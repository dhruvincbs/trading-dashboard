# Trading Performance Dashboard — Full Spec

## Overview
Replicate a Streamlit multi-client trading performance dashboard as a React + Express web app. The app has two roles: **admin** (manages everything) and **client** (views their own data).

## Data Model (in-memory, no DB)

### Users
- username, password (plain text for simplicity), role ('admin'|'client'), name, email, starting_capital, investment_start_date, active

Default admin: username="admin", password="admin123", role="admin", name="Admin"

### Trades
- trade_id, buy_date, sell_date, stock, buy_price, sell_price, quantity, profit_loss (calculated), position_size (calculated), return_pct (calculated), win_loss (calculated: 'Win' if profit_loss > 0, else 'Loss')

### Clients
- client_id (= username), username, name, email, starting_capital, investment_start_date, active

### Capital Movements
- movement_id, client_id, date, type ('contribution'|'withdrawal'), amount, notes

### Monthly Capital
- month (string like '2025-01'), total_capital, notes

### Config
```json
{
  "global": {
    "tax_rate": 0.25,
    "trader_share": 0.40,
    "investor_share": 0.60,
    "auto_remove_day_trades": true
  },
  "clients": {
    "client_id": {
      "tax_rate": 0.25,
      "trader_share": 0.40,
      "investor_share": 0.60,
      "tier_override": "" // '', 'default', 'preferential', 'gold'
    }
  }
}
```

## Authentication
- Simple session-based login. POST /api/auth/login with {username, password}. Returns user info and sets a session token.
- GET /api/auth/me returns current user
- POST /api/auth/logout clears session
- All API routes except login should be protected

## Tier System (Critical Business Logic)
Based on capital at period start:
- **Default** (< $25,000): 50/50 profit split, 100% investor loss
- **Preferential** ($25k-$74,999): 10% annual preferred return to investor first, then 50/50 on remainder, 100% investor loss
- **Gold** (>= $75,000): 60/40 profit/loss split (investor/trader)

Can be overridden per-client.

## Profit Split Calculation
For each period:
1. Calculate raw return amount = capital * return_pct / 100
2. Apply tax: profit_after_tax = raw * (1 - tax_rate)
3. Determine tier for the capital amount
4. Apply tier-based split to get investor_share and trader_share

### Preferred Return (Preferential Tier)
- Monthly: 10% / 12 = 0.833% per month
- If profit_after_tax <= preferred_return: all to investor
- If profit_after_tax > preferred_return: investor gets preferred + 50% of remainder, trader gets 50% of remainder

## Key Pages

### Admin Pages
1. **Dashboard Overview** — Total trades, total clients, total capital, tax rate. Recent trades and capital movements.
2. **Upload Trade Log** — CSV/XLSX upload with columns: buy_date, sell_date, stock, buy_price, sell_price, quantity. Auto-calculates profit_loss, position_size, return_pct, win_loss. Removes day trades if configured. Deduplicates trades.
3. **Manage Clients** — CRUD for client accounts. Each client has: username, name, email, password, starting_capital, investment_start_date, active status.
4. **Capital Movements** — Add contributions/withdrawals for clients. History view.
5. **Capital Accounts** — Select a client, view their capital progression: starting capital, contributions, withdrawals, investor returns, current tier, ending capital. Monthly table with columns: month, starting_capital, capital_after_contributions, tier, return_pct, profit_after_tax, investor_share, trader_share, cumulative_investor_profit, ending_capital. Chart showing cumulative investor profit over time.
6. **Configuration** — Global settings (tax rate, trader share) and per-client settings (tax rate, trader share, tier override).
7. **Strategy Analysis** — Summary metrics (cumulative return, win rate, avg win %, avg loss %). Monthly returns table. Bar chart of monthly returns.
8. **Strategy Details** — Top winners/losers by month. Detailed trade log sorted by sell date (only trades with quantity >= 2).

### Client Pages
1. **Capital Account** — Same as admin capital accounts but locked to the logged-in client.
2. **Strategy Summary** — Same as admin strategy analysis (read-only).
3. **Strategy Details** — Same as admin strategy details (read-only).

## Monthly Strategy Returns Calculation
Group trades by sell_date month. For each month:
- Total_PL = sum of profit_loss
- Total_Trades = count
- Winning_Trades = count where win_loss == 'Win'
- Win_Rate = Winning_Trades / Total_Trades * 100
- Get monthly capital for that month
- Return_Pct = Total_PL / monthly_capital * 100
- Avg_Win_Pct = avg of (sell_price - buy_price) / buy_price * 100 for winning trades
- Avg_Loss_Pct = avg of same for losing trades
- Cumulative_Return = running sum of Return_Pct

## Capital Flow Calculation (per client)
Start with starting_capital. For each month (from investment_start_date):
1. Add net contributions (contributions - withdrawals) for that month
2. Determine tier based on capital AFTER contributions
3. Apply monthly return pct to get return amount
4. Apply tax, then tier-based split
5. Add investor_share to current capital
6. Track cumulative investor profit

## API Routes Needed

### Auth
- POST /api/auth/login
- GET /api/auth/me
- POST /api/auth/logout

### Trades
- GET /api/trades — all trades
- POST /api/trades/upload — multipart form upload CSV
- DELETE /api/trades/:id

### Clients
- GET /api/clients
- POST /api/clients
- PATCH /api/clients/:id
- DELETE /api/clients/:id

### Capital Movements
- GET /api/capital-movements
- POST /api/capital-movements

### Config
- GET /api/config
- PATCH /api/config (global)
- PATCH /api/config/:clientId (per-client)

### Monthly Capital
- GET /api/monthly-capital
- POST /api/monthly-capital
- DELETE /api/monthly-capital/:month

### Analytics
- GET /api/analytics/strategy-summary
- GET /api/analytics/monthly-returns
- GET /api/analytics/client-capital-flow/:clientId
- GET /api/analytics/strategy-details

## UI/Design
- Finance dashboard aesthetic: dark mode default, cool blue-gray palette
- Sidebar navigation with role-based menu items
- Use Recharts for all charts (BarChart, LineChart, AreaChart)
- Use shadcn/ui components: Card, Table, Form, Dialog, Select, Button, Badge, Tabs
- KPI cards for metrics (large number, label, optional delta)
- Responsive layout
