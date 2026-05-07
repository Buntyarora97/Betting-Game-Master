import { useState, useEffect } from "react";
import { useGetGameSettings, useUpdateGameSettings, getGetGameSettingsQueryKey } from "@workspace/api-client-react";
import { useQueryClient } from "@tanstack/react-query";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Skeleton } from "@/components/ui/skeleton";
import { useToast } from "@/hooks/use-toast";
import { Settings } from "lucide-react";

export default function GameSettings() {
  const { data, isLoading } = useGetGameSettings();
  const updateMutation = useUpdateGameSettings();
  const queryClient = useQueryClient();
  const { toast } = useToast();

  const settings = data as any;

  const [form, setForm] = useState({
    minBetAmount: "10",
    maxBetAmount: "10000",
    colorMultiplier: "2",
    numberMultiplier: "9",
    bettingWindowMinutes: "5",
    minDeposit: "100",
    minWithdrawal: "100",
    signupBonus: "25",
    referrerBonus: "50",
    bettingCommission: "1",
    level2Commission: "0.5",
  });

  useEffect(() => {
    if (settings) {
      setForm({
        minBetAmount: String(settings.minBetAmount ?? 10),
        maxBetAmount: String(settings.maxBetAmount ?? 10000),
        colorMultiplier: String(settings.colorMultiplier ?? 2),
        numberMultiplier: String(settings.numberMultiplier ?? 9),
        bettingWindowMinutes: String(settings.bettingWindowMinutes ?? 5),
        minDeposit: String(settings.minDeposit ?? 100),
        minWithdrawal: String(settings.minWithdrawal ?? 100),
        signupBonus: String(settings.signupBonus ?? 25),
        referrerBonus: String(settings.referrerBonus ?? 50),
        bettingCommission: String(settings.bettingCommission ?? 1),
        level2Commission: String(settings.level2Commission ?? 0.5),
      });
    }
  }, [settings]);

  const handleSave = () => {
    const numeric = Object.fromEntries(Object.entries(form).map(([k, v]) => [k, parseFloat(v)]));
    updateMutation.mutate({ data: numeric }, {
      onSuccess: () => {
        toast({ title: "Game settings saved successfully" });
        queryClient.invalidateQueries({ queryKey: getGetGameSettingsQueryKey() });
      },
      onError: (e: any) => toast({ title: "Error", description: e.message, variant: "destructive" }),
    });
  };

  const Field = ({ label, field, hint }: { label: string; field: keyof typeof form; hint?: string }) => (
    <div className="space-y-1">
      <Label>{label}</Label>
      <Input
        type="number"
        value={form[field]}
        onChange={e => setForm(prev => ({ ...prev, [field]: e.target.value }))}
      />
      {hint && <p className="text-xs text-muted-foreground">{hint}</p>}
    </div>
  );

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <h2 className="text-3xl font-bold tracking-tight">Game Settings</h2>
        <Button onClick={handleSave} disabled={updateMutation.isPending}>
          {updateMutation.isPending ? "Saving..." : "Save All Settings"}
        </Button>
      </div>

      {isLoading ? (
        <div className="space-y-4">{[1,2,3].map(i => <Skeleton key={i} className="h-20 w-full" />)}</div>
      ) : (
        <div className="grid gap-6 md:grid-cols-2">
          <Card>
            <CardHeader><CardTitle className="flex items-center gap-2"><Settings className="w-4 h-4" />Betting Limits</CardTitle></CardHeader>
            <CardContent className="space-y-4">
              <Field label="Minimum Bet Amount (₹)" field="minBetAmount" />
              <Field label="Maximum Bet Amount (₹)" field="maxBetAmount" />
              <Field label="Betting Window (minutes)" field="bettingWindowMinutes" hint="Time before game closes for bets" />
            </CardContent>
          </Card>

          <Card>
            <CardHeader><CardTitle>Multipliers</CardTitle></CardHeader>
            <CardContent className="space-y-4">
              <Field label="Color Bet Multiplier" field="colorMultiplier" hint="Win multiplier for correct color (e.g. 2 = 2x)" />
              <Field label="Number Bet Multiplier" field="numberMultiplier" hint="Win multiplier for correct number (e.g. 9 = 9x)" />
            </CardContent>
          </Card>

          <Card>
            <CardHeader><CardTitle>Deposits & Withdrawals</CardTitle></CardHeader>
            <CardContent className="space-y-4">
              <Field label="Minimum Deposit (₹)" field="minDeposit" />
              <Field label="Minimum Withdrawal (₹)" field="minWithdrawal" />
            </CardContent>
          </Card>

          <Card>
            <CardHeader><CardTitle>Bonuses & Commission</CardTitle></CardHeader>
            <CardContent className="space-y-4">
              <Field label="Signup Bonus (₹)" field="signupBonus" hint="Given to new user on registration" />
              <Field label="Referrer Bonus (₹)" field="referrerBonus" hint="Given to referrer when referee deposits" />
              <Field label="Betting Commission (%)" field="bettingCommission" hint="Level 1 referral commission on bets" />
              <Field label="Level 2 Commission (%)" field="level2Commission" hint="Level 2 referral commission on bets" />
            </CardContent>
          </Card>
        </div>
      )}
    </div>
  );
}
