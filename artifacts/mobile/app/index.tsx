import React, { useState, useEffect, useRef } from "react";
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
  Animated,
  Dimensions,
} from "react-native";
import { LinearGradient } from "expo-linear-gradient";
import { useRouter } from "expo-router";
import { useLogin, useRegister } from "@workspace/api-client-react";
import { useAuth } from "@/contexts/AuthContext";
import { useColors } from "@/hooks/useColors";
import * as Haptics from "expo-haptics";

const { width } = Dimensions.get("window");

type Mode = "login" | "register";

function AnimatedLight({ color, delay }: { color: string; delay: number }) {
  const scaleAnim = useRef(new Animated.Value(1)).current;
  const opacityAnim = useRef(new Animated.Value(0.7)).current;

  useEffect(() => {
    const pulse = Animated.loop(
      Animated.sequence([
        Animated.delay(delay),
        Animated.parallel([
          Animated.sequence([
            Animated.timing(scaleAnim, { toValue: 1.35, duration: 900, useNativeDriver: true }),
            Animated.timing(scaleAnim, { toValue: 1, duration: 900, useNativeDriver: true }),
          ]),
          Animated.sequence([
            Animated.timing(opacityAnim, { toValue: 1, duration: 900, useNativeDriver: true }),
            Animated.timing(opacityAnim, { toValue: 0.65, duration: 900, useNativeDriver: true }),
          ]),
        ]),
      ])
    );
    pulse.start();
    return () => pulse.stop();
  }, []);

  return (
    <Animated.View
      style={{
        transform: [{ scale: scaleAnim }],
        opacity: opacityAnim,
        width: 30,
        height: 30,
        borderRadius: 15,
        backgroundColor: color,
        shadowColor: color,
        shadowOffset: { width: 0, height: 0 },
        shadowOpacity: 0.9,
        shadowRadius: 14,
        elevation: 8,
      }}
    />
  );
}

