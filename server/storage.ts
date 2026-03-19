import { randomUUID } from "crypto";
import type {
  User,
  InsertUser,
  Trade,
  InsertTrade,
  Client,
  InsertClient,
  CapitalMovement,
  InsertCapitalMovement,
  MonthlyCapital,
  InsertMonthlyCapital,
  Config,
  GlobalConfig,
  ClientConfig,
  MonthlyReturn,
  StrategySummary,
  CapitalFlowRow,
  StrategyDetails,
  Tier,
} from "@shared/schema";

// ─── Interface ───────────────────────────────────────────────────────────────
export interface IStorage {
  // Users
  getUser(id: string): Promise<User | undefined>;
  getUserByUsername(username: string): Promise<User | undefined>;
  createUser(user: InsertUser): Promise<User>;
  updateUser(id: string, updates: Partial<User>): Promise<User | undefined>;

  // Trades
  getAllTrades(): Promise<Trade[]>;
  getTradeById(id: string): Promise<Trade | undefined>;
  addTrades(trades: Trade[]): Promise<Trade[]>;
  deleteTrade(id: string): Promise<boolean>;
  clearTrades(): Promise<void>;

  // Clients
  getAllClients(): Promise<Client[]>;
  getClient(id: string): Promise<Client | undefined>;
  createClient(client: InsertClient): Promise<Client>;
  updateClient(id: string, updates: Partial<Client>): Promise<Client | undefined>;
  deleteClient(id: string): Promise<boolean>;

  // Capital Movements
  getAllCapitalMovements(): Promise<CapitalMovement[]>;
  getCapitalMovementsForClient(clientId: string): Promise<CapitalMovement[]>;
  addCapitalMovement(cm: InsertCapitalMovement): Promise<CapitalMovement>;

  // Monthly Capital
  getAllMonthlyCapital(): Promise<MonthlyCapital[]>;
  setMonthlyCapital(mc: InsertMonthlyCapital): Promise<MonthlyCapital>;
  deleteMonthlyCapital(month: string): Promise<boolean>;

  // Config
  getConfig(clientId?: string): Promise<GlobalConfig & Partial<ClientConfig>>;
  getFullConfig(): Promise<Config>;
  updateGlobalConfig(updates: Partial<GlobalConfig>): Promise<Config>;
  updateClientConfig(clientId: string, updates: Partial<ClientConfig>): Promise<Config>;

  // Analytics / Business Logic
  getMonthlyStrategyReturns(clientId?: string): Promise<MonthlyReturn[]>;
  getClientCapitalFlow(clientId: string): Promise<CapitalFlowRow[]>;
  getStrategySummary(clientId?: string): Promise<StrategySummary>;
  getStrategyDetails(): Promise<StrategyDetails>;
  getTierForCapital(amount: number, clientId?: string): Tier;
  calculateProfitSplit(
    tier: Tier,
    profitAfterTax: number,
    capitalAtStart: number,
    periodType: "monthly" | "annual"
  ): { investorShare: number; traderShare: number };

  // Trade upload processing
  processTradeUpload(
    rawRows: Record<string, string>[],
    removeDayTrades: boolean
  ): Promise<{ added: number; duplicates: number; dayTradesRemoved: number }>;
}

// ─── Helpers ─────────────────────────────────────────────────────────────────

function toISODate(val: string): string {
  if (!val) return "";
  // Try parsing common date formats
  const d = new Date(val);
  if (!isNaN(d.getTime())) {
    return d.toISOString().slice(0, 10);
  }
  return val;
}

function tradeSignature(t: {
  buyDate: string;
  sellDate: string;
  stock: string;
  buyPrice: number;
  sellPrice: number;
  quantity: number;
}): string {
  return `${t.buyDate}|${t.sellDate}|${t.stock}|${t.buyPrice}|${t.sellPrice}|${t.quantity}`;
}

function monthKey(dateStr: string): string {
  return dateStr.slice(0, 7); // "2025-01"
}

// ─── Implementation ──────────────────────────────────────────────────────────

