import { useState } from "react";
import { useQuery, useMutation } from "@tanstack/react-query";
import { queryClient, apiRequest } from "@/lib/queryClient";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Skeleton } from "@/components/ui/skeleton";
import { useToast } from "@/hooks/use-toast";
import { Plus, Pencil, Trash2 } from "lucide-react";
import type { Client } from "@shared/schema";

interface ClientForm {
  username: string;
  name: string;
  email: string;
  password: string;
  startingCapital: string;
  investmentStartDate: string;
}

const emptyForm: ClientForm = {
  username: "",
  name: "",
  email: "",
  password: "",
  startingCapital: "0",
  investmentStartDate: "",
};

export default function AdminManageClients() {
  const { toast } = useToast();
  const [form, setForm] = useState<ClientForm>(emptyForm);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [deleteId, setDeleteId] = useState<string | null>(null);

  const { data: clients, isLoading } = useQuery<Client[]>({
    queryKey: ["/api/clients"],
  });

  const createMutation = useMutation({
    mutationFn: async (data: ClientForm) => {
      await apiRequest("POST", "/api/clients", {
        username: data.username,
        name: data.name,
        email: data.email,
        password: data.password,
        startingCapital: parseFloat(data.startingCapital) || 0,
        investmentStartDate: data.investmentStartDate,
      });
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/clients"] });
      toast({ title: "Client created" });
      setForm(emptyForm);
    },
    onError: (err: Error) => {
      toast({ title: "Error", description: err.message, variant: "destructive" });
    },
  });

  const updateMutation = useMutation({
    mutationFn: async ({ id, data }: { id: string; data: Partial<ClientForm> }) => {
      const body: Record<string, unknown> = {};
      if (data.name) body.name = data.name;
      if (data.email !== undefined) body.email = data.email;
      if (data.startingCapital !== undefined) body.startingCapital = parseFloat(data.startingCapital) || 0;
      if (data.investmentStartDate) body.investmentStartDate = data.investmentStartDate;
      await apiRequest("PATCH", `/api/clients/${id}`, body);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/clients"] });
      toast({ title: "Client updated" });
      setEditingId(null);
      setForm(emptyForm);
    },
    onError: (err: Error) => {
      toast({ title: "Error", description: err.message, variant: "destructive" });
    },
  });

  const deleteMutation = useMutation({
    mutationFn: async (id: string) => {
      await apiRequest("DELETE", `/api/clients/${id}`);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/clients"] });
      toast({ title: "Client deleted" });
      setDeleteId(null);
    },
    onError: (err: Error) => {
      toast({ title: "Error", description: err.message, variant: "destructive" });
    },
  });

  function startEdit(client: Client) {
    setEditingId(client.clientId);
    setForm({
      username: client.username,
      name: client.name,
      email: client.email,
      password: "",
      startingCapital: client.startingCapital.toString(),
      investmentStartDate: client.investmentStartDate,
    });
  }

  function cancelEdit() {
    setEditingId(null);
    setForm(emptyForm);
  }

  function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (editingId) {
      updateMutation.mutate({ id: editingId, data: form });
    } else {
      createMutation.mutate(form);
    }
  }

  return (
    <div className="space-y-6">
      <h1 className="text-xl font-semibold" data-testid="text-page-title">Manage Clients</h1>

      <Card>
        <CardHeader className="pb-3">
          <CardTitle className="text-base">
            {editingId ? "Edit Client" : "Create Client"}
          </CardTitle>
        </CardHeader>
        <CardContent>
          <form onSubmit={handleSubmit} className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
            <div className="space-y-1">
              <Label htmlFor="username">Username</Label>
              <Input
                id="username"
                data-testid="input-client-username"
                value={form.username}
                onChange={(e) => setForm({ ...form, username: e.target.value })}
                disabled={!!editingId}
                required={!editingId}
              />
            </div>
            <div className="space-y-1">
              <Label htmlFor="name">Name</Label>
              <Input
                id="name"
                data-testid="input-client-name"
                value={form.name}
                onChange={(e) => setForm({ ...form, name: e.target.value })}
                required
              />
            </div>
            <div className="space-y-1">
              <Label htmlFor="email">Email</Label>
              <Input
                id="email"
                data-testid="input-client-email"
                type="email"
                value={form.email}
                onChange={(e) => setForm({ ...form, email: e.target.value })}
              />
            </div>
            {!editingId && (
              <div className="space-y-1">
                <Label htmlFor="password">Password</Label>
                <Input
                  id="password"
                  data-testid="input-client-password"
                  type="password"
                  value={form.password}
                  onChange={(e) => setForm({ ...form, password: e.target.value })}
                  required={!editingId}
                />
              </div>
            )}
            <div className="space-y-1">
              <Label htmlFor="startingCapital">Starting Capital</Label>
              <Input
                id="startingCapital"
                data-testid="input-client-capital"
                type="number"
                value={form.startingCapital}
                onChange={(e) => setForm({ ...form, startingCapital: e.target.value })}
              />
            </div>
            <div className="space-y-1">
              <Label htmlFor="investmentStartDate">Investment Start Date</Label>
              <Input
                id="investmentStartDate"
                data-testid="input-client-start-date"
                type="date"
                value={form.investmentStartDate}
                onChange={(e) => setForm({ ...form, investmentStartDate: e.target.value })}
              />
            </div>
            <div className="flex items-end gap-2 sm:col-span-2 lg:col-span-3">
              <Button
                type="submit"
                disabled={createMutation.isPending || updateMutation.isPending}
                data-testid="button-save-client"
              >
                <Plus className="h-4 w-4 mr-1" />
                {editingId ? "Update Client" : "Create Client"}
              </Button>
              {editingId && (
                <Button type="button" variant="secondary" onClick={cancelEdit} data-testid="button-cancel-edit">
                  Cancel
                </Button>
              )}
            </div>
          </form>
        </CardContent>
      </Card>

      <Card>
        <CardHeader className="pb-3">
          <CardTitle className="text-base">Clients ({clients?.length ?? 0})</CardTitle>
        </CardHeader>
        <CardContent>
          {isLoading ? (
            <div className="space-y-2">
              {[1,2,3].map(i => <Skeleton key={i} className="h-8 w-full" />)}
            </div>
          ) : !clients || clients.length === 0 ? (
            <p className="text-sm text-muted-foreground">No clients yet</p>
          ) : (
            <div className="overflow-x-auto">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Username</TableHead>
                    <TableHead>Name</TableHead>
                    <TableHead>Email</TableHead>
                    <TableHead className="text-right">Starting Capital</TableHead>
                    <TableHead>Start Date</TableHead>
                    <TableHead>Status</TableHead>
                    <TableHead></TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {clients.map((c) => (
                    <TableRow key={c.clientId} data-testid={`row-client-${c.clientId}`}>
                      <TableCell className="font-medium">{c.username}</TableCell>
                      <TableCell>{c.name}</TableCell>
                      <TableCell>{c.email}</TableCell>
                      <TableCell className="text-right">${c.startingCapital.toLocaleString()}</TableCell>
                      <TableCell>{c.investmentStartDate}</TableCell>
                      <TableCell>
                        <span className={`text-xs font-medium ${c.active ? "text-green-600 dark:text-green-400" : "text-muted-foreground"}`}>
                          {c.active ? "Active" : "Inactive"}
                        </span>
                      </TableCell>
                      <TableCell>
                        <div className="flex gap-1">
                          <Button
                            variant="ghost"
                            size="icon"
                            className="h-7 w-7"
                            onClick={() => startEdit(c)}
                            data-testid={`button-edit-client-${c.clientId}`}
                          >
                            <Pencil className="h-3.5 w-3.5" />
                          </Button>
                          <Button
                            variant="ghost"
                            size="icon"
                            className="h-7 w-7 text-destructive"
                            onClick={() => setDeleteId(c.clientId)}
                            data-testid={`button-delete-client-${c.clientId}`}
                          >
                            <Trash2 className="h-3.5 w-3.5" />
                          </Button>
                        </div>
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </div>
          )}
        </CardContent>
      </Card>

      {/* Delete Confirmation Dialog */}
      <Dialog open={!!deleteId} onOpenChange={() => setDeleteId(null)}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Delete Client</DialogTitle>
            <DialogDescription>
              Are you sure you want to delete this client? This action cannot be undone.
            </DialogDescription>
          </DialogHeader>
          <DialogFooter>
            <Button variant="secondary" onClick={() => setDeleteId(null)} data-testid="button-cancel-delete">
              Cancel
            </Button>
            <Button
              variant="destructive"
              onClick={() => deleteId && deleteMutation.mutate(deleteId)}
              disabled={deleteMutation.isPending}
              data-testid="button-confirm-delete"
            >
              Delete
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