export default function AuthScreen() {
  const colors = useColors();
  const router = useRouter();
  const { login } = useAuth();
  const [mode, setMode] = useState<Mode>("login");
  const [mobile, setMobile] = useState("");
  const [mpin, setMpin] = useState("");
  const [name, setName] = useState("");
  const [referralCode, setReferralCode] = useState("");

  const fadeAnim = useRef(new Animated.Value(0)).current;
  const slideAnim = useRef(new Animated.Value(40)).current;

  useEffect(() => {
    Animated.parallel([
      Animated.timing(fadeAnim, { toValue: 1, duration: 800, useNativeDriver: true }),
      Animated.timing(slideAnim, { toValue: 0, duration: 800, useNativeDriver: true }),
    ]).start();
  }, []);

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

    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);

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

  return (
    <LinearGradient
      colors={["#0A0C10", "#0D1018", "#131726"]}
      style={{ flex: 1 }}
    >
      <KeyboardAvoidingView
        style={{ flex: 1 }}
        behavior={Platform.OS === "ios" ? "padding" : undefined}
      >
        <ScrollView
          contentContainerStyle={styles.scroll}
          keyboardShouldPersistTaps="handled"
          showsVerticalScrollIndicator={false}
        >
          <Animated.View style={{ opacity: fadeAnim, transform: [{ translateY: slideAnim }] }}>
            {/* Logo area */}
            <View style={styles.logoArea}>
              <View style={styles.lightsContainer}>
                <View style={styles.lightsRow}>
                  <AnimatedLight color="#E53935" delay={0} />
                  <AnimatedLight color="#FBC02D" delay={300} />
                  <AnimatedLight color="#43A047" delay={600} />
                </View>
              </View>
              <Text style={styles.appName}>3 Batti</Text>
              <View style={styles.taglinePill}>
                <Text style={styles.tagline}>Premium Color & Number Game</Text>
              </View>

              {/* Banner stats */}
              <View style={styles.bannerRow}>
                <View style={styles.bannerItem}>
                  <Text style={styles.bannerValue}>4x</Text>
                  <Text style={styles.bannerLabel}>Daily Games</Text>
                </View>
                <View style={styles.bannerDivider} />
                <View style={styles.bannerItem}>
                  <Text style={styles.bannerValue}>9x</Text>
                  <Text style={styles.bannerLabel}>Max Win</Text>
                </View>
                <View style={styles.bannerDivider} />
                <View style={styles.bannerItem}>
                  <Text style={styles.bannerValue}>₹25</Text>
                  <Text style={styles.bannerLabel}>Signup Bonus</Text>
                </View>
              </View>
            </View>

            {/* Card */}
            <View style={styles.card}>
              {/* Mode toggle */}
              <View style={styles.toggle}>
                <TouchableOpacity
                  style={[styles.toggleBtn, mode === "login" && styles.toggleActive]}
                  onPress={() => { setMode("login"); Haptics.selectionAsync(); }}
                >
                  <Text style={[styles.toggleText, mode === "login" && styles.toggleActiveText]}>Login</Text>
                </TouchableOpacity>
                <TouchableOpacity
                  style={[styles.toggleBtn, mode === "register" && styles.toggleActive]}
                  onPress={() => { setMode("register"); Haptics.selectionAsync(); }}
                >
                  <Text style={[styles.toggleText, mode === "register" && styles.toggleActiveText]}>Register</Text>
                </TouchableOpacity>
              </View>

              {/* Form */}
              <View style={styles.form}>
                {mode === "register" && (
                  <View style={styles.inputWrapper}>
                    <Text style={styles.inputLabel}>Full Name</Text>
                    <TextInput
                      style={styles.input}
                      placeholder="Enter your name"
                      placeholderTextColor="#4A4E6A"
                      value={name}
                      onChangeText={setName}
                      autoCapitalize="words"
                    />
                  </View>
                )}
                <View style={styles.inputWrapper}>
                  <Text style={styles.inputLabel}>Mobile Number</Text>
                  <TextInput
                    style={styles.input}
                    placeholder="10-digit mobile number"
                    placeholderTextColor="#4A4E6A"
                    value={mobile}
                    onChangeText={setMobile}
                    keyboardType="phone-pad"
                    maxLength={10}
                  />
                </View>
                <View style={styles.inputWrapper}>
                  <Text style={styles.inputLabel}>6-digit MPIN</Text>
                  <TextInput
                    style={styles.input}
                    placeholder="••••••"
                    placeholderTextColor="#4A4E6A"
                    value={mpin}
                    onChangeText={setMpin}
                    keyboardType="number-pad"
                    maxLength={6}
                    secureTextEntry
                  />
                </View>
                {mode === "register" && (
                  <View style={styles.inputWrapper}>
                    <Text style={styles.inputLabel}>Referral Code (optional)</Text>
                    <TextInput
                      style={styles.input}
                      placeholder="Enter referral code"
                      placeholderTextColor="#4A4E6A"
                      value={referralCode}
                      onChangeText={setReferralCode}
                      autoCapitalize="characters"
                    />
                  </View>
                )}

                <TouchableOpacity
                  activeOpacity={0.85}
                  onPress={handleSubmit}
                  disabled={isPending}
                >
                  <LinearGradient
                    colors={isPending ? ["#6B5A1A", "#6B5A1A"] : ["#D4AF37", "#A07820"]}
                    start={{ x: 0, y: 0 }}
                    end={{ x: 1, y: 0 }}
                    style={styles.submitBtn}
                  >
                    {isPending ? (
                      <ActivityIndicator color="#0A0C10" />
                    ) : (
                      <Text style={styles.submitText}>
                        {mode === "login" ? "Login to Play" : "Create Account"}
                      </Text>
                    )}
                  </LinearGradient>
                </TouchableOpacity>
              </View>
            </View>

            <Text style={styles.footer}>
              {mode === "register"
                ? "₹25 signup bonus + ₹50 per referral"
                : "Play 4 games daily — 9AM · 1PM · 5PM · 9PM IST"}
            </Text>
          </Animated.View>
        </ScrollView>
      </KeyboardAvoidingView>
    </LinearGradient>
  );
}