export class MemStorage implements IStorage {
  private users: Map<string, User>;
  private trades: Map<string, Trade>;
  private clients: Map<string, Client>;
  private capitalMovements: Map<string, CapitalMovement>;
  private monthlyCapital: Map<string, MonthlyCapital>;
  private config: Config;
  private tradeSignatures: Set<string>;

  constructor() {
    this.users = new Map();
    this.trades = new Map();
    this.clients = new Map();
    this.capitalMovements = new Map();
    this.monthlyCapital = new Map();
    this.tradeSignatures = new Set();

    this.config = {
      global: {
        tax_rate: 0.25,
        trader_share: 0.40,
        investor_share: 0.60,
        auto_remove_day_trades: true,
      },
      clients: {},
    };

    // Default admin user
    const adminId = randomUUID();
    this.users.set(adminId, {
      id: adminId,
      username: "admin",
      password: "admin123",
      role: "admin",
      name: "Admin",
      email: "",
      startingCapital: 0,
      investmentStartDate: "",
      active: true,
    });
  }

  // ─── Users ───────────────────────────────────────────────────────────────

  async getUser(id: string): Promise<User | undefined> {
    return this.users.get(id);
  }

  async getUserByUsername(username: string): Promise<User | undefined> {
    return Array.from(this.users.values()).find((u) => u.username === username);
  }

  async createUser(insert: InsertUser): Promise<User> {
    const id = randomUUID();
    const user: User = {
      id,
      username: insert.username,
      password: insert.password,
      role: insert.role ?? "client",
      name: insert.name,
      email: insert.email ?? "",
      startingCapital: insert.startingCapital ?? 0,
      investmentStartDate: insert.investmentStartDate ?? "",
      active: insert.active ?? true,
    };
    this.users.set(id, user);
    return user;
  }

  async updateUser(id: string, updates: Partial<User>): Promise<User | undefined> {
    const user = this.users.get(id);
    if (!user) return undefined;
    const updated = { ...user, ...updates, id };
    this.users.set(id, updated);
    return updated;
  }

  // ─── Trades ──────────────────────────────────────────────────────────────

  async getAllTrades(): Promise<Trade[]> {
    return Array.from(this.trades.values());
  }

  async getTradeById(id: string): Promise<Trade | undefined> {
    return this.trades.get(id);
  }

  async addTrades(trades: Trade[]): Promise<Trade[]> {
    for (const t of trades) {
      this.trades.set(t.tradeId, t);
      this.tradeSignatures.add(tradeSignature(t));
    }
    return trades;
  }

  async deleteTrade(id: string): Promise<boolean> {
    const t = this.trades.get(id);
    if (!t) return false;
    this.tradeSignatures.delete(tradeSignature(t));
    return this.trades.delete(id);
  }

  async clearTrades(): Promise<void> {
    this.trades.clear();
    this.tradeSignatures.clear();
  }

  // ─── Clients ─────────────────────────────────────────────────────────────

  async getAllClients(): Promise<Client[]> {
    return Array.from(this.clients.values());
  }

  async getClient(id: string): Promise<Client | undefined> {
    return this.clients.get(id);
  }

  async createClient(insert: InsertClient): Promise<Client> {
    const clientId = insert.username;
    const client: Client = {
      clientId,
      username: insert.username,
      name: insert.name,
      email: insert.email ?? "",
      startingCapital: insert.startingCapital ?? 0,
      investmentStartDate: insert.investmentStartDate ?? "",
      active: insert.active ?? true,
    };
    this.clients.set(clientId, client);

    // Also create a user account for the client
    const existingUser = await this.getUserByUsername(insert.username);
    if (!existingUser) {
      await this.createUser({
        username: insert.username,
        password: insert.password,
        role: "client",
        name: insert.name,
        email: insert.email ?? "",
        startingCapital: insert.startingCapital ?? 0,
        investmentStartDate: insert.investmentStartDate ?? "",
        active: insert.active ?? true,
      });
    }

    return client;
  }

  async updateClient(
    id: string,
    updates: Partial<Client>
  ): Promise<Client | undefined> {
    const client = this.clients.get(id);
    if (!client) return undefined;
    const updated = { ...client, ...updates, clientId: id };
    this.clients.set(id, updated);
    return updated;
  }

