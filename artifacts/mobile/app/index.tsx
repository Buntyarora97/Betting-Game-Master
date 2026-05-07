import React, { useState } from "react";
import {
  View,
  Text,
  TextInput,
  TouchableOpacity,
  StyleSheet,
  ActivityIndicator,
  Alert,
  ScrollView,
  KeyboardAvoidingView,
  Platform,
} from "react-native";
import { useRouter } from "expo-router";
import { useLogin, useRegister } from "@workspace/api-client-react";
import { useAuth } from "@/contexts/AuthContext";
import { useColors } from "@/hooks/useColors";
import * as Haptics from "expo-haptics";

type Mode = "login" | "register";

export default function AuthScreen() {
  const colors = useColors();
  const router = useRouter();
  const { login } = useAuth();
  const [mode, setMode] = useState<Mode>("login");
  const [mobile, setMobile] = useState("");
  const [mpin, setMpin] = useState("");
  const [name, setName] = useState("");
  const [referralCode, setReferralCode] = useState("");

  const loginMutation = useLogin();
  const registerMutation = useRegister();

  const isPending = loginMutation.isPending || registerMutation.isPending;

  const handleSubmit = async () => {
    if (!mobile || !mpin) {
      Alert.alert("Required", "Please enter mobile and MPIN");
      return;
    }
    if (mpin.length !== 6) {
      Alert.alert("Invalid MPIN", "MPIN must be exactly 6 digits");
      return;
    }
    if (mode === "register" && !name) {
      Alert.alert("Required", "Please enter your name");
      return;
    }

    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);

    try {
      if (mode === "login") {
        const data = await loginMutation.mutateAsync({ data: { mobile, mpin } });
        const d = data as any;
        await login(d.accessToken, d.refreshToken, d.user);
      } else {
        const data = await registerMutation.mutateAsync({
          data: { mobile, mpin, name, referralCode: referralCode || undefined },
        });
        const d = data as any;
        await login(d.accessToken, d.refreshToken, d.user);
      }
      router.replace("/(tabs)");
    } catch (e: any) {
      const msg = e?.data?.message || e?.message || "Something went wrong";
      Alert.alert("Error", msg);
    }
  };

  const s = makeStyles(colors);

  return (
    <KeyboardAvoidingView
      style={s.root}
      behavior={Platform.OS === "ios" ? "padding" : undefined}
    >
      <ScrollView
        contentContainerStyle={s.scroll}
        keyboardShouldPersistTaps="handled"
        showsVerticalScrollIndicator={false}
      >
        {/* Logo */}
        <View style={s.logoArea}>
          <View style={s.lights}>
            <View style={[s.light, { backgroundColor: colors.red }]} />
            <View style={[s.light, { backgroundColor: colors.yellow }]} />
            <View style={[s.light, { backgroundColor: colors.green }]} />
          </View>
          <Text style={s.appName}>3 Batti</Text>
          <Text style={s.tagline}>Color & Number Betting Game</Text>
        </View>

        {/* Mode toggle */}
        <View style={s.toggle}>
          <TouchableOpacity
            style={[s.toggleBtn, mode === "login" && s.toggleActive]}
            onPress={() => setMode("login")}
          >
            <Text style={[s.toggleText, mode === "login" && s.toggleActiveText]}>Login</Text>
          </TouchableOpacity>
          <TouchableOpacity
            style={[s.toggleBtn, mode === "register" && s.toggleActive]}
            onPress={() => setMode("register")}
          >
            <Text style={[s.toggleText, mode === "register" && s.toggleActiveText]}>Register</Text>
          </TouchableOpacity>
        </View>

        {/* Form */}
        <View style={s.form}>
          {mode === "register" && (
            <TextInput
              style={s.input}
              placeholder="Full Name"
              placeholderTextColor={colors.mutedForeground}
              value={name}
              onChangeText={setName}
              autoCapitalize="words"
            />
          )}
          <TextInput
            style={s.input}
            placeholder="Mobile Number"
            placeholderTextColor={colors.mutedForeground}
            value={mobile}
            onChangeText={setMobile}
            keyboardType="phone-pad"
            maxLength={10}
          />
          <TextInput
            style={s.input}
            placeholder="6-digit MPIN"
            placeholderTextColor={colors.mutedForeground}
            value={mpin}
            onChangeText={setMpin}
            keyboardType="number-pad"
            maxLength={6}
            secureTextEntry
          />
          {mode === "register" && (
            <TextInput
              style={s.input}
              placeholder="Referral Code (optional)"
              placeholderTextColor={colors.mutedForeground}
              value={referralCode}
              onChangeText={setReferralCode}
              autoCapitalize="characters"
            />
          )}

          <TouchableOpacity
            style={[s.submitBtn, isPending && s.submitBtnDisabled]}
            onPress={handleSubmit}
            disabled={isPending}
            activeOpacity={0.8}
          >
            {isPending ? (
              <ActivityIndicator color="#fff" />
            ) : (
              <Text style={s.submitText}>
                {mode === "login" ? "Login" : "Create Account"}
              </Text>
            )}
          </TouchableOpacity>
        </View>

        <Text style={s.footer}>
          {mode === "register" ? "₹25 signup bonus + ₹50 referral reward" : "Play 4 games daily — 9AM, 1PM, 5PM, 9PM IST"}
        </Text>
      </ScrollView>
    </KeyboardAvoidingView>
  );
}

