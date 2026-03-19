import { useState } from "react";
import { useQuery, useMutation } from "@tanstack/react-query";
import { queryClient, apiRequest } from "@/lib/queryClient";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Skeleton } from "@/components/ui/skeleton";
import { Textarea } from "@/components/ui/textarea";
import { useToast } from "@/hooks/use-toast";
import { Plus, ArrowDownCircle, ArrowUpCircle } from "lucide-react";
import type { Client, CapitalMovement } from "@shared/schema";

export default function AdminCapitalMovements() {
  const { toast } = useToast();
  const [clientId, setClientId] = useState("");
  const [type, setType] = useState<"contribution" | "withdrawal">("contribution");
  const [amount, setAmount] = useState("");
  const [date, setDate] = useState("");
  const [notes, setNotes] = useState("");

  const { data: clients } = useQuery<Client[]>({
    queryKey: ["/api/clients"],
  });

  const { data: movements, isLoading } = useQuery<CapitalMovement[]>({
    queryKey: ["/api/capital-movements"],
  });

  const createMutation = useMutation({
    mutationFn: async () => {
      await apiRequest("POST", "/api/capital-movements", {
        clientId,
        type,
        amount: parseFloat(amount),
        date,
        notes,
      });
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/capital-movements"] });
      toast({ title: "Capital movement recorded" });
      setAmount("");
      setDate("");
      setNotes("");
    },
    onError: (err: Error) => {
      toast({ title: "Error", description: err.message, variant: "destructive" });
    },
  });

  function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    createMutation.mutate();
  }

  return (
    <div className="space-y-6">
      <h1 className="text-xl font-semibold" data-testid="text-page-title">Deposits & Withdrawals</h1>

      <Card>
        <CardHeader className="pb-3">
          <CardTitle className="text-base">Record Movement</CardTitle>
        </CardHeader>
        <CardContent>
          <form onSubmit={handleSubmit} className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
            <div className="space-y-1">
              <Label>Client</Label>
              <Select value={clientId} onValueChange={setClientId}>
                <SelectTrigger data-testid="select-client">
                  <SelectValue placeholder="Select client" />
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
            <div className="space-y-1">
              <Label>Type</Label>
              <Select value={type} onValueChange={(v) => setType(v as "contribution" | "withdrawal")}>
                <SelectTrigger data-testid="select-movement-type">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="contribution">Contribution</SelectItem>
                  <SelectItem value="withdrawal">Withdrawal</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-1">
              <Label>Amount</Label>
              <Input
                type="number"
                value={amount}
                onChange={(e) => setAmount(e.target.value)}
                placeholder="0.00"
                required
                data-testid="input-movement-amount"
              />
            </div>
            <div className="space-y-1">
              <Label>Date</Label>
              <Input
                type="date"
                value={date}
                onChange={(e) => setDate(e.target.value)}
                required
                data-testid="input-movement-date"
              />
            </div>
            <div className="space-y-1 sm:col-span-2">
              <Label>Notes</Label>
              <Textarea
                value={notes}
                onChange={(e) => setNotes(e.target.value)}
                placeholder="Optional notes"
                rows={1}
                data-testid="input-movement-notes"
              />
            </div>
            <div className="flex items-end">
              <Button type="submit" disabled={!clientId || createMutation.isPending} data-testid="button-record-movement">
                <Plus className="h-4 w-4 mr-1" />
                Record
              </Button>
            </div>
          </form>
        </CardContent>
      </Card>

      <Card>
        <CardHeader className="pb-3">
          <CardTitle className="text-base">Movement History</CardTitle>
        </CardHeader>
        <CardContent>
          {isLoading ? (
            <div className="space-y-2">
              {[1,2,3].map(i => <Skeleton key={i} className="h-8 w-full" />)}
            </div>
          ) : !movements || movements.length === 0 ? (
            <p className="text-sm text-muted-foreground">No capital movements recorded</p>
          ) : (
            <div className="overflow-x-auto">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Client</TableHead>
                    <TableHead>Type</TableHead>
                    <TableHead>Date</TableHead>
                    <TableHead className="text-right">Amount</TableHead>
                    <TableHead>Notes</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {movements.map((m) => (
                    <TableRow key={m.movementId} data-testid={`row-movement-${m.movementId}`}>
                      <TableCell className="font-medium">{m.clientId}</TableCell>
                      <TableCell>
                        <div className="flex items-center gap-1.5">
                          {m.type === "contribution" ? (
                            <ArrowDownCircle className="h-3.5 w-3.5 text-green-600 dark:text-green-400" />
                          ) : (
                            <ArrowUpCircle className="h-3.5 w-3.5 text-red-600 dark:text-red-400" />
                          )}
                          <span className="capitalize">{m.type}</span>
                        </div>
                      </TableCell>
                      <TableCell>{m.date}</TableCell>
                      <TableCell className="text-right">${m.amount.toLocaleString()}</TableCell>
                      <TableCell className="text-muted-foreground text-sm">{m.notes}</TableCell>
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
