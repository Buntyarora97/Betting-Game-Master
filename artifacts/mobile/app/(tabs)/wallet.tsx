import React, { useState } from "react";
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  ScrollView,
  TextInput,
  Alert,
  ActivityIndicator,
  Platform,
} from "react-native";
import {
  useGetWallet,
  useGetTransactions,
  useCreateDepositRequest,
  useCreateWithdrawalRequest,
  useGetUpiDetails,
} from "@workspace/api-client-react";
import { useAuth } from "@/contexts/AuthContext";
import { useColors } from "@/hooks/useColors";
import * as Haptics from "expo-haptics";
import { format } from "date-fns";

type TabType = "overview" | "deposit" | "withdraw";

const TX_ICONS: Record<string, string> = {
  deposit: "+",
  withdrawal: "-",
  bet: "-",
  win: "+",
  referral: "+",
  bonus: "+",
};

const TX_COLORS: Record<string, string> = {
  deposit: "#2E7D32",
  withdrawal: "#D32F2F",
  bet: "#FBC02D",
  win: "#2E7D32",
  referral: "#2E7D32",
  bonus: "#2E7D32",
};

export default function WalletScreen() {
  const colors = useColors();
  const { isAuthenticated } = useAuth();
  const [tab, setTab] = useState<TabType>("overview");
  const [depositAmount, setDepositAmount] = useState("");
  const [depositRef, setDepositRef] = useState("");
  const [withdrawAmount, setWithdrawAmount] = useState("");

  const { data: walletData, refetch: refetchWallet } = useGetWallet({ query: { enabled: isAuthenticated } });
  const { data: txData, refetch: refetchTx } = useGetTransactions({ page: 1, limit: 20 }, { query: { enabled: isAuthenticated } });
  const { data: upiData } = useGetUpiDetails({ query: { enabled: isAuthenticated && tab === "deposit" } });

  const depositMutation = useCreateDepositRequest();
  const withdrawMutation = useCreateWithdrawalRequest();

  const wallet = walletData as any;
  const txs = (txData as any)?.transactions || [];
  const upi = upiData as any;

  const s = makeStyles(colors);

  if (!isAuthenticated) {
    return (
      <View style={s.center}>
        <Text style={s.emptyTitle}>Login to manage wallet</Text>
      </View>
    );
  }

  const handleDeposit = async () => {
    const amt = parseFloat(depositAmount);
    if (!amt || amt < 100) {
      Alert.alert("Minimum ₹100", "Minimum deposit is ₹100");
      return;
    }
    if (!depositRef) {
      Alert.alert("Required", "Please enter UTR/Reference ID from your payment");
      return;
    }
    try {
      await depositMutation.mutateAsync({ data: { amount: amt, referenceId: depositRef } });
      Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
      Alert.alert("Request Submitted", "Your deposit request is under review. It will be credited within 30 minutes.");
      setDepositAmount("");
      setDepositRef("");
      refetchWallet();
      refetchTx();
    } catch (e: any) {
      Alert.alert("Error", e?.data?.message || "Deposit failed");
    }
  };

  const handleWithdraw = async () => {
    const amt = parseFloat(withdrawAmount);
    if (!amt || amt < 100) {
      Alert.alert("Minimum ₹100", "Minimum withdrawal is ₹100");
      return;
    }
    if (amt > Number(wallet?.balance || 0)) {
      Alert.alert("Insufficient Balance", "You don't have enough balance");
      return;
    }
    try {
      await withdrawMutation.mutateAsync({ data: { amount: amt, method: "upi" } });
      Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
      Alert.alert("Withdrawal Requested", "Your withdrawal will be processed within 24 hours.");
      setWithdrawAmount("");
      refetchWallet();
    } catch (e: any) {
      Alert.alert("Error", e?.data?.message || "Withdrawal failed");
    }
  };

  return (
    <ScrollView style={s.root} contentContainerStyle={s.scroll} showsVerticalScrollIndicator={false}>
      {/* Balance Card */}
      <View style={s.balanceCard}>
        <Text style={s.balanceLabel}>Total Balance</Text>
        <Text style={s.balanceValue}>₹{Number(wallet?.balance || 0).toFixed(2)}</Text>
        <View style={s.statsRow}>
          <View style={s.statItem}>
            <Text style={s.statLabel}>Deposited</Text>
            <Text style={[s.statValue, { color: colors.green }]}>₹{Number(wallet?.totalDeposited || 0).toFixed(0)}</Text>
          </View>
          <View style={s.statDivider} />
          <View style={s.statItem}>
            <Text style={s.statLabel}>Won</Text>
            <Text style={[s.statValue, { color: colors.green }]}>₹{Number(wallet?.totalWon || 0).toFixed(0)}</Text>
          </View>
          <View style={s.statDivider} />
          <View style={s.statItem}>
            <Text style={s.statLabel}>Withdrawn</Text>
            <Text style={[s.statValue, { color: colors.red }]}>₹{Number(wallet?.totalWithdrawn || 0).toFixed(0)}</Text>
          </View>
        </View>
      </View>

      {/* Tab switcher */}
      <View style={s.tabs}>
        {(["overview", "deposit", "withdraw"] as TabType[]).map((t) => (
          <TouchableOpacity
            key={t}
            style={[s.tabBtn, tab === t && s.tabBtnActive]}
            onPress={() => { setTab(t); Haptics.selectionAsync(); }}
          >
            <Text style={[s.tabText, tab === t && s.tabTextActive]}>
              {t.charAt(0).toUpperCase() + t.slice(1)}
            </Text>
          </TouchableOpacity>
        ))}
      </View>

      {/* Tab content */}
      {tab === "overview" && (
        <View>
          <Text style={s.sectionTitle}>Recent Transactions</Text>
          {txs.length === 0 ? (
            <View style={s.center}>
              <Text style={s.emptyTitle}>No transactions yet</Text>
            </View>
          ) : (
            txs.map((tx: any) => (
              <View key={tx.id} style={s.txRow}>
                <View style={[s.txIcon, { backgroundColor: TX_COLORS[tx.type] + "22" }]}>
                  <Text style={[s.txIconText, { color: TX_COLORS[tx.type] }]}>{TX_ICONS[tx.type] || "?"}</Text>
                </View>
                <View style={s.txInfo}>
                  <Text style={s.txType}>{tx.type.charAt(0).toUpperCase() + tx.type.slice(1)}</Text>
                  <Text style={s.txDate}>{format(new Date(tx.createdAt), "dd MMM, HH:mm")}</Text>
                </View>
                <Text style={[s.txAmount, { color: TX_COLORS[tx.type] || colors.foreground }]}>
                  {TX_ICONS[tx.type]}{Number(tx.amount).toFixed(2)}
                </Text>
              </View>
            ))
          )}
        </View>
      )}

      {tab === "deposit" && (
        <View style={s.form}>
          <Text style={s.sectionTitle}>Add Money</Text>
          {upi?.upiId && (
            <View style={s.upiCard}>
              <Text style={s.upiLabel}>Pay to UPI ID</Text>
              <Text style={s.upiId}>{upi.upiId}</Text>
              <Text style={s.upiHint}>Send money via any UPI app, then submit reference below</Text>
            </View>
          )}
          <TextInput
            style={s.input}
            placeholder="Amount (min ₹100)"
            placeholderTextColor={colors.mutedForeground}
            value={depositAmount}
            onChangeText={setDepositAmount}
            keyboardType="numeric"
          />
          <TextInput
            style={s.input}
            placeholder="UTR / Transaction Reference ID"
            placeholderTextColor={colors.mutedForeground}
            value={depositRef}
            onChangeText={setDepositRef}
          />
          <TouchableOpacity style={s.actionBtn} onPress={handleDeposit} disabled={depositMutation.isPending}>
            {depositMutation.isPending ? <ActivityIndicator color="#fff" /> : <Text style={s.actionBtnText}>Submit Deposit Request</Text>}
          </TouchableOpacity>
        </View>
      )}

      {tab === "withdraw" && (
        <View style={s.form}>
          <Text style={s.sectionTitle}>Withdraw Money</Text>
          <View style={s.withdrawInfo}>
            <Text style={s.withdrawBalance}>Available: ₹{Number(wallet?.balance || 0).toFixed(2)}</Text>
          </View>
          <TextInput
            style={s.input}
            placeholder="Amount (min ₹100)"
            placeholderTextColor={colors.mutedForeground}
            value={withdrawAmount}
            onChangeText={setWithdrawAmount}
            keyboardType="numeric"
          />
          <Text style={s.hintText}>Make sure your bank/UPI details are updated in Profile before withdrawing</Text>
          <TouchableOpacity style={[s.actionBtn, { backgroundColor: colors.red }]} onPress={handleWithdraw} disabled={withdrawMutation.isPending}>
            {withdrawMutation.isPending ? <ActivityIndicator color="#fff" /> : <Text style={s.actionBtnText}>Request Withdrawal</Text>}
          </TouchableOpacity>
        </View>
      )}
    </ScrollView>
  );
}

