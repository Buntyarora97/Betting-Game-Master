import { useState } from "react";
import { useGetAdminGames, useGetLiveBets, useDeclareResult, getGetAdminGamesQueryKey } from "@workspace/api-client-react";
import { useQueryClient } from "@tanstack/react-query";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Label } from "@/components/ui/label";
import { useToast } from "@/hooks/use-toast";
import { Skeleton } from "@/components/ui/skeleton";
import { format } from "date-fns";
import { BarChart, Bar, XAxis, YAxis, Tooltip, ResponsiveContainer, Cell } from "recharts";

const COLOR_MAP: Record<string, string> = {
  red: "#D32F2F",
  yellow: "#FBC02D",
  green: "#2E7D32",
};

export default function Games() {
  const [page, setPage] = useState(1);
  const [declareOpen, setDeclareOpen] = useState(false);
  const [winningColor, setWinningColor] = useState("red");
  const [winningNumber, setWinningNumber] = useState("0");
  const [selectedGameId, setSelectedGameId] = useState<number | null>(null);
  const { toast } = useToast();
  const queryClient = useQueryClient();

  const { data: games, isLoading } = useGetAdminGames(
    { page, limit: 20 },
    { query: { queryKey: getGetAdminGamesQueryKey({ page, limit: 20 }) } }
  );

  const { data: liveBets } = useGetLiveBets({
    query: { refetchInterval: 5000 },
  });

  const declareMutation = useDeclareResult();

  const handleDeclare = () => {
    if (!selectedGameId) return;
    declareMutation.mutate(
      { data: { gameId: selectedGameId, winningColor, winningNumber: parseInt(winningNumber, 10) } },
      {
        onSuccess: () => {
          toast({ title: "Result declared successfully" });
          setDeclareOpen(false);
          queryClient.invalidateQueries({ queryKey: getGetAdminGamesQueryKey({ page, limit: 20 }) });
        },
        onError: (e: any) => toast({ title: "Error", description: e.message, variant: "destructive" }),
      }
    );
  };

  const colorChartData = liveBets?.colorBets
    ? Object.entries(liveBets.colorBets as Record<string, { count: number; amount: number }>).map(([color, d]) => ({
        color,
        amount: d.amount,
        count: d.count,
      }))
    : [];

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <h2 className="text-3xl font-bold tracking-tight">Games & Live Monitoring</h2>
        <Dialog open={declareOpen} onOpenChange={setDeclareOpen}>
          <DialogTrigger asChild>
            <Button className="bg-primary">Declare Result</Button>
          </DialogTrigger>
          <DialogContent>
            <DialogHeader>
              <DialogTitle>Declare Game Result</DialogTitle>
            </DialogHeader>
            <div className="space-y-4 py-4">
              <div className="space-y-2">
                <Label>Game ID</Label>
                <input
                  type="number"
                  className="w-full border rounded px-3 py-2 text-sm"
                  placeholder="Enter game ID"
                  onChange={(e) => setSelectedGameId(parseInt(e.target.value, 10))}
                />
              </div>
              <div className="space-y-2">
                <Label>Winning Color</Label>
                <Select value={winningColor} onValueChange={setWinningColor}>
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="red">Red</SelectItem>
                    <SelectItem value="yellow">Yellow</SelectItem>
                    <SelectItem value="green">Green</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              <div className="space-y-2">
                <Label>Winning Number (0-9)</Label>
                <Select value={winningNumber} onValueChange={setWinningNumber}>
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    {Array.from({ length: 10 }, (_, i) => (
                      <SelectItem key={i} value={String(i)}>{i}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              <Button className="w-full" onClick={handleDeclare} disabled={declareMutation.isPending || !selectedGameId}>
                {declareMutation.isPending ? "Declaring..." : "Confirm & Distribute Winnings"}
              </Button>
            </div>
          </DialogContent>
        </Dialog>
      </div>

      {/* Live Bet Distribution */}
      {liveBets && (
        <div className="grid gap-4 md:grid-cols-2">
          <Card>
            <CardHeader>
              <CardTitle className="text-base">Live Color Distribution</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="flex items-center justify-between mb-4">
                <span className="text-sm text-muted-foreground">Total Bets: {liveBets.totalBets}</span>
                <span className="text-sm font-semibold">₹{liveBets.totalAmount?.toFixed(2)}</span>
              </div>
              <ResponsiveContainer width="100%" height={180}>
                <BarChart data={colorChartData}>
                  <XAxis dataKey="color" />
                  <YAxis />
                  <Tooltip formatter={(v: any) => `₹${v}`} />
                  <Bar dataKey="amount" radius={[4, 4, 0, 0]}>
                    {colorChartData.map((entry, i) => (
                      <Cell key={i} fill={COLOR_MAP[entry.color] || "#888"} />
                    ))}
                  </Bar>
                </BarChart>
              </ResponsiveContainer>
              <div className="grid grid-cols-3 gap-2 mt-2">
                {colorChartData.map((d) => (
                  <div key={d.color} className="text-center p-2 rounded" style={{ background: COLOR_MAP[d.color] + "22" }}>
                    <div className="text-xs font-medium capitalize" style={{ color: COLOR_MAP[d.color] }}>{d.color}</div>
                    <div className="text-sm font-bold">₹{d.amount}</div>
                    <div className="text-xs text-muted-foreground">{d.count} bets</div>
                  </div>
                ))}
              </div>
            </CardContent>
          </Card>
          <Card>
            <CardHeader>
              <CardTitle className="text-base">Number Distribution</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="grid grid-cols-5 gap-2">
                {(liveBets.numberBets || []).map((nb: any) => (
                  <div key={nb.number} className="text-center p-2 rounded border">
                    <div className="text-lg font-bold">{nb.number}</div>
                    <div className="text-xs text-muted-foreground">{nb.count}</div>
                    <div className="text-xs font-medium">₹{nb.amount}</div>
                  </div>
                ))}
              </div>
            </CardContent>
          </Card>
        </div>
      )}

      {/* Game History */}
      <Card>
        <CardHeader>
          <CardTitle>Game History</CardTitle>
        </CardHeader>
        <CardContent>
          {isLoading ? (
            <div className="space-y-2">{[1,2,3,4,5].map(i => <Skeleton key={i} className="h-12 w-full" />)}</div>
          ) : (
            <>
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>ID</TableHead>
                    <TableHead>Scheduled At</TableHead>
                    <TableHead>Status</TableHead>
                    <TableHead>Result</TableHead>
                    <TableHead>Collection</TableHead>
                    <TableHead>Payout</TableHead>
                    <TableHead>Profit</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {(games?.games || []).map((g: any) => (
                    <TableRow key={g.id}>
                      <TableCell className="font-mono">#{g.id}</TableCell>
                      <TableCell>{format(new Date(g.scheduledAt), "dd MMM yyyy HH:mm")}</TableCell>
                      <TableCell>
                        <Badge variant={g.status === "closed" ? "secondary" : g.status === "live" ? "destructive" : "outline"}>
                          {g.status}
                        </Badge>
                      </TableCell>
                      <TableCell>
                        {g.winningColor ? (
                          <span className="flex items-center gap-1">
                            <span className="w-3 h-3 rounded-full inline-block" style={{ background: COLOR_MAP[g.winningColor] }} />
                            <span className="capitalize">{g.winningColor}</span>
                            <span className="text-muted-foreground">#{g.winningNumber}</span>
                          </span>
                        ) : "-"}
                      </TableCell>
                      <TableCell>₹{Number(g.totalCollection).toFixed(2)}</TableCell>
                      <TableCell>₹{Number(g.totalPayout).toFixed(2)}</TableCell>
                      <TableCell className={Number(g.totalCollection) - Number(g.totalPayout) > 0 ? "text-green-600" : "text-red-600"}>
                        ₹{(Number(g.totalCollection) - Number(g.totalPayout)).toFixed(2)}
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
              <div className="flex justify-between mt-4">
                <Button variant="outline" onClick={() => setPage(p => Math.max(1, p - 1))} disabled={page === 1}>Previous</Button>
                <span className="text-sm text-muted-foreground">Page {page}</span>
                <Button variant="outline" onClick={() => setPage(p => p + 1)} disabled={!games?.games?.length || games.games.length < 20}>Next</Button>
              </div>
            </>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
