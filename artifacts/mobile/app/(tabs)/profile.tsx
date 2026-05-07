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
import { LinearGradient } from "expo-linear-gradient";
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

  if (!isAuthenticated) {
    return (
      <View style={styles.center}>
        <Text style={styles.emptyTitle}>Login to view profile</Text>
      </View>
    );
  }

  const handleShare = () => {
    const code = profile?.referralCode;
    if (!code) return;
    Share.share({
      message: `Join 3 Batti and win big! Use my referral code ${code} to get ₹25 bonus. Play 4 games daily!`,
    });
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
  };

  const handleSaveBank = async () => {
    try {
      await updateBankMutation.mutateAsync({
        data: { upiId, accountNumber, ifsc, accountHolderName: holderName },
      });
      Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
      Alert.alert("Saved ✓", "Bank details updated successfully");
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

  const initials = profile?.name?.split(" ").map((w: string) => w[0]).slice(0, 2).join("").toUpperCase() || "?";

  return (
    <ScrollView
      style={{ flex: 1, backgroundColor: "#0A0C10" }}
      contentContainerStyle={{ paddingBottom: 120 }}
      showsVerticalScrollIndicator={false}
    >
      {/* Profile Hero */}
      <LinearGradient
        colors={["#1A1200", "#2A1E00", "#0A0C10"]}
        style={styles.heroArea}
      >
        <LinearGradient
          colors={["#D4AF37", "#A07820"]}
          style={styles.avatar}
        >
          <Text style={styles.avatarText}>{initials}</Text>
        </LinearGradient>
        <Text style={styles.name}>{profile?.name || "Player"}</Text>
        <Text style={styles.mobile}>{profile?.mobile}</Text>
        <View style={[styles.kycBadge, {
          backgroundColor: profile?.kycStatus === "verified" ? "#43A04720" : "#FBC02D20",
          borderColor: profile?.kycStatus === "verified" ? "#43A047" : "#FBC02D",
        }]}>
          <Text style={[styles.kycText, {
            color: profile?.kycStatus === "verified" ? "#43A047" : "#FBC02D",
          }]}>
            KYC: {profile?.kycStatus?.toUpperCase() || "PENDING"}
          </Text>
        </View>
      </LinearGradient>

      <View style={{ paddingHorizontal: 16 }}>
        {/* Stats Row */}
        <View style={styles.statsCard}>
          <View style={styles.statItem}>
            <Text style={styles.statValue}>₹{Number(profile?.walletBalance || 0).toFixed(0)}</Text>
            <Text style={styles.statLabel}>Balance</Text>
          </View>
          <View style={styles.statDivider} />
          <View style={styles.statItem}>
            <Text style={styles.statValue}>{referral?.totalReferrals || 0}</Text>
            <Text style={styles.statLabel}>Referrals</Text>
          </View>
          <View style={styles.statDivider} />
          <View style={styles.statItem}>
            <Text style={styles.statValue}>₹{Number(referral?.totalEarnings || 0).toFixed(0)}</Text>
            <Text style={styles.statLabel}>Earned</Text>
          </View>
        </View>

        {/* Tabs */}
        <View style={styles.tabs}>
          {(["info", "referral", "bank"] as ProfileTab[]).map((t) => (
            <TouchableOpacity
              key={t}
              style={styles.tabBtn}
              onPress={() => { setActiveTab(t); Haptics.selectionAsync(); }}
            >
              {activeTab === t ? (
                <LinearGradient
                  colors={["#D4AF37", "#A07820"]}
                  start={{ x: 0, y: 0 }}
                  end={{ x: 1, y: 0 }}
                  style={styles.tabBtnActive}
                >
                  <Text style={styles.tabTextActive}>{t.charAt(0).toUpperCase() + t.slice(1)}</Text>
                </LinearGradient>
              ) : (
                <Text style={styles.tabText}>{t.charAt(0).toUpperCase() + t.slice(1)}</Text>
              )}
            </TouchableOpacity>
          ))}
        </View>

        {/* Info Tab */}
        {activeTab === "info" && (
          <View style={styles.section}>
            {[
              { label: "Mobile Number", value: profile?.mobile },
              { label: "Referral Code", value: profile?.referralCode },
              { label: "Member Since", value: profile?.createdAt ? new Date(profile.createdAt).toLocaleDateString("en-IN") : "-" },
              { label: "Account Status", value: profile?.isBlocked ? "BLOCKED" : "Active", valueColor: profile?.isBlocked ? "#E53935" : "#43A047" },
            ].map((row, i) => (
              <View key={i} style={styles.infoRow}>
                <Text style={styles.infoLabel}>{row.label}</Text>
                <Text style={[styles.infoValue, row.valueColor ? { color: row.valueColor } : {}]}>{row.value}</Text>
              </View>
            ))}

            <TouchableOpacity
              style={styles.logoutBtn}
              onPress={() => {
                Alert.alert("Logout", "Are you sure you want to logout?", [
                  { text: "Cancel" },
                  { text: "Logout", style: "destructive", onPress: logout },
                ]);
              }}
            >
              <Text style={styles.logoutText}>Logout</Text>
            </TouchableOpacity>
          </View>
        )}

        {/* Referral Tab */}
        {activeTab === "referral" && (
          <View style={styles.section}>
            <LinearGradient
              colors={["#1A1200", "#2A1E00"]}
              style={styles.referralCard}
            >
              <Text style={styles.referralCodeLabel}>Your Referral Code</Text>
              <Text style={styles.referralCodeValue}>{profile?.referralCode}</Text>
              <Text style={styles.referralSubLabel}>Share & earn ₹50 per friend</Text>
            </LinearGradient>

            <TouchableOpacity onPress={handleShare} activeOpacity={0.85}>
              <LinearGradient colors={["#D4AF37", "#A07820"]} start={{ x: 0, y: 0 }} end={{ x: 1, y: 0 }} style={styles.shareBtn}>
                <Text style={styles.shareBtnText}>Share & Earn ₹50</Text>
              </LinearGradient>
            </TouchableOpacity>

            <View style={styles.referralStats}>
              {[
                { value: String(referral?.totalReferrals || 0), label: "Friends Joined" },
                { value: `₹${Number(referral?.totalEarnings || 0).toFixed(0)}`, label: "Total Earned" },
                { value: `₹${Number(referral?.pendingEarnings || 0).toFixed(0)}`, label: "Pending" },
              ].map((s, i) => (
                <View key={i} style={[styles.refStat, i < 2 && styles.refStatBorder]}>
                  <Text style={styles.refStatValue}>{s.value}</Text>
                  <Text style={styles.refStatLabel}>{s.label}</Text>
                </View>
              ))}
            </View>

            <View style={styles.earningInfoCard}>
              <Text style={styles.earningInfoTitle}>How Referral Earning Works</Text>
              <Text style={styles.earningInfo}>
                • Earn ₹50 when a friend makes their first deposit{"\n"}
                • Earn 1% commission on every bet they place{"\n"}
                • Unlimited referrals, unlimited earnings
              </Text>
            </View>
          </View>
        )}

        {/* Bank Tab */}
        {activeTab === "bank" && (
          <View style={styles.section}>
            <Text style={styles.sectionTitle}>Payment Details for Withdrawal</Text>
            {[
              { label: "UPI ID", placeholder: "yourname@bank", value: upiId, setter: setUpiId },
              { label: "Account Holder Name", placeholder: "Full name as per bank", value: holderName, setter: setHolderName },
              { label: "Account Number", placeholder: "Bank account number", value: accountNumber, setter: setAccountNumber, numeric: true },
              { label: "IFSC Code", placeholder: "e.g. HDFC0001234", value: ifsc, setter: setIfsc, caps: true },
            ].map((field, i) => (
              <View key={i} style={styles.inputWrapper}>
                <Text style={styles.inputLabel}>{field.label}</Text>
                <TextInput
                  style={styles.input}
                  placeholder={field.placeholder}
                  placeholderTextColor="#4A4E6A"
                  value={field.value}
                  onChangeText={field.setter}
                  keyboardType={field.numeric ? "numeric" : "default"}
                  autoCapitalize={field.caps ? "characters" : "none"}
                />
              </View>
            ))}
            <TouchableOpacity onPress={handleSaveBank} disabled={updateBankMutation.isPending} activeOpacity={0.85}>
              <LinearGradient colors={["#D4AF37", "#A07820"]} start={{ x: 0, y: 0 }} end={{ x: 1, y: 0 }} style={styles.saveBtn}>
                {updateBankMutation.isPending ? (
                  <ActivityIndicator color="#0A0C10" />
                ) : (
                  <Text style={styles.saveBtnText}>Save Bank Details</Text>
                )}
              </LinearGradient>
            </TouchableOpacity>
          </View>
        )}
      </View>
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  heroArea: {
    paddingTop: Platform.OS === "web" ? 80 : 52,
    paddingBottom: 28,
    alignItems: "center",
  },
  avatar: {
    width: 80,
    height: 80,
    borderRadius: 40,
    justifyContent: "center",
    alignItems: "center",
    marginBottom: 12,
    shadowColor: "#D4AF37",
    shadowOffset: { width: 0, height: 0 },
    shadowOpacity: 0.5,
    shadowRadius: 16,
    elevation: 8,
  },
  avatarText: { fontSize: 28, fontFamily: "Inter_700Bold", color: "#0A0C10" },
  name: { fontSize: 22, fontFamily: "Inter_700Bold", color: "#F0EAD6" },
  mobile: { fontSize: 14, color: "#8B8FA8", fontFamily: "Inter_400Regular", marginTop: 2 },
  kycBadge: {
    marginTop: 10,
    borderRadius: 20,
    paddingHorizontal: 14,
    paddingVertical: 5,
    borderWidth: 1,
  },
  kycText: { fontSize: 11, fontFamily: "Inter_600SemiBold", letterSpacing: 0.5 },
  statsCard: {
    flexDirection: "row",
    backgroundColor: "#12151E",
    borderRadius: 16,
    padding: 16,
    marginBottom: 16,
    marginTop: 16,
    borderWidth: 1,
    borderColor: "rgba(212,175,55,0.15)",
  },
  statItem: { flex: 1, alignItems: "center" },
  statValue: { fontSize: 18, fontFamily: "Inter_700Bold", color: "#D4AF37" },
  statLabel: { fontSize: 11, color: "#8B8FA8", fontFamily: "Inter_400Regular", marginTop: 2 },
  statDivider: { width: 1, backgroundColor: "#242840" },
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
  section: { gap: 14 },
  sectionTitle: { fontSize: 15, fontFamily: "Inter_700Bold", color: "#F0EAD6" },
  infoRow: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    paddingVertical: 13,
    borderBottomWidth: 1,
    borderBottomColor: "#1A1D28",
  },
  infoLabel: { fontSize: 14, color: "#8B8FA8", fontFamily: "Inter_400Regular" },
  infoValue: { fontSize: 14, fontFamily: "Inter_600SemiBold", color: "#F0EAD6" },
  logoutBtn: {
    marginTop: 8,
    backgroundColor: "#E5393520",
    borderRadius: 12,
    paddingVertical: 14,
    alignItems: "center",
    borderWidth: 1,
    borderColor: "#E5393540",
  },
  logoutText: { fontSize: 15, fontFamily: "Inter_600SemiBold", color: "#E53935" },
  referralCard: {
    borderRadius: 16,
    padding: 20,
    alignItems: "center",
    borderWidth: 1,
    borderColor: "rgba(212,175,55,0.2)",
  },
  referralCodeLabel: { fontSize: 11, color: "rgba(212,175,55,0.6)", fontFamily: "Inter_500Medium", letterSpacing: 1 },
  referralCodeValue: { fontSize: 32, fontFamily: "Inter_700Bold", color: "#D4AF37", letterSpacing: 6, marginVertical: 6 },
  referralSubLabel: { fontSize: 12, color: "#8B8FA8", fontFamily: "Inter_400Regular" },
  shareBtn: { borderRadius: 12, paddingVertical: 14, alignItems: "center" },
  shareBtnText: { fontSize: 15, fontFamily: "Inter_700Bold", color: "#0A0C10" },
  referralStats: {
    flexDirection: "row",
    backgroundColor: "#12151E",
    borderRadius: 14,
    padding: 16,
    borderWidth: 1,
    borderColor: "#242840",
  },
  refStat: { flex: 1, alignItems: "center" },
  refStatBorder: { borderRightWidth: 1, borderRightColor: "#242840" },
  refStatValue: { fontSize: 18, fontFamily: "Inter_700Bold", color: "#F0EAD6" },
  refStatLabel: { fontSize: 11, color: "#8B8FA8", fontFamily: "Inter_400Regular", marginTop: 2 },
  earningInfoCard: {
    backgroundColor: "#12151E",
    borderRadius: 14,
    padding: 16,
    borderWidth: 1,
    borderColor: "rgba(212,175,55,0.1)",
  },
  earningInfoTitle: { fontSize: 13, fontFamily: "Inter_700Bold", color: "#D4AF37", marginBottom: 8 },
  earningInfo: { fontSize: 13, color: "#8B8FA8", fontFamily: "Inter_400Regular", lineHeight: 22 },
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
  saveBtn: { borderRadius: 12, paddingVertical: 14, alignItems: "center" },
  saveBtnText: { fontSize: 15, fontFamily: "Inter_700Bold", color: "#0A0C10" },
  center: { flex: 1, justifyContent: "center", alignItems: "center", paddingTop: 80, backgroundColor: "#0A0C10" },
  emptyTitle: { fontSize: 15, color: "#8B8FA8", fontFamily: "Inter_500Medium" },
});