const styles = StyleSheet.create({
  scroll: {
    flexGrow: 1,
    justifyContent: "center",
    paddingHorizontal: 20,
    paddingVertical: 48,
  },
  logoArea: {
    alignItems: "center",
    marginBottom: 32,
  },
  lightsContainer: {
    width: 120,
    height: 120,
    borderRadius: 60,
    backgroundColor: "rgba(212,175,55,0.06)",
    justifyContent: "center",
    alignItems: "center",
    marginBottom: 16,
    borderWidth: 1,
    borderColor: "rgba(212,175,55,0.15)",
  },
  lightsRow: {
    flexDirection: "row",
    gap: 16,
    alignItems: "center",
  },
  appName: {
    fontSize: 46,
    fontWeight: "800",
    color: "#D4AF37",
    fontFamily: "Inter_700Bold",
    letterSpacing: -1,
    textShadowColor: "rgba(212,175,55,0.4)",
    textShadowOffset: { width: 0, height: 0 },
    textShadowRadius: 20,
  },
  taglinePill: {
    backgroundColor: "rgba(212,175,55,0.12)",
    borderRadius: 20,
    paddingHorizontal: 14,
    paddingVertical: 5,
    marginTop: 8,
    borderWidth: 1,
    borderColor: "rgba(212,175,55,0.2)",
  },
  tagline: {
    fontSize: 12,
    color: "#D4AF37",
    fontFamily: "Inter_500Medium",
    letterSpacing: 0.5,
  },
  bannerRow: {
    flexDirection: "row",
    marginTop: 20,
    backgroundColor: "rgba(26,29,40,0.8)",
    borderRadius: 14,
    paddingVertical: 14,
    paddingHorizontal: 12,
    borderWidth: 1,
    borderColor: "rgba(212,175,55,0.15)",
    width: width - 40,
  },
  bannerItem: {
    flex: 1,
    alignItems: "center",
  },
  bannerValue: {
    fontSize: 22,
    fontFamily: "Inter_700Bold",
    color: "#D4AF37",
  },
  bannerLabel: {
    fontSize: 11,
    color: "#8B8FA8",
    fontFamily: "Inter_400Regular",
    marginTop: 2,
  },
  bannerDivider: {
    width: 1,
    backgroundColor: "rgba(212,175,55,0.15)",
  },
  card: {
    backgroundColor: "#12151E",
    borderRadius: 20,
    padding: 20,
    borderWidth: 1,
    borderColor: "rgba(212,175,55,0.12)",
    shadowColor: "#D4AF37",
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.08,
    shadowRadius: 20,
    elevation: 8,
  },
  toggle: {
    flexDirection: "row",
    backgroundColor: "#1A1D28",
    borderRadius: 12,
    padding: 4,
    marginBottom: 20,
  },
  toggleBtn: {
    flex: 1,
    paddingVertical: 10,
    alignItems: "center",
    borderRadius: 10,
  },
  toggleActive: {
    backgroundColor: "rgba(212,175,55,0.15)",
    borderWidth: 1,
    borderColor: "rgba(212,175,55,0.3)",
  },
  toggleText: {
    fontSize: 14,
    color: "#8B8FA8",
    fontFamily: "Inter_500Medium",
  },
  toggleActiveText: {
    color: "#D4AF37",
    fontFamily: "Inter_600SemiBold",
  },
  form: { gap: 14 },
  inputWrapper: { gap: 6 },
  inputLabel: {
    fontSize: 12,
    color: "#8B8FA8",
    fontFamily: "Inter_500Medium",
    letterSpacing: 0.3,
  },
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
  submitBtn: {
    borderRadius: 12,
    paddingVertical: 15,
    alignItems: "center",
    marginTop: 4,
  },
  submitText: {
    fontSize: 16,
    fontWeight: "700",
    color: "#0A0C10",
    fontFamily: "Inter_700Bold",
    letterSpacing: 0.5,
  },
  footer: {
    textAlign: "center",
    marginTop: 20,
    fontSize: 13,
    color: "#8B8FA8",
    fontFamily: "Inter_400Regular",
  },
});
