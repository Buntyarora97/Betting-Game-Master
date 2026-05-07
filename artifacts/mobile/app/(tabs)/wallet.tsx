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
  Image,
} from "react-native";
import { LinearGradient } from "expo-linear-gradient";
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
  deposit: "↑",
  withdrawal: "↓",
  bet: "→",
  win: "★",
  referral: "♦",
  bonus: "✦",
};

const TX_COLORS: Record<string, string> = {
  deposit: "#43A047",
  withdrawal: "#E53935",
  bet: "#FBC02D",
  win: "#43A047",
  referral: "#43A047",
  bonus: "#D4AF37",
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

  if (!isAuthenticated) {
    return (
      <View style={styles.center}>
        <Text style={styles.emptyTitle}>Login to manage wallet</Text>
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
      Alert.alert("Required", "Please enter UTR/Reference ID");
      return;
    }
    try {
      await depositMutation.mutateAsync({ data: { amount: amt, referenceId: depositRef } });
      Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
      Alert.alert("Request Submitted ✓", "Your deposit is under review. It will be credited within 30 minutes.");
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
      Alert.alert("Withdrawal Requested ✓", "Your withdrawal will be processed within 24 hours.");
      setWithdrawAmount("");
      refetchWallet();
    } catch (e: any) {
      Alert.alert("Error", e?.data?.message || "Withdrawal failed");
    }
  };

  return (
    <ScrollView
      style={{ flex: 1, backgroundColor: "#0A0C10" }}
      contentContainerStyle={{ paddingBottom: 120 }}
      showsVerticalScrollIndicator={false}
    >
      {/* Balance Card */}
      <LinearGradient
        colors={["#1A1200", "#2A1E00", "#1A1D28"]}
        style={styles.balanceCard}
      >
        <View style={styles.balanceGoldBar} />
        <Text style={styles.balanceLabel}>TOTAL BALANCE</Text>
        <Text style={styles.balanceValue}>₹{Number(wallet?.balance || 0).toFixed(2)}</Text>
        <View style={styles.statsRow}>
          <View style={styles.statItem}>
            <Text style={styles.statLabel}>Deposited</Text>
            <Text style={[styles.statValue, { color: "#43A047" }]}>₹{Number(wallet?.totalDeposited || 0).toFixed(0)}</Text>
          </View>
          <View style={styles.statDivider} />
          <View style={styles.statItem}>
            <Text style={styles.statLabel}>Won</Text>
            <Text style={[styles.statValue, { color: "#D4AF37" }]}>₹{Number(wallet?.totalWon || 0).toFixed(0)}</Text>
          </View>
          <View style={styles.statDivider} />
          <View style={styles.statItem}>
            <Text style={styles.statLabel}>Withdrawn</Text>
            <Text style={[styles.statValue, { color: "#E53935" }]}>₹{Number(wallet?.totalWithdrawn || 0).toFixed(0)}</Text>
          </View>
        </View>
      </LinearGradient>

      <View style={{ paddingHorizontal: 16, paddingTop: 16 }}>
        {/* Tab switcher */}
        <View style={styles.tabs}>
          {(["overview", "deposit", "withdraw"] as TabType[]).map((t) => (
            <TouchableOpacity
              key={t}
              style={styles.tabBtn}
              onPress={() => { setTab(t); Haptics.selectionAsync(); }}
            >
              {tab === t ? (
                <LinearGradient
                  colors={["#D4AF37", "#A07820"]}
                  start={{ x: 0, y: 0 }}
                  end={{ x: 1, y: 0 }}
                  style={styles.tabBtnActive}
                >
                  <Text style={styles.tabTextActive}>
                    {t.charAt(0).toUpperCase() + t.slice(1)}
                  </Text>
                </LinearGradient>
              ) : (
                <Text style={styles.tabText}>
                  {t.charAt(0).toUpperCase() + t.slice(1)}
                </Text>
              )}
            </TouchableOpacity>
          ))}
        </View>

        {/* Overview Tab */}
        {tab === "overview" && (
          <View>
            <Text style={styles.sectionTitle}>Recent Transactions</Text>
            {txs.length === 0 ? (
              <View style={styles.emptyCard}>
                <Text style={styles.emptyText}>No transactions yet</Text>
              </View>
            ) : (
              txs.map((tx: any) => (
                <View key={tx.id} style={styles.txRow}>
                  <View style={[styles.txIcon, { backgroundColor: (TX_COLORS[tx.type] || "#888") + "22" }]}>
                    <Text style={[styles.txIconText, { color: TX_COLORS[tx.type] || "#888" }]}>
                      {TX_ICONS[tx.type] || "?"}
                    </Text>
                  </View>
                  <View style={styles.txInfo}>
                    <Text style={styles.txType}>{tx.type.charAt(0).toUpperCase() + tx.type.slice(1)}</Text>
                    <Text style={styles.txDate}>{format(new Date(tx.createdAt), "dd MMM, HH:mm")}</Text>
                  </View>
                  <View style={styles.txAmountCol}>
                    <Text style={[styles.txAmount, { color: TX_COLORS[tx.type] || "#F0EAD6" }]}>
                      {TX_ICONS[tx.type]}{Number(tx.amount).toFixed(2)}
                    </Text>
                    <View style={[styles.txStatusBadge, { backgroundColor: tx.status === "approved" ? "#43A04722" : tx.status === "pending" ? "#FBC02D22" : "#E5393522" }]}>
                      <Text style={[styles.txStatus, { color: tx.status === "approved" ? "#43A047" : tx.status === "pending" ? "#FBC02D" : "#E53935" }]}>
                        {tx.status}
                      </Text>
                    </View>
                  </View>
                </View>
              ))
            )}
          </View>
        )}

        {/* Deposit Tab */}
        {tab === "deposit" && (
          <View style={styles.form}>
            {upi?.upiId && (
              <View style={styles.upiCard}>
                {upi.qrImageUrl ? (
                  <View style={styles.qrSection}>
                    <Text style={styles.qrScanLabel}>Scan QR to Pay</Text>
                    <View style={styles.qrImageWrapper}>
                      <Image
                        source={{ uri: upi.qrImageUrl }}
                        style={styles.qrImage}
                        resizeMode="contain"
                      />
                    </View>
                  </View>
                ) : null}
                <View style={styles.upiIdRow}>
                  <Text style={styles.upiLabel}>UPI ID</Text>
                  <Text style={styles.upiId}>{upi.upiId}</Text>
                </View>
                <Text style={styles.upiHint}>Send money using any UPI app, then enter the UTR reference below</Text>
              </View>
            )}

            <View style={styles.inputWrapper}>
              <Text style={styles.inputLabel}>Amount</Text>
              <TextInput
                style={styles.input}
                placeholder="Minimum ₹100"
                placeholderTextColor="#4A4E6A"
                value={depositAmount}
                onChangeText={setDepositAmount}
                keyboardType="numeric"
              />
            </View>
            <View style={styles.inputWrapper}>
              <Text style={styles.inputLabel}>UTR / Transaction Reference ID</Text>
              <TextInput
                style={styles.input}
                placeholder="Enter 12-digit UTR number"
                placeholderTextColor="#4A4E6A"
                value={depositRef}
                onChangeText={setDepositRef}
              />
            </View>
            <TouchableOpacity onPress={handleDeposit} disabled={depositMutation.isPending} activeOpacity={0.85}>
              <LinearGradient colors={["#D4AF37", "#A07820"]} start={{ x: 0, y: 0 }} end={{ x: 1, y: 0 }} style={styles.actionBtn}>
                {depositMutation.isPending ? <ActivityIndicator color="#0A0C10" /> : <Text style={styles.actionBtnText}>Submit Deposit Request</Text>}
              </LinearGradient>
            </TouchableOpacity>
          </View>
        )}

        {/* Withdraw Tab */}
        {tab === "withdraw" && (
          <View style={styles.form}>
            <View style={styles.withdrawBalanceCard}>
              <Text style={styles.withdrawBalanceLabel}>Available Balance</Text>
              <Text style={styles.withdrawBalance}>₹{Number(wallet?.balance || 0).toFixed(2)}</Text>
            </View>
            <View style={styles.inputWrapper}>
              <Text style={styles.inputLabel}>Withdrawal Amount</Text>
              <TextInput
                style={styles.input}
                placeholder="Minimum ₹100"
                placeholderTextColor="#4A4E6A"
                value={withdrawAmount}
                onChangeText={setWithdrawAmount}
                keyboardType="numeric"
              />
            </View>
            <Text style={styles.hintText}>Ensure your bank/UPI details are saved in Profile before withdrawing</Text>
            <TouchableOpacity onPress={handleWithdraw} disabled={withdrawMutation.isPending} activeOpacity={0.85}>
              <LinearGradient colors={["#B71C1C", "#E53935"]} start={{ x: 0, y: 0 }} end={{ x: 1, y: 0 }} style={styles.actionBtn}>
                {withdrawMutation.isPending ? <ActivityIndicator color="#fff" /> : <Text style={[styles.actionBtnText, { color: "#fff" }]}>Request Withdrawal</Text>}
              </LinearGradient>
            </TouchableOpacity>
          </View>
        )}
      </View>
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  balanceCard: {
    paddingTop: Platform.OS === "web" ? 80 : 52,
    paddingBottom: 24,
    paddingHorizontal: 20,
    borderBottomLeftRadius: 24,
    borderBottomRightRadius: 24,
  },
  balanceGoldBar: {
    position: "absolute",
    top: 0,
    left: 20,
    right: 20,
    height: 2,
    backgroundColor: "#D4AF37",
    borderRadius: 1,
  },
  balanceLabel: {
    fontSize: 11,
    color: "rgba(212,175,55,0.7)",
    fontFamily: "Inter_600SemiBold",
    letterSpacing: 2,
    marginBottom: 6,
  },
  balanceValue: {
    fontSize: 44,
    fontFamily: "Inter_700Bold",
    color: "#D4AF37",
    marginBottom: 16,
    textShadowColor: "rgba(212,175,55,0.3)",
    textShadowOffset: { width: 0, height: 0 },
    textShadowRadius: 10,
  },
  statsRow: {
    flexDirection: "row",
    backgroundColor: "rgba(0,0,0,0.3)",
    borderRadius: 12,
    padding: 12,
    borderWidth: 1,
    borderColor: "rgba(212,175,55,0.1)",
  },
  statItem: { flex: 1, alignItems: "center" },
  statLabel: { fontSize: 11, color: "rgba(240,234,214,0.5)", fontFamily: "Inter_400Regular" },
  statValue: { fontSize: 14, fontFamily: "Inter_700Bold", marginTop: 2 },
  statDivider: { width: 1, backgroundColor: "rgba(212,175,55,0.15)" },
  tabs: {
    flexDirection: "row",
    backgroundColor: "#12151E",
    borderRadius: 14,
    padding: 4,
    marginBottom: 20,
    borderWidth: 1,
    borderColor: "#242840",
  },
  tabBtn: { flex: 1, alignItems: "center" },
  tabBtnActive: { width: "100%", paddingVertical: 10, alignItems: "center", borderRadius: 10 },
  tabText: { fontSize: 13, color: "#8B8FA8", fontFamily: "Inter_500Medium", paddingVertical: 10 },
  tabTextActive: { fontSize: 13, color: "#0A0C10", fontFamily: "Inter_700Bold" },
  sectionTitle: { fontSize: 16, fontFamily: "Inter_700Bold", color: "#F0EAD6", marginBottom: 12 },
  emptyCard: { backgroundColor: "#12151E", borderRadius: 14, padding: 24, alignItems: "center", borderWidth: 1, borderColor: "#242840" },
  emptyText: { fontSize: 14, color: "#8B8FA8", fontFamily: "Inter_400Regular" },
  txRow: {
    flexDirection: "row",
    alignItems: "center",
    paddingVertical: 12,
    borderBottomWidth: 1,
    borderBottomColor: "#1A1D28",
  },
  txIcon: {
    width: 40,
    height: 40,
    borderRadius: 12,
    justifyContent: "center",
    alignItems: "center",
    marginRight: 12,
  },
  txIconText: { fontSize: 18, fontFamily: "Inter_700Bold" },
  txInfo: { flex: 1 },
  txType: { fontSize: 14, fontFamily: "Inter_600SemiBold", color: "#F0EAD6" },
  txDate: { fontSize: 11, color: "#8B8FA8", fontFamily: "Inter_400Regular" },
  txAmountCol: { alignItems: "flex-end" },
  txAmount: { fontSize: 15, fontFamily: "Inter_700Bold" },
  txStatusBadge: { borderRadius: 6, paddingHorizontal: 6, paddingVertical: 2, marginTop: 3 },
  txStatus: { fontSize: 10, fontFamily: "Inter_600SemiBold", textTransform: "capitalize" },
  form: { gap: 14 },
  upiCard: {
    backgroundColor: "#12151E",
    borderRadius: 16,
    padding: 16,
    borderWidth: 1,
    borderColor: "rgba(212,175,55,0.2)",
  },
  qrSection: { alignItems: "center", marginBottom: 12 },
  qrScanLabel: {
    fontSize: 12,
    color: "#D4AF37",
    fontFamily: "Inter_600SemiBold",
    letterSpacing: 0.5,
    marginBottom: 10,
  },
  qrImageWrapper: {
    backgroundColor: "#fff",
    borderRadius: 12,
    padding: 8,
    borderWidth: 2,
    borderColor: "#D4AF37",
  },
  qrImage: {
    width: 180,
    height: 180,
  },
  upiIdRow: { marginBottom: 6 },
  upiLabel: {
    fontSize: 10,
    color: "#8B8FA8",
    fontFamily: "Inter_500Medium",
    textTransform: "uppercase",
    letterSpacing: 1.2,
    marginBottom: 4,
  },
  upiId: { fontSize: 18, fontFamily: "Inter_700Bold", color: "#D4AF37" },
  upiHint: { fontSize: 12, color: "#8B8FA8", fontFamily: "Inter_400Regular", lineHeight: 18 },
  inputWrapper: { gap: 6 },
  inputLabel: { fontSize: 12, color: "#8B8FA8", fontFamily: "Inter_500Medium" },
  input: {
    backgroundColor: "#1A1D28",
    borderWidth: 1,
    borderColor: "#242840",
    borderRadius: 12,
    paddingHorizontal: 16,
    paddingVertical: 13,
    fontSize: 15,
    color: "#F0EAD6",
    fontFamily: "Inter_400Regular",
  },
  actionBtn: {
    borderRadius: 12,
    paddingVertical: 15,
    alignItems: "center",
  },
  actionBtnText: { fontSize: 15, fontFamily: "Inter_700Bold", color: "#0A0C10" },
  withdrawBalanceCard: {
    backgroundColor: "#12151E",
    borderRadius: 14,
    padding: 16,
    borderWidth: 1,
    borderColor: "#242840",
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
  },
  withdrawBalanceLabel: { fontSize: 13, color: "#8B8FA8", fontFamily: "Inter_400Regular" },
  withdrawBalance: { fontSize: 20, fontFamily: "Inter_700Bold", color: "#F0EAD6" },
  hintText: { fontSize: 12, color: "#8B8FA8", fontFamily: "Inter_400Regular", lineHeight: 18 },
  center: { flex: 1, justifyContent: "center", alignItems: "center", paddingTop: 80, backgroundColor: "#0A0C10" },
  emptyTitle: { fontSize: 15, color: "#8B8FA8", fontFamily: "Inter_500Medium" },
});
