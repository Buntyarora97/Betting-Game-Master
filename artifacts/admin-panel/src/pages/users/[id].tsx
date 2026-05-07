import { useRoute, useLocation } from "wouter";
import {
  useGetAdminUser,
  useUpdateAdminUser,
  useAdjustUserWallet,
  getGetAdminUserQueryKey,
} from "@workspace/api-client-react";
import { useQueryClient } from "@tanstack/react-query";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Skeleton } from "@/components/ui/skeleton";
import { useToast } from "@/hooks/use-toast";
import { format } from "date-fns";
import { ArrowLeft, ShieldAlert, ShieldCheck, Wallet } from "lucide-react";
import { useState } from "react";

export default function UserDetail() {
  const [, params] = useRoute("/users/:id");
  const [, setLocation] = useLocation();
  const userId = parseInt(params?.id || "0", 10);
  const { toast } = useToast();
  const queryClient = useQueryClient();

  const [walletOpen, setWalletOpen] = useState(false);
  const [walletType, setWalletType] = useState("credit");
  const [walletAmount, setWalletAmount] = useState("");
  const [walletReason, setWalletReason] = useState("");

  const { data, isLoading } = useGetAdminUser(userId, {
    query: { queryKey: getGetAdminUserQueryKey(userId), enabled: !!userId },
  });

  const updateMutation = useUpdateAdminUser();
  const walletMutation = useAdjustUserWallet();

  const userDetail = data as any;

  const toggleBlock = () => {
    if (!userDetail?.user) return;
    updateMutation.mutate(
      { userId, data: { isBlocked: !userDetail.user.isBlocked, kycStatus: userDetail.user.kycStatus } },
      {
        onSuccess: () => {
          toast({ title: userDetail.user.isBlocked ? "User unblocked" : "User blocked" });
          queryClient.invalidateQueries({ queryKey: getGetAdminUserQueryKey(userId) });
        },
        onError: (e: any) => toast({ title: "Error", description: e.message, variant: "destructive" }),
      }
    );
  };

  const handleWalletAdjust = () => {
    walletMutation.mutate(
      { userId, data: { type: walletType, amount: parseFloat(walletAmount), reason: walletReason } },
      {
        onSuccess: () => {
          toast({ title: "Wallet adjusted successfully" });
          setWalletOpen(false);
          setWalletAmount("");
          setWalletReason("");
          queryClient.invalidateQueries({ queryKey: getGetAdminUserQueryKey(userId) });
        },
        onError: (e: any) => toast({ title: "Error", description: e.message, variant: "destructive" }),
      }
    );
  };

  if (isLoading) {
    return (
      <div className="space-y-6">
        <Skeleton className="h-10 w-48" />
        <div className="grid md:grid-cols-2 gap-4">
          {[1,2,3,4].map(i => <Skeleton key={i} className="h-40 w-full" />)}
        </div>
      </div>
    );
  }

  if (!userDetail?.user) {
    return <div className="text-destructive">User not found.</div>;
  }

  const { user, wallet, recentBets, recentTransactions } = userDetail;

  return (
    <div className="space-y-6">
      <div className="flex items-center gap-4">
        <Button variant="ghost" size="sm" onClick={() => setLocation("/users")}>
          <ArrowLeft className="w-4 h-4 mr-1" />Back
        </Button>
        <h2 className="text-2xl font-bold">{user.name}</h2>
        <Badge variant={user.isBlocked ? "destructive" : "secondary"}>
          {user.isBlocked ? "Blocked" : "Active"}
        </Badge>
        <Badge variant={user.kycStatus === "verified" ? "default" : "outline"}>
          KYC: {user.kycStatus}
        </Badge>
      </div>

      <div className="flex gap-2">
        <Button
          variant={user.isBlocked ? "default" : "destructive"}
          size="sm"
          onClick={toggleBlock}
          disabled={updateMutation.isPending}
        >
          {user.isBlocked ? <><ShieldCheck className="w-4 h-4 mr-1" />Unblock User</> : <><ShieldAlert className="w-4 h-4 mr-1" />Block User</>}
        </Button>
        <Dialog open={walletOpen} onOpenChange={setWalletOpen}>
          <DialogTrigger asChild>
            <Button variant="outline" size="sm">
              <Wallet className="w-4 h-4 mr-1" />Adjust Wallet
            </Button>
          </DialogTrigger>
          <DialogContent>
            <DialogHeader><DialogTitle>Adjust Wallet</DialogTitle></DialogHeader>
            <div className="space-y-4 py-2">
              <div className="space-y-1">
                <Label>Type</Label>
                <Select value={walletType} onValueChange={setWalletType}>
                  <SelectTrigger><SelectValue /></SelectTrigger>
                  <SelectContent>
                    <SelectItem value="credit">Credit</SelectItem>
                    <SelectItem value="debit">Debit</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              <div className="space-y-1">
                <Label>Amount (₹)</Label>
                <Input type="number" value={walletAmount} onChange={e => setWalletAmount(e.target.value)} placeholder="0.00" />
              </div>
              <div className="space-y-1">
                <Label>Reason</Label>
                <Input value={walletReason} onChange={e => setWalletReason(e.target.value)} placeholder="Reason for adjustment..." />
              </div>
              <Button className="w-full" onClick={handleWalletAdjust} disabled={walletMutation.isPending || !walletAmount}>
                {walletMutation.isPending ? "Processing..." : "Confirm Adjustment"}
              </Button>
            </div>
          </DialogContent>
        </Dialog>
      </div>

      <div className="grid md:grid-cols-2 gap-4">
        <Card>
          <CardHeader><CardTitle>User Info</CardTitle></CardHeader>
          <CardContent className="space-y-2 text-sm">
            <div className="flex justify-between"><span className="text-muted-foreground">ID</span><span className="font-mono">#{user.id}</span></div>
            <div className="flex justify-between"><span className="text-muted-foreground">Mobile</span><span className="font-mono">{user.mobile}</span></div>
            <div className="flex justify-between"><span className="text-muted-foreground">Email</span><span>{user.email || "-"}</span></div>
            <div className="flex justify-between"><span className="text-muted-foreground">Referral Code</span><span className="font-mono font-semibold">{user.referralCode}</span></div>
            <div className="flex justify-between"><span className="text-muted-foreground">Joined</span><span>{format(new Date(user.createdAt), "dd MMM yyyy")}</span></div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader><CardTitle>Wallet Summary</CardTitle></CardHeader>
          <CardContent className="space-y-2 text-sm">
            <div className="flex justify-between"><span className="text-muted-foreground">Current Balance</span><span className="text-lg font-bold">₹{Number(wallet?.balance || user.walletBalance).toFixed(2)}</span></div>
            <div className="flex justify-between"><span className="text-muted-foreground">Total Deposited</span><span className="text-green-600">₹{Number(wallet?.totalDeposited || 0).toFixed(2)}</span></div>
            <div className="flex justify-between"><span className="text-muted-foreground">Total Withdrawn</span><span className="text-red-600">₹{Number(wallet?.totalWithdrawn || 0).toFixed(2)}</span></div>
            <div className="flex justify-between"><span className="text-muted-foreground">Total Won</span><span className="text-green-600">₹{Number(wallet?.totalWon || 0).toFixed(2)}</span></div>
            <div className="flex justify-between"><span className="text-muted-foreground">Total Lost</span><span className="text-red-600">₹{Number(wallet?.totalLost || 0).toFixed(2)}</span></div>
          </CardContent>
        </Card>
      </div>

      <div className="grid md:grid-cols-2 gap-4">
        <Card>
          <CardHeader><CardTitle className="text-base">Recent Bets</CardTitle></CardHeader>
          <CardContent>
            {!recentBets?.length ? (
              <div className="text-center py-6 text-muted-foreground text-sm">No bets yet.</div>
            ) : (
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Type</TableHead>
                    <TableHead>Selection</TableHead>
                    <TableHead>Amount</TableHead>
                    <TableHead>Result</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {recentBets.map((b: any) => (
                    <TableRow key={b.id}>
                      <TableCell className="capitalize">{b.betType}</TableCell>
                      <TableCell className="capitalize font-medium">{b.selection}</TableCell>
                      <TableCell>₹{Number(b.amount).toFixed(2)}</TableCell>
                      <TableCell>
                        <Badge variant={b.status === "won" ? "default" : b.status === "lost" ? "destructive" : "outline"}>
                          {b.status}
                        </Badge>
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            )}
          </CardContent>
        </Card>

        <Card>
          <CardHeader><CardTitle className="text-base">Recent Transactions</CardTitle></CardHeader>
          <CardContent>
            {!recentTransactions?.length ? (
              <div className="text-center py-6 text-muted-foreground text-sm">No transactions yet.</div>
            ) : (
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Type</TableHead>
                    <TableHead>Amount</TableHead>
                    <TableHead>Status</TableHead>
                    <TableHead>Date</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {recentTransactions.map((t: any) => (
                    <TableRow key={t.id}>
                      <TableCell className="capitalize">{t.type}</TableCell>
                      <TableCell>₹{Number(t.amount).toFixed(2)}</TableCell>
                      <TableCell>
                        <Badge variant={t.status === "approved" || t.status === "completed" ? "default" : t.status === "rejected" ? "destructive" : "outline"}>
                          {t.status}
                        </Badge>
                      </TableCell>
                      <TableCell className="text-xs text-muted-foreground">{format(new Date(t.createdAt), "dd MMM")}</TableCell>
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
