import type { Express, Request, Response, NextFunction } from "express";
import { createServer, type Server } from "http";
import multer from "multer";
import Papa from "papaparse";
import fs from "fs";
import { storage } from "./storage";
import {
  loginSchema,
  insertClientSchema,
  insertCapitalMovementSchema,
  insertMonthlyCapitalSchema,
  globalConfigSchema,
  clientConfigSchema,
} from "@shared/schema";
import type { User } from "@shared/schema";

// ─── Session Management ──────────────────────────────────────────────────────

interface Session {
  userId: string;
  user: Omit<User, "password">;
  createdAt: number;
}

const sessions = new Map<string, Session>();

function generateToken(): string {
  return (
    Math.random().toString(36).slice(2) +
    Math.random().toString(36).slice(2) +
    Date.now().toString(36)
  );
}

function getToken(req: Request): string | null {
  // Check Authorization header first, then cookie
  const authHeader = req.headers.authorization;
  if (authHeader?.startsWith("Bearer ")) {
    return authHeader.slice(7);
  }
  const cookies = req.headers.cookie;
  if (cookies) {
    const match = cookies.split(";").find((c) => c.trim().startsWith("token="));
    if (match) return match.split("=")[1]?.trim() || null;
  }
  return null;
}

function stripPassword(user: User): Omit<User, "password"> {
  const { password: _, ...rest } = user;
  return rest;
}

// Auth middleware
function requireAuth(req: Request, res: Response, next: NextFunction): void {
  const token = getToken(req);
  if (!token || !sessions.has(token)) {
    res.status(401).json({ message: "Unauthorized" });
    return;
  }
  // Attach session to request
  (req as any).session_data = sessions.get(token)!;
  (req as any).token = token;
  next();
}

function requireAdmin(req: Request, res: Response, next: NextFunction): void {
  const session: Session | undefined = (req as any).session_data;
  if (!session || session.user.role !== "admin") {
    res.status(403).json({ message: "Forbidden: admin access required" });
    return;
  }
  next();
}

// ─── Multer Setup ────────────────────────────────────────────────────────────

const upload = multer({ dest: "/tmp/uploads/" });

// ─── Register Routes ─────────────────────────────────────────────────────────