  async deleteClient(id: string): Promise<boolean> {
    return this.clients.delete(id);
  }

  // ─── Capital Movements ───────────────────────────────────────────────────

  async getAllCapitalMovements(): Promise<CapitalMovement[]> {
    return Array.from(this.capitalMovements.values());
  }

  async getCapitalMovementsForClient(clientId: string): Promise<CapitalMovement[]> {
    return Array.from(this.capitalMovements.values()).filter(
      (cm) => cm.clientId === clientId
    );
  }

  async addCapitalMovement(insert: InsertCapitalMovement): Promise<CapitalMovement> {
    const movementId = randomUUID();
    const cm: CapitalMovement = {
      movementId,
      clientId: insert.clientId,
      date: insert.date,
      type: insert.type,
      amount: insert.amount,
      notes: insert.notes ?? "",
    };
    this.capitalMovements.set(movementId, cm);
    return cm;
  }

  // ─── Monthly Capital ─────────────────────────────────────────────────────

  async getAllMonthlyCapital(): Promise<MonthlyCapital[]> {
    return Array.from(this.monthlyCapital.values()).sort((a, b) =>
      a.month.localeCompare(b.month)
    );
  }

  async setMonthlyCapital(insert: InsertMonthlyCapital): Promise<MonthlyCapital> {
    const mc: MonthlyCapital = {
      month: insert.month,
      totalCapital: insert.totalCapital,
      notes: insert.notes ?? "",
    };
    this.monthlyCapital.set(mc.month, mc);
    return mc;
  }

  async deleteMonthlyCapital(month: string): Promise<boolean> {
    return this.monthlyCapital.delete(month);
  }

  // ─── Config ──────────────────────────────────────────────────────────────

  async getConfig(
    clientId?: string
  ): Promise<GlobalConfig & Partial<ClientConfig>> {
    const base = { ...this.config.global };
    if (clientId && this.config.clients[clientId]) {
      const cc = this.config.clients[clientId];
      return {
        ...base,
        ...cc,
        tax_rate: cc.tax_rate ?? base.tax_rate,
        trader_share: cc.trader_share ?? base.trader_share,
        investor_share: cc.investor_share ?? base.investor_share,
      };
    }
    return base;
  }

  async getFullConfig(): Promise<Config> {
    return { ...this.config };
  }

  async updateGlobalConfig(updates: Partial<GlobalConfig>): Promise<Config> {
    this.config.global = { ...this.config.global, ...updates };
    return { ...this.config };
  }

  async updateClientConfig(
    clientId: string,
    updates: Partial<ClientConfig>
  ): Promise<Config> {
    const existing = this.config.clients[clientId] ?? {
      tax_rate: this.config.global.tax_rate,
      trader_share: this.config.global.trader_share,
      investor_share: this.config.global.investor_share,
      tier_override: "" as const,
    };
    this.config.clients[clientId] = { ...existing, ...updates };
    return { ...this.config };
  }

  // ─── Tier & Profit Split ─────────────────────────────────────────────────

  getTierForCapital(amount: number, clientId?: string): Tier {
    // Check client override first
    if (clientId && this.config.clients[clientId]?.tier_override) {
      return this.config.clients[clientId].tier_override as Tier;
    }
    if (amount >= 75_000) return "gold";
    if (amount >= 25_000) return "preferential";
    return "default";
  }

