import { Tabs } from "expo-router";
import BottomTabBar from "@/components/navigation/BottomTabBar";

export default function TabsLayout() {
  return (
    <Tabs
      tabBar={(props) => <BottomTabBar {...props} />}
      screenOptions={{ headerShown: false }}
    >
      <Tabs.Screen name="map" />
      <Tabs.Screen name="home" />
      <Tabs.Screen name="notifications" />
      <Tabs.Screen name="account" />
    </Tabs>
  );
}
