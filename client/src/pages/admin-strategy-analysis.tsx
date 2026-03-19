import { useQuery } from "@tanstack/react-query";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Skeleton } from "@/components/ui/skeleton";
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, Cell, LineChart, Line, Legend } from "recharts";
import { TrendingUp, Hash, Target, ArrowUp, ArrowDown } from "lucide-react";
import type { StrategySummary, MonthlyReturn } from "@shared/schema";

export default function AdminStrategyAnalysis() {
  const { data: summary, isLoading: summaryLoading } = useQuery<StrategySummary>({
    queryKey: ["/api/analytics/strategy-summary"],
  });

  const { data: monthlyReturns, isLoading: returnsLoading } = useQuery<MonthlyReturn[]>({
    queryKey: ["/api/analytics/monthly-returns"],
  });

  const { data: sp500Data } = useQuery<{ month: string; returnPct: number; cumulativeReturn: number }[]>({
    queryKey: ["/api/analytics/sp500-monthly"],
  });

  const isLoading = summaryLoading || returnsLoading;

  return (
    <div className="space-y-6">
      <h1 className="text-xl font-semibold" data-testid="text-page-title">Performance Overview</h1>

      {/* KPI Cards */}
      <div className="grid gap-4 grid-cols-2 lg:grid-cols-5">
        <KpiCard
          title="Cumulative Return"
          value={isLoading ? null : `${(summary?.cumulativeReturn ?? 0).toFixed(2)}%`}
          icon={<TrendingUp className="h-4 w-4 text-muted-foreground" />}
          testId="kpi-cumulative-return"
        />
        <KpiCard
          title="Total Trades"
          value={isLoading ? null : (summary?.totalTrades ?? 0).toString()}
          icon={<Hash className="h-4 w-4 text-muted-foreground" />}
          testId="kpi-total-trades"
        />
        <KpiCard
          title="Win Rate"
          value={isLoading ? null : `${(summary?.winRate ?? 0).toFixed(1)}%`}
          icon={<Target className="h-4 w-4 text-muted-foreground" />}
          testId="kpi-win-rate"
        />
        <KpiCard
          title="Avg Win %"
          value={isLoading ? null : `${(summary?.avgWinPct ?? 0).toFixed(2)}%`}
          icon={<ArrowUp className="h-4 w-4 text-green-600 dark:text-green-400" />}
          testId="kpi-avg-win"
        />
        <KpiCard
          title="Avg Loss %"
          value={isLoading ? null : `${(summary?.avgLossPct ?? 0).toFixed(2)}%`}
          icon={<ArrowDown className="h-4 w-4 text-red-600 dark:text-red-400" />}
          testId="kpi-avg-loss"
        />
      </div>

      {/* Bar Chart */}
      {!returnsLoading && monthlyReturns && monthlyReturns.length > 0 && (
        <Card>
          <CardHeader className="pb-3">
            <CardTitle className="text-base">Monthly Returns</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="h-[300px]">
              <ResponsiveContainer width="100%" height="100%">
                <BarChart data={monthlyReturns}>
                  <CartesianGrid strokeDasharray="3 3" stroke="hsl(var(--border))" />
                  <XAxis
                    dataKey="month"
                    tick={{ fontSize: 12, fill: "hsl(var(--muted-foreground))" }}
                  />
                  <YAxis
                    tick={{ fontSize: 12, fill: "hsl(var(--muted-foreground))" }}
                    tickFormatter={(v) => `${v}%`}
                  />
                  <Tooltip
                    contentStyle={{
                      backgroundColor: "hsl(var(--card))",
                      border: "1px solid hsl(var(--border))",
                      borderRadius: "6px",
                      color: "hsl(var(--foreground))",
                    }}
                    formatter={(value: number) => [`${value.toFixed(2)}%`, "Return"]}
                  />
                  <Bar dataKey="returnPct" radius={[3, 3, 0, 0]}>
                    {monthlyReturns.map((entry, index) => (
                      <Cell
                        key={index}
                        fill={entry.returnPct >= 0 ? "hsl(217, 91%, 60%)" : "hsl(0, 72%, 65%)"}
                      />
                    ))}
                  </Bar>
                </BarChart>
              </ResponsiveContainer>
            </div>
          </CardContent>
        </Card>
      )}

      {/* Cumulative Returns vs S&P 500 */}
      {!returnsLoading && monthlyReturns && monthlyReturns.length > 0 && sp500Data && (
        <Card>
          <CardHeader className="pb-3">
            <CardTitle className="text-base">Cumulative Returns vs S&P 500</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="h-[300px]">
              <ResponsiveContainer width="100%" height="100%">
                <LineChart data={monthlyReturns.map((r, i) => ({
                  month: r.month,
                  strategy: r.cumulativeReturn,
                  sp500: sp500Data[i]?.cumulativeReturn ?? 0,
                }))}>
                  <CartesianGrid strokeDasharray="3 3" stroke="hsl(var(--border))" />
                  <XAxis
                    dataKey="month"
                    tick={{ fontSize: 12, fill: "hsl(var(--muted-foreground))" }}
                  />
                  <YAxis
                    tick={{ fontSize: 12, fill: "hsl(var(--muted-foreground))" }}
                    tickFormatter={(v) => `${v}%`}
                  />
                  <Tooltip
                    contentStyle={{
                      backgroundColor: "hsl(var(--card))",
                      border: "1px solid hsl(var(--border))",
                      borderRadius: "6px",
                      color: "hsl(var(--foreground))",
                    }}
                    formatter={(value: number, name: string) => [
                      `${value.toFixed(2)}%`,
                      name === "strategy" ? "Your Strategy" : "S&P 500"
                    ]}
                  />
                  <Legend 
                    wrapperStyle={{ fontSize: "12px" }}
                    formatter={(value: string) => value === "strategy" ? "Your Strategy" : "S&P 500"}
                  />
                  <Line type="monotone" dataKey="strategy" stroke="hsl(217, 91%, 60%)" strokeWidth={2} dot={{ r: 3 }} />
                  <Line type="monotone" dataKey="sp500" stroke="hsl(160, 60%, 45%)" strokeWidth={2} strokeDasharray="5 5" dot={{ r: 3 }} />
                </LineChart>
              </ResponsiveContainer>
            </div>
          </CardContent>
        </Card>
      )}

      {/* Monthly Returns Table */}
      {returnsLoading ? (
        <Card>
          <CardContent className="p-4">
            <div className="space-y-2">
              {[1,2,3].map(i => <Skeleton key={i} className="h-8 w-full" />)}
            </div>
          </CardContent>
        </Card>
      ) : monthlyReturns && monthlyReturns.length > 0 ? (
        <Card>
          <CardHeader className="pb-3">
            <CardTitle className="text-base">Monthly Returns Table</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="overflow-x-auto">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Month</TableHead>
                    <TableHead className="text-right">Total P/L</TableHead>
                    <TableHead className="text-right">Total Trades</TableHead>
                    <TableHead className="text-right">Winning</TableHead>
                    <TableHead className="text-right">Win Rate</TableHead>
                    <TableHead className="text-right">Return %</TableHead>
                    <TableHead className="text-right">Avg Win %</TableHead>
                    <TableHead className="text-right">Avg Loss %</TableHead>
                    <TableHead className="text-right">Cumul. Return</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {monthlyReturns.map((r) => (
                    <TableRow key={r.month} data-testid={`row-return-${r.month}`}>
                      <TableCell className="font-medium">{r.month}</TableCell>
                      <TableCell className={`text-right ${r.totalPL >= 0 ? "text-green-600 dark:text-green-400" : "text-red-600 dark:text-red-400"}`}>
                        ${r.totalPL.toFixed(2)}
                      </TableCell>
                      <TableCell className="text-right">{r.totalTrades}</TableCell>
                      <TableCell className="text-right">{r.winningTrades}</TableCell>
                      <TableCell className="text-right">{r.winRate.toFixed(1)}%</TableCell>
                      <TableCell className={`text-right ${r.returnPct >= 0 ? "text-green-600 dark:text-green-400" : "text-red-600 dark:text-red-400"}`}>
                        {r.returnPct.toFixed(2)}%
                      </TableCell>
                      <TableCell className="text-right">{r.avgWinPct.toFixed(2)}%</TableCell>
                      <TableCell className="text-right">{r.avgLossPct.toFixed(2)}%</TableCell>
                      <TableCell className="text-right font-medium">{r.cumulativeReturn.toFixed(2)}%</TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </div>
          </CardContent>
        </Card>
      ) : (
        <Card>
          <CardContent className="py-12 text-center">
            <TrendingUp className="h-12 w-12 text-muted-foreground/30 mx-auto mb-3" />
            <p className="text-sm font-medium text-muted-foreground">No performance data yet</p>
            <p className="text-xs text-muted-foreground/70 mt-1">Import trades to see your strategy analysis and monthly returns</p>
          </CardContent>
        </Card>
      )}
    </div>
  );
}

function KpiCard({ title, value, icon, testId }: { title: string; value: string | null; icon: React.ReactNode; testId: string }) {
  return (
    <Card data-testid={testId}>
      <CardContent className="p-4">
        <div className="flex items-center justify-between mb-1">
          <span className="text-sm text-muted-foreground">{title}</span>
          {icon}
        </div>
        {value === null ? (
          <Skeleton className="h-7 w-20" />
        ) : (
          <span className="text-lg font-bold" data-testid={`${testId}-value`}>{value}</span>
        )}
      </CardContent>
    </Card>
  );
}
