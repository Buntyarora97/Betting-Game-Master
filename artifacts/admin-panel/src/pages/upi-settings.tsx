import { useState, useRef } from "react";
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
import { Plus, Trash2, Edit, CreditCard, Upload, X, ImageIcon } from "lucide-react";

function QrUploadField({
  value,
  onChange,
}: {
  value: string;
  onChange: (url: string) => void;
}) {
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [isConverting, setIsConverting] = useState(false);

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    if (!file.type.startsWith("image/")) {
      alert("Please select an image file");
      return;
    }

    if (file.size > 5 * 1024 * 1024) {
      alert("Image must be smaller than 5MB");
      return;
    }

    setIsConverting(true);
    const reader = new FileReader();
    reader.onload = (ev) => {
      const result = ev.target?.result as string;
      onChange(result);
      setIsConverting(false);
    };
    reader.onerror = () => {
      alert("Failed to read image");
      setIsConverting(false);
    };
    reader.readAsDataURL(file);
  };

  return (
    <div className="space-y-2">
      <Label>QR Code Image</Label>

      {value ? (
        <div className="relative">
          <div className="border-2 border-primary/30 rounded-lg p-3 bg-muted/30 flex items-start gap-3">
            <img
              src={value}
              alt="QR Preview"
              className="w-24 h-24 object-contain rounded-lg border bg-white flex-shrink-0"
            />
            <div className="flex flex-col gap-2 flex-1 min-w-0">
              <p className="text-sm font-medium text-foreground">QR Code uploaded</p>
              <p className="text-xs text-muted-foreground">This QR code will be displayed to users in the deposit screen of the app</p>
              <div className="flex gap-2 mt-1">
                <Button
                  type="button"
                  size="sm"
                  variant="outline"
                  onClick={() => fileInputRef.current?.click()}
                  disabled={isConverting}
                  className="text-xs"
                >
                  <Upload className="w-3 h-3 mr-1" />
                  Replace
                </Button>
                <Button
                  type="button"
                  size="sm"
                  variant="ghost"
                  onClick={() => onChange("")}
                  className="text-xs text-destructive hover:text-destructive"
                >
                  <X className="w-3 h-3 mr-1" />
                  Remove
                </Button>
              </div>
            </div>
          </div>
        </div>
      ) : (
        <div
          className="border-2 border-dashed border-muted-foreground/30 rounded-lg p-6 cursor-pointer hover:border-primary/50 hover:bg-muted/30 transition-all text-center"
          onClick={() => fileInputRef.current?.click()}
        >
          {isConverting ? (
            <div className="flex flex-col items-center gap-2">
              <div className="w-8 h-8 border-2 border-primary border-t-transparent rounded-full animate-spin" />
              <p className="text-sm text-muted-foreground">Processing image...</p>
            </div>
          ) : (
            <div className="flex flex-col items-center gap-2">
              <div className="w-12 h-12 rounded-full bg-primary/10 flex items-center justify-center">
                <ImageIcon className="w-6 h-6 text-primary" />
              </div>
              <div>
                <p className="text-sm font-medium">Click to upload QR code</p>
                <p className="text-xs text-muted-foreground mt-0.5">PNG, JPG, or JPEG (max 5MB)</p>
              </div>
              <Button type="button" size="sm" variant="outline" className="mt-1">
                <Upload className="w-3 h-3 mr-2" />
                Choose from Gallery
              </Button>
            </div>
          )}
        </div>
      )}

      <input
        ref={fileInputRef}
        type="file"
        accept="image/*"
        className="hidden"
        onChange={handleFileChange}
      />

      <p className="text-xs text-muted-foreground">
        Or paste an image URL:
      </p>
      <Input
        value={value.startsWith("data:") ? "" : value}
        onChange={(e) => onChange(e.target.value)}
        placeholder="https://example.com/qr.png (optional)"
        className="text-xs"
      />
    </div>
  );
}

