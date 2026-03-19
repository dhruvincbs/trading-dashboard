import { z } from "zod";

// ─── User ────────────────────────────────────────────────────────────────────
export interface User {
  id: string;
  username: string;
  password: string;
  role: "admin" | "client";
  name: string;
  email: string;
  startingCapital: number;
  investmentStartDate: string; // ISO date string
  active: boolean;
}

export const insertUserSchema = z.object({
  username: z.string().min(1),
  password: z.string().min(1),
  role: z.enum(["admin", "client"]).default("client"),
  name: z.string().min(1),
  email: z.string().email().optional().default(""),
  startingCapital: z.number().min(0).optional().default(0),
  investmentStartDate: z.string().optional().default(""),
  active: z.boolean().optional().default(true),
});

export type InsertUser = z.infer<typeof insertUserSchema>;

// ─── Trade ───────────────────────────────────────────────────────────────────
export interface Trade {
  tradeId: string;
  buyDate: string;
  sellDate: string;
  stock: string;
  buyPrice: number;
  sellPrice: number;
  quantity: number;
  profitLoss: number;
  positionSize: number;
  returnPct: number;
  winLoss: "Win" | "Loss";
}

export const insertTradeSchema = z.object({
  buyDate: z.string().min(1),
  sellDate: z.string().min(1),
  stock: z.string().min(1),
  buyPrice: z.number(),
  sellPrice: z.number(),
  quantity: z.number(),
});

export type InsertTrade = z.infer<typeof insertTradeSchema>;

// ─── Client ──────────────────────────────────────────────────────────────────
export interface Client {
  clientId: string;
  username: string;
  name: string;
  email: string;
  startingCapital: number;
  investmentStartDate: string;
  active: boolean;
}

export const insertClientSchema = z.object({
  username: z.string().min(1),
  name: z.string().min(1),
  email: z.string().email().optional().default(""),
  password: z.string().min(1),
  startingCapital: z.number().min(0).optional().default(0),
  investmentStartDate: z.string().optional().default(""),
  active: z.boolean().optional().default(true),
});

export type InsertClient = z.infer<typeof insertClientSchema>;

// ─── Capital Movement ────────────────────────────────────────────────────────
export interface CapitalMovement {
  movementId: string;
  clientId: string;
  date: string;
  type: "contribution" | "withdrawal";
  amount: number;
  notes: string;
}

export const insertCapitalMovementSchema = z.object({
  clientId: z.string().min(1),
  date: z.string().min(1),
  type: z.enum(["contribution", "withdrawal"]),
  amount: z.number().min(0),
  notes: z.string().optional().default(""),
});

export type InsertCapitalMovement = z.infer<typeof insertCapitalMovementSchema>;

// ─── Monthly Capital ─────────────────────────────────────────────────────────
export interface MonthlyCapital {
  month: string; // e.g. '2025-01'
  totalCapital: number;
  notes: string;
}

export const insertMonthlyCapitalSchema = z.object({
  month: z.string().min(1),
  totalCapital: z.number().min(0),
  notes: z.string().optional().default(""),
});

export type InsertMonthlyCapital = z.infer<typeof insertMonthlyCapitalSchema>;

// ─── Config ──────────────────────────────────────────────────────────────────
export interface ClientConfig {
  tax_rate: number;
  trader_share: number;
  investor_share: number;
  tier_override: "" | "default" | "preferential" | "gold";
}

export interface GlobalConfig {
  tax_rate: number;
  trader_share: number;
  investor_share: number;
  auto_remove_day_trades: boolean;
}

export interface Config {
  global: GlobalConfig;
  clients: Record<string, ClientConfig>;
}

export const globalConfigSchema = z.object({
  tax_rate: z.number().min(0).max(1).optional(),
  trader_share: z.number().min(0).max(1).optional(),
  investor_share: z.number().min(0).max(1).optional(),
  auto_remove_day_trades: z.boolean().optional(),
});

export const clientConfigSchema = z.object({
  tax_rate: z.number().min(0).max(1).optional(),
  trader_share: z.number().min(0).max(1).optional(),
  investor_share: z.number().min(0).max(1).optional(),
  tier_override: z.enum(["", "default", "preferential", "gold"]).optional(),
});

// ─── Auth ────────────────────────────────────────────────────────────────────
export const loginSchema = z.object({
  username: z.string().min(1),
  password: z.string().min(1),
});

export type LoginInput = z.infer<typeof loginSchema>;

// ─── Analytics result types ──────────────────────────────────────────────────
export interface MonthlyReturn {
  month: string;
  totalPL: number;
  totalTrades: number;
  winningTrades: number;
  winRate: number;
  returnPct: number;
  avgWinPct: number;
  avgLossPct: number;
  cumulativeReturn: number;
  monthlyCapital: number;
}

export interface StrategySummary {
  cumulativeReturn: number;
  totalTrades: number;
  winRate: number;
  avgWinPct: number;
  avgLossPct: number;
  totalPL: number;
}

export interface CapitalFlowRow {
  month: string;
  startingCapital: number;
  contributions: number;
  withdrawals: number;
  capitalAfterContributions: number;
  tier: string;
  returnPct: number;
  returnAmount: number;
  profitAfterTax: number;
  investorShare: number;
  traderShare: number;
  cumulativeInvestorProfit: number;
  endingCapital: number;
}

export interface StrategyDetails {
  topWinnersByMonth: Record<string, Trade[]>;
  topLosersByMonth: Record<string, Trade[]>;
  tradeLog: Trade[];
}

export type Tier = "default" | "preferential" | "gold";