  calculateProfitSplit(
    tier: Tier,
    profitAfterTax: number,
    capitalAtStart: number,
    periodType: "monthly" | "annual" = "monthly"
  ): { investorShare: number; traderShare: number } {
    if (profitAfterTax <= 0) {
      // Loss scenario
      if (tier === "gold") {
        return {
          investorShare: profitAfterTax * 0.6,
          traderShare: profitAfterTax * 0.4,
        };
      }
      // Default and Preferential: 100% investor loss
      return { investorShare: profitAfterTax, traderShare: 0 };
    }

    // Profit scenario
    switch (tier) {
      case "default": {
        // 50/50 split
        return {
          investorShare: profitAfterTax * 0.5,
          traderShare: profitAfterTax * 0.5,
        };
      }
      case "preferential": {
        // 10% annual preferred return to investor first
        const annualPreferredRate = 0.10;
        const preferredRate =
          periodType === "monthly"
            ? annualPreferredRate / 12
            : annualPreferredRate;
        const preferredReturn = capitalAtStart * preferredRate;

        if (profitAfterTax <= preferredReturn) {
          return { investorShare: profitAfterTax, traderShare: 0 };
        }
        const remainder = profitAfterTax - preferredReturn;
        return {
          investorShare: preferredReturn + remainder * 0.5,
          traderShare: remainder * 0.5,
        };
      }
      case "gold": {
        // 60/40 investor/trader
        return {
          investorShare: profitAfterTax * 0.6,
          traderShare: profitAfterTax * 0.4,
        };
      }
      default:
        return {
          investorShare: profitAfterTax * 0.5,
          traderShare: profitAfterTax * 0.5,
        };
    }
  }

  // ─── Analytics ───────────────────────────────────────────────────────────

  async getMonthlyStrategyReturns(clientId?: string): Promise<MonthlyReturn[]> {
    const trades = Array.from(this.trades.values());
    const mcMap = this.monthlyCapital;

    // Group trades by sell month
    const monthGroups = new Map<string, Trade[]>();
    for (const t of trades) {
      const m = monthKey(t.sellDate);
      if (!monthGroups.has(m)) monthGroups.set(m, []);
      monthGroups.get(m)!.push(t);
    }

    // Sort months chronologically
    const sortedMonths = Array.from(monthGroups.keys()).sort();

    let cumulativeReturn = 0;
    const results: MonthlyReturn[] = [];

    for (const m of sortedMonths) {
      const monthTrades = monthGroups.get(m)!;
      const totalPL = monthTrades.reduce((s, t) => s + t.profitLoss, 0);
      const totalTrades = monthTrades.length;
      const winners = monthTrades.filter((t) => t.winLoss === "Win");
      const losers = monthTrades.filter((t) => t.winLoss === "Loss");
      const winRate =
        totalTrades > 0 ? (winners.length / totalTrades) * 100 : 0;

      const mc = mcMap.get(m);
      const capital = mc ? mc.totalCapital : 0;
      const returnPct = capital > 0 ? (totalPL / capital) * 100 : 0;

      const avgWinPct =
        winners.length > 0
          ? winners.reduce(
              (s, t) => s + ((t.sellPrice - t.buyPrice) / t.buyPrice) * 100,
              0
            ) / winners.length
          : 0;
      const avgLossPct =
        losers.length > 0
          ? losers.reduce(
              (s, t) => s + ((t.sellPrice - t.buyPrice) / t.buyPrice) * 100,
              0
            ) / losers.length
          : 0;

      cumulativeReturn += returnPct;

      results.push({
        month: m,
        totalPL: Math.round(totalPL * 100) / 100,
        totalTrades,
        winningTrades: winners.length,
        winRate: Math.round(winRate * 100) / 100,
        returnPct: Math.round(returnPct * 100) / 100,
        avgWinPct: Math.round(avgWinPct * 100) / 100,
        avgLossPct: Math.round(avgLossPct * 100) / 100,
        cumulativeReturn: Math.round(cumulativeReturn * 100) / 100,
        monthlyCapital: capital,
      });
    }

    return results;
  }

