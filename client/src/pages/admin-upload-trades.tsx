import { useState, useRef } from "react";
import { useQuery, useMutation } from "@tanstack/react-query";
import { queryClient, apiRequest, API_BASE, getAuthToken } from "@/lib/queryClient";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Skeleton } from "@/components/ui/skeleton";
import { useToast } from "@/hooks/use-toast";
import { Upload, Trash2 } from "lucide-react";
import type { Trade } from "@shared/schema";

export default function AdminUploadTrades() {
  const { toast } = useToast();
  const fileRef = useRef<HTMLInputElement>(null);
  const [uploading, setUploading] = useState(false);

  const { data: trades, isLoading } = useQuery<Trade[]>({
    queryKey: ["/api/trades"],
  });

  const uploadMutation = useMutation({
    mutationFn: async (file: File) => {
      const formData = new FormData();
      formData.append("file", file);
      const headers: Record<string, string> = {};
      const token = getAuthToken();
      if (token) {
        headers["Authorization"] = `Bearer ${token}`;
      }
      const res = await fetch(`${API_BASE}/api/trades/upload`, {
        method: "POST",
        headers,
        body: formData,
      });
      if (!res.ok) {
        const text = await res.text();
        throw new Error(`${res.status}: ${text}`);
      }
      return res.json();
    },
    onSuccess: (data) => {
      queryClient.invalidateQueries({ queryKey: ["/api/trades"] });
      toast({ title: "Upload Successful", description: `Processed ${data.totalRows} rows. ${data.added} trades added, ${data.duplicates} duplicates skipped.` });
      if (fileRef.current) fileRef.current.value = "";
    },
    onError: (err: Error) => {
      toast({ title: "Upload Failed", description: err.message, variant: "destructive" });
    },
  });

  const deleteMutation = useMutation({
    mutationFn: async (tradeId: string) => {
      await apiRequest("DELETE", `/api/trades/${tradeId}`);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/trades"] });
      toast({ title: "Trade deleted" });
    },
    onError: (err: Error) => {
      toast({ title: "Delete failed", description: err.message, variant: "destructive" });
    },
  });

  async function handleUpload() {
    const file = fileRef.current?.files?.[0];
    if (!file) {
      toast({ title: "No file selected", variant: "destructive" });
      return;
    }
    setUploading(true);
    try {
      await uploadMutation.mutateAsync(file);
    } finally {
      setUploading(false);
    }
  }

  return (
    <div className="space-y-6">
      <h1 className="text-xl font-semibold" data-testid="text-page-title">Import Trades</h1>

      <Card>
        <CardHeader className="pb-3">
          <CardTitle className="text-base">Upload CSV File</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="flex items-center gap-3">
            <Input
              ref={fileRef}
              type="file"
              accept=".csv"
              className="max-w-sm"
              data-testid="input-file-upload"
            />
            <Button onClick={handleUpload} disabled={uploading} data-testid="button-process-upload">
              <Upload className="h-4 w-4 mr-1" />
              {uploading ? "Processing..." : "Process"}
            </Button>
          </div>
          <p className="text-xs text-muted-foreground mt-2">
            CSV columns: buy_date, sell_date, stock, buy_price, sell_price, quantity
          </p>
        </CardContent>
      </Card>

      <Card>
        <CardHeader className="pb-3">
          <CardTitle className="text-base">Current Trades ({trades?.length ?? 0})</CardTitle>
        </CardHeader>
        <CardContent>
          {isLoading ? (
            <div className="space-y-2">
              {[1,2,3,4,5].map(i => <Skeleton key={i} className="h-8 w-full" />)}
            </div>
          ) : !trades || trades.length === 0 ? (
            <div className="py-8 text-center">
              <Upload className="h-10 w-10 text-muted-foreground/30 mx-auto mb-3" />
              <p className="text-sm font-medium text-muted-foreground">No trades imported yet</p>
              <p className="text-xs text-muted-foreground/70 mt-1">Upload a CSV file above to import your trade history</p>
            </div>
          ) : (
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
                    <TableHead>W/L</TableHead>
                    <TableHead></TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {trades.map((t) => (
                    <TableRow key={t.tradeId} data-testid={`row-trade-${t.tradeId}`}>
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
                        <span className={`text-xs font-medium ${t.winLoss === "Win" ? "text-green-600 dark:text-green-400" : "text-red-600 dark:text-red-400"}`}>
                          {t.winLoss}
                        </span>
                      </TableCell>
                      <TableCell>
                        <Button
                          variant="ghost"
                          size="icon"
                          className="h-7 w-7 text-destructive"
                          onClick={() => deleteMutation.mutate(t.tradeId)}
                          disabled={deleteMutation.isPending}
                          data-testid={`button-delete-trade-${t.tradeId}`}
                        >
                          <Trash2 className="h-3.5 w-3.5" />
                        </Button>
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
