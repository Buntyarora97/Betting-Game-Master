import React, { useState, useEffect, useRef } from "react";
import {
  View,
  Text,
  TouchableOpacity,
  StyleSheet,
  ScrollView,
  Alert,
  Animated,
  RefreshControl,
  Platform,
  Dimensions,
} from "react-native";
import { LinearGradient } from "expo-linear-gradient";
import { useGetCurrentGame, usePlaceBet, useGetGameResults, useGetWallet } from "@workspace/api-client-react";
import { useAuth } from "@/contexts/AuthContext";
import { useColors } from "@/hooks/useColors";
import * as Haptics from "expo-haptics";

const { width } = Dimensions.get("window");

const COLORS = ["red", "yellow", "green"] as const;
const NUMBERS = [0, 1, 2, 3, 4, 5, 6, 7, 8, 9];

const COLOR_HEX: Record<string, string> = {
  red: "#E53935",
  yellow: "#FBC02D",
  green: "#43A047",
};

const COLOR_GRADIENT: Record<string, [string, string]> = {
  red: ["#B71C1C", "#E53935"],
  yellow: ["#F57F17", "#FBC02D"],
  green: ["#1B5E20", "#43A047"],
};

const COLOR_LABEL: Record<string, string> = {
  red: "Red",
  yellow: "Yellow",
  green: "Green",
};

function Countdown({ seconds }: { seconds: number }) {
  const [timeLeft, setTimeLeft] = useState(seconds);
  const pulseAnim = useRef(new Animated.Value(1)).current;

  useEffect(() => {
    setTimeLeft(seconds);
  }, [seconds]);

  useEffect(() => {
    if (timeLeft <= 0) return;
    const t = setInterval(() => setTimeLeft((s) => Math.max(0, s - 1)), 1000);
    return () => clearInterval(t);
  }, [timeLeft]);

  useEffect(() => {
    if (timeLeft < 30 && timeLeft > 0) {
      const pulse = Animated.loop(
        Animated.sequence([
          Animated.timing(pulseAnim, { toValue: 1.04, duration: 500, useNativeDriver: true }),
          Animated.timing(pulseAnim, { toValue: 1, duration: 500, useNativeDriver: true }),
        ])
      );
      pulse.start();
      return () => pulse.stop();
    }
  }, [timeLeft < 30]);

  const h = Math.floor(timeLeft / 3600);
  const m = Math.floor((timeLeft % 3600) / 60);
  const s = timeLeft % 60;
  const isUrgent = timeLeft < 300;
  const isCritical = timeLeft < 30;

  return (
    <Animated.View style={{ alignItems: "center", transform: [{ scale: pulseAnim }] }}>
      <Text style={[styles.countdownLabel, isUrgent && { color: "#E53935" }]}>
        {isCritical ? "⚡ BETTING CLOSES SOON" : "NEXT GAME IN"}
      </Text>
      <View style={styles.timerRow}>
        {[
          { val: h, unit: "HRS" },
          { val: m, unit: "MIN" },
          { val: s, unit: "SEC" },
        ].map((item, i) => (
          <React.Fragment key={item.unit}>
            {i > 0 && (
              <Text style={[styles.timerSep, isCritical && { color: "#E53935" }]}>:</Text>
            )}
            <View style={[styles.timerBlock, isCritical && styles.timerBlockUrgent]}>
              <Text style={[styles.timerNum, isCritical && { color: "#E53935" }]}>
                {String(item.val).padStart(2, "0")}
              </Text>
              <Text style={styles.timerUnit}>{item.unit}</Text>
            </View>
          </React.Fragment>
        ))}
      </View>
    </Animated.View>
  );
}

