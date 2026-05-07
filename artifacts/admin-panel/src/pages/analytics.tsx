import { useState } from "react";
import { useGetAnalytics, getGetAnalyticsQueryKey } from "@workspace/api-client-react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import {
  BarChart, Bar, XAxis, YAxis, Tooltip, ResponsiveContainer, Cell,
  PieChart, Pie, Legend,
} from "recharts";

const COLOR_MAP: Record<string, string> = {
  red: "#D32F2F",
  yellow: "#FBC02D",
  green: "#2E7D32",
};

const PERIODS = ["today", "week", "month"] as const;

export default function Analytics() {
  const [period, setPeriod] = useState<"today" | "week" | "month">("today");

  const { data, isLoading } = useGetAnalytics(
    { period },
    { query: { queryKey: getGetAnalyticsQueryKey({ period }) } }
  );

  const analytics = data as any;

  const colorPieData = analytics?.colorPopularity
    ? Object.entries(analytics.colorPopularity as Record<string, number>).map(([name, value]) => ({ name, value }))
    : [];

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <h2 className="text-3xl font-bold tracking-tight">Analytics</h2>
        <div className="flex gap-2">
          {PERIODS.map((p) => (
            <Button
              key={p}
              size="sm"
              variant={period === p ? "default" : "outline"}
              onClick={() => setPeriod(p)}
              className="capitalize"
            >
              {p}
            </Button>
          ))}
        </div>
      </div>

      {isLoading ? (
        <div className="grid gap-4 md:grid-cols-3">
          {[1,2,3].map(i => <Skeleton key={i} className="h-28 w-full" />)}
        </div>
      ) : (
        <>
          <div className="grid gap-4 md:grid-cols-3">
            <Card>
              <CardHeader className="pb-2">
                <CardTitle className="text-sm text-muted-foreground">Total Collection</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold text-green-600">₹{analytics?.totalCollection?.toFixed(2) || "0.00"}</div>
              </CardContent>
            </Card>
            <Card>
              <CardHeader className="pb-2">
                <CardTitle className="text-sm text-muted-foreground">Total Payout</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold text-red-600">₹{analytics?.totalPayout?.toFixed(2) || "0.00"}</div>
              </CardContent>
            </Card>
            <Card>
              <CardHeader className="pb-2">
                <CardTitle className="text-sm text-muted-foreground">Net Profit</CardTitle>
              </CardHeader>
              <CardContent>
                <div className={`text-2xl font-bold ${analytics?.totalProfit >= 0 ? "text-green-600" : "text-red-600"}`}>
                  ₹{analytics?.totalProfit?.toFixed(2) || "0.00"}
                </div>
              </CardContent>
            </Card>
          </div>

          <div className="grid gap-4 md:grid-cols-2">
            <Card>
              <CardHeader><CardTitle className="text-base">Color Bet Distribution</CardTitle></CardHeader>
              <CardContent>
                {colorPieData.length === 0 ? (
                  <div className="h-40 flex items-center justify-center text-muted-foreground text-sm">No data</div>
                ) : (
                  <ResponsiveContainer width="100%" height={220}>
                    <PieChart>
                      <Pie data={colorPieData} dataKey="value" nameKey="name" cx="50%" cy="50%" outerRadius={80} label={({ name, percent }) => `${name} ${(percent * 100).toFixed(0)}%`}>
                        {colorPieData.map((entry, i) => (
                          <Cell key={i} fill={COLOR_MAP[entry.name] || "#888"} />
                        ))}
                      </Pie>
                      <Tooltip formatter={(v: any) => `₹${v}`} />
                    </PieChart>
                  </ResponsiveContainer>
                )}
              </CardContent>
            </Card>

            <Card>
              <CardHeader><CardTitle className="text-base">Top Bettors</CardTitle></CardHeader>
              <CardContent>
                {!analytics?.topBettors?.length ? (
                  <div className="h-40 flex items-center justify-center text-muted-foreground text-sm">No data</div>
                ) : (
                  <Table>
                    <TableHeader>
                      <TableRow>
                        <TableHead>Name</TableHead>
                        <TableHead>Wallet Balance</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {analytics.topBettors.map((u: any) => (
                        <TableRow key={u.id}>
                          <TableCell className="font-medium">{u.name}</TableCell>
                          <TableCell className="font-semibold">₹{Number(u.walletBalance).toFixed(2)}</TableCell>
                        </TableRow>
                      ))}
                    </TableBody>
                  </Table>
                )}
              </CardContent>
            </Card>
          </div>
        </>
      )}
    </div>
  );
}
