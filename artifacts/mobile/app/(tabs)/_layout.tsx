import { BlurView } from "expo-blur";
import { isLiquidGlassAvailable } from "expo-glass-effect";
import { Tabs } from "expo-router";
import { Icon, Label, NativeTabs } from "expo-router/unstable-native-tabs";
import { SymbolView } from "expo-symbols";
import { Feather } from "@expo/vector-icons";
import React from "react";
import { Platform, StyleSheet, View, useColorScheme, Text } from "react-native";
import { LinearGradient } from "expo-linear-gradient";

function NativeTabLayout() {
  return (
    <NativeTabs>
      <NativeTabs.Trigger name="index">
        <Icon sf={{ default: "house", selected: "house.fill" }} />
        <Label>Home</Label>
      </NativeTabs.Trigger>
      <NativeTabs.Trigger name="bets">
        <Icon sf={{ default: "chart.bar", selected: "chart.bar.fill" }} />
        <Label>Bets</Label>
      </NativeTabs.Trigger>
      <NativeTabs.Trigger name="wallet">
        <Icon sf={{ default: "wallet.pass", selected: "wallet.pass.fill" }} />
        <Label>Wallet</Label>
      </NativeTabs.Trigger>
      <NativeTabs.Trigger name="profile">
        <Icon sf={{ default: "person", selected: "person.fill" }} />
        <Label>Profile</Label>
      </NativeTabs.Trigger>
    </NativeTabs>
  );
}

function GoldTabIcon({ focused, icon, label }: { focused: boolean; icon: string; label: string }) {
  return (
    <View style={{ alignItems: "center", paddingTop: 6 }}>
      <Feather name={icon as any} size={22} color={focused ? "#D4AF37" : "#8B8FA8"} />
      <Text style={{
        fontSize: 10,
        marginTop: 3,
        fontFamily: "Inter_500Medium",
        color: focused ? "#D4AF37" : "#8B8FA8",
      }}>
        {label}
      </Text>
    </View>
  );
}

function ClassicTabLayout() {
  const colorScheme = useColorScheme();
  const isIOS = Platform.OS === "ios";
  const isWeb = Platform.OS === "web";

  return (
    <Tabs
      screenOptions={{
        tabBarActiveTintColor: "#D4AF37",
        tabBarInactiveTintColor: "#8B8FA8",
        headerShown: false,
        tabBarShowLabel: false,
        tabBarStyle: {
          position: "absolute",
          backgroundColor: isIOS ? "transparent" : "#0A0C10",
          borderTopWidth: 1,
          borderTopColor: "rgba(212,175,55,0.15)",
          elevation: 0,
          height: isWeb ? 84 : 64,
        },
        tabBarBackground: () =>
          isIOS ? (
            <BlurView
              intensity={80}
              tint="dark"
              style={StyleSheet.absoluteFill}
            />
          ) : (
            <View style={[StyleSheet.absoluteFill, { backgroundColor: "#0A0C10" }]} />
          ),
      }}
    >
      <Tabs.Screen
        name="index"
        options={{
          tabBarIcon: ({ focused }) =>
            isIOS ? (
              <View style={{ alignItems: "center", paddingTop: 6 }}>
                <SymbolView name={focused ? "house.fill" : "house"} tintColor={focused ? "#D4AF37" : "#8B8FA8"} size={22} />
                <Text style={{ fontSize: 10, marginTop: 3, fontFamily: "Inter_500Medium", color: focused ? "#D4AF37" : "#8B8FA8" }}>Play</Text>
              </View>
            ) : (
              <GoldTabIcon focused={focused} icon="home" label="Play" />
            ),
        }}
      />
      <Tabs.Screen
        name="bets"
        options={{
          tabBarIcon: ({ focused }) =>
            isIOS ? (
              <View style={{ alignItems: "center", paddingTop: 6 }}>
                <SymbolView name={focused ? "chart.bar.fill" : "chart.bar"} tintColor={focused ? "#D4AF37" : "#8B8FA8"} size={22} />
                <Text style={{ fontSize: 10, marginTop: 3, fontFamily: "Inter_500Medium", color: focused ? "#D4AF37" : "#8B8FA8" }}>Bets</Text>
              </View>
            ) : (
              <GoldTabIcon focused={focused} icon="bar-chart-2" label="Bets" />
            ),
        }}
      />
      <Tabs.Screen
        name="wallet"
        options={{
          tabBarIcon: ({ focused }) =>
            isIOS ? (
              <View style={{ alignItems: "center", paddingTop: 6 }}>
                <SymbolView name={focused ? "creditcard.fill" : "creditcard"} tintColor={focused ? "#D4AF37" : "#8B8FA8"} size={22} />
                <Text style={{ fontSize: 10, marginTop: 3, fontFamily: "Inter_500Medium", color: focused ? "#D4AF37" : "#8B8FA8" }}>Wallet</Text>
              </View>
            ) : (
              <GoldTabIcon focused={focused} icon="credit-card" label="Wallet" />
            ),
        }}
      />
      <Tabs.Screen
        name="profile"
        options={{
          tabBarIcon: ({ focused }) =>
            isIOS ? (
              <View style={{ alignItems: "center", paddingTop: 6 }}>
                <SymbolView name={focused ? "person.fill" : "person"} tintColor={focused ? "#D4AF37" : "#8B8FA8"} size={22} />
                <Text style={{ fontSize: 10, marginTop: 3, fontFamily: "Inter_500Medium", color: focused ? "#D4AF37" : "#8B8FA8" }}>Profile</Text>
              </View>
            ) : (
              <GoldTabIcon focused={focused} icon="user" label="Profile" />
            ),
        }}
      />
    </Tabs>
  );
}

export default function TabLayout() {
  if (isLiquidGlassAvailable()) {
    return <NativeTabLayout />;
  }
  return <ClassicTabLayout />;
}