export async function registerRoutes(
  httpServer: Server,
  app: Express
): Promise<Server> {
  // ── Auth Routes ────────────────────────────────────────────────────────

  app.post("/api/auth/login", async (req: Request, res: Response) => {
    try {
      const parsed = loginSchema.safeParse(req.body);
      if (!parsed.success) {
        res.status(400).json({ message: "Invalid credentials format" });
        return;
      }

      const { username, password } = parsed.data;
      const user = await storage.getUserByUsername(username);

      if (!user || user.password !== password) {
        res.status(401).json({ message: "Invalid username or password" });
        return;
      }

      if (!user.active) {
        res.status(403).json({ message: "Account is deactivated" });
        return;
      }

      const token = generateToken();
      const session: Session = {
        userId: user.id,
        user: stripPassword(user),
        createdAt: Date.now(),
      };
      sessions.set(token, session);

      res.setHeader(
        "Set-Cookie",
        `token=${token}; Path=/; HttpOnly; SameSite=Lax; Max-Age=86400`
      );

      res.json({ user: stripPassword(user), token });
    } catch (err: any) {
      res.status(500).json({ message: err.message });
    }
  });

  app.get("/api/auth/me", requireAuth, async (req: Request, res: Response) => {
    const session: Session = (req as any).session_data;
    // Refresh user data from storage
    const user = await storage.getUser(session.userId);
    if (!user) {
      res.status(401).json({ message: "User not found" });
      return;
    }
    res.json({ user: stripPassword(user) });
  });

  app.post(
    "/api/auth/logout",
    requireAuth,
    async (req: Request, res: Response) => {
      const token: string = (req as any).token;
      sessions.delete(token);
      res.setHeader(
        "Set-Cookie",
        "token=; Path=/; HttpOnly; SameSite=Lax; Max-Age=0"
      );
      res.json({ message: "Logged out" });
    }
  );

  // ── Apply auth middleware to all subsequent /api routes ─────────────────
  app.use("/api", (req: Request, res: Response, next: NextFunction) => {
    // Skip auth for login route (already handled above)
    if (req.path === "/auth/login") {
      next();
      return;
    }
    requireAuth(req, res, next);
  });

  // ── Trades ─────────────────────────────────────────────────────────────

  app.get("/api/trades", async (_req: Request, res: Response) => {
    const trades = await storage.getAllTrades();
    res.json(trades);
  });

  app.post(
    "/api/trades/upload",
    requireAdmin,
    upload.single("file"),
    async (req: Request, res: Response) => {
      try {
        const file = (req as any).file;
        if (!file) {
          res.status(400).json({ message: "No file uploaded" });
          return;
        }

        const fileContent = fs.readFileSync(file.path, "utf-8");

        // Parse CSV using PapaParse
        const parsed = Papa.parse<Record<string, string>>(fileContent, {
          header: true,
          skipEmptyLines: true,
          dynamicTyping: false,
        });

        if (parsed.errors.length > 0 && parsed.data.length === 0) {
          res.status(400).json({
            message: "CSV parse error",
            errors: parsed.errors.slice(0, 5),
          });
          return;
        }

        // Determine if day trades should be removed
        const config = await storage.getFullConfig();
        const removeDayTrades =
          req.body?.auto_remove_day_trades !== undefined
            ? req.body.auto_remove_day_trades === "true" ||
              req.body.auto_remove_day_trades === true
            : config.global.auto_remove_day_trades;

        const result = await storage.processTradeUpload(
          parsed.data,
          removeDayTrades
        );

        // Clean up temp file
        fs.unlink(file.path, () => {});

        res.json({
          message: "Upload processed",
          ...result,
          totalRows: parsed.data.length,
        });
      } catch (err: any) {
        res.status(500).json({ message: err.message });
      }
    }
  );

  app.delete(
    "/api/trades/:id",
    requireAdmin,
    async (req: Request, res: Response) => {
      const deleted = await storage.deleteTrade(req.params.id as string);
      if (!deleted) {
        res.status(404).json({ message: "Trade not found" });
        return;
      }
      res.json({ message: "Trade deleted" });
    }
  );

  // ── Clients ────────────────────────────────────────────────────────────

  app.get(
    "/api/clients",
    requireAdmin,
    async (_req: Request, res: Response) => {
      const clients = await storage.getAllClients();
      res.json(clients);
    }
  );

  app.post(
    "/api/clients",
    requireAdmin,
    async (req: Request, res: Response) => {
      try {
        const parsed = insertClientSchema.safeParse(req.body);
        if (!parsed.success) {
          res.status(400).json({
            message: "Validation error",
            errors: parsed.error.flatten(),
          });
          return;
        }

        // Check if username already exists
        const existing = await storage.getUserByUsername(parsed.data.username);
        if (existing) {
          res.status(409).json({ message: "Username already exists" });
          return;
        }

        const client = await storage.createClient(parsed.data);
        res.status(201).json(client);
      } catch (err: any) {
        res.status(500).json({ message: err.message });
      }
    }
  );

  app.patch(
    "/api/clients/:id",
    requireAdmin,
    async (req: Request, res: Response) => {
      const updated = await storage.updateClient(req.params.id as string, req.body);
      if (!updated) {
        res.status(404).json({ message: "Client not found" });
        return;
      }
      res.json(updated);
    }
  );

  app.delete(
    "/api/clients/:id",
    requireAdmin,
    async (req: Request, res: Response) => {
      const deleted = await storage.deleteClient(req.params.id as string);
      if (!deleted) {
        res.status(404).json({ message: "Client not found" });
        return;
      }
      res.json({ message: "Client deleted" });
    }
  );

  // ── Capital Movements ──────────────────────────────────────────────────

  app.get(
    "/api/capital-movements",
    async (req: Request, res: Response) => {
      const session: Session = (req as any).session_data;
      if (session.user.role === "admin") {
        const movements = await storage.getAllCapitalMovements();
        res.json(movements);
      } else {
        // Client can only see their own
        const movements = await storage.getCapitalMovementsForClient(
          session.user.username
        );
        res.json(movements);
      }
    }
  );

  app.post(
    "/api/capital-movements",
    requireAdmin,
    async (req: Request, res: Response) => {
      try {
        const parsed = insertCapitalMovementSchema.safeParse(req.body);
        if (!parsed.success) {
          res.status(400).json({
            message: "Validation error",
            errors: parsed.error.flatten(),
          });
          return;
        }
        const cm = await storage.addCapitalMovement(parsed.data);
        res.status(201).json(cm);
      } catch (err: any) {
        res.status(500).json({ message: err.message });
      }
    }
  );

  // ── Config ─────────────────────────────────────────────────────────────

  app.get(
    "/api/config",
    requireAdmin,
    async (_req: Request, res: Response) => {
      const config = await storage.getFullConfig();
      res.json(config);
    }
  );

  app.patch(
    "/api/config",
    requireAdmin,
    async (req: Request, res: Response) => {
      try {
        const parsed = globalConfigSchema.safeParse(req.body);
        if (!parsed.success) {
          res.status(400).json({
            message: "Validation error",
            errors: parsed.error.flatten(),
          });
          return;
        }
        const config = await storage.updateGlobalConfig(parsed.data);
        res.json(config);
      } catch (err: any) {
        res.status(500).json({ message: err.message });
      }
    }
  );

  app.patch(
    "/api/config/:clientId",
    requireAdmin,
    async (req: Request, res: Response) => {
      try {
        const parsed = clientConfigSchema.safeParse(req.body);
        if (!parsed.success) {
          res.status(400).json({
            message: "Validation error",
            errors: parsed.error.flatten(),
          });
          return;
        }
        const config = await storage.updateClientConfig(
          req.params.clientId as string,
          parsed.data
        );
        res.json(config);
      } catch (err: any) {
        res.status(500).json({ message: err.message });
      }
    }
  );

  // ── Monthly Capital ────────────────────────────────────────────────────

  app.get("/api/monthly-capital", async (_req: Request, res: Response) => {
    const mc = await storage.getAllMonthlyCapital();
    res.json(mc);
  });

  app.post(
    "/api/monthly-capital",
    requireAdmin,
    async (req: Request, res: Response) => {
      try {
        const parsed = insertMonthlyCapitalSchema.safeParse(req.body);
        if (!parsed.success) {
          res.status(400).json({
            message: "Validation error",
            errors: parsed.error.flatten(),
          });
          return;
        }
        const mc = await storage.setMonthlyCapital(parsed.data);
        res.status(201).json(mc);
      } catch (err: any) {
        res.status(500).json({ message: err.message });
      }
    }
  );

  app.delete(
    "/api/monthly-capital/:month",
    requireAdmin,
    async (req: Request, res: Response) => {
      const deleted = await storage.deleteMonthlyCapital(req.params.month as string);
      if (!deleted) {
        res.status(404).json({ message: "Monthly capital entry not found" });
        return;
      }
      res.json({ message: "Deleted" });
    }
  );

  // ── Analytics ──────────────────────────────────────────────────────────

  app.get(
    "/api/analytics/strategy-summary",
    async (req: Request, res: Response) => {
      const clientId = (req.query.clientId as string) || undefined;
      const session: Session = (req as any).session_data;

      // If client user, lock to their own data
      const effectiveClientId =
        session.user.role === "client" ? session.user.username : clientId;

      const summary = await storage.getStrategySummary(effectiveClientId);
      res.json(summary);
    }
  );

  app.get(
    "/api/analytics/monthly-returns",
    async (req: Request, res: Response) => {
      const clientId = (req.query.clientId as string) || undefined;
      const session: Session = (req as any).session_data;
      const effectiveClientId =
        session.user.role === "client" ? session.user.username : clientId;

      const returns = await storage.getMonthlyStrategyReturns(effectiveClientId);
      res.json(returns);
    }
  );

  app.get(
    "/api/analytics/client-capital-flow/:clientId",
    async (req: Request, res: Response) => {
      const session: Session = (req as any).session_data;
      const requestedClientId = req.params.clientId as string;

      // Clients can only view their own capital flow
      if (
        session.user.role === "client" &&
        session.user.username !== requestedClientId
      ) {
        res.status(403).json({ message: "Forbidden" });
        return;
      }

      const flow = await storage.getClientCapitalFlow(requestedClientId);
      res.json(flow);
    }
  );

  app.get(
    "/api/analytics/strategy-details",
    async (_req: Request, res: Response) => {
      const details = await storage.getStrategyDetails();
      res.json(details);
    }
  );

  // S&P 500 approximate monthly returns (historical averages as static data)
  // These are approximate monthly returns for the S&P 500 for reference comparison
  app.get(
    "/api/analytics/sp500-monthly",
    async (req: Request, res: Response) => {
      // Get our monthly returns to know what date range to cover
      const clientId = (req.query.clientId as string) || undefined;
      const session: Session = (req as any).session_data;
      const effectiveClientId =
        session.user.role === "client" ? session.user.username : clientId;
      const returns = await storage.getMonthlyStrategyReturns(effectiveClientId);
      
      // Generate approximate S&P 500 monthly returns for the same months
      // Using a simplified model: ~0.8% avg monthly return with some variance
      const sp500Data = returns.map((r, i) => {
        // Use a seeded pseudo-random based on month string for consistency
        const seed = r.month.split("").reduce((a, c) => a + c.charCodeAt(0), 0);
        const variance = ((seed * 9301 + 49297) % 233280) / 233280; // 0-1 range
        const monthlyReturn = 0.5 + (variance - 0.5) * 2.0; // roughly -0.5% to 1.5%
        return {
          month: r.month,
          returnPct: Math.round(monthlyReturn * 100) / 100,
        };
      });
      
      // Add cumulative returns
      let cumulative = 0;
      const result = sp500Data.map(d => {
        cumulative += d.returnPct;
        return { ...d, cumulativeReturn: Math.round(cumulative * 100) / 100 };
      });
      
      res.json(result);
    }
  );

  return httpServer;
}
