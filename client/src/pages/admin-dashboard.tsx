import { useQuery } from "@tanstack/react-query";
import { useMemo } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Skeleton } from "@/components/ui/skeleton";
import { BarChart3, Users, Landmark, Percent, ArrowLeftRight } from "lucide-react";
import { AreaChart, Area, ResponsiveContainer } from "recharts";
import type { Trade, Client, CapitalMovement, Config } from "@shared/schema";

export default function AdminDashboard() {
  const { data: trades, isLoading: tradesLoading } = useQuery<Trade[]>({
    queryKey: ["/api/trades"],
  });

  const { data: clients, isLoading: clientsLoading } = useQuery<Client[]>({
    queryKey: ["/api/clients"],
  });

  const { data: movements, isLoading: movementsLoading } = useQuery<CapitalMovement[]>({
    queryKey: ["/api/capital-movements"],
  });

  const { data: config } = useQuery<Config>({
    queryKey: ["/api/config"],
  });

  const totalCapital = clients?.reduce((sum, c) => sum + c.startingCapital, 0) ?? 0;
  const taxRate = config?.global.tax_rate ?? 0.25;
  const recentTrades = trades?.slice(-5).reverse() ?? [];
  const recentMovements = movements?.slice(-5).reverse() ?? [];

  const isLoading = tradesLoading || clientsLoading || movementsLoading;

  const tradesByMonth = useMemo(() => {
    if (!trades || trades.length === 0) return [];
    const counts: Record<string, number> = {};
    trades.forEach(t => {
      const m = t.sellDate.slice(0, 7);
      counts[m] = (counts[m] || 0) + 1;
    });
    return Object.keys(counts).sort().map(m => ({ v: counts[m] }));
  }, [trades]);

  const plByMonth = useMemo(() => {
    if (!trades || trades.length === 0) return [];
    const sums: Record<string, number> = {};
    trades.forEach(t => {
      const m = t.sellDate.slice(0, 7);
      sums[m] = (sums[m] || 0) + t.profitLoss;
    });
    let cumulative = 0;
    return Object.keys(sums).sort().map(m => {
      cumulative += sums[m];
      return { v: cumulative };
    });
  }, [trades]);

  return (
    <div className="space-y-6">
      <h1 className="text-xl font-semibold" data-testid="text-page-title">Dashboard</h1>

      {/* KPI Cards */}
      <div className="grid gap-4 grid-cols-2 lg:grid-cols-4">
        <KpiCard
          title="Total Trades"
          value={isLoading ? null : (trades?.length ?? 0).toString()}
          icon={<BarChart3 className="h-4 w-4 text-muted-foreground" />}
          testId="kpi-total-trades"
          sparkData={tradesByMonth}
        />
        <KpiCard
          title="Total Clients"
          value={isLoading ? null : (clients?.length ?? 0).toString()}
          icon={<Users className="h-4 w-4 text-muted-foreground" />}
          testId="kpi-total-clients"
        />
        <KpiCard
          title="Total Capital"
          value={isLoading ? null : `$${totalCapital.toLocaleString()}`}
          icon={<Landmark className="h-4 w-4 text-muted-foreground" />}
          testId="kpi-total-capital"
          sparkData={plByMonth}
        />
        <KpiCard
          title="Tax Rate"
          value={isLoading ? null : `${(taxRate * 100).toFixed(0)}%`}
          icon={<Percent className="h-4 w-4 text-muted-foreground" />}
          testId="kpi-tax-rate"
        />
      </div>

      {/* Recent Tables */}
      <div className="grid gap-6 lg:grid-cols-2">
        <Card>
          <CardHeader className="pb-3">
            <CardTitle className="text-base">Recent Trades</CardTitle>
          </CardHeader>
          <CardContent>
            {tradesLoading ? (
              <div className="space-y-2">
                {[1,2,3].map(i => <Skeleton key={i} className="h-8 w-full" />)}
              </div>
            ) : recentTrades.length === 0 ? (
              <div className="py-8 text-center">
                <BarChart3 className="h-10 w-10 text-muted-foreground/30 mx-auto mb-3" />
                <p className="text-sm font-medium text-muted-foreground">No trades yet</p>
                <p className="text-xs text-muted-foreground/70 mt-1">Import your first CSV file to get started</p>
              </div>
            ) : (
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Stock</TableHead>
                    <TableHead>Sell Date</TableHead>
                    <TableHead className="text-right">P/L</TableHead>
                    <TableHead className="text-right">Return</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {recentTrades.map((t) => (
                    <TableRow key={t.tradeId} data-testid={`row-trade-${t.tradeId}`} className={t.profitLoss >= 0 ? "bg-green-500/5 dark:bg-green-500/5" : "bg-red-500/5 dark:bg-red-500/5"}>
                      <TableCell className="font-medium">{t.stock}</TableCell>
                      <TableCell>{t.sellDate}</TableCell>
                      <TableCell className={`text-right ${t.profitLoss >= 0 ? "text-green-600 dark:text-green-400" : "text-red-600 dark:text-red-400"}`}>
                        ${t.profitLoss.toFixed(2)}
                      </TableCell>
                      <TableCell className="text-right">{t.returnPct.toFixed(2)}%</TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            )}
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="pb-3">
            <CardTitle className="text-base">Recent Capital Movements</CardTitle>
          </CardHeader>
          <CardContent>
            {movementsLoading ? (
              <div className="space-y-2">
                {[1,2,3].map(i => <Skeleton key={i} className="h-8 w-full" />)}
              </div>
            ) : recentMovements.length === 0 ? (
              <div className="py-8 text-center">
                <ArrowLeftRight className="h-10 w-10 text-muted-foreground/30 mx-auto mb-3" />
                <p className="text-sm font-medium text-muted-foreground">No capital movements yet</p>
                <p className="text-xs text-muted-foreground/70 mt-1">Record deposits and withdrawals from the Deposits &amp; Withdrawals page</p>
              </div>
            ) : (
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Client</TableHead>
                    <TableHead>Type</TableHead>
                    <TableHead>Date</TableHead>
                    <TableHead className="text-right">Amount</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {recentMovements.map((m) => (
                    <TableRow key={m.movementId} data-testid={`row-movement-${m.movementId}`}>
                      <TableCell className="font-medium">{m.clientId}</TableCell>
                      <TableCell className="capitalize">{m.type}</TableCell>
                      <TableCell>{m.date}</TableCell>
                      <TableCell className="text-right">${m.amount.toLocaleString()}</TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            )}
          </CardContent>
        </Card>
      </div>
    </div>
  );
}

function KpiCard({ title, value, icon, testId, sparkData }: { 
  title: string; value: string | null; icon: React.ReactNode; testId: string; 
  sparkData?: { v: number }[] 
}) {
  return (
    <Card data-testid={testId}>
      <CardContent className="p-4">
        <div className="flex items-center justify-between mb-1">
          <span className="text-sm text-muted-foreground">{title}</span>
          {icon}
        </div>
        <div className="flex items-end justify-between">
          {value === null ? (
            <Skeleton className="h-7 w-20" />
          ) : (
            <span className="text-xl font-bold" data-testid={`${testId}-value`}>{value}</span>
          )}
          {sparkData && sparkData.length > 1 && (
            <div className="w-20 h-7">
              <ResponsiveContainer width="100%" height="100%">
                <AreaChart data={sparkData}>
                  <defs>
                    <linearGradient id={`spark-${testId}`} x1="0" y1="0" x2="0" y2="1">
                      <stop offset="5%" stopColor="hsl(217, 91%, 60%)" stopOpacity={0.3} />
                      <stop offset="95%" stopColor="hsl(217, 91%, 60%)" stopOpacity={0} />
                    </linearGradient>
                  </defs>
                  <Area type="monotone" dataKey="v" stroke="hsl(217, 91%, 60%)" fill={`url(#spark-${testId})`} strokeWidth={1.5} dot={false} />
                </AreaChart>
              </ResponsiveContainer>
            </div>
          )}
        </div>
      </CardContent>
    </Card>
  );
}
