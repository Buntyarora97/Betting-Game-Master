import { useGetAdminDashboard } from "@workspace/api-client-react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Link } from "wouter";
import { 
  Users, 
  Wallet, 
  TrendingUp, 
  ArrowDownToLine, 
  ArrowUpFromLine,
  Activity,
  Settings
} from "lucide-react";
import { Skeleton } from "@/components/ui/skeleton";
import {
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
} from "recharts";

export default function Dashboard() {
  const { data: dashboard, isLoading, error } = useGetAdminDashboard();

  if (isLoading) {
    return (
      <div className="space-y-6">
        <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
          {[1, 2, 3, 4].map(i => <Skeleton key={i} className="h-32 w-full" />)}
        </div>
        <Skeleton className="h-96 w-full" />
      </div>
    );
  }

  if (error || !dashboard) {
    return <div className="text-destructive">Failed to load dashboard data</div>;
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <h2 className="text-3xl font-bold tracking-tight">Dashboard Overview</h2>
        
        <div className="flex items-center gap-4">
          {dashboard.pendingDeposits > 0 && (
            <Link href="/deposits">
              <Button variant="destructive" className="bg-warning text-warning-foreground hover:bg-warning/90 gap-2">
                <ArrowDownToLine className="w-4 h-4" />
                {dashboard.pendingDeposits} Pending Deposits
              </Button>
            </Link>
          )}
          {dashboard.pendingWithdrawals > 0 && (
            <Link href="/withdrawals">
              <Button variant="destructive" className="gap-2">
                <ArrowUpFromLine className="w-4 h-4" />
                {dashboard.pendingWithdrawals} Pending Withdrawals
              </Button>
            </Link>
          )}
        </div>
      </div>

      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium text-muted-foreground">Total Users</CardTitle>
            <Users className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{dashboard.totalUsers}</div>
            <p className="text-xs text-muted-foreground">
              +{dashboard.todayNewUsers} today
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium text-muted-foreground">Total Wallet Balance</CardTitle>
            <Wallet className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">₹{dashboard.totalWalletBalance?.toLocaleString()}</div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium text-muted-foreground">Today's Collection</CardTitle>
            <TrendingUp className="h-4 w-4 text-success" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-success">₹{dashboard.todayCollection?.toLocaleString()}</div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium text-muted-foreground">Today's Profit</CardTitle>
            <Activity className="h-4 w-4 text-primary" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-primary">₹{dashboard.todayProfit?.toLocaleString()}</div>
            <p className="text-xs text-muted-foreground">
              Payout: ₹{dashboard.todayPayout?.toLocaleString()}
            </p>
          </CardContent>
        </Card>
      </div>

      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-7">
        <Card className="col-span-4">
          <CardHeader>
            <CardTitle>Weekly Performance</CardTitle>
          </CardHeader>
          <CardContent className="pl-2">
            {dashboard.weeklyStats && dashboard.weeklyStats.length > 0 ? (
              <ResponsiveContainer width="100%" height={350}>
                <BarChart data={dashboard.weeklyStats}>
                  <CartesianGrid strokeDasharray="3 3" stroke="#333" vertical={false} />
                  <XAxis dataKey="date" stroke="#888" fontSize={12} tickLine={false} axisLine={false} />
                  <YAxis stroke="#888" fontSize={12} tickLine={false} axisLine={false} tickFormatter={(value) => `₹${value}`} />
                  <Tooltip 
                    cursor={{fill: 'rgba(255,255,255,0.05)'}} 
                    contentStyle={{ backgroundColor: 'hsl(var(--card))', borderColor: 'hsl(var(--border))' }}
                  />
                  <Bar dataKey="collection" fill="hsl(var(--success))" radius={[4, 4, 0, 0]} name="Collection" />
                  <Bar dataKey="payout" fill="hsl(var(--destructive))" radius={[4, 4, 0, 0]} name="Payout" />
                </BarChart>
              </ResponsiveContainer>
            ) : (
              <div className="h-[350px] flex items-center justify-center text-muted-foreground">
                No weekly data available
              </div>
            )}
          </CardContent>
        </Card>

        <Card className="col-span-3">
          <CardHeader>
            <CardTitle>Quick Actions</CardTitle>
          </CardHeader>
          <CardContent className="grid gap-4">
            <Link href="/games">
              <Button className="w-full justify-start h-14 text-lg" variant="outline">
                <Activity className="mr-2 h-5 w-5 text-primary" />
                Monitor Live Game
              </Button>
            </Link>
            <Link href="/users">
              <Button className="w-full justify-start h-14 text-lg" variant="outline">
                <Users className="mr-2 h-5 w-5 text-muted-foreground" />
                Manage Users
              </Button>
            </Link>
            <Link href="/game-settings">
              <Button className="w-full justify-start h-14 text-lg" variant="outline">
                <Settings className="mr-2 h-5 w-5 text-muted-foreground" />
                Game Settings
              </Button>
            </Link>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
