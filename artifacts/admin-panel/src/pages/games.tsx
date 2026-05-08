import { useState } from "react";
import { useGetAdminGames, useGetLiveBets, useDeclareResult, getGetAdminGamesQueryKey } from "@workspace/api-client-react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
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

const COLOR_BG: Record<string, string> = {
  red: "#D32F2F22",
  yellow: "#FBC02D22",
  green: "#2E7D3222",
};

const API_BASE = (import.meta.env.VITE_API_URL as string) || "";

async function fetchPreset() {
  const res = await fetch(`${API_BASE}/api/admin/games/preset-result`, {
    headers: { Authorization: `Bearer ${localStorage.getItem("admin_token")}` },
  });
  if (!res.ok) throw new Error("Failed to fetch preset");
  return res.json() as Promise<{ presetColor: string | null; presetNumber: number | null; currentGameId: number | null }>;
}

async function savePreset(data: { presetColor: string; presetNumber: number }, token: string) {
  const res = await fetch(`${API_BASE}/api/admin/games/preset-result`, {
    method: "POST",
    headers: { "Content-Type": "application/json", Authorization: `Bearer ${token}` },
    body: JSON.stringify(data),
  });
  if (!res.ok) throw new Error("Failed to save preset");
  return res.json();
}

async function openGame(token: string) {
  const res = await fetch(`${API_BASE}/api/admin/games/open`, {
    method: "POST",
    headers: { "Content-Type": "application/json", Authorization: `Bearer ${token}` },
  });
  if (!res.ok) throw new Error("Failed to open game");
  return res.json() as Promise<{ id: number; scheduledAt: string; status: string }>;
}

