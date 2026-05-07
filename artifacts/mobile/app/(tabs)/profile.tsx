import React, { useState } from "react";
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  ScrollView,
  TextInput,
  Alert,
  Share,
  Platform,
  ActivityIndicator,
} from "react-native";
import {
  useGetUserProfile,
  useGetUserReferrals,
  useUpdateBankDetails,
  useGetBankDetails,
} from "@workspace/api-client-react";
import { useAuth } from "@/contexts/AuthContext";
import { useColors } from "@/hooks/useColors";
import * as Haptics from "expo-haptics";

type ProfileTab = "info" | "referral" | "bank";

export default function ProfileScreen() {
  const colors = useColors();
  const { user, logout, isAuthenticated } = useAuth();
  const [activeTab, setActiveTab] = useState<ProfileTab>("info");

  // Bank form state
  const [upiId, setUpiId] = useState("");
  const [accountNumber, setAccountNumber] = useState("");
  const [ifsc, setIfsc] = useState("");
  const [holderName, setHolderName] = useState("");

  const { data: profileData } = useGetUserProfile({ query: { enabled: isAuthenticated } });
  const { data: referralData } = useGetUserReferrals({ query: { enabled: isAuthenticated && activeTab === "referral" } });
  const { data: bankData } = useGetBankDetails({ query: { enabled: isAuthenticated && activeTab === "bank" } });
  const updateBankMutation = useUpdateBankDetails();

  const profile = (profileData || user) as any;
  const referral = referralData as any;
  const bank = bankData as any;

  const s = makeStyles(colors);

  if (!isAuthenticated) {
    return (
      <View style={s.center}>
        <Text style={s.emptyTitle}>Login to view profile</Text>
      </View>
    );
  }

  const handleShare = () => {
    const code = profile?.referralCode;
    if (!code) return;
    Share.share({
      message: `Join 3 Batti and win big! Use my referral code ${code} to get ₹25 bonus. Download now and play 4 games daily!`,
    });
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
  };

  const handleSaveBank = async () => {
    try {
      await updateBankMutation.mutateAsync({
        data: { upiId, accountNumber, ifsc, accountHolderName: holderName },
      });
      Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
      Alert.alert("Saved", "Bank details updated successfully");
    } catch (e: any) {
      Alert.alert("Error", e?.data?.message || "Failed to save");
    }
  };

  React.useEffect(() => {
    if (bank) {
      setUpiId(bank.upiId || "");
      setAccountNumber(bank.accountNumber || "");
      setIfsc(bank.ifsc || "");
      setHolderName(bank.accountHolderName || "");
    }
  }, [bank]);

  return (
    <ScrollView style={s.root} contentContainerStyle={s.scroll} showsVerticalScrollIndicator={false}>
      {/* Avatar + Name */}
      <View style={s.avatarArea}>
        <View style={s.avatar}>
          <Text style={s.avatarText}>{profile?.name?.charAt(0)?.toUpperCase() || "?"}</Text>
        </View>
        <Text style={s.name}>{profile?.name || "User"}</Text>
        <Text style={s.mobile}>{profile?.mobile}</Text>
        <View style={s.kycBadge}>
          <Text style={s.kycText}>KYC: {profile?.kycStatus?.toUpperCase() || "PENDING"}</Text>
        </View>
      </View>

      {/* Wallet quick stats */}
      <View style={s.statsCard}>
        <View style={s.statItem}>
          <Text style={s.statValue}>₹{Number(profile?.walletBalance || 0).toFixed(2)}</Text>
          <Text style={s.statLabel}>Balance</Text>
        </View>
        <View style={s.statDivider} />
        <View style={s.statItem}>
          <Text style={s.statValue}>{referral?.totalReferrals || 0}</Text>
          <Text style={s.statLabel}>Referrals</Text>
        </View>
        <View style={s.statDivider} />
        <View style={s.statItem}>
          <Text style={s.statValue}>₹{Number(referral?.totalEarnings || 0).toFixed(0)}</Text>
          <Text style={s.statLabel}>Earned</Text>
        </View>
      </View>

      {/* Tabs */}
      <View style={s.tabs}>
        {(["info", "referral", "bank"] as ProfileTab[]).map((t) => (
          <TouchableOpacity
            key={t}
            style={[s.tabBtn, activeTab === t && s.tabBtnActive]}
            onPress={() => { setActiveTab(t); Haptics.selectionAsync(); }}
          >
            <Text style={[s.tabText, activeTab === t && s.tabTextActive]}>
              {t.charAt(0).toUpperCase() + t.slice(1)}
            </Text>
          </TouchableOpacity>
        ))}
      </View>

      {/* Info Tab */}
      {activeTab === "info" && (
        <View style={s.section}>
          <View style={s.infoRow}>
            <Text style={s.infoLabel}>Mobile</Text>
            <Text style={s.infoValue}>{profile?.mobile}</Text>
          </View>
          <View style={s.infoRow}>
            <Text style={s.infoLabel}>Referral Code</Text>
            <Text style={s.infoValue}>{profile?.referralCode}</Text>
          </View>
          <View style={s.infoRow}>
            <Text style={s.infoLabel}>Member Since</Text>
            <Text style={s.infoValue}>
              {profile?.createdAt ? new Date(profile.createdAt).toLocaleDateString("en-IN") : "-"}
            </Text>
          </View>
          <View style={s.infoRow}>
            <Text style={s.infoLabel}>Account Status</Text>
            <Text style={[s.infoValue, { color: profile?.isBlocked ? colors.red : colors.green }]}>
              {profile?.isBlocked ? "BLOCKED" : "Active"}
            </Text>
          </View>

          <TouchableOpacity style={s.logoutBtn} onPress={() => {
            Alert.alert("Logout", "Are you sure?", [
              { text: "Cancel" },
              { text: "Logout", style: "destructive", onPress: logout },
            ]);
          }}>
            <Text style={s.logoutText}>Logout</Text>
          </TouchableOpacity>
        </View>
      )}

      {/* Referral Tab */}
      {activeTab === "referral" && (
        <View style={s.section}>
          <View style={s.referralCode}>
            <Text style={s.referralCodeLabel}>Your Referral Code</Text>
            <Text style={s.referralCodeValue}>{profile?.referralCode}</Text>
          </View>
          <TouchableOpacity style={s.shareBtn} onPress={handleShare}>
            <Text style={s.shareBtnText}>Share & Earn ₹50</Text>
          </TouchableOpacity>
          <View style={s.referralStats}>
            <View style={s.refStatItem}>
              <Text style={s.refStatValue}>{referral?.totalReferrals || 0}</Text>
              <Text style={s.refStatLabel}>Friends Joined</Text>
            </View>
            <View style={s.refStatItem}>
              <Text style={s.refStatValue}>₹{Number(referral?.totalEarnings || 0).toFixed(2)}</Text>
              <Text style={s.refStatLabel}>Total Earned</Text>
            </View>
            <View style={s.refStatItem}>
              <Text style={s.refStatValue}>₹{Number(referral?.pendingEarnings || 0).toFixed(2)}</Text>
              <Text style={s.refStatLabel}>Pending</Text>
            </View>
          </View>
          <Text style={s.earningInfo}>
            Earn ₹50 when each friend makes their first deposit. Plus 1% commission on every bet they place.
          </Text>
        </View>
      )}

      {/* Bank Tab */}
      {activeTab === "bank" && (
        <View style={s.section}>
          <Text style={s.sectionTitle}>Payment Details for Withdrawal</Text>
          <TextInput
            style={s.input}
            placeholder="UPI ID (e.g. name@bank)"
            placeholderTextColor={colors.mutedForeground}
            value={upiId}
            onChangeText={setUpiId}
          />
          <TextInput
            style={s.input}
            placeholder="Account Holder Name"
            placeholderTextColor={colors.mutedForeground}
            value={holderName}
            onChangeText={setHolderName}
          />
          <TextInput
            style={s.input}
            placeholder="Account Number"
            placeholderTextColor={colors.mutedForeground}
            value={accountNumber}
            onChangeText={setAccountNumber}
            keyboardType="numeric"
          />
          <TextInput
            style={s.input}
            placeholder="IFSC Code"
            placeholderTextColor={colors.mutedForeground}
            value={ifsc}
            onChangeText={setIfsc}
            autoCapitalize="characters"
          />
          <TouchableOpacity style={s.saveBtn} onPress={handleSaveBank} disabled={updateBankMutation.isPending}>
            {updateBankMutation.isPending ? (
              <ActivityIndicator color="#fff" />
            ) : (
              <Text style={s.saveBtnText}>Save Bank Details</Text>
            )}
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
    avatarArea: { alignItems: "center", marginBottom: 20 },
    avatar: {
      width: 72,
      height: 72,
      borderRadius: 36,
      backgroundColor: "#1A237E",
      justifyContent: "center",
      alignItems: "center",
      marginBottom: 12,
      borderWidth: 3,
      borderColor: colors.primary,
    },
    avatarText: { fontSize: 28, fontFamily: "Inter_700Bold", color: "#fff" },
    name: { fontSize: 22, fontFamily: "Inter_700Bold", color: colors.foreground },
    mobile: { fontSize: 14, color: colors.mutedForeground, fontFamily: "Inter_400Regular", marginTop: 2 },
    kycBadge: { marginTop: 8, backgroundColor: colors.secondary, borderRadius: 20, paddingHorizontal: 12, paddingVertical: 4 },
    kycText: { fontSize: 11, color: colors.mutedForeground, fontFamily: "Inter_500Medium", letterSpacing: 0.5 },
    statsCard: { flexDirection: "row" as const, backgroundColor: colors.card, borderRadius: 14, padding: 16, marginBottom: 20, borderWidth: 1, borderColor: colors.border },
    statItem: { flex: 1, alignItems: "center" },
    statValue: { fontSize: 18, fontFamily: "Inter_700Bold", color: colors.foreground },
    statLabel: { fontSize: 11, color: colors.mutedForeground, fontFamily: "Inter_400Regular", marginTop: 2 },
    statDivider: { width: 1, backgroundColor: colors.border },
    tabs: { flexDirection: "row" as const, backgroundColor: colors.secondary, borderRadius: 12, padding: 4, marginBottom: 20 },
    tabBtn: { flex: 1, paddingVertical: 10, alignItems: "center", borderRadius: 10 },
    tabBtnActive: { backgroundColor: colors.card },
    tabText: { fontSize: 13, color: colors.mutedForeground, fontFamily: "Inter_500Medium" },
    tabTextActive: { color: colors.foreground, fontFamily: "Inter_600SemiBold" },
    section: { gap: 12 },
    sectionTitle: { fontSize: 15, fontFamily: "Inter_700Bold", color: colors.foreground, marginBottom: 4 },
    infoRow: { flexDirection: "row" as const, justifyContent: "space-between", paddingVertical: 12, borderBottomWidth: 1, borderBottomColor: colors.border },
    infoLabel: { fontSize: 14, color: colors.mutedForeground, fontFamily: "Inter_400Regular" },
    infoValue: { fontSize: 14, fontFamily: "Inter_600SemiBold", color: colors.foreground },
    logoutBtn: { marginTop: 20, backgroundColor: colors.red + "22", borderRadius: 12, paddingVertical: 14, alignItems: "center", borderWidth: 1, borderColor: colors.red + "44" },
    logoutText: { fontSize: 15, fontFamily: "Inter_600SemiBold", color: colors.red },
    referralCode: { backgroundColor: "#1A237E", borderRadius: 14, padding: 20, alignItems: "center" },
    referralCodeLabel: { fontSize: 12, color: "rgba(255,255,255,0.7)", fontFamily: "Inter_400Regular", marginBottom: 4 },
    referralCodeValue: { fontSize: 28, fontFamily: "Inter_700Bold", color: "#fff", letterSpacing: 4 },
    shareBtn: { backgroundColor: colors.primary, borderRadius: 12, paddingVertical: 14, alignItems: "center" },
    shareBtnText: { fontSize: 15, fontFamily: "Inter_600SemiBold", color: "#fff" },
    referralStats: { flexDirection: "row" as const, backgroundColor: colors.card, borderRadius: 12, padding: 16, borderWidth: 1, borderColor: colors.border },
    refStatItem: { flex: 1, alignItems: "center" },
    refStatValue: { fontSize: 18, fontFamily: "Inter_700Bold", color: colors.foreground },
    refStatLabel: { fontSize: 11, color: colors.mutedForeground, fontFamily: "Inter_400Regular", marginTop: 2 },
    earningInfo: { fontSize: 13, color: colors.mutedForeground, fontFamily: "Inter_400Regular", lineHeight: 20 },
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
    saveBtn: { backgroundColor: colors.primary, borderRadius: 12, paddingVertical: 14, alignItems: "center" },
    saveBtnText: { fontSize: 15, fontFamily: "Inter_600SemiBold", color: "#fff" },
    center: { flex: 1, justifyContent: "center", alignItems: "center", paddingTop: 80 },
    emptyTitle: { fontSize: 15, color: colors.mutedForeground, fontFamily: "Inter_500Medium" },
  });
}
