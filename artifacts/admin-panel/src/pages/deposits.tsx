import { useGetAdminDeposits, useApproveDeposit, getGetAdminDepositsQueryKey } from "@workspace/api-client-react";
import { useState } from "react";
import { useQueryClient } from "@tanstack/react-query";
import { format } from "date-fns";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";
import { useToast } from "@/hooks/use-toast";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Check, X, Clock } from "lucide-react";
import { Skeleton } from "@/components/ui/skeleton";

export default function Deposits() {
  const [page, setPage] = useState(1);
  const [status, setStatus] = useState<string>("pending");
  const { toast } = useToast();
  const queryClient = useQueryClient();

  const qParams = { page, limit: 20, status: status === "all" ? undefined : status };

  const { data, isLoading } = useGetAdminDeposits(qParams, {
    query: { queryKey: getGetAdminDepositsQueryKey(qParams) },
  });

  const approveMutation = useApproveDeposit();

  const handleAction = (txId: number, action: "approve" | "reject") => {
    approveMutation.mutate(
      { txId, data: { action } },
      {
        onSuccess: () => {
          toast({
            title: "Success",
            description: `Deposit ${action}d successfully`,
          });
          queryClient.invalidateQueries({ queryKey: getGetAdminDepositsQueryKey(qParams) });
        },
        onError: (err: any) => {
          toast({
            title: "Error",
            description: err?.data?.message || err.message || "Failed to process deposit",
            variant: "destructive",
          });
        },
      }
    );
  };

  const transactions = (data as any)?.transactions || [];

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <h2 className="text-3xl font-bold tracking-tight">Deposit Requests</h2>
      </div>

      <Card>
        <CardHeader className="flex flex-row items-center justify-between pb-4">
          <CardTitle>Requests</CardTitle>
          <Select value={status} onValueChange={setStatus}>
            <SelectTrigger className="w-[180px]">
              <SelectValue placeholder="Filter by status" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="pending">Pending</SelectItem>
              <SelectItem value="approved">Approved</SelectItem>
              <SelectItem value="rejected">Rejected</SelectItem>
              <SelectItem value="all">All</SelectItem>
            </SelectContent>
          </Select>
        </CardHeader>
        <CardContent>
          {isLoading ? (
            <div className="space-y-2">
              {[1, 2, 3, 4].map((i) => <Skeleton key={i} className="h-12 w-full" />)}
            </div>
          ) : transactions.length === 0 ? (
            <div className="text-center py-10 text-muted-foreground flex flex-col items-center">
              <Clock className="h-10 w-10 mb-3 text-muted-foreground/50" />
              <p>No deposit requests found.</p>
            </div>
          ) : (
            <>
              <div className="rounded-md border">
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Date</TableHead>
                      <TableHead>User</TableHead>
                      <TableHead>Amount</TableHead>
                      <TableHead>UTR / Ref</TableHead>
                      <TableHead>Status</TableHead>
                      <TableHead className="text-right">Actions</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {transactions.map((tx: any) => (
                      <TableRow key={tx.id}>
                        <TableCell>
                          {tx.createdAt ? format(new Date(tx.createdAt), "dd MMM yyyy HH:mm") : "-"}
                        </TableCell>
                        <TableCell>
                          <div className="font-medium">{tx.userName || tx.userMobile || "Unknown"}</div>
                          <div className="text-xs text-muted-foreground">#{tx.userId}</div>
                        </TableCell>
                        <TableCell className="font-mono font-medium text-green-500">
                          +₹{Number(tx.amount).toLocaleString()}
                        </TableCell>
                        <TableCell className="font-mono text-xs">{tx.referenceId || "-"}</TableCell>
                        <TableCell>
                          {tx.status === "pending" && <Badge variant="outline" className="border-yellow-500 text-yellow-500">Pending</Badge>}
                          {tx.status === "approved" && <Badge className="bg-green-700 text-white">Approved</Badge>}
                          {tx.status === "rejected" && <Badge variant="destructive">Rejected</Badge>}
                        </TableCell>
                        <TableCell className="text-right">
                          {tx.status === "pending" ? (
                            <div className="flex justify-end gap-2">
                              <Button
                                size="sm"
                                variant="outline"
                                className="h-8 border-green-600 text-green-600 hover:bg-green-600 hover:text-white"
                                onClick={() => handleAction(tx.id, "approve")}
                                disabled={approveMutation.isPending}
                              >
                                <Check className="h-4 w-4 mr-1" /> Approve
                              </Button>
                              <Button
                                size="sm"
                                variant="outline"
                                className="h-8 border-destructive text-destructive hover:bg-destructive hover:text-destructive-foreground"
                                onClick={() => handleAction(tx.id, "reject")}
                                disabled={approveMutation.isPending}
                              >
                                <X className="h-4 w-4 mr-1" /> Reject
                              </Button>
                            </div>
                          ) : (
                            <span className="text-xs text-muted-foreground">Processed</span>
                          )}
                        </TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              </div>
              <div className="flex items-center justify-between pt-4">
                <div className="text-sm text-muted-foreground">Page {page}</div>
                <div className="flex space-x-2">
                  <Button variant="outline" size="sm" onClick={() => setPage((p) => Math.max(1, p - 1))} disabled={page === 1}>
                    Previous
                  </Button>
                  <Button variant="outline" size="sm" onClick={() => setPage((p) => p + 1)} disabled={transactions.length < 20}>
                    Next
                  </Button>
                </div>
              </div>
            </>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
