import { useState, useEffect } from "react";
import { useQuery, useMutation } from "@tanstack/react-query";
import { queryClient, apiRequest } from "@/lib/queryClient";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { Slider } from "@/components/ui/slider";
import { Switch } from "@/components/ui/switch";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Skeleton } from "@/components/ui/skeleton";
import { Input } from "@/components/ui/input";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { useToast } from "@/hooks/use-toast";
import { Save, Trash2, Plus } from "lucide-react";
import type { Config, Client, MonthlyCapital } from "@shared/schema";

export default function AdminConfiguration() {
  const { toast } = useToast();

  const { data: config, isLoading: configLoading } = useQuery<Config>({
    queryKey: ["/api/config"],
  });

  const { data: clients } = useQuery<Client[]>({
    queryKey: ["/api/clients"],
  });

  const { data: monthlyCapital, isLoading: mcLoading } = useQuery<MonthlyCapital[]>({
    queryKey: ["/api/monthly-capital"],
  });

  // Global config state
  const [taxRate, setTaxRate] = useState(25);
  const [traderShare, setTraderShare] = useState(40);
  const [autoRemoveDayTrades, setAutoRemoveDayTrades] = useState(true);

  // Monthly capital form
  const [mcMonth, setMcMonth] = useState("");
  const [mcCapital, setMcCapital] = useState("");
  const [mcNotes, setMcNotes] = useState("");

  // Per-client state
  const [selectedClient, setSelectedClient] = useState("");
  const [clientTaxRate, setClientTaxRate] = useState(25);
  const [clientTraderShare, setClientTraderShare] = useState(40);
  const [clientTierOverride, setClientTierOverride] = useState("");

  useEffect(() => {
    if (config) {
      setTaxRate(Math.round(config.global.tax_rate * 100));
      setTraderShare(Math.round(config.global.trader_share * 100));
      setAutoRemoveDayTrades(config.global.auto_remove_day_trades);
    }
  }, [config]);

  useEffect(() => {
    if (config && selectedClient) {
      const clientConfig = config.clients[selectedClient];
      if (clientConfig) {
        setClientTaxRate(Math.round(clientConfig.tax_rate * 100));
        setClientTraderShare(Math.round(clientConfig.trader_share * 100));
        setClientTierOverride(clientConfig.tier_override);
      } else {
        setClientTaxRate(Math.round(config.global.tax_rate * 100));
        setClientTraderShare(Math.round(config.global.trader_share * 100));
        setClientTierOverride("");
      }
    }
  }, [config, selectedClient]);

  const globalMutation = useMutation({
    mutationFn: async () => {
      await apiRequest("PATCH", "/api/config", {
        tax_rate: taxRate / 100,
        trader_share: traderShare / 100,
        investor_share: (100 - traderShare) / 100,
        auto_remove_day_trades: autoRemoveDayTrades,
      });
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/config"] });
      toast({ title: "Global settings saved" });
    },
    onError: (err: Error) => {
      toast({ title: "Error", description: err.message, variant: "destructive" });
    },
  });

  const clientMutation = useMutation({
    mutationFn: async () => {
      await apiRequest("PATCH", `/api/config/${selectedClient}`, {
        tax_rate: clientTaxRate / 100,
        trader_share: clientTraderShare / 100,
        investor_share: (100 - clientTraderShare) / 100,
        tier_override: clientTierOverride === "none" ? "" : clientTierOverride,
      });
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/config"] });
      toast({ title: "Client settings saved" });
    },
    onError: (err: Error) => {
      toast({ title: "Error", description: err.message, variant: "destructive" });
    },
  });

  const addMcMutation = useMutation({
    mutationFn: async () => {
      await apiRequest("POST", "/api/monthly-capital", {
        month: mcMonth,
        totalCapital: parseFloat(mcCapital),
        notes: mcNotes,
      });
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/monthly-capital"] });
      toast({ title: "Monthly capital saved" });
      setMcMonth("");
      setMcCapital("");
      setMcNotes("");
    },
    onError: (err: Error) => {
      toast({ title: "Error", description: err.message, variant: "destructive" });
    },
  });

  const deleteMcMutation = useMutation({
    mutationFn: async (month: string) => {
      await apiRequest("DELETE", `/api/monthly-capital/${month}`);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/monthly-capital"] });
      toast({ title: "Monthly capital deleted" });
    },
    onError: (err: Error) => {
      toast({ title: "Error", description: err.message, variant: "destructive" });
    },
  });

  if (configLoading) {
    return (
      <div className="space-y-6">
        <h1 className="text-xl font-semibold">Configuration</h1>
        <Skeleton className="h-64 w-full" />
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <h1 className="text-xl font-semibold" data-testid="text-page-title">Settings</h1>

      <Tabs defaultValue="global">
        <TabsList data-testid="tabs-config">
          <TabsTrigger value="global" data-testid="tab-global">Global Settings</TabsTrigger>
          <TabsTrigger value="client" data-testid="tab-client">Per-Client Settings</TabsTrigger>
        </TabsList>

        <TabsContent value="global" className="space-y-6">
          <Card>
            <CardHeader className="pb-3">
              <CardTitle className="text-base">Global Configuration</CardTitle>
            </CardHeader>
            <CardContent className="space-y-6">
              <div className="space-y-3">
                <div className="flex items-center justify-between">
                  <Label>Tax Rate</Label>
                  <span className="text-sm font-medium" data-testid="text-tax-rate">{taxRate}%</span>
                </div>
                <Slider
                  value={[taxRate]}
                  onValueChange={(v) => setTaxRate(v[0])}
                  min={0}
                  max={100}
                  step={1}
                  data-testid="slider-tax-rate"
                />
              </div>

              <div className="space-y-3">
                <div className="flex items-center justify-between">
                  <Label>Trader Share</Label>
                  <span className="text-sm font-medium" data-testid="text-trader-share">{traderShare}% (Investor: {100 - traderShare}%)</span>
                </div>
                <Slider
                  value={[traderShare]}
                  onValueChange={(v) => setTraderShare(v[0])}
                  min={0}
                  max={100}
                  step={1}
                  data-testid="slider-trader-share"
                />
              </div>

              <div className="flex items-center justify-between">
                <Label htmlFor="auto-remove">Auto-remove Day Trades</Label>
                <Switch
                  id="auto-remove"
                  checked={autoRemoveDayTrades}
                  onCheckedChange={setAutoRemoveDayTrades}
                  data-testid="switch-auto-remove"
                />
              </div>

              <Button onClick={() => globalMutation.mutate()} disabled={globalMutation.isPending} data-testid="button-save-global">
                <Save className="h-4 w-4 mr-1" />
                Save Global Settings
              </Button>
            </CardContent>
          </Card>

          {/* Monthly Capital Management */}
          <Card>
            <CardHeader className="pb-3">
              <CardTitle className="text-base">Monthly Capital Management</CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="flex items-end gap-3 flex-wrap">
                <div className="space-y-1">
                  <Label>Month</Label>
                  <Input
                    type="month"
                    value={mcMonth}
                    onChange={(e) => setMcMonth(e.target.value)}
                    className="w-[180px]"
                    data-testid="input-mc-month"
                  />
                </div>
                <div className="space-y-1">
                  <Label>Total Capital</Label>
                  <Input
                    type="number"
                    value={mcCapital}
                    onChange={(e) => setMcCapital(e.target.value)}
                    placeholder="0.00"
                    className="w-[180px]"
                    data-testid="input-mc-capital"
                  />
                </div>
                <div className="space-y-1">
                  <Label>Notes</Label>
                  <Input
                    value={mcNotes}
                    onChange={(e) => setMcNotes(e.target.value)}
                    placeholder="Optional notes"
                    className="w-[200px]"
                    data-testid="input-mc-notes"
                  />
                </div>
                <Button
                  onClick={() => addMcMutation.mutate()}
                  disabled={!mcMonth || !mcCapital || addMcMutation.isPending}
                  data-testid="button-add-mc"
                >
                  <Plus className="h-4 w-4 mr-1" />
                  Add
                </Button>
              </div>

              {mcLoading ? (
                <Skeleton className="h-20 w-full" />
              ) : monthlyCapital && monthlyCapital.length > 0 ? (
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Month</TableHead>
                      <TableHead className="text-right">Total Capital</TableHead>
                      <TableHead>Notes</TableHead>
                      <TableHead></TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {monthlyCapital.map((mc) => (
                      <TableRow key={mc.month} data-testid={`row-mc-${mc.month}`}>
                        <TableCell className="font-medium">{mc.month}</TableCell>
                        <TableCell className="text-right">${mc.totalCapital.toLocaleString()}</TableCell>
                        <TableCell className="text-muted-foreground">{mc.notes}</TableCell>
                        <TableCell>
                          <Button
                            variant="ghost"
                            size="icon"
                            className="h-7 w-7 text-destructive"
                            onClick={() => deleteMcMutation.mutate(mc.month)}
                            disabled={deleteMcMutation.isPending}
                            data-testid={`button-delete-mc-${mc.month}`}
                          >
                            <Trash2 className="h-3.5 w-3.5" />
                          </Button>
                        </TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              ) : (
                <p className="text-sm text-muted-foreground">No monthly capital entries yet</p>
              )}
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="client" className="space-y-6">
          <Card>
            <CardHeader className="pb-3">
              <CardTitle className="text-base">Per-Client Configuration</CardTitle>
            </CardHeader>
            <CardContent className="space-y-6">
              <div className="space-y-1">
                <Label>Select Client</Label>
                <Select value={selectedClient} onValueChange={setSelectedClient}>
                  <SelectTrigger className="w-[260px]" data-testid="select-config-client">
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

              {selectedClient && (
                <>
                  <div className="space-y-3">
                    <div className="flex items-center justify-between">
                      <Label>Tax Rate</Label>
                      <span className="text-sm font-medium" data-testid="text-client-tax-rate">{clientTaxRate}%</span>
                    </div>
                    <Slider
                      value={[clientTaxRate]}
                      onValueChange={(v) => setClientTaxRate(v[0])}
                      min={0}
                      max={100}
                      step={1}
                      data-testid="slider-client-tax-rate"
                    />
                  </div>

                  <div className="space-y-3">
                    <div className="flex items-center justify-between">
                      <Label>Trader Share</Label>
                      <span className="text-sm font-medium" data-testid="text-client-trader-share">{clientTraderShare}% (Investor: {100 - clientTraderShare}%)</span>
                    </div>
                    <Slider
                      value={[clientTraderShare]}
                      onValueChange={(v) => setClientTraderShare(v[0])}
                      min={0}
                      max={100}
                      step={1}
                      data-testid="slider-client-trader-share"
                    />
                  </div>

                  <div className="space-y-1">
                    <Label>Tier Override</Label>
                    <Select value={clientTierOverride} onValueChange={setClientTierOverride}>
                      <SelectTrigger className="w-[200px]" data-testid="select-tier-override">
                        <SelectValue placeholder="No override" />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="none">No Override</SelectItem>
                        <SelectItem value="default">Default</SelectItem>
                        <SelectItem value="preferential">Preferential</SelectItem>
                        <SelectItem value="gold">Gold</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>

                  <Button
                    onClick={() => clientMutation.mutate()}
                    disabled={clientMutation.isPending}
                    data-testid="button-save-client-config"
                  >
                    <Save className="h-4 w-4 mr-1" />
                    Save Client Settings
                  </Button>
                </>
              )}
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>
    </div>
  );
}