  async getClientCapitalFlow(clientId: string): Promise<CapitalFlowRow[]> {
    const client = this.clients.get(clientId);
    if (!client) return [];

    const effectiveConfig = await this.getConfig(clientId);
    const taxRate = effectiveConfig.tax_rate;

    // Get monthly returns
    const monthlyReturns = await this.getMonthlyStrategyReturns();
    const returnsByMonth = new Map<string, MonthlyReturn>();
    for (const mr of monthlyReturns) {
      returnsByMonth.set(mr.month, mr);
    }

    // Get capital movements for this client
    const movements = await this.getCapitalMovementsForClient(clientId);

    // Build month list from investment start date to latest month with data
    const startMonth = client.investmentStartDate
      ? monthKey(client.investmentStartDate)
      : "";
    if (!startMonth) return [];

    // Gather all months: from start to the latest month with any data
    const allMonths = new Set<string>();
    allMonths.add(startMonth);
    for (const mr of monthlyReturns) allMonths.add(mr.month);
    for (const cm of movements) allMonths.add(monthKey(cm.date));

    const sortedMonths = Array.from(allMonths).sort();
    // Only include months >= startMonth
    const relevantMonths = sortedMonths.filter((m) => m >= startMonth);

    let currentCapital = client.startingCapital;
    let cumulativeInvestorProfit = 0;
    const results: CapitalFlowRow[] = [];

    for (const m of relevantMonths) {
      const startingCapital = currentCapital;

      // Net contributions for this month
      const monthMovements = movements.filter((cm) => monthKey(cm.date) === m);
      let contributions = 0;
      let withdrawals = 0;
      for (const cm of monthMovements) {
        if (cm.type === "contribution") contributions += cm.amount;
        else withdrawals += cm.amount;
      }

      const capitalAfterContributions =
        startingCapital + contributions - withdrawals;

      // Determine tier
      const tier = this.getTierForCapital(capitalAfterContributions, clientId);

      // Get return for this month
      const mr = returnsByMonth.get(m);
      const returnPct = mr ? mr.returnPct : 0;

      // Calculate return amount
      const returnAmount = capitalAfterContributions * (returnPct / 100);

      // Apply tax
      const profitAfterTax =
        returnAmount > 0 ? returnAmount * (1 - taxRate) : returnAmount;

      // Split
      const { investorShare, traderShare } = this.calculateProfitSplit(
        tier,
        profitAfterTax,
        capitalAfterContributions,
        "monthly"
      );

      cumulativeInvestorProfit += investorShare;
      const endingCapital = capitalAfterContributions + investorShare;

      results.push({
        month: m,
        startingCapital: Math.round(startingCapital * 100) / 100,
        contributions: Math.round(contributions * 100) / 100,
        withdrawals: Math.round(withdrawals * 100) / 100,
        capitalAfterContributions:
          Math.round(capitalAfterContributions * 100) / 100,
        tier,
        returnPct: Math.round(returnPct * 100) / 100,
        returnAmount: Math.round(returnAmount * 100) / 100,
        profitAfterTax: Math.round(profitAfterTax * 100) / 100,
        investorShare: Math.round(investorShare * 100) / 100,
        traderShare: Math.round(traderShare * 100) / 100,
        cumulativeInvestorProfit:
          Math.round(cumulativeInvestorProfit * 100) / 100,
        endingCapital: Math.round(endingCapital * 100) / 100,
      });

      currentCapital = endingCapital;
    }

    return results;
  }

  async getStrategySummary(clientId?: string): Promise<StrategySummary> {
    const monthlyReturns = await this.getMonthlyStrategyReturns(clientId);

    const trades = Array.from(this.trades.values());
    const totalTrades = trades.length;
    const winners = trades.filter((t) => t.winLoss === "Win");
    const losers = trades.filter((t) => t.winLoss === "Loss");

    const winRate =
      totalTrades > 0 ? (winners.length / totalTrades) * 100 : 0;
    const cumulativeReturn =
      monthlyReturns.length > 0
        ? monthlyReturns[monthlyReturns.length - 1].cumulativeReturn
        : 0;

    const avgWinPct =
      winners.length > 0
        ? winners.reduce(
            (s, t) => s + ((t.sellPrice - t.buyPrice) / t.buyPrice) * 100,
            0
          ) / winners.length
        : 0;
    const avgLossPct =
      losers.length > 0
        ? losers.reduce(
            (s, t) => s + ((t.sellPrice - t.buyPrice) / t.buyPrice) * 100,
            0
          ) / losers.length
        : 0;

    const totalPL = trades.reduce((s, t) => s + t.profitLoss, 0);

    return {
      cumulativeReturn: Math.round(cumulativeReturn * 100) / 100,
      totalTrades,
      winRate: Math.round(winRate * 100) / 100,
      avgWinPct: Math.round(avgWinPct * 100) / 100,
      avgLossPct: Math.round(avgLossPct * 100) / 100,
      totalPL: Math.round(totalPL * 100) / 100,
    };
  }

