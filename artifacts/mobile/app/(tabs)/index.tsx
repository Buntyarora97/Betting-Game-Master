import React, { useState, useEffect } from "react";
import {
  View,
  Text,
  TouchableOpacity,
  StyleSheet,
  ScrollView,
  Alert,
  ActivityIndicator,
  RefreshControl,
} from "react-native";
import { useGetCurrentGame, usePlaceBet, useGetGameResults, useGetWallet } from "@workspace/api-client-react";
import { useAuth } from "@/contexts/AuthContext";
import { useColors } from "@/hooks/useColors";
import * as Haptics from "expo-haptics";

const COLORS = ["red", "yellow", "green"] as const;
const NUMBERS = [0, 1, 2, 3, 4, 5, 6, 7, 8, 9];

const COLOR_HEX: Record<string, string> = {
  red: "#D32F2F",
  yellow: "#FBC02D",
  green: "#2E7D32",
};

const COLOR_LABEL: Record<string, string> = {
  red: "Red",
  yellow: "Yellow",
  green: "Green",
};

function Countdown({ seconds }: { seconds: number }) {
  const [timeLeft, setTimeLeft] = useState(seconds);
  const colors = useColors();

  useEffect(() => {
    setTimeLeft(seconds);
  }, [seconds]);

  useEffect(() => {
    if (timeLeft <= 0) return;
    const t = setInterval(() => setTimeLeft((s) => Math.max(0, s - 1)), 1000);
    return () => clearInterval(t);
  }, [timeLeft]);

  const h = Math.floor(timeLeft / 3600);
  const m = Math.floor((timeLeft % 3600) / 60);
  const s = timeLeft % 60;
  const isUrgent = timeLeft < 300;

  const s2 = StyleSheet.create({
    container: { alignItems: "center", paddingVertical: 8 },
    label: { fontSize: 12, color: colors.mutedForeground, fontFamily: "Inter_400Regular", marginBottom: 4, letterSpacing: 1.5, textTransform: "uppercase" as const },
    timer: { flexDirection: "row" as const, alignItems: "center", gap: 2 },
    block: {
      backgroundColor: colors.card,
      borderRadius: 8,
      paddingHorizontal: 12,
      paddingVertical: 8,
      minWidth: 52,
      alignItems: "center",
    },
    num: { fontSize: 32, fontFamily: "Inter_700Bold", color: isUrgent ? "#D32F2F" : colors.foreground },
    sep: { fontSize: 28, fontFamily: "Inter_700Bold", color: colors.mutedForeground, marginBottom: 4 },
    unit: { fontSize: 10, color: colors.mutedForeground, fontFamily: "Inter_400Regular", marginTop: 2 },
  });

  return (
    <View style={s2.container}>
      <Text style={s2.label}>Next Game In</Text>
      <View style={s2.timer}>
        <View style={s2.block}>
          <Text style={s2.num}>{String(h).padStart(2, "0")}</Text>
          <Text style={s2.unit}>HRS</Text>
        </View>
        <Text style={s2.sep}>:</Text>
        <View style={s2.block}>
          <Text style={s2.num}>{String(m).padStart(2, "0")}</Text>
          <Text style={s2.unit}>MIN</Text>
        </View>
        <Text style={s2.sep}>:</Text>
        <View style={s2.block}>
          <Text style={s2.num}>{String(s).padStart(2, "0")}</Text>
          <Text style={s2.unit}>SEC</Text>
        </View>
      </View>
    </View>
  );
}