function UpiForm({
  initial,
  onSubmit,
  loading,
}: {
  initial?: any;
  onSubmit: (data: any) => void;
  loading?: boolean;
}) {
  const [upiId, setUpiId] = useState(initial?.upiId || "");
  const [qrImageUrl, setQrImageUrl] = useState(initial?.qrImageUrl || "");
  const [displayOrder, setDisplayOrder] = useState(String(initial?.displayOrder ?? 0));
  const [isActive, setIsActive] = useState(initial?.isActive ?? true);

  return (
    <div className="space-y-4">
      <div className="space-y-1">
        <Label>UPI ID *</Label>
        <Input
          value={upiId}
          onChange={(e) => setUpiId(e.target.value)}
          placeholder="name@bankname"
        />
      </div>

      <QrUploadField value={qrImageUrl} onChange={setQrImageUrl} />

      <div className="space-y-1">
        <Label>Display Order</Label>
        <Input
          type="number"
          value={displayOrder}
          onChange={(e) => setDisplayOrder(e.target.value)}
          placeholder="0"
        />
      </div>

      <div className="flex items-center gap-2">
        <Switch checked={isActive} onCheckedChange={setIsActive} />
        <Label>Active (show to users)</Label>
      </div>

      <Button
        className="w-full"
        onClick={() =>
          onSubmit({
            upiId,
            qrImageUrl: qrImageUrl || null,
            displayOrder: parseInt(displayOrder, 10) || 0,
            isActive,
          })
        }
        disabled={loading || !upiId}
      >
        {loading ? "Saving..." : initial ? "Update UPI Settings" : "Add UPI"}
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

  const invalidate = () =>
    queryClient.invalidateQueries({ queryKey: getGetUpiSettingsQueryKey() });

  const handleCreate = (formData: any) => {
    createMutation.mutate(
      { data: formData },
      {
        onSuccess: () => {
          toast({ title: "UPI setting added successfully" });
          setAddOpen(false);
          invalidate();
        },
        onError: (e: any) =>
          toast({ title: "Error", description: e.message, variant: "destructive" }),
      }
    );
  };

  const handleUpdate = (formData: any) => {
    updateMutation.mutate(
      { id: editItem.id, data: formData },
      {
        onSuccess: () => {
          toast({ title: "UPI setting updated" });
          setEditItem(null);
          invalidate();
        },
        onError: (e: any) =>
          toast({ title: "Error", description: e.message, variant: "destructive" }),
      }
    );
  };

  const handleDelete = (id: number) => {
    if (!confirm("Delete this UPI setting? Users won't see it anymore.")) return;
    deleteMutation.mutate(
      { id },
      {
        onSuccess: () => {
          toast({ title: "UPI setting deleted" });
          invalidate();
        },
        onError: (e: any) =>
          toast({ title: "Error", description: e.message, variant: "destructive" }),
      }
    );
  };

  const settings = (data as any)?.settings || [];

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-3xl font-bold tracking-tight">UPI Settings</h2>
          <p className="text-muted-foreground text-sm mt-1">
            Manage UPI IDs and QR codes displayed to users during deposit
          </p>
        </div>
        <Dialog open={addOpen} onOpenChange={setAddOpen}>
          <DialogTrigger asChild>
            <Button>
              <Plus className="w-4 h-4 mr-2" />
              Add UPI
            </Button>
          </DialogTrigger>
          <DialogContent className="max-w-md">
            <DialogHeader>
              <DialogTitle>Add New UPI Setting</DialogTitle>
            </DialogHeader>
            <UpiForm onSubmit={handleCreate} loading={createMutation.isPending} />
          </DialogContent>
        </Dialog>
      </div>

      {isLoading ? (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {[1, 2, 3].map((i) => (
            <Skeleton key={i} className="h-56 w-full" />
          ))}
        </div>
      ) : settings.length === 0 ? (
        <Card>
          <CardContent className="py-16 text-center">
            <div className="flex flex-col items-center gap-3">
              <div className="w-16 h-16 rounded-full bg-muted flex items-center justify-center">
                <CreditCard className="w-8 h-8 text-muted-foreground" />
              </div>
              <p className="text-muted-foreground font-medium">No UPI settings yet</p>
              <p className="text-sm text-muted-foreground">Add a UPI ID and QR code to start accepting deposits</p>
              <Button variant="outline" onClick={() => setAddOpen(true)} className="mt-2">
                <Plus className="w-4 h-4 mr-2" />
                Add First UPI
              </Button>
            </div>
          </CardContent>
        </Card>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {settings.map((s: any) => (
            <Card
              key={s.id}
              className={s.isActive ? "border-primary/30" : "opacity-60"}
            >
              <CardHeader className="pb-2 flex flex-row items-center justify-between">
                <div className="flex items-center gap-2 min-w-0">
                  <CreditCard className="w-4 h-4 text-primary flex-shrink-0" />
                  <CardTitle className="text-sm font-mono truncate">{s.upiId}</CardTitle>
                </div>
                <Badge variant={s.isActive ? "default" : "secondary"}>
                  {s.isActive ? "Active" : "Inactive"}
                </Badge>
              </CardHeader>
              <CardContent className="space-y-3">
                {s.qrImageUrl ? (
                  <div className="flex flex-col items-center">
                    <div className="bg-white p-2 rounded-lg border border-border">
                      <img
                        src={s.qrImageUrl}
                        alt="QR Code"
                        className="w-28 h-28 object-contain"
                      />
                    </div>
                    <p className="text-xs text-muted-foreground mt-1.5">QR code uploaded ✓</p>
                  </div>
                ) : (
                  <div className="flex flex-col items-center py-3 bg-muted/30 rounded-lg border border-dashed border-muted-foreground/20">
                    <ImageIcon className="w-8 h-8 text-muted-foreground/40" />
                    <p className="text-xs text-muted-foreground mt-1">No QR code</p>
                  </div>
                )}

                <div className="text-xs text-muted-foreground">
                  Display order: {s.displayOrder}
                </div>

                <div className="flex gap-2">
                  <Button
                    size="sm"
                    variant="outline"
                    className="flex-1"
                    onClick={() => setEditItem(s)}
                  >
                    <Edit className="w-3 h-3 mr-1" />
                    Edit
                  </Button>
                  <Button
                    size="sm"
                    variant="destructive"
                    onClick={() => handleDelete(s.id)}
                    disabled={deleteMutation.isPending}
                  >
                    <Trash2 className="w-3 h-3" />
                  </Button>
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      )}

      <Dialog open={!!editItem} onOpenChange={(v) => !v && setEditItem(null)}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle>Edit UPI Setting</DialogTitle>
          </DialogHeader>
          {editItem && (
            <UpiForm
              initial={editItem}
              onSubmit={handleUpdate}
              loading={updateMutation.isPending}
            />
          )}
        </DialogContent>
      </Dialog>
    </div>
  );
}