  async getStrategyDetails(): Promise<StrategyDetails> {
    const trades = Array.from(this.trades.values());

    // Group by sell month
    const monthGroups = new Map<string, Trade[]>();
    for (const t of trades) {
      const m = monthKey(t.sellDate);
      if (!monthGroups.has(m)) monthGroups.set(m, []);
      monthGroups.get(m)!.push(t);
    }

    const topWinnersByMonth: Record<string, Trade[]> = {};
    const topLosersByMonth: Record<string, Trade[]> = {};

    monthGroups.forEach((mTrades, m) => {
      const sorted = [...mTrades].sort((a, b) => b.profitLoss - a.profitLoss);
      topWinnersByMonth[m] = sorted.filter((t) => t.winLoss === "Win").slice(0, 5);
      topLosersByMonth[m] = sorted
        .filter((t) => t.winLoss === "Loss")
        .slice(-5)
        .reverse();
    });

    // Trade log: sorted by sell date, quantity >= 2
    const tradeLog = trades
      .filter((t) => t.quantity >= 2)
      .sort((a, b) => b.sellDate.localeCompare(a.sellDate));

    return { topWinnersByMonth, topLosersByMonth, tradeLog };
  }

  // ─── Trade Upload Processing ─────────────────────────────────────────────

  async processTradeUpload(
    rawRows: Record<string, string>[],
    removeDayTrades: boolean
  ): Promise<{ added: number; duplicates: number; dayTradesRemoved: number }> {
    let duplicates = 0;
    let dayTradesRemoved = 0;
    const newTrades: Trade[] = [];

    for (const row of rawRows) {
      // Normalize column names (handle various formats)
      const normalized: Record<string, string> = {};
      for (const [key, val] of Object.entries(row)) {
        const k = key
          .toLowerCase()
          .trim()
          .replace(/\s+/g, "_")
          .replace(/-/g, "_");
        normalized[k] = (val ?? "").toString().trim();
      }

      const buyDateRaw = normalized["buy_date"] || normalized["buydate"] || "";
      const sellDateRaw =
        normalized["sell_date"] || normalized["selldate"] || "";
      const stock = normalized["stock"] || normalized["symbol"] || "";
      const buyPriceRaw =
        normalized["buy_price"] || normalized["buyprice"] || "0";
      const sellPriceRaw =
        normalized["sell_price"] || normalized["sellprice"] || "0";
      const quantityRaw =
        normalized["quantity"] || normalized["qty"] || "0";

      if (!buyDateRaw || !sellDateRaw || !stock) continue;

      const buyDate = toISODate(buyDateRaw);
      const sellDate = toISODate(sellDateRaw);
      const buyPrice = parseFloat(buyPriceRaw) || 0;
      const sellPrice = parseFloat(sellPriceRaw) || 0;
      const quantity = parseInt(quantityRaw, 10) || 0;

      if (quantity <= 0 || buyPrice <= 0) continue;

      // Day trade check
      if (removeDayTrades && buyDate === sellDate) {
        dayTradesRemoved++;
        continue;
      }

      // Derived fields
      const profitLoss = (sellPrice - buyPrice) * quantity;
      const positionSize = buyPrice * quantity;
      const returnPct = buyPrice > 0 ? ((sellPrice - buyPrice) / buyPrice) * 100 : 0;
      const winLoss: "Win" | "Loss" = profitLoss > 0 ? "Win" : "Loss";

      const trade: Trade = {
        tradeId: randomUUID(),
        buyDate,
        sellDate,
        stock: stock.toUpperCase(),
        buyPrice,
        sellPrice,
        quantity,
        profitLoss: Math.round(profitLoss * 100) / 100,
        positionSize: Math.round(positionSize * 100) / 100,
        returnPct: Math.round(returnPct * 100) / 100,
        winLoss,
      };

      // Deduplication
      const sig = tradeSignature(trade);
      if (this.tradeSignatures.has(sig)) {
        duplicates++;
        continue;
      }

      newTrades.push(trade);
    }

    await this.addTrades(newTrades);

    return {
      added: newTrades.length,
      duplicates,
      dayTradesRemoved,
    };
  }
}

export const storage = new MemStorage();
