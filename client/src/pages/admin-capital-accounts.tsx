import { useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Skeleton } from "@/components/ui/skeleton";
import { AreaChart, Area, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer } from "recharts";
import { DollarSign, TrendingUp, ArrowDownCircle, ArrowUpCircle, Shield, Percent, Users } from "lucide-react";
import type { Client, CapitalFlowRow } from "@shared/schema";

export default function AdminCapitalAccounts() {
  const [selectedClient, setSelectedClient] = useState("");

  const { data: clients } = useQuery<Client[]>({
    queryKey: ["/api/clients"],
  });

  const { data: flowData, isLoading: flowLoading } = useQuery<CapitalFlowRow[]>({
    queryKey: ["/api/analytics/client-capital-flow", selectedClient],
    enabled: !!selectedClient,
  });

  const client = clients?.find((c) => c.clientId === selectedClient);
  const lastRow = flowData && flowData.length > 0 ? flowData[flowData.length - 1] : null;

  const totalContributions = flowData?.reduce((sum, r) => sum + r.contributions, 0) ?? 0;
  const totalWithdrawals = flowData?.reduce((sum, r) => sum + r.withdrawals, 0) ?? 0;
  const investorReturns = lastRow?.cumulativeInvestorProfit ?? 0;
  const currentCapital = lastRow?.endingCapital ?? (client?.startingCapital ?? 0);
  const startingCapital = client?.startingCapital ?? 0;
  const returnPct = startingCapital > 0
    ? ((investorReturns / startingCapital) * 100)
    : 0;
  const currentTier = lastRow?.tier ?? "N/A";

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <h1 className="text-xl font-semibold" data-testid="text-page-title">Capital Accounts</h1>
        <Select value={selectedClient} onValueChange={setSelectedClient}>
          <SelectTrigger className="w-[220px]" data-testid="select-client">
            <SelectValue placeholder="Select a client" />
          </SelectTrigger>
          <SelectContent>
            {clients?.map((c) => (
              <SelectItem key={c.clientId} value={c.clientId}>
                {c.name} ({c.username})
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
      </div>

      {!selectedClient ? (
        <Card>
          <CardContent className="py-12 text-center">
            <Users className="h-12 w-12 text-muted-foreground/30 mx-auto mb-3" />
            <p className="text-sm font-medium text-muted-foreground">No client selected</p>
            <p className="text-xs text-muted-foreground/70 mt-1">Choose a client from the dropdown above to view their capital account</p>
          </CardContent>
        </Card>
      ) : flowLoading ? (
        <div className="space-y-4">
          <div className="grid gap-4 grid-cols-2 lg:grid-cols-3">
            {[1,2,3,4,5,6].map(i => (
              <Card key={i}><CardContent className="p-4"><Skeleton className="h-12 w-full" /></CardContent></Card>
            ))}
          </div>
        </div>
      ) : (
        <>
          {/* KPI Cards */}
          <div className="grid gap-4 grid-cols-2 lg:grid-cols-3">
            <KpiCard
              title="Starting Capital"
              value={`$${startingCapital.toLocaleString()}`}
              icon={<DollarSign className="h-4 w-4 text-muted-foreground" />}
              testId="kpi-starting-capital"
            />
            <KpiCard
              title="Current Capital"
              value={`$${currentCapital.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`}
              icon={<DollarSign className="h-4 w-4 text-muted-foreground" />}
              testId="kpi-current-capital"
            />
            <KpiCard
              title="Total Contributions"
              value={`$${totalContributions.toLocaleString()}`}
              icon={<ArrowDownCircle className="h-4 w-4 text-green-600 dark:text-green-400" />}
              testId="kpi-contributions"
            />
            <KpiCard
              title="Total Withdrawals"
              value={`$${totalWithdrawals.toLocaleString()}`}
              icon={<ArrowUpCircle className="h-4 w-4 text-red-600 dark:text-red-400" />}
              testId="kpi-withdrawals"
            />
            <KpiCard
              title="Investor Returns"
              value={`$${investorReturns.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })} (${returnPct.toFixed(2)}%)`}
              icon={<Percent className="h-4 w-4 text-muted-foreground" />}
              testId="kpi-investor-returns"
            />
            <KpiCard
              title="Current Tier"
              value={currentTier}
              icon={<Shield className="h-4 w-4 text-muted-foreground" />}
              testId="kpi-current-tier"
            />
          </div>

          {/* Chart */}
          {flowData && flowData.length > 0 && (
            <Card>
              <CardHeader className="pb-3">
                <CardTitle className="text-base">Cumulative Investor Profit</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="h-[300px]">
                  <ResponsiveContainer width="100%" height="100%">
                    <AreaChart data={flowData}>
                      <defs>
                        <linearGradient id="profitGradient" x1="0" y1="0" x2="0" y2="1">
                          <stop offset="5%" stopColor="hsl(217, 91%, 60%)" stopOpacity={0.3} />
                          <stop offset="95%" stopColor="hsl(217, 91%, 60%)" stopOpacity={0} />
                        </linearGradient>
                      </defs>
                      <CartesianGrid strokeDasharray="3 3" stroke="hsl(var(--border))" />
                      <XAxis
                        dataKey="month"
                        tick={{ fontSize: 12, fill: "hsl(var(--muted-foreground))" }}
                      />
                      <YAxis
                        tick={{ fontSize: 12, fill: "hsl(var(--muted-foreground))" }}
                        tickFormatter={(v) => `$${v.toLocaleString()}`}
                      />
                      <Tooltip
                        contentStyle={{
                          backgroundColor: "hsl(var(--card))",
                          border: "1px solid hsl(var(--border))",
                          borderRadius: "6px",
                          color: "hsl(var(--foreground))",
                        }}
                        formatter={(value: number) => [`$${value.toFixed(2)}`, "Cumulative Profit"]}
                      />
                      <Area
                        type="monotone"
                        dataKey="cumulativeInvestorProfit"
                        stroke="hsl(217, 91%, 60%)"
                        fill="url(#profitGradient)"
                        strokeWidth={2}
                      />
                    </AreaChart>
                  </ResponsiveContainer>
                </div>
              </CardContent>
            </Card>
          )}

          {/* Monthly Table */}
          {flowData && flowData.length > 0 && (
            <Card>
              <CardHeader className="pb-3">
                <CardTitle className="text-base">Monthly Progression</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="overflow-x-auto">
                  <Table>
                    <TableHeader>
                      <TableRow>
                        <TableHead>Month</TableHead>
                        <TableHead className="text-right">Starting Capital</TableHead>
                        <TableHead className="text-right">Capital After Contrib.</TableHead>
                        <TableHead>Tier</TableHead>
                        <TableHead className="text-right">Return %</TableHead>
                        <TableHead className="text-right">Profit After Tax</TableHead>
                        <TableHead className="text-right">Investor Share</TableHead>
                        <TableHead className="text-right">Trader Share</TableHead>
                        <TableHead className="text-right">Cumul. Investor Profit</TableHead>
                        <TableHead className="text-right">Ending Capital</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {flowData.map((row) => (
                        <TableRow key={row.month} data-testid={`row-flow-${row.month}`}>
                          <TableCell className="font-medium">{row.month}</TableCell>
                          <TableCell className="text-right">${row.startingCapital.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}</TableCell>
                          <TableCell className="text-right">${row.capitalAfterContributions.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}</TableCell>
                          <TableCell className="capitalize">{row.tier}</TableCell>
                          <TableCell className="text-right">{row.returnPct.toFixed(2)}%</TableCell>
                          <TableCell className="text-right">${row.profitAfterTax.toFixed(2)}</TableCell>
                          <TableCell className="text-right">${row.investorShare.toFixed(2)}</TableCell>
                          <TableCell className="text-right">${row.traderShare.toFixed(2)}</TableCell>
                          <TableCell className="text-right">${row.cumulativeInvestorProfit.toFixed(2)}</TableCell>
                          <TableCell className="text-right">${row.endingCapital.toFixed(2)}</TableCell>
                        </TableRow>
                      ))}
                    </TableBody>
                  </Table>
                </div>
              </CardContent>
            </Card>
          )}
        </>
      )}
    </div>
  );
}

function KpiCard({ title, value, icon, testId }: { title: string; value: string; icon: React.ReactNode; testId: string }) {
  return (
    <Card data-testid={testId}>
      <CardContent className="p-4">
        <div className="flex items-center justify-between mb-1">
          <span className="text-sm text-muted-foreground">{title}</span>
          {icon}
        </div>
        <span className="text-lg font-bold" data-testid={`${testId}-value`}>{value}</span>
      </CardContent>
    </Card>
  );
}
