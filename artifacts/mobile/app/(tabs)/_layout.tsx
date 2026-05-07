import { BlurView } from "expo-blur";
import { Tabs } from "expo-router";
import { Feather } from "@expo/vector-icons";
import React from "react";
import { Platform, StyleSheet, View, Text } from "react-native";

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

export default function TabLayout() {
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
            <BlurView intensity={80} tint="dark" style={StyleSheet.absoluteFill} />
          ) : (
            <View style={[StyleSheet.absoluteFill, { backgroundColor: "#0A0C10" }]} />
          ),
      }}
    >
      <Tabs.Screen
        name="index"
        options={{
          tabBarIcon: ({ focused }) => (
            <GoldTabIcon focused={focused} icon="home" label="Play" />
          ),
        }}
      />
      <Tabs.Screen
        name="bets"
        options={{
          tabBarIcon: ({ focused }) => (
            <GoldTabIcon focused={focused} icon="bar-chart-2" label="Bets" />
          ),
        }}
      />
      <Tabs.Screen
        name="wallet"
        options={{
          tabBarIcon: ({ focused }) => (
            <GoldTabIcon focused={focused} icon="credit-card" label="Wallet" />
          ),
        }}
      />
      <Tabs.Screen
        name="profile"
        options={{
          tabBarIcon: ({ focused }) => (
            <GoldTabIcon focused={focused} icon="user" label="Profile" />
          ),
        }}
      />
    </Tabs>
  );
}
