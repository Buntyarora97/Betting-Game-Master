import React, { useState } from "react";
import {
  View,
  Text,
  StyleSheet,
  FlatList,
  RefreshControl,
  Platform,
} from "react-native";
import { LinearGradient } from "expo-linear-gradient";
import { useGetUserBets, getGetUserBetsQueryKey } from "@workspace/api-client-react";
import { useAuth } from "@/contexts/AuthContext";
import { useColors } from "@/hooks/useColors";
import { format } from "date-fns";

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

const STATUS_CONFIG: Record<string, { color: string; bg: string; label: string }> = {
  won: { color: "#43A047", bg: "#43A04720", label: "WON" },
  lost: { color: "#E53935", bg: "#E5393520", label: "LOST" },
  pending: { color: "#FBC02D", bg: "#FBC02D20", label: "PENDING" },
};

interface Bet {
  id: number;
  gameId: number;
  betType: string;
  selection: string;
  amount: number;
  potentialWin: number;
  status: string;
  createdAt: string;
}

export default function BetsScreen() {
  const colors = useColors();
  const { isAuthenticated } = useAuth();
  const [page, setPage] = useState(1);
  const [refreshing, setRefreshing] = useState(false);

  const { data, refetch } = useGetUserBets(
    { page, limit: 20 },
    { query: { enabled: isAuthenticated, queryKey: getGetUserBetsQueryKey({ page, limit: 20 }) } }
  );

  const bets = (data as any)?.bets || [];

  const onRefresh = async () => {
    setRefreshing(true);
    await refetch();
    setRefreshing(false);
  };

  if (!isAuthenticated) {
    return (
      <View style={styles.center}>
        <Text style={styles.emptyIcon}>🎮</Text>
        <Text style={styles.emptyTitle}>Login to view your bets</Text>
      </View>
    );
  }

  const renderBet = ({ item: bet }: { item: Bet }) => {
    const isColor = bet.betType === "color";
    const statusCfg = STATUS_CONFIG[bet.status] || { color: "#8B8FA8", bg: "#1A1D28", label: bet.status.toUpperCase() };

    return (
      <View style={styles.betCard}>
        <View style={styles.betLeft}>
          {isColor ? (
            <LinearGradient
              colors={COLOR_GRADIENT[bet.selection] || ["#333", "#555"]}
              style={styles.colorDot}
            >
              <View style={styles.colorDotInner} />
            </LinearGradient>
          ) : (
            <LinearGradient colors={["#D4AF37", "#A07820"]} style={styles.numberBox}>
              <Text style={styles.numberText}>{bet.selection}</Text>
            </LinearGradient>
          )}
          <View style={styles.betInfo}>
            <Text style={styles.betType}>
              {isColor
                ? bet.selection.charAt(0).toUpperCase() + bet.selection.slice(1)
                : `Number ${bet.selection}`}
            </Text>
            <Text style={styles.betDate}>{format(new Date(bet.createdAt), "dd MMM · HH:mm")}</Text>
            <Text style={styles.betGame}>Game #{bet.gameId}</Text>
          </View>
        </View>
        <View style={styles.betRight}>
          <Text style={styles.betAmount}>₹{Number(bet.amount).toFixed(0)}</Text>
          {bet.status === "won" && (
            <Text style={styles.wonAmount}>+₹{Number(bet.potentialWin).toFixed(0)}</Text>
          )}
          <View style={[styles.statusBadge, { backgroundColor: statusCfg.bg }]}>
            <Text style={[styles.statusText, { color: statusCfg.color }]}>{statusCfg.label}</Text>
          </View>
        </View>
      </View>
    );
  };

  return (
    <View style={styles.root}>
      <FlatList
        data={bets}
        keyExtractor={(item) => String(item.id)}
        renderItem={renderBet}
        contentContainerStyle={styles.list}
        showsVerticalScrollIndicator={false}
        refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} tintColor="#D4AF37" />}
        ListEmptyComponent={
          <View style={styles.emptyCard}>
            <Text style={styles.emptyIcon}>🎯</Text>
            <Text style={styles.emptyTitle}>No bets yet</Text>
            <Text style={styles.emptySubtitle}>Place your first bet on the Home tab</Text>
          </View>
        }
        ListHeaderComponent={
          <View style={styles.pageHeader}>
            <Text style={styles.pageTitle}>My Bets</Text>
            <View style={styles.betCountBadge}>
              <Text style={styles.betCount}>{bets.length} bets</Text>
            </View>
          </View>
        }
      />
    </View>
  );
}

const styles = StyleSheet.create({
  root: { flex: 1, backgroundColor: "#0A0C10" },
  list: { paddingHorizontal: 16, paddingBottom: 120, paddingTop: Platform.OS === "web" ? 67 : 16 },
  pageHeader: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    marginBottom: 16,
  },
  pageTitle: { fontSize: 24, fontFamily: "Inter_700Bold", color: "#F0EAD6" },
  betCountBadge: {
    backgroundColor: "rgba(212,175,55,0.12)",
    borderRadius: 20,
    paddingHorizontal: 12,
    paddingVertical: 4,
    borderWidth: 1,
    borderColor: "rgba(212,175,55,0.2)",
  },
  betCount: { fontSize: 12, color: "#D4AF37", fontFamily: "Inter_600SemiBold" },
  betCard: {
    backgroundColor: "#12151E",
    borderRadius: 14,
    padding: 14,
    marginBottom: 10,
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    borderWidth: 1,
    borderColor: "#242840",
  },
  betLeft: { flexDirection: "row", alignItems: "center", gap: 12, flex: 1 },
  colorDot: {
    width: 40,
    height: 40,
    borderRadius: 20,
    justifyContent: "center",
    alignItems: "center",
  },
  colorDotInner: {
    width: 16,
    height: 16,
    borderRadius: 8,
    backgroundColor: "rgba(255,255,255,0.4)",
  },
  numberBox: {
    width: 40,
    height: 40,
    borderRadius: 12,
    justifyContent: "center",
    alignItems: "center",
  },
  numberText: { fontSize: 20, fontFamily: "Inter_700Bold", color: "#0A0C10" },
  betInfo: { gap: 2, flex: 1 },
  betType: { fontSize: 15, fontFamily: "Inter_600SemiBold", color: "#F0EAD6" },
  betDate: { fontSize: 12, color: "#8B8FA8", fontFamily: "Inter_400Regular" },
  betGame: { fontSize: 11, color: "#4A4E6A", fontFamily: "Inter_400Regular" },
  betRight: { alignItems: "flex-end", gap: 4 },
  betAmount: { fontSize: 16, fontFamily: "Inter_700Bold", color: "#F0EAD6" },
  wonAmount: { fontSize: 13, fontFamily: "Inter_700Bold", color: "#43A047" },
  statusBadge: { borderRadius: 8, paddingHorizontal: 8, paddingVertical: 3 },
  statusText: { fontSize: 10, fontFamily: "Inter_700Bold", letterSpacing: 0.5 },
  center: { flex: 1, alignItems: "center", justifyContent: "center", paddingTop: 80, backgroundColor: "#0A0C10" },
  emptyCard: { paddingTop: 60, alignItems: "center" },
  emptyIcon: { fontSize: 44, marginBottom: 12 },
  emptyTitle: { fontSize: 17, fontFamily: "Inter_600SemiBold", color: "#F0EAD6" },
  emptySubtitle: { fontSize: 13, color: "#8B8FA8", fontFamily: "Inter_400Regular", marginTop: 4 },
});