export default function Games() {
  const [page, setPage] = useState(1);
  const [declareOpen, setDeclareOpen] = useState(false);
  const [winningColor, setWinningColor] = useState("red");
  const [winningNumber, setWinningNumber] = useState("0");
  const [selectedGameId, setSelectedGameId] = useState<number | null>(null);

  const [presetColor, setPresetColor] = useState("red");
  const [presetNumber, setPresetNumber] = useState(0);

  const { toast } = useToast();
  const queryClient = useQueryClient();

  const token = localStorage.getItem("admin_token") || "";

  const { data: games, isLoading } = useGetAdminGames(
    { page, limit: 20 },
    { query: { queryKey: getGetAdminGamesQueryKey({ page, limit: 20 }) } }
  );

  const { data: liveBets, isLoading: liveBetsLoading } = useGetLiveBets({
    query: { refetchInterval: 5000 },
  });

  const { data: preset, isLoading: presetLoading } = useQuery({
    queryKey: ["preset-result"],
    queryFn: fetchPreset,
    refetchInterval: 10000,
    select: (data) => {
      if (data.presetColor) setPresetColor(data.presetColor);
      if (data.presetNumber !== null) setPresetNumber(data.presetNumber);
      return data;
    },
  });

  const presetMutation = useMutation({
    mutationFn: (data: { presetColor: string; presetNumber: number }) => savePreset(data, token),
    onSuccess: () => {
      toast({ title: "Preset saved", description: `Next result set to ${presetColor} #${presetNumber}` });
      queryClient.invalidateQueries({ queryKey: ["preset-result"] });
    },
    onError: () => toast({ title: "Failed to save preset", variant: "destructive" }),
  });

  const openGameMutation = useMutation({
    mutationFn: () => openGame(token),
    onSuccess: (data) => {
      toast({ title: "Game opened!", description: `Game #${data.id} is now LIVE — users can place bets` });
      queryClient.invalidateQueries({ queryKey: getGetAdminGamesQueryKey({ page, limit: 20 }) });
      queryClient.invalidateQueries({ queryKey: ["preset-result"] });
      setSelectedGameId(data.id);
    },
    onError: () => toast({ title: "Failed to open game", variant: "destructive" }),
  });

  const declareMutation = useDeclareResult();

  const handleSavePreset = () => {
    presetMutation.mutate({ presetColor, presetNumber });
  };

  const handleOpenDeclare = () => {
    const gameId = (liveBets as any)?.gameId || preset?.currentGameId || null;
    setSelectedGameId(gameId);
    setWinningColor(presetColor);
    setWinningNumber(String(presetNumber));
    setDeclareOpen(true);
  };

  const handleDeclare = () => {
    const gameId = selectedGameId || (liveBets as any)?.gameId || preset?.currentGameId;
    if (!gameId) {
      toast({ title: "No active game found", variant: "destructive" });
      return;
    }
    declareMutation.mutate(
      { data: { gameId, winningColor, winningNumber: parseInt(winningNumber, 10) } },
      {
        onSuccess: () => {
          toast({ title: "Result declared successfully", description: `${winningColor} #${winningNumber} — winnings distributed` });
          setDeclareOpen(false);
          queryClient.invalidateQueries({ queryKey: getGetAdminGamesQueryKey({ page, limit: 20 }) });
          queryClient.invalidateQueries({ queryKey: ["preset-result"] });
        },
        onError: (e: any) => toast({ title: "Error declaring result", description: e.message, variant: "destructive" }),
      }
    );
  };

  const colorChartData = (liveBets as any)?.colorBets
    ? Object.entries((liveBets as any).colorBets as Record<string, { count: number; amount: number; potentialPayout: number }>).map(([color, d]) => ({
        color,
        amount: d.amount,
        count: d.count,
        potentialPayout: d.potentialPayout,
      }))
    : [];

  const totalCollection = (liveBets as any)?.totalAmount || 0;

  const profitByColor = colorChartData.map((d) => ({
    color: d.color,
    profit: totalCollection - d.potentialPayout,
    potentialPayout: d.potentialPayout,
  })).sort((a, b) => b.profit - a.profit);

  const bestColorForAdmin = profitByColor[0]?.color || null;

  const numberBets: Array<{ number: number; count: number; amount: number; potentialPayout: number }> =
    (liveBets as any)?.numberBets || [];

  const profitByNumber = [...numberBets]
    .map((nb) => ({ number: nb.number, profit: totalCollection - nb.potentialPayout }))
    .sort((a, b) => b.profit - a.profit);

  const bestNumberForAdmin = profitByNumber[0]?.number ?? null;

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <h2 className="text-3xl font-bold tracking-tight">Games & Live Monitoring</h2>
        <div className="flex items-center gap-2">
          <Button
            variant="outline"
            className="border-green-500 text-green-600 hover:bg-green-50 dark:hover:bg-green-950"
            onClick={() => openGameMutation.mutate()}
            disabled={openGameMutation.isPending}
          >
            {openGameMutation.isPending ? "Opening..." : "Open Game"}
          </Button>
        <Dialog open={declareOpen} onOpenChange={setDeclareOpen}>
          <DialogTrigger asChild>
            <Button className="bg-primary" onClick={handleOpenDeclare}>Declare Result</Button>
          </DialogTrigger>
          <DialogContent>
            <DialogHeader>
              <DialogTitle>Declare Game Result</DialogTitle>
            </DialogHeader>
            <div className="space-y-4 py-4">
              {selectedGameId ? (
                <div className="rounded-md bg-muted px-4 py-2 text-sm">
                  Game ID: <span className="font-bold">#{selectedGameId}</span>
                </div>
              ) : (
                <div className="space-y-2">
                  <Label>Game ID</Label>
                  <input
                    type="number"
                    className="w-full border rounded px-3 py-2 text-sm"
                    placeholder="Enter game ID"
                    onChange={(e) => setSelectedGameId(parseInt(e.target.value, 10))}
                  />
                </div>
              )}
              <div className="space-y-2">
                <Label>Winning Color</Label>
                <div className="grid grid-cols-3 gap-2">
                  {["red", "yellow", "green"].map((c) => (
                    <button
                      key={c}
                      onClick={() => setWinningColor(c)}
                      className="rounded-lg border-2 py-3 capitalize font-semibold transition-all"
                      style={{
                        borderColor: winningColor === c ? COLOR_MAP[c] : "transparent",
                        background: COLOR_BG[c],
                        color: COLOR_MAP[c],
                      }}
                    >
                      {c}
                    </button>
                  ))}
                </div>
              </div>
              <div className="space-y-2">
                <Label>Winning Number (0–9)</Label>
                <div className="grid grid-cols-5 gap-2">
                  {Array.from({ length: 10 }, (_, i) => (
                    <button
                      key={i}
                      onClick={() => setWinningNumber(String(i))}
                      className="rounded-lg border-2 py-2 text-center font-bold text-lg transition-all"
                      style={{
                        borderColor: winningNumber === String(i) ? "#6366f1" : "transparent",
                        background: winningNumber === String(i) ? "#6366f122" : "var(--muted)",
                      }}
                    >
                      {i}
                    </button>
                  ))}
                </div>
              </div>
              <div className="rounded-md border p-3 bg-muted/40 text-sm space-y-1">
                <div className="font-medium">Summary</div>
                <div>Color: <span className="font-bold capitalize" style={{ color: COLOR_MAP[winningColor] }}>{winningColor}</span></div>
                <div>Number: <span className="font-bold">#{winningNumber}</span></div>
                <div>Collection: <span className="font-bold">₹{totalCollection.toFixed(2)}</span></div>
              </div>
              <Button className="w-full" onClick={handleDeclare} disabled={declareMutation.isPending}>
                {declareMutation.isPending ? "Declaring..." : "Confirm & Distribute Winnings"}
              </Button>
            </div>
          </DialogContent>
        </Dialog>
        </div>
      </div>

      {/* Next Result Controller */}
      <Card className="border-2 border-primary/20">
        <CardHeader>
          <CardTitle className="flex items-center gap-2 text-base">
            <span className="text-lg">🎯</span> Next Result Controller
            {presetLoading && <span className="text-xs text-muted-foreground font-normal">Loading...</span>}
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-5">
          {bestColorForAdmin && (
            <div className="rounded-lg border bg-green-50 dark:bg-green-950/20 border-green-200 dark:border-green-800 p-3">
              <div className="text-xs font-medium text-green-700 dark:text-green-400 mb-1">Admin Profit Analysis</div>
              <div className="flex flex-wrap gap-2">
                {profitByColor.map((p) => (
                  <span key={p.color} className="inline-flex items-center gap-1.5 rounded-full px-2 py-1 text-xs font-medium"
                    style={{ background: COLOR_BG[p.color], color: COLOR_MAP[p.color] }}>
                    <span className="w-2 h-2 rounded-full" style={{ background: COLOR_MAP[p.color] }} />
                    {p.color}: {p.profit >= 0 ? "+" : ""}₹{p.profit.toFixed(0)} profit
                    {p.color === bestColorForAdmin && <span className="ml-1 font-bold">★ Best</span>}
                  </span>
                ))}
              </div>
              {bestNumberForAdmin !== null && (
                <div className="mt-2 text-xs text-muted-foreground">
                  Best number: <span className="font-bold text-foreground">#{bestNumberForAdmin}</span>
                  {" "}(₹{(profitByNumber[0]?.profit || 0).toFixed(0)} profit)
                </div>
              )}
            </div>
          )}

          <div className="space-y-3">
            <div>
              <Label className="text-xs mb-2 block">Set Next Winning Color</Label>
              <div className="grid grid-cols-3 gap-2">
                {["red", "yellow", "green"].map((c) => (
                  <button
                    key={c}
                    onClick={() => setPresetColor(c)}
                    className="rounded-xl border-2 py-3 capitalize font-semibold transition-all text-sm"
                    style={{
                      borderColor: presetColor === c ? COLOR_MAP[c] : "transparent",
                      background: COLOR_BG[c],
                      color: COLOR_MAP[c],
                      boxShadow: presetColor === c ? `0 0 12px ${COLOR_MAP[c]}44` : "none",
                    }}
                  >
                    {c}
                  </button>
                ))}
              </div>
            </div>

            <div>
              <Label className="text-xs mb-2 block">Set Next Winning Number</Label>
              <div className="grid grid-cols-5 gap-2">
                {Array.from({ length: 10 }, (_, i) => (
                  <button
                    key={i}
                    onClick={() => setPresetNumber(i)}
                    className="rounded-xl border-2 py-2 text-center font-bold text-lg transition-all"
                    style={{
                      borderColor: presetNumber === i ? "#6366f1" : "transparent",
                      background: presetNumber === i ? "#6366f122" : "var(--muted)",
                      color: presetNumber === i ? "#6366f1" : undefined,
                    }}
                  >
                    {i}
                  </button>
                ))}
              </div>
            </div>
          </div>

          <div className="flex items-center gap-3">
            <div className="flex-1 rounded-lg border p-3 flex items-center gap-3">
              <div className="w-4 h-4 rounded-full" style={{ background: COLOR_MAP[presetColor] }} />
              <span className="font-semibold capitalize">{presetColor}</span>
              <span className="text-muted-foreground">·</span>
              <span className="font-bold text-lg">#{presetNumber}</span>
              <Badge variant="outline" className="ml-auto text-xs">Preset</Badge>
            </div>
            <Button
              onClick={handleSavePreset}
              disabled={presetMutation.isPending}
              className="shrink-0"
            >
              {presetMutation.isPending ? "Saving..." : "Save Preset"}
            </Button>
          </div>

          {preset?.currentGameId && (
            <div className="text-xs text-muted-foreground">
              Active game: <span className="font-mono font-medium">#{preset.currentGameId}</span>
            </div>
          )}
        </CardContent>
      </Card>

      {/* Live Bet Distribution */}
      {(liveBets || liveBetsLoading) && (
        <div className="grid gap-4 md:grid-cols-2">
          <Card>
            <CardHeader>
              <CardTitle className="text-base">Live Color Distribution</CardTitle>
            </CardHeader>
            <CardContent>
              {liveBetsLoading ? (
                <Skeleton className="h-[180px] w-full" />
              ) : (
                <>
                  <div className="flex items-center justify-between mb-4">
                    <span className="text-sm text-muted-foreground">Total Bets: {(liveBets as any)?.totalBets}</span>
                    <span className="text-sm font-semibold">₹{((liveBets as any)?.totalAmount || 0).toFixed(2)}</span>
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
                      <div key={d.color} className="text-center p-2 rounded" style={{ background: COLOR_BG[d.color] }}>
                        <div className="text-xs font-medium capitalize" style={{ color: COLOR_MAP[d.color] }}>{d.color}</div>
                        <div className="text-sm font-bold">₹{d.amount}</div>
                        <div className="text-xs text-muted-foreground">{d.count} bets</div>
                        <div className="text-xs" style={{ color: totalCollection - d.potentialPayout >= 0 ? "#22c55e" : "#ef4444" }}>
                          {totalCollection - d.potentialPayout >= 0 ? "+" : ""}₹{(totalCollection - d.potentialPayout).toFixed(0)}
                        </div>
                      </div>
                    ))}
                  </div>
                </>
              )}
            </CardContent>
          </Card>
          <Card>
            <CardHeader>
              <CardTitle className="text-base">Number Distribution</CardTitle>
            </CardHeader>
            <CardContent>
              {liveBetsLoading ? (
                <div className="grid grid-cols-5 gap-2">
                  {Array.from({ length: 10 }, (_, i) => <Skeleton key={i} className="h-16" />)}
                </div>
              ) : (
                <div className="grid grid-cols-5 gap-2">
                  {numberBets.map((nb) => (
                    <div
                      key={nb.number}
                      className="text-center p-2 rounded border"
                      style={{
                        borderColor: nb.number === bestNumberForAdmin ? "#22c55e" : undefined,
                        background: nb.number === bestNumberForAdmin ? "#22c55e11" : undefined,
                      }}
                    >
                      <div className="text-lg font-bold">{nb.number}</div>
                      <div className="text-xs text-muted-foreground">{nb.count}</div>
                      <div className="text-xs font-medium">₹{nb.amount}</div>
                      <div className="text-xs" style={{ color: totalCollection - nb.potentialPayout >= 0 ? "#22c55e" : "#ef4444" }}>
                        {totalCollection - nb.potentialPayout >= 0 ? "+" : ""}₹{(totalCollection - nb.potentialPayout).toFixed(0)}
                      </div>
                    </div>
                  ))}
                </div>
              )}
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
                  {((games as any)?.games || []).map((g: any) => (
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
                <Button variant="outline" onClick={() => setPage(p => p + 1)} disabled={!(games as any)?.games?.length || (games as any).games.length < 20}>Next</Button>
              </div>
            </>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
