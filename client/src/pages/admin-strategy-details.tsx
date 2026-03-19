import { useQuery } from "@tanstack/react-query";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Skeleton } from "@/components/ui/skeleton";
import { Badge } from "@/components/ui/badge";
import type { StrategyDetails } from "@shared/schema";

export default function AdminStrategyDetails() {
  const { data: details, isLoading } = useQuery<StrategyDetails>({
    queryKey: ["/api/analytics/strategy-details"],
  });

  if (isLoading) {
    return (
      <div className="space-y-6">
        <h1 className="text-xl font-semibold">Strategy Details</h1>
        <div className="space-y-4">
          {[1,2,3].map(i => <Skeleton key={i} className="h-40 w-full" />)}
        </div>
      </div>
    );
  }

  const months = details ? Object.keys(details.topWinnersByMonth).sort() : [];

  return (
    <div className="space-y-6">
      <h1 className="text-xl font-semibold" data-testid="text-page-title">Monthly Breakdown</h1>

      {/* Top Winners and Losers by Month */}
      {months.length > 0 ? (
        months.map((month) => (
          <div key={month} className="space-y-4">
            <h2 className="text-base font-semibold" data-testid={`text-month-${month}`}>{month}</h2>
            <div className="grid gap-4 lg:grid-cols-2">
              {/* Winners */}
              <Card>
                <CardHeader className="pb-2">
                  <CardTitle className="text-sm text-green-600 dark:text-green-400">
                    Top 5 Winners
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  {details!.topWinnersByMonth[month]?.length ? (
                    <Table>
                      <TableHeader>
                        <TableRow>
                          <TableHead>Stock</TableHead>
                          <TableHead className="text-right">P/L</TableHead>
                          <TableHead className="text-right">Return %</TableHead>
                        </TableRow>
                      </TableHeader>
                      <TableBody>
                        {details!.topWinnersByMonth[month].map((t, i) => (
                          <TableRow key={i} data-testid={`row-winner-${month}-${i}`}>
                            <TableCell className="font-medium">{t.stock}</TableCell>
                            <TableCell className="text-right text-green-600 dark:text-green-400">
                              ${t.profitLoss.toFixed(2)}
                            </TableCell>
                            <TableCell className="text-right">{t.returnPct.toFixed(2)}%</TableCell>
                          </TableRow>
                        ))}
                      </TableBody>
                    </Table>
                  ) : (
                    <p className="text-sm text-muted-foreground">No winning trades</p>
                  )}
                </CardContent>
              </Card>

              {/* Losers */}
              <Card>
                <CardHeader className="pb-2">
                  <CardTitle className="text-sm text-red-600 dark:text-red-400">
                    Top 5 Losers
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  {details!.topLosersByMonth[month]?.length ? (
                    <Table>
                      <TableHeader>
                        <TableRow>
                          <TableHead>Stock</TableHead>
                          <TableHead className="text-right">P/L</TableHead>
                          <TableHead className="text-right">Return %</TableHead>
                        </TableRow>
                      </TableHeader>
                      <TableBody>
                        {details!.topLosersByMonth[month].map((t, i) => (
                          <TableRow key={i} data-testid={`row-loser-${month}-${i}`}>
                            <TableCell className="font-medium">{t.stock}</TableCell>
                            <TableCell className="text-right text-red-600 dark:text-red-400">
                              ${t.profitLoss.toFixed(2)}
                            </TableCell>
                            <TableCell className="text-right">{t.returnPct.toFixed(2)}%</TableCell>
                          </TableRow>
                        ))}
                      </TableBody>
                    </Table>
                  ) : (
                    <p className="text-sm text-muted-foreground">No losing trades</p>
                  )}
                </CardContent>
              </Card>
            </div>
          </div>
        ))
      ) : (
        <Card>
          <CardContent className="py-12 text-center text-muted-foreground">
            No trade data available
          </CardContent>
        </Card>
      )}

      {/* Full Trade Log */}
      {details?.tradeLog && details.tradeLog.length > 0 && (
        <Card>
          <CardHeader className="pb-3">
            <CardTitle className="text-base">Trade Log (qty &ge; 2)</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="overflow-x-auto">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Stock</TableHead>
                    <TableHead>Buy Date</TableHead>
                    <TableHead>Sell Date</TableHead>
                    <TableHead className="text-right">Buy Price</TableHead>
                    <TableHead className="text-right">Sell Price</TableHead>
                    <TableHead className="text-right">Qty</TableHead>
                    <TableHead className="text-right">P/L</TableHead>
                    <TableHead className="text-right">Return %</TableHead>
                    <TableHead>Status</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {details.tradeLog.map((t, i) => (
                    <TableRow key={i} data-testid={`row-tradelog-${i}`}>
                      <TableCell className="font-medium">{t.stock}</TableCell>
                      <TableCell>{t.buyDate}</TableCell>
                      <TableCell>{t.sellDate}</TableCell>
                      <TableCell className="text-right">${t.buyPrice.toFixed(2)}</TableCell>
                      <TableCell className="text-right">${t.sellPrice.toFixed(2)}</TableCell>
                      <TableCell className="text-right">{t.quantity}</TableCell>
                      <TableCell className={`text-right ${t.profitLoss >= 0 ? "text-green-600 dark:text-green-400" : "text-red-600 dark:text-red-400"}`}>
                        ${t.profitLoss.toFixed(2)}
                      </TableCell>
                      <TableCell className="text-right">{t.returnPct.toFixed(2)}%</TableCell>
                      <TableCell>
                        <Badge variant={t.winLoss === "Win" ? "default" : "destructive"} className="text-xs">
                          {t.winLoss}
                        </Badge>
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </div>
          </CardContent>
        </Card>
      )}
    </div>
  );
}
