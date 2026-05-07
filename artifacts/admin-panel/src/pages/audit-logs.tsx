import { useState } from "react";
import { useGetAuditLogs, getGetAuditLogsQueryKey } from "@workspace/api-client-react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
import { format } from "date-fns";
import { ShieldAlert } from "lucide-react";

const ACTION_COLORS: Record<string, string> = {
  approve_deposit: "default",
  reject_deposit: "destructive",
  approve_withdrawal: "default",
  reject_withdrawal: "destructive",
  declare_result: "secondary",
  update_user: "outline",
  wallet_adjust: "secondary",
  add_upi: "outline",
  update_upi: "outline",
  delete_upi: "destructive",
  update_game_settings: "outline",
};

export default function AuditLogs() {
  const [page, setPage] = useState(1);

  const { data, isLoading } = useGetAuditLogs(
    { page, limit: 50 },
    { query: { queryKey: getGetAuditLogsQueryKey({ page, limit: 50 }) } }
  );

  const logs = (data as any)?.logs || [];
  const total = (data as any)?.total || 0;

  return (
    <div className="space-y-6">
      <div className="flex items-center gap-3">
        <ShieldAlert className="w-7 h-7 text-muted-foreground" />
        <h2 className="text-3xl font-bold tracking-tight">Audit Logs</h2>
        <Badge variant="secondary">{total} total</Badge>
      </div>

      <Card>
        <CardHeader><CardTitle>All Admin Actions</CardTitle></CardHeader>
        <CardContent>
          {isLoading ? (
            <div className="space-y-2">{[1,2,3,4,5].map(i => <Skeleton key={i} className="h-12 w-full" />)}</div>
          ) : logs.length === 0 ? (
            <div className="text-center py-16 text-muted-foreground">No audit logs yet.</div>
          ) : (
            <>
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Time</TableHead>
                    <TableHead>Admin</TableHead>
                    <TableHead>Action</TableHead>
                    <TableHead>Details</TableHead>
                    <TableHead>IP Address</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {logs.map((log: any) => (
                    <TableRow key={log.id}>
                      <TableCell className="text-xs text-muted-foreground whitespace-nowrap">
                        {format(new Date(log.createdAt), "dd MMM yyyy HH:mm:ss")}
                      </TableCell>
                      <TableCell className="font-medium">{log.adminName || `Admin #${log.adminId}`}</TableCell>
                      <TableCell>
                        <Badge variant={(ACTION_COLORS[log.action] as any) || "outline"}>
                          {log.action.replace(/_/g, " ")}
                        </Badge>
                      </TableCell>
                      <TableCell className="text-sm max-w-xs truncate">{log.details || "-"}</TableCell>
                      <TableCell className="font-mono text-xs">{log.ipAddress || "-"}</TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
              <div className="flex justify-between mt-4">
                <Button variant="outline" onClick={() => setPage(p => Math.max(1, p - 1))} disabled={page === 1}>Previous</Button>
                <span className="text-sm text-muted-foreground">Page {page} — {total} total</span>
                <Button variant="outline" onClick={() => setPage(p => p + 1)} disabled={logs.length < 50}>Next</Button>
              </div>
            </>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