function makeStyles(colors: any) {
  return StyleSheet.create({
    root: { flex: 1, backgroundColor: colors.background },
    scroll: {
      flexGrow: 1,
      justifyContent: "center",
      paddingHorizontal: 24,
      paddingVertical: 48,
    },
    logoArea: { alignItems: "center", marginBottom: 40 },
    lights: { flexDirection: "row", gap: 12, marginBottom: 16 },
    light: {
      width: 24,
      height: 24,
      borderRadius: 12,
      shadowColor: "#fff",
      shadowOpacity: 0.3,
      shadowRadius: 8,
      elevation: 4,
    },
    appName: {
      fontSize: 42,
      fontWeight: "700" as const,
      color: colors.foreground,
      fontFamily: "Inter_700Bold",
      letterSpacing: -1,
    },
    tagline: {
      fontSize: 14,
      color: colors.mutedForeground,
      marginTop: 4,
      fontFamily: "Inter_400Regular",
    },
    toggle: {
      flexDirection: "row",
      backgroundColor: colors.secondary,
      borderRadius: 12,
      padding: 4,
      marginBottom: 24,
    },
    toggleBtn: {
      flex: 1,
      paddingVertical: 10,
      alignItems: "center",
      borderRadius: 10,
    },
    toggleActive: { backgroundColor: colors.card },
    toggleText: {
      fontSize: 14,
      color: colors.mutedForeground,
      fontFamily: "Inter_500Medium",
    },
    toggleActiveText: { color: colors.foreground },
    form: { gap: 12 },
    input: {
      backgroundColor: colors.input,
      borderWidth: 1,
      borderColor: colors.border,
      borderRadius: 12,
      paddingHorizontal: 16,
      paddingVertical: 14,
      fontSize: 15,
      color: colors.foreground,
      fontFamily: "Inter_400Regular",
    },
    submitBtn: {
      backgroundColor: colors.primary,
      borderRadius: 12,
      paddingVertical: 15,
      alignItems: "center",
      marginTop: 8,
    },
    submitBtnDisabled: { opacity: 0.6 },
    submitText: {
      fontSize: 16,
      fontWeight: "600" as const,
      color: "#fff",
      fontFamily: "Inter_600SemiBold",
    },
    footer: {
      textAlign: "center",
      marginTop: 24,
      fontSize: 13,
      color: colors.mutedForeground,
      fontFamily: "Inter_400Regular",
    },
  });
}