export default function HomeScreen() {
  const colors = useColors();
  const { user, isAuthenticated } = useAuth();

  const [selectedColor, setSelectedColor] = useState<string | null>(null);
  const [selectedNumber, setSelectedNumber] = useState<number | null>(null);
  const [amount, setAmount] = useState<number>(100);
  const [refreshing, setRefreshing] = useState(false);

  const headerAnim = useRef(new Animated.Value(0)).current;

  useEffect(() => {
    Animated.timing(headerAnim, { toValue: 1, duration: 700, useNativeDriver: true }).start();
  }, []);

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

    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);

    Alert.alert(
      "Confirm Bet",
      `Place ₹${amount} on ${type === "color" ? COLOR_LABEL[String(value)] : `Number ${value}`}?`,
      [
        { text: "Cancel", style: "cancel" },
        {
          text: "Confirm & Bet",
          onPress: async () => {
            Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
            try {
              await placeBetMutation.mutateAsync({
                data: { gameId, betType: type, selection: String(value), amount },
              });
              Alert.alert("✓ Bet Placed!", `₹${amount} on ${type === "color" ? COLOR_LABEL[String(value)] : `Number ${value}`}`);
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

  return (
    <ScrollView
      style={{ flex: 1, backgroundColor: "#0A0C10" }}
      contentContainerStyle={{ paddingBottom: 120 }}
      showsVerticalScrollIndicator={false}
      refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} tintColor="#D4AF37" />}
    >
      {/* Hero Banner */}
      <LinearGradient
        colors={["#12151E", "#1A1D28", "#0A0C10"]}
        style={styles.heroBanner}
      >
        <Animated.View style={{ opacity: headerAnim }}>
          <View style={styles.headerRow}>
            <View>
              <Text style={styles.helloText}>Hello,</Text>
              <Text style={styles.nameText}>{user?.name?.split(" ")[0] || "Player"} 👋</Text>
            </View>
            <LinearGradient
              colors={["#D4AF37", "#A07820"]}
              start={{ x: 0, y: 0 }}
              end={{ x: 1, y: 1 }}
              style={styles.walletChip}
            >
              <Text style={styles.walletLabel}>BALANCE</Text>
              <Text style={styles.walletValue}>₹{Number(wallet?.balance || user?.walletBalance || 0).toFixed(2)}</Text>
            </LinearGradient>
          </View>
        </Animated.View>

        {/* Timer Card */}
        <View style={styles.timerCard}>
          <LinearGradient
            colors={["#1A1D28", "#12151E"]}
            style={styles.timerGradient}
          >
            <Countdown seconds={game?.secondsUntilNext || 0} />
            <View style={styles.scheduleRow}>
              {(game?.schedule || ["9:00", "13:00", "17:00", "21:00"]).map((t: string) => (
                <View key={t} style={styles.scheduleChip}>
                  <Text style={styles.scheduleTime}>{t}</Text>
                </View>
              ))}
            </View>
          </LinearGradient>
        </View>
      </LinearGradient>

      <View style={styles.body}>
        {/* Amount Selection */}
        <View style={styles.sectionHeader}>
          <View style={styles.sectionDot} />
          <Text style={styles.sectionTitle}>Select Amount</Text>
        </View>
        <ScrollView horizontal showsHorizontalScrollIndicator={false} style={{ marginBottom: 20 }}>
          <View style={styles.amountRow}>
            {AMOUNTS.map((a) => (
              <TouchableOpacity
                key={a}
                onPress={() => { setAmount(a); Haptics.selectionAsync(); }}
                activeOpacity={0.8}
              >
                {amount === a ? (
                  <LinearGradient
                    colors={["#D4AF37", "#A07820"]}
                    start={{ x: 0, y: 0 }}
                    end={{ x: 1, y: 1 }}
                    style={styles.amountChipActive}
                  >
                    <Text style={styles.amountTextActive}>₹{a}</Text>
                  </LinearGradient>
                ) : (
                  <View style={styles.amountChip}>
                    <Text style={styles.amountText}>₹{a}</Text>
                  </View>
                )}
              </TouchableOpacity>
            ))}
          </View>
        </ScrollView>

        {/* Color Betting */}
        <View style={styles.sectionHeader}>
          <View style={styles.sectionDot} />
          <View>
            <Text style={styles.sectionTitle}>Bet on Color</Text>
            <Text style={styles.sectionSub}>Win 2× your bet amount</Text>
          </View>
        </View>
        <View style={styles.colorRow}>
          {COLORS.map((c) => (
            <TouchableOpacity
              key={c}
              onPress={() => {
                setSelectedColor(selectedColor === c ? null : c);
                handleBet("color", c);
              }}
              activeOpacity={0.85}
              style={{ flex: 1 }}
            >
              <LinearGradient
                colors={COLOR_GRADIENT[c]}
                start={{ x: 0, y: 0 }}
                end={{ x: 0, y: 1 }}
                style={[styles.colorBtn, selectedColor === c && styles.colorBtnSelected]}
              >
                <View style={[styles.colorCircle, { borderColor: `${COLOR_HEX[c]}88` }]}>
                  <View style={[styles.colorCircleInner, { backgroundColor: COLOR_HEX[c] }]} />
                </View>
                <Text style={styles.colorLabel}>{COLOR_LABEL[c]}</Text>
                <View style={styles.multBadge}>
                  <Text style={styles.multText}>2×</Text>
                </View>
              </LinearGradient>
            </TouchableOpacity>
          ))}
        </View>

        {/* Number Betting */}
        <View style={[styles.sectionHeader, { marginTop: 4 }]}>
          <View style={styles.sectionDot} />
          <View>
            <Text style={styles.sectionTitle}>Bet on Number</Text>
            <Text style={styles.sectionSub}>Win 9× your bet amount</Text>
          </View>
        </View>
        <View style={styles.numberGrid}>
          {NUMBERS.map((n) => (
            <TouchableOpacity
              key={n}
              onPress={() => {
                setSelectedNumber(selectedNumber === n ? null : n);
                handleBet("number", n);
              }}
              activeOpacity={0.8}
              style={styles.numberBtnWrapper}
            >
              {selectedNumber === n ? (
                <LinearGradient
                  colors={["#D4AF37", "#A07820"]}
                  style={styles.numberBtnActive}
                >
                  <Text style={styles.numberTextActive}>{n}</Text>
                </LinearGradient>
              ) : (
                <View style={styles.numberBtn}>
                  <Text style={styles.numberText}>{n}</Text>
                </View>
              )}
            </TouchableOpacity>
          ))}
        </View>

        {/* Recent Results */}
        <View style={styles.sectionHeader}>
          <View style={styles.sectionDot} />
          <Text style={styles.sectionTitle}>Recent Results</Text>
        </View>
        {results.length === 0 ? (
          <View style={styles.emptyResults}>
            <Text style={styles.emptyText}>No results yet — be the first to play!</Text>
          </View>
        ) : (
          <ScrollView horizontal showsHorizontalScrollIndicator={false} style={{ marginBottom: 8 }}>
            <View style={styles.resultsRow}>
              {results.slice(0, 20).map((r: any) => (
                <View key={r.id} style={styles.resultBadge}>
                  <View style={[styles.resultDot, { backgroundColor: COLOR_HEX[r.winningColor] || "#888" }]} />
                  <Text style={styles.resultNum}>{r.winningNumber}</Text>
                </View>
              ))}
            </View>
          </ScrollView>
        )}
      </View>
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  heroBanner: {
    paddingTop: Platform.OS === "web" ? 80 : 52,
    paddingHorizontal: 16,
    paddingBottom: 16,
  },
  headerRow: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    marginBottom: 16,
  },
  helloText: {
    fontSize: 14,
    color: "#8B8FA8",
    fontFamily: "Inter_400Regular",
  },
  nameText: {
    fontSize: 22,
    fontFamily: "Inter_700Bold",
    color: "#F0EAD6",
    marginTop: 2,
  },
  walletChip: {
    borderRadius: 12,
    paddingHorizontal: 14,
    paddingVertical: 8,
    alignItems: "center",
  },
  walletLabel: {
    fontSize: 9,
    color: "rgba(10,12,16,0.7)",
    fontFamily: "Inter_600SemiBold",
    letterSpacing: 1,
  },
  walletValue: {
    fontSize: 16,
    fontFamily: "Inter_700Bold",
    color: "#0A0C10",
  },
  timerCard: {
    borderRadius: 18,
    overflow: "hidden",
    borderWidth: 1,
    borderColor: "rgba(212,175,55,0.15)",
  },
  timerGradient: {
    padding: 18,
    alignItems: "center",
  },
  countdownLabel: {
    fontSize: 11,
    color: "#8B8FA8",
    fontFamily: "Inter_600SemiBold",
    letterSpacing: 2,
    marginBottom: 10,
  },
  timerRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 6,
  },
  timerBlock: {
    backgroundColor: "#242840",
    borderRadius: 10,
    paddingHorizontal: 14,
    paddingVertical: 8,
    minWidth: 60,
    alignItems: "center",
    borderWidth: 1,
    borderColor: "#303560",
  },
  timerBlockUrgent: {
    borderColor: "#E53935",
    backgroundColor: "#2A1018",
  },
  timerNum: {
    fontSize: 34,
    fontFamily: "Inter_700Bold",
    color: "#F0EAD6",
  },
  timerUnit: {
    fontSize: 9,
    color: "#8B8FA8",
    fontFamily: "Inter_500Medium",
    marginTop: 2,
    letterSpacing: 1,
  },
  timerSep: {
    fontSize: 28,
    fontFamily: "Inter_700Bold",
    color: "#8B8FA8",
    marginBottom: 8,
  },
  scheduleRow: {
    flexDirection: "row",
    gap: 8,
    marginTop: 14,
    flexWrap: "wrap",
    justifyContent: "center",
  },
  scheduleChip: {
    backgroundColor: "rgba(212,175,55,0.1)",
    borderRadius: 6,
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderWidth: 1,
    borderColor: "rgba(212,175,55,0.2)",
  },
  scheduleTime: {
    fontSize: 11,
    color: "#D4AF37",
    fontFamily: "Inter_500Medium",
  },
  body: {
    paddingHorizontal: 16,
    paddingTop: 16,
  },
  sectionHeader: {
    flexDirection: "row",
    alignItems: "flex-start",
    gap: 10,
    marginBottom: 12,
  },
  sectionDot: {
    width: 3,
    height: 18,
    borderRadius: 2,
    backgroundColor: "#D4AF37",
    marginTop: 2,
  },
  sectionTitle: {
    fontSize: 16,
    fontFamily: "Inter_700Bold",
    color: "#F0EAD6",
  },
  sectionSub: {
    fontSize: 12,
    color: "#8B8FA8",
    fontFamily: "Inter_400Regular",
    marginTop: 1,
  },
  amountRow: {
    flexDirection: "row",
    gap: 8,
    paddingRight: 16,
  },
  amountChip: {
    paddingHorizontal: 18,
    paddingVertical: 10,
    borderRadius: 22,
    backgroundColor: "#12151E",
    borderWidth: 1,
    borderColor: "#242840",
  },
  amountChipActive: {
    paddingHorizontal: 18,
    paddingVertical: 10,
    borderRadius: 22,
  },
  amountText: {
    fontSize: 14,
    color: "#8B8FA8",
    fontFamily: "Inter_600SemiBold",
  },
  amountTextActive: {
    fontSize: 14,
    color: "#0A0C10",
    fontFamily: "Inter_700Bold",
  },
  colorRow: {
    flexDirection: "row",
    gap: 10,
    marginBottom: 24,
  },
  colorBtn: {
    borderRadius: 16,
    padding: 16,
    alignItems: "center",
    borderWidth: 2,
    borderColor: "transparent",
  },
  colorBtnSelected: {
    borderColor: "#D4AF37",
  },
  colorCircle: {
    width: 38,
    height: 38,
    borderRadius: 19,
    borderWidth: 2,
    justifyContent: "center",
    alignItems: "center",
    marginBottom: 8,
    backgroundColor: "rgba(255,255,255,0.1)",
  },
  colorCircleInner: {
    width: 22,
    height: 22,
    borderRadius: 11,
  },
  colorLabel: {
    fontSize: 13,
    fontFamily: "Inter_700Bold",
    color: "#fff",
    marginBottom: 6,
  },
  multBadge: {
    backgroundColor: "rgba(255,255,255,0.2)",
    borderRadius: 8,
    paddingHorizontal: 8,
    paddingVertical: 3,
  },
  multText: {
    fontSize: 12,
    color: "#fff",
    fontFamily: "Inter_700Bold",
  },
  numberGrid: {
    flexDirection: "row",
    flexWrap: "wrap",
    gap: 10,
    marginBottom: 24,
  },
  numberBtnWrapper: {
    width: "17%",
    aspectRatio: 1,
  },
  numberBtn: {
    flex: 1,
    borderRadius: 14,
    backgroundColor: "#12151E",
    alignItems: "center",
    justifyContent: "center",
    borderWidth: 1,
    borderColor: "#242840",
  },
  numberBtnActive: {
    flex: 1,
    borderRadius: 14,
    alignItems: "center",
    justifyContent: "center",
  },
  numberText: {
    fontSize: 22,
    fontFamily: "Inter_700Bold",
    color: "#F0EAD6",
  },
  numberTextActive: {
    fontSize: 22,
    fontFamily: "Inter_700Bold",
    color: "#0A0C10",
  },
  emptyResults: {
    paddingVertical: 20,
    alignItems: "center",
    backgroundColor: "#12151E",
    borderRadius: 14,
    borderWidth: 1,
    borderColor: "#242840",
  },
  emptyText: {
    fontSize: 13,
    color: "#8B8FA8",
    fontFamily: "Inter_400Regular",
  },
  resultsRow: {
    flexDirection: "row",
    gap: 8,
    paddingRight: 16,
    paddingBottom: 8,
  },
  resultBadge: {
    backgroundColor: "#12151E",
    borderRadius: 12,
    padding: 10,
    alignItems: "center",
    borderWidth: 1,
    borderColor: "#242840",
    minWidth: 54,
  },
  resultDot: {
    width: 18,
    height: 18,
    borderRadius: 9,
    marginBottom: 4,
    shadowColor: "#fff",
    shadowOpacity: 0.2,
    shadowRadius: 4,
  },
  resultNum: {
    fontSize: 16,
    fontFamily: "Inter_700Bold",
    color: "#F0EAD6",
  },
});