export default function HomeScreen() {
  const colors = useColors();
  const { user, isAuthenticated } = useAuth();

  const [selectedColor, setSelectedColor] = useState<string | null>(null);
  const [selectedNumber, setSelectedNumber] = useState<number | null>(null);
  const [amount, setAmount] = useState<number>(100);
  const [refreshing, setRefreshing] = useState(false);

  const { data: gameData, refetch: refetchGame } = useGetCurrentGame({
    query: { refetchInterval: 10000 },
  });

  const { data: walletData, refetch: refetchWallet } = useGetWallet({
    query: { enabled: isAuthenticated },
  });

  const { data: resultsData } = useGetGameResults({ page: 1 });

  const placeBetMutation = usePlaceBet();

  const game = gameData as any;
  const wallet = walletData as any;
  const results = (resultsData as any)?.results || [];

  const AMOUNTS = [50, 100, 200, 500, 1000];

  const handleBet = async (type: "color" | "number", value: string | number) => {
    if (!isAuthenticated) {
      Alert.alert("Login Required", "Please login to place bets");
      return;
    }
    if (!game?.currentGame && !game?.nextGameAt) {
      Alert.alert("No Game", "No game available right now");
      return;
    }

    const gameId = game?.currentGame?.id;
    if (!gameId) {
      Alert.alert("Game Not Live", "Betting opens when the game goes live");
      return;
    }

    const balance = Number(wallet?.balance || 0);
    if (balance < amount) {
      Alert.alert("Insufficient Balance", `You need ₹${amount} but have ₹${balance.toFixed(2)}`);
      return;
    }

    Alert.alert(
      "Confirm Bet",
      `Place ₹${amount} on ${type === "color" ? COLOR_LABEL[String(value)] : `Number ${value}`}?`,
      [
        { text: "Cancel", style: "cancel" },
        {
          text: "Confirm",
          onPress: async () => {
            Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
            try {
              await placeBetMutation.mutateAsync({
                data: {
                  gameId,
                  betType: type,
                  selection: String(value),
                  amount,
                },
              });
              Alert.alert("Bet Placed!", `₹${amount} on ${type === "color" ? COLOR_LABEL[String(value)] : `Number ${value}`}`);
              setSelectedColor(null);
              setSelectedNumber(null);
              refetchWallet();
            } catch (e: any) {
              Alert.alert("Error", e?.data?.message || e?.message || "Bet failed");
            }
          },
        },
      ]
    );
  };

  const onRefresh = async () => {
    setRefreshing(true);
    await Promise.all([refetchGame(), refetchWallet()]);
    setRefreshing(false);
  };

  const s = makeStyles(colors);

  return (
    <ScrollView
      style={s.root}
      contentContainerStyle={s.scroll}
      showsVerticalScrollIndicator={false}
      refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} tintColor={colors.primary} />}
    >
      {/* Header */}
      <View style={s.header}>
        <Text style={s.greeting}>Hello, {user?.name?.split(" ")[0] || "Player"}</Text>
        <View style={s.walletChip}>
          <Text style={s.walletLabel}>Balance</Text>
          <Text style={s.walletValue}>₹{Number(wallet?.balance || user?.walletBalance || 0).toFixed(2)}</Text>
        </View>
      </View>

      {/* Game Timer Card */}
      <View style={s.timerCard}>
        <Countdown seconds={game?.secondsUntilNext || 0} />
        <View style={s.schedule}>
          {(game?.schedule || ["9:00", "13:00", "17:00", "21:00"]).map((t: string) => (
            <View key={t} style={s.scheduleItem}>
              <Text style={s.scheduleTime}>{t}</Text>
            </View>
          ))}
        </View>
      </View>

      {/* Amount Selection */}
      <Text style={s.sectionTitle}>Select Amount</Text>
      <View style={s.amountRow}>
        {AMOUNTS.map((a) => (
          <TouchableOpacity
            key={a}
            style={[s.amountChip, amount === a && s.amountChipActive]}
            onPress={() => { setAmount(a); Haptics.selectionAsync(); }}
          >
            <Text style={[s.amountText, amount === a && s.amountTextActive]}>₹{a}</Text>
          </TouchableOpacity>
        ))}
      </View>

      {/* Color Betting */}
      <Text style={s.sectionTitle}>Bet on Color</Text>
      <Text style={s.sectionSub}>Win 2x your bet</Text>
      <View style={s.colorRow}>
        {COLORS.map((c) => (
          <TouchableOpacity
            key={c}
            style={[s.colorBtn, { backgroundColor: COLOR_HEX[c] }, selectedColor === c && s.colorBtnSelected]}
            onPress={() => {
              setSelectedColor(selectedColor === c ? null : c);
              handleBet("color", c);
            }}
            activeOpacity={0.8}
          >
            <View style={[s.colorCircle, { backgroundColor: COLOR_HEX[c] }]} />
            <Text style={s.colorText}>{COLOR_LABEL[c]}</Text>
            <Text style={s.colorMult}>2x</Text>
          </TouchableOpacity>
        ))}
      </View>

      {/* Number Betting */}
      <Text style={s.sectionTitle}>Bet on Number</Text>
      <Text style={s.sectionSub}>Win 9x your bet</Text>
      <View style={s.numberGrid}>
        {NUMBERS.map((n) => (
          <TouchableOpacity
            key={n}
            style={[s.numberBtn, selectedNumber === n && s.numberBtnSelected]}
            onPress={() => {
              setSelectedNumber(selectedNumber === n ? null : n);
              handleBet("number", n);
            }}
            activeOpacity={0.8}
          >
            <Text style={[s.numberText, selectedNumber === n && s.numberTextSelected]}>{n}</Text>
          </TouchableOpacity>
        ))}
      </View>

      {/* Recent Results */}
      <Text style={s.sectionTitle}>Recent Results</Text>
      {results.length === 0 ? (
        <View style={s.emptyResults}>
          <Text style={s.emptyText}>No results yet. First game today!</Text>
        </View>
      ) : (
        <ScrollView horizontal showsHorizontalScrollIndicator={false} style={s.resultsScroll}>
          {results.slice(0, 20).map((r: any) => (
            <View key={r.id} style={s.resultBadge}>
              <View style={[s.resultDot, { backgroundColor: COLOR_HEX[r.winningColor] || "#888" }]} />
              <Text style={s.resultNum}>{r.winningNumber}</Text>
            </View>
          ))}
        </ScrollView>
      )}
    </ScrollView>
  );
}

function makeStyles(colors: any) {
  return StyleSheet.create({
    root: { flex: 1, backgroundColor: colors.background },
    scroll: { paddingHorizontal: 16, paddingBottom: 120, paddingTop: Platform.OS === "web" ? 67 : 16 },
    header: { flexDirection: "row" as const, justifyContent: "space-between", alignItems: "center", marginBottom: 16 },
    greeting: { fontSize: 22, fontFamily: "Inter_700Bold", color: colors.foreground },
    walletChip: { backgroundColor: colors.card, borderRadius: 10, paddingHorizontal: 12, paddingVertical: 6, borderWidth: 1, borderColor: colors.border },
    walletLabel: { fontSize: 10, color: colors.mutedForeground, fontFamily: "Inter_400Regular" },
    walletValue: { fontSize: 15, fontFamily: "Inter_700Bold", color: colors.primary },
    timerCard: { backgroundColor: colors.card, borderRadius: 16, padding: 20, marginBottom: 20, borderWidth: 1, borderColor: colors.border },
    schedule: { flexDirection: "row" as const, justifyContent: "center", gap: 8, marginTop: 12, flexWrap: "wrap" as const },
    scheduleItem: { backgroundColor: colors.secondary, borderRadius: 6, paddingHorizontal: 10, paddingVertical: 4 },
    scheduleTime: { fontSize: 11, color: colors.mutedForeground, fontFamily: "Inter_500Medium" },
    sectionTitle: { fontSize: 16, fontFamily: "Inter_700Bold", color: colors.foreground, marginBottom: 4 },
    sectionSub: { fontSize: 12, color: colors.mutedForeground, fontFamily: "Inter_400Regular", marginBottom: 12 },
    amountRow: { flexDirection: "row" as const, gap: 8, marginBottom: 20, flexWrap: "wrap" as const },
    amountChip: { paddingHorizontal: 16, paddingVertical: 8, borderRadius: 20, backgroundColor: colors.card, borderWidth: 1, borderColor: colors.border },
    amountChipActive: { backgroundColor: colors.primary, borderColor: colors.primary },
    amountText: { fontSize: 14, color: colors.mutedForeground, fontFamily: "Inter_500Medium" },
    amountTextActive: { color: "#fff" },
    colorRow: { flexDirection: "row" as const, gap: 10, marginBottom: 24 },
    colorBtn: { flex: 1, borderRadius: 14, padding: 14, alignItems: "center", opacity: 0.9, borderWidth: 2, borderColor: "transparent" },
    colorBtnSelected: { borderColor: "#fff", opacity: 1 },
    colorCircle: { width: 28, height: 28, borderRadius: 14, marginBottom: 6, borderWidth: 2, borderColor: "rgba(255,255,255,0.3)" },
    colorText: { fontSize: 13, fontFamily: "Inter_600SemiBold", color: "#fff" },
    colorMult: { fontSize: 11, color: "rgba(255,255,255,0.8)", fontFamily: "Inter_400Regular", marginTop: 2 },
    numberGrid: { flexDirection: "row" as const, flexWrap: "wrap" as const, gap: 8, marginBottom: 24 },
    numberBtn: { width: "18%" as any, aspectRatio: 1, borderRadius: 12, backgroundColor: colors.card, alignItems: "center", justifyContent: "center", borderWidth: 1, borderColor: colors.border },
    numberBtnSelected: { backgroundColor: colors.primary, borderColor: colors.primary },
    numberText: { fontSize: 22, fontFamily: "Inter_700Bold", color: colors.foreground },
    numberTextSelected: { color: "#fff" },
    emptyResults: { paddingVertical: 20, alignItems: "center" },
    emptyText: { fontSize: 14, color: colors.mutedForeground, fontFamily: "Inter_400Regular" },
    resultsScroll: { marginBottom: 16 },
    resultBadge: { backgroundColor: colors.card, borderRadius: 10, padding: 10, marginRight: 8, alignItems: "center", borderWidth: 1, borderColor: colors.border, minWidth: 52 },
    resultDot: { width: 16, height: 16, borderRadius: 8, marginBottom: 4 },
    resultNum: { fontSize: 16, fontFamily: "Inter_700Bold", color: colors.foreground },
  });
}

import { Platform } from "react-native";