function makeStyles(colors: any) {
  return StyleSheet.create({
    root: { flex: 1, backgroundColor: colors.background },
    scroll: { paddingHorizontal: 16, paddingBottom: 120, paddingTop: Platform.OS === "web" ? 67 : 16 },
    balanceCard: {
      backgroundColor: "#1A237E",
      borderRadius: 16,
      padding: 20,
      marginBottom: 20,
    },
    balanceLabel: { fontSize: 13, color: "rgba(255,255,255,0.7)", fontFamily: "Inter_400Regular" },
    balanceValue: { fontSize: 38, fontFamily: "Inter_700Bold", color: "#fff", marginVertical: 4 },
    statsRow: { flexDirection: "row" as const, marginTop: 12, justifyContent: "space-between" },
    statItem: { alignItems: "center", flex: 1 },
    statLabel: { fontSize: 11, color: "rgba(255,255,255,0.6)", fontFamily: "Inter_400Regular" },
    statValue: { fontSize: 14, fontFamily: "Inter_700Bold", marginTop: 2 },
    statDivider: { width: 1, backgroundColor: "rgba(255,255,255,0.15)" },
    tabs: { flexDirection: "row" as const, backgroundColor: colors.secondary, borderRadius: 12, padding: 4, marginBottom: 20 },
    tabBtn: { flex: 1, paddingVertical: 10, alignItems: "center", borderRadius: 10 },
    tabBtnActive: { backgroundColor: colors.card },
    tabText: { fontSize: 13, color: colors.mutedForeground, fontFamily: "Inter_500Medium" },
    tabTextActive: { color: colors.foreground, fontFamily: "Inter_600SemiBold" },
    sectionTitle: { fontSize: 16, fontFamily: "Inter_700Bold", color: colors.foreground, marginBottom: 12 },
    txRow: { flexDirection: "row" as const, alignItems: "center", paddingVertical: 10, borderBottomWidth: 1, borderBottomColor: colors.border },
    txIcon: { width: 36, height: 36, borderRadius: 10, justifyContent: "center", alignItems: "center", marginRight: 12 },
    txIconText: { fontSize: 18, fontFamily: "Inter_700Bold" },
    txInfo: { flex: 1 },
    txType: { fontSize: 14, fontFamily: "Inter_600SemiBold", color: colors.foreground },
    txDate: { fontSize: 11, color: colors.mutedForeground, fontFamily: "Inter_400Regular" },
    txAmount: { fontSize: 15, fontFamily: "Inter_700Bold" },
    form: { gap: 12 },
    input: {
      backgroundColor: colors.input,
      borderWidth: 1,
      borderColor: colors.border,
      borderRadius: 12,
      paddingHorizontal: 16,
      paddingVertical: 13,
      fontSize: 15,
      color: colors.foreground,
      fontFamily: "Inter_400Regular",
    },
    upiCard: { backgroundColor: colors.card, borderRadius: 12, padding: 16, borderWidth: 1, borderColor: colors.border },
    upiLabel: { fontSize: 11, color: colors.mutedForeground, fontFamily: "Inter_400Regular", textTransform: "uppercase" as const, letterSpacing: 1 },
    upiId: { fontSize: 18, fontFamily: "Inter_700Bold", color: colors.primary, marginVertical: 4 },
    upiHint: { fontSize: 12, color: colors.mutedForeground, fontFamily: "Inter_400Regular" },
    actionBtn: { backgroundColor: colors.primary, borderRadius: 12, paddingVertical: 14, alignItems: "center" },
    actionBtnText: { fontSize: 15, fontFamily: "Inter_600SemiBold", color: "#fff" },
    withdrawInfo: { backgroundColor: colors.card, borderRadius: 10, padding: 12, borderWidth: 1, borderColor: colors.border },
    withdrawBalance: { fontSize: 16, fontFamily: "Inter_700Bold", color: colors.foreground },
    hintText: { fontSize: 12, color: colors.mutedForeground, fontFamily: "Inter_400Regular" },
    center: { paddingTop: 40, alignItems: "center" },
    emptyTitle: { fontSize: 15, color: colors.mutedForeground, fontFamily: "Inter_500Medium" },
  });
}
