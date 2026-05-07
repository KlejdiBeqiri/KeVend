import React from "react";
import { Pressable, StyleSheet } from "react-native";
import { Ionicons } from "@expo/vector-icons";
import { router } from "expo-router";

type Props = {
  top?: number;
  left?: number;
  href?: string;
};

export default function BackButton({ top = 78, left = 20, href }: Props) {
  return (
    <Pressable
      style={[styles.container, { top, left }]}
      onPress={() => (href ? router.replace(href as any) : router.back())}
      hitSlop={10}
    >
      <Ionicons name="arrow-back" size={24} color="#FFFFFF" />
    </Pressable>
  );
}

const styles = StyleSheet.create({
  container: {
    position: "absolute",
    zIndex: 20,
  },
});