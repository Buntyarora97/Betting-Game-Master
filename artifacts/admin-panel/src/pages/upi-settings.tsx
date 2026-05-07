import { useState } from "react";
import {
  useGetUpiSettings,
  useCreateUpiSetting,
  useUpdateUpiSetting,
  useDeleteUpiSetting,
  getGetUpiSettingsQueryKey,
} from "@workspace/api-client-react";
import { useQueryClient } from "@tanstack/react-query";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Switch } from "@/components/ui/switch";
import { useToast } from "@/hooks/use-toast";
import { Skeleton } from "@/components/ui/skeleton";
import { Plus, Trash2, Edit, CreditCard } from "lucide-react";

function UpiForm({ initial, onSubmit, loading }: { initial?: any; onSubmit: (data: any) => void; loading?: boolean }) {
  const [upiId, setUpiId] = useState(initial?.upiId || "");
  const [qrImageUrl, setQrImageUrl] = useState(initial?.qrImageUrl || "");
  const [displayOrder, setDisplayOrder] = useState(String(initial?.displayOrder ?? 0));
  const [isActive, setIsActive] = useState(initial?.isActive ?? true);

  return (
    <div className="space-y-4">
      <div className="space-y-1">
        <Label>UPI ID</Label>
        <Input value={upiId} onChange={e => setUpiId(e.target.value)} placeholder="name@bank" />
      </div>
      <div className="space-y-1">
        <Label>QR Image URL (optional)</Label>
        <Input value={qrImageUrl} onChange={e => setQrImageUrl(e.target.value)} placeholder="https://..." />
      </div>
      <div className="space-y-1">
        <Label>Display Order</Label>
        <Input type="number" value={displayOrder} onChange={e => setDisplayOrder(e.target.value)} />
      </div>
      <div className="flex items-center gap-2">
        <Switch checked={isActive} onCheckedChange={setIsActive} />
        <Label>Active</Label>
      </div>
      <Button
        className="w-full"
        onClick={() => onSubmit({ upiId, qrImageUrl: qrImageUrl || null, displayOrder: parseInt(displayOrder, 10), isActive })}
        disabled={loading || !upiId}
      >
        {loading ? "Saving..." : initial ? "Update UPI" : "Add UPI"}
      </Button>
    </div>
  );
}

export default function UpiSettings() {
  const [addOpen, setAddOpen] = useState(false);
  const [editItem, setEditItem] = useState<any>(null);
  const { toast } = useToast();
  const queryClient = useQueryClient();

  const { data, isLoading } = useGetUpiSettings();
  const createMutation = useCreateUpiSetting();
  const updateMutation = useUpdateUpiSetting();
  const deleteMutation = useDeleteUpiSetting();

  const invalidate = () => queryClient.invalidateQueries({ queryKey: getGetUpiSettingsQueryKey() });

  const handleCreate = (formData: any) => {
    createMutation.mutate({ data: formData }, {
      onSuccess: () => { toast({ title: "UPI added" }); setAddOpen(false); invalidate(); },
      onError: (e: any) => toast({ title: "Error", description: e.message, variant: "destructive" }),
    });
  };

  const handleUpdate = (formData: any) => {
    updateMutation.mutate({ id: editItem.id, data: formData }, {
      onSuccess: () => { toast({ title: "UPI updated" }); setEditItem(null); invalidate(); },
      onError: (e: any) => toast({ title: "Error", description: e.message, variant: "destructive" }),
    });
  };

  const handleDelete = (id: number) => {
    if (!confirm("Delete this UPI setting?")) return;
    deleteMutation.mutate({ id }, {
      onSuccess: () => { toast({ title: "UPI deleted" }); invalidate(); },
      onError: (e: any) => toast({ title: "Error", description: e.message, variant: "destructive" }),
    });
  };

  const settings = (data as any)?.settings || [];

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <h2 className="text-3xl font-bold tracking-tight">UPI Settings</h2>
        <Dialog open={addOpen} onOpenChange={setAddOpen}>
          <DialogTrigger asChild>
            <Button><Plus className="w-4 h-4 mr-2" />Add UPI</Button>
          </DialogTrigger>
          <DialogContent>
            <DialogHeader><DialogTitle>Add New UPI</DialogTitle></DialogHeader>
            <UpiForm onSubmit={handleCreate} loading={createMutation.isPending} />
          </DialogContent>
        </Dialog>
      </div>

      {isLoading ? (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {[1,2,3].map(i => <Skeleton key={i} className="h-48 w-full" />)}
        </div>
      ) : settings.length === 0 ? (
        <Card><CardContent className="py-16 text-center text-muted-foreground">No UPI settings yet. Add one to get started.</CardContent></Card>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {settings.map((s: any) => (
            <Card key={s.id} className={s.isActive ? "border-primary/40" : "opacity-60"}>
              <CardHeader className="pb-2 flex flex-row items-center justify-between">
                <div className="flex items-center gap-2">
                  <CreditCard className="w-5 h-5 text-primary" />
                  <CardTitle className="text-sm font-mono">{s.upiId}</CardTitle>
                </div>
                <Badge variant={s.isActive ? "default" : "secondary"}>
                  {s.isActive ? "Active" : "Inactive"}
                </Badge>
              </CardHeader>
              <CardContent>
                {s.qrImageUrl && (
                  <img src={s.qrImageUrl} alt="QR" className="w-24 h-24 object-contain mx-auto mb-3 rounded border" />
                )}
                <div className="text-xs text-muted-foreground mb-3">Order: {s.displayOrder}</div>
                <div className="flex gap-2">
                  <Button size="sm" variant="outline" className="flex-1" onClick={() => setEditItem(s)}>
                    <Edit className="w-3 h-3 mr-1" />Edit
                  </Button>
                  <Button size="sm" variant="destructive" onClick={() => handleDelete(s.id)}>
                    <Trash2 className="w-3 h-3" />
                  </Button>
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      )}

      <Dialog open={!!editItem} onOpenChange={v => !v && setEditItem(null)}>
        <DialogContent>
          <DialogHeader><DialogTitle>Edit UPI</DialogTitle></DialogHeader>
          {editItem && <UpiForm initial={editItem} onSubmit={handleUpdate} loading={updateMutation.isPending} />}
        </DialogContent>
      </Dialog>
    </div>
  );
}
