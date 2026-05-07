import React, { useState } from "react";
import {
  View,
  Text,
  StyleSheet,
  FlatList,
  RefreshControl,
  Platform,
} from "react-native";
import { useGetUserBets, getGetUserBetsQueryKey } from "@workspace/api-client-react";
import { useAuth } from "@/contexts/AuthContext";
import { useColors } from "@/hooks/useColors";
import { format } from "date-fns";

const COLOR_HEX: Record<string, string> = {
  red: "#D32F2F",
  yellow: "#FBC02D",
  green: "#2E7D32",
};

const STATUS_COLOR: Record<string, string> = {
  won: "#2E7D32",
  lost: "#D32F2F",
  pending: "#FBC02D",
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

  const s = makeStyles(colors);

  if (!isAuthenticated) {
    return (
      <View style={s.center}>
        <Text style={s.emptyIcon}>🎮</Text>
        <Text style={s.emptyTitle}>Login to view your bets</Text>
      </View>
    );
  }

  const renderBet = ({ item: bet }: { item: Bet }) => {
    const isColor = bet.betType === "color";
    const color = isColor ? COLOR_HEX[bet.selection] : undefined;

    return (
      <View style={s.betCard}>
        <View style={s.betLeft}>
          {isColor ? (
            <View style={[s.colorDot, { backgroundColor: color }]} />
          ) : (
            <View style={s.numberBox}>
              <Text style={s.numberText}>{bet.selection}</Text>
            </View>
          )}
          <View style={s.betInfo}>
            <Text style={s.betType}>{isColor ? bet.selection.charAt(0).toUpperCase() + bet.selection.slice(1) : `Number ${bet.selection}`}</Text>
            <Text style={s.betDate}>{format(new Date(bet.createdAt), "dd MMM, HH:mm")}</Text>
          </View>
        </View>
        <View style={s.betRight}>
          <Text style={s.betAmount}>₹{Number(bet.amount).toFixed(0)}</Text>
          <Text style={[s.betStatus, { color: STATUS_COLOR[bet.status] || colors.mutedForeground }]}>
            {bet.status === "won" ? `+₹${Number(bet.potentialWin).toFixed(0)}` : bet.status.toUpperCase()}
          </Text>
        </View>
      </View>
    );
  };

  return (
    <View style={s.root}>
      <FlatList
        data={bets}
        keyExtractor={(item) => String(item.id)}
        renderItem={renderBet}
        contentContainerStyle={s.list}
        showsVerticalScrollIndicator={false}
        scrollEnabled={!!bets.length}
        refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} tintColor={colors.primary} />}
        ListEmptyComponent={
          <View style={s.center}>
            <Text style={s.emptyTitle}>No bets yet</Text>
            <Text style={s.emptySubtitle}>Place your first bet on the Home tab</Text>
          </View>
        }
        ListHeaderComponent={
          <Text style={s.pageTitle}>My Bets</Text>
        }
      />
    </View>
  );
}

function makeStyles(colors: any) {
  return StyleSheet.create({
    root: { flex: 1, backgroundColor: colors.background },
    list: { paddingHorizontal: 16, paddingBottom: 120, paddingTop: Platform.OS === "web" ? 67 : 16 },
    pageTitle: { fontSize: 22, fontFamily: "Inter_700Bold", color: colors.foreground, marginBottom: 16 },
    betCard: {
      backgroundColor: colors.card,
      borderRadius: 12,
      padding: 14,
      marginBottom: 10,
      flexDirection: "row" as const,
      justifyContent: "space-between",
      alignItems: "center",
      borderWidth: 1,
      borderColor: colors.border,
    },
    betLeft: { flexDirection: "row" as const, alignItems: "center", gap: 12 },
    colorDot: { width: 32, height: 32, borderRadius: 16, borderWidth: 2, borderColor: "rgba(255,255,255,0.2)" },
    numberBox: { width: 32, height: 32, borderRadius: 8, backgroundColor: colors.primary, justifyContent: "center", alignItems: "center" },
    numberText: { fontSize: 18, fontFamily: "Inter_700Bold", color: "#fff" },
    betInfo: { gap: 2 },
    betType: { fontSize: 15, fontFamily: "Inter_600SemiBold", color: colors.foreground },
    betDate: { fontSize: 12, color: colors.mutedForeground, fontFamily: "Inter_400Regular" },
    betRight: { alignItems: "flex-end" as const },
    betAmount: { fontSize: 15, fontFamily: "Inter_700Bold", color: colors.foreground },
    betStatus: { fontSize: 12, fontFamily: "Inter_600SemiBold", marginTop: 2 },
    center: { flex: 1, alignItems: "center", justifyContent: "center", paddingTop: 80 },
    emptyIcon: { fontSize: 40, marginBottom: 12 },
    emptyTitle: { fontSize: 16, fontFamily: "Inter_600SemiBold", color: colors.foreground },
    emptySubtitle: { fontSize: 13, color: colors.mutedForeground, fontFamily: "Inter_400Regular", marginTop: 4 },
  });
}
