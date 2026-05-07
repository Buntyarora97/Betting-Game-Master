import { useGetAdminWithdrawals, useApproveWithdrawal, getGetAdminWithdrawalsQueryKey } from "@workspace/api-client-react";
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

export default function Withdrawals() {
  const [page, setPage] = useState(1);
  const [status, setStatus] = useState<string>("PENDING");
  const { toast } = useToast();
  const queryClient = useQueryClient();

  const { data, isLoading } = useGetAdminWithdrawals(
    { page, limit: 20, status: status === "ALL" ? undefined : status },
    { query: { queryKey: getGetAdminWithdrawalsQueryKey({ page, limit: 20, status: status === "ALL" ? undefined : status }) } }
  );

  const approveMutation = useApproveWithdrawal();

  const handleAction = (id: string, action: "APPROVED" | "REJECTED") => {
    approveMutation.mutate(
      { id, data: { status: action } },
      {
        onSuccess: () => {
          toast({
            title: "Success",
            description: `Withdrawal ${action.toLowerCase()} successfully`,
          });
          queryClient.invalidateQueries({ queryKey: getGetAdminWithdrawalsQueryKey({ page, limit: 20, status: status === "ALL" ? undefined : status }) });
        },
        onError: (err) => {
          toast({
            title: "Error",
            description: err.message || "Failed to process withdrawal",
            variant: "destructive",
          });
        }
      }
    );
  };

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <h2 className="text-3xl font-bold tracking-tight">Withdrawal Requests</h2>
      </div>

      <Card>
        <CardHeader className="flex flex-row items-center justify-between pb-4">
          <CardTitle>Requests</CardTitle>
          <Select value={status} onValueChange={setStatus}>
            <SelectTrigger className="w-[180px]">
              <SelectValue placeholder="Filter by status" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="PENDING">Pending</SelectItem>
              <SelectItem value="APPROVED">Approved</SelectItem>
              <SelectItem value="REJECTED">Rejected</SelectItem>
              <SelectItem value="ALL">All</SelectItem>
            </SelectContent>
          </Select>
        </CardHeader>
        <CardContent>
          {isLoading ? (
             <div className="space-y-2">
               {[1, 2, 3, 4].map(i => <Skeleton key={i} className="h-12 w-full" />)}
             </div>
          ) : !data || data.withdrawals?.length === 0 ? (
            <div className="text-center py-10 text-muted-foreground flex flex-col items-center">
              <Clock className="h-10 w-10 mb-3 text-muted-foreground/50" />
              <p>No withdrawal requests found.</p>
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
                      <TableHead>Bank / UPI Info</TableHead>
                      <TableHead>Status</TableHead>
                      <TableHead className="text-right">Actions</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {data.withdrawals.map((tx) => (
                      <TableRow key={tx.id}>
                        <TableCell>
                          {tx.createdAt ? format(new Date(tx.createdAt), "dd MMM yyyy HH:mm") : '-'}
                        </TableCell>
                        <TableCell>
                          <div className="font-medium">{tx.user?.phone || 'Unknown'}</div>
                          <div className="text-xs text-muted-foreground">{tx.userId.substring(0,8)}</div>
                        </TableCell>
                        <TableCell className="font-mono font-medium text-destructive">
                          -₹{tx.amount.toLocaleString()}
                        </TableCell>
                        <TableCell className="text-sm">
                           {tx.bankDetails ? (
                             <div>
                               <div>{tx.bankDetails.accountNumber}</div>
                               <div className="text-xs text-muted-foreground">{tx.bankDetails.ifsc}</div>
                             </div>
                           ) : tx.upiDetails ? (
                             <div className="font-mono">{tx.upiDetails.upiId}</div>
                           ) : (
                             <span className="text-muted-foreground">Not provided</span>
                           )}
                        </TableCell>
                        <TableCell>
                          {tx.status === "PENDING" && <Badge variant="outline" className="text-warning border-warning">Pending</Badge>}
                          {tx.status === "APPROVED" && <Badge className="bg-success text-success-foreground">Approved</Badge>}
                          {tx.status === "REJECTED" && <Badge variant="destructive">Rejected</Badge>}
                        </TableCell>
                        <TableCell className="text-right">
                          {tx.status === "PENDING" ? (
                            <div className="flex justify-end gap-2">
                              <Button 
                                size="sm" 
                                variant="outline" 
                                className="h-8 border-success text-success hover:bg-success hover:text-success-foreground"
                                onClick={() => handleAction(tx.id, "APPROVED")}
                                disabled={approveMutation.isPending}
                              >
                                <Check className="h-4 w-4 mr-1" /> Approve
                              </Button>
                              <Button 
                                size="sm" 
                                variant="outline" 
                                className="h-8 border-destructive text-destructive hover:bg-destructive hover:text-destructive-foreground"
                                onClick={() => handleAction(tx.id, "REJECTED")}
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
                <div className="text-sm text-muted-foreground">
                  Page {page}
                </div>
                <div className="flex space-x-2">
                  <Button 
                    variant="outline" 
                    size="sm" 
                    onClick={() => setPage(p => Math.max(1, p - 1))}
                    disabled={page === 1}
                  >
                    Previous
                  </Button>
                  <Button 
                    variant="outline" 
                    size="sm"
                    onClick={() => setPage(p => p + 1)}
                    disabled={data.withdrawals.length < 20}
                  >
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
