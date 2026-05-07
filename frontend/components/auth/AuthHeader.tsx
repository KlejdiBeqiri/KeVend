import React from "react";
import { Image, StyleSheet, Text, View } from "react-native";
import colors from "../../constants/colors";
import fonts from "../../constants/fonts";

type Props = {
  title: string;
  subtitle?: string;
  compact?: boolean;
};

export default function AuthHeader({ title, subtitle, compact }: Props) {
  return (
    <View style={[styles.container, compact && styles.compactContainer]}>
      <Image
        source={require("../../assets/logo.png")}
        style={[styles.logo, compact && styles.compactLogo]}
        resizeMode="contain"
      />

      <Text style={styles.title}>{title}</Text>

      {subtitle ? <Text style={styles.subtitle}>{subtitle}</Text> : null}
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    alignItems: "center",
    marginTop: 100, 
  },

  compactContainer: {
    marginTop: 40, 
  },

  logo: {
    width: 174,       
    height: 57,
    marginBottom: 110, 
  },

  compactLogo: {
    marginBottom: 40, 
  },


  title: {
    fontSize: 36,     
    color: colors.white,
    fontWeight: "600", 
    fontFamily: fonts.interSemiBold,
    textAlign: "center",
    marginBottom: 20,
  },

  subtitle: {
    fontSize: 18,     
    color: colors.white,
    fontFamily: fonts.sansationLight,
    textAlign: "center",
    opacity: 0.9,
    maxWidth: 400,
  },
});