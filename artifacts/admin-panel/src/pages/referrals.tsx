import { useGetAdminReferrals } from "@workspace/api-client-react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Skeleton } from "@/components/ui/skeleton";
import { format } from "date-fns";
import { Users, DollarSign, Network } from "lucide-react";

export default function Referrals() {
  const { data, isLoading } = useGetAdminReferrals();

  if (isLoading) {
    return (
      <div className="space-y-6">
        <h2 className="text-3xl font-bold tracking-tight">Referrals</h2>
        <div className="grid gap-4 md:grid-cols-3">
          {[1,2,3].map(i => <Skeleton key={i} className="h-28 w-full" />)}
        </div>
        <Skeleton className="h-64 w-full" />
      </div>
    );
  }

  const summary = data as any;

  return (
    <div className="space-y-6">
      <h2 className="text-3xl font-bold tracking-tight">Referral Management</h2>

      <div className="grid gap-4 md:grid-cols-3">
        <Card>
          <CardHeader className="flex flex-row items-center justify-between pb-2">
            <CardTitle className="text-sm text-muted-foreground">Total Referrals</CardTitle>
            <Network className="w-4 h-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{summary?.totalReferrals || 0}</div>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="flex flex-row items-center justify-between pb-2">
            <CardTitle className="text-sm text-muted-foreground">Commission Paid</CardTitle>
            <DollarSign className="w-4 h-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">₹{summary?.totalCommissionPaid?.toFixed(2) || "0.00"}</div>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="flex flex-row items-center justify-between pb-2">
            <CardTitle className="text-sm text-muted-foreground">Top Referrers</CardTitle>
            <Users className="w-4 h-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{summary?.topReferrers?.length || 0}</div>
          </CardContent>
        </Card>
      </div>

      <Card>
        <CardHeader><CardTitle>Top Referrers</CardTitle></CardHeader>
        <CardContent>
          {!summary?.topReferrers?.length ? (
            <div className="text-center py-10 text-muted-foreground">No referral data yet.</div>
          ) : (
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Name</TableHead>
                  <TableHead>Mobile</TableHead>
                  <TableHead>Joined</TableHead>
                  <TableHead>Total Bets</TableHead>
                  <TableHead>Commission Earned</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {summary.topReferrers.map((r: any) => (
                  <TableRow key={r.id}>
                    <TableCell className="font-medium">{r.name}</TableCell>
                    <TableCell className="font-mono">{r.mobile}</TableCell>
                    <TableCell>{format(new Date(r.joinedAt), "dd MMM yyyy")}</TableCell>
                    <TableCell>₹{r.totalBets?.toFixed(2) || "0.00"}</TableCell>
                    <TableCell className="text-green-600 font-semibold">₹{r.commissionEarned?.toFixed(2) || "0.00"}</TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
