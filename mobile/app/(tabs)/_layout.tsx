import { Tabs, useRouter } from "expo-router";
import { useEffect } from "react";
import { useSession } from "@/hooks/useSession";
import { colors } from "@/lib/colors";

function TabIcon({ label, active }: { label: string; active: boolean }) {
  const icons: Record<string, string> = { Home: "◆", Ops: "🧹", Requests: "🛎", Bookings: "📅", More: "⋯" };
  return null; // Expo renders label+icon together; we just use the label
}

export default function TabsLayout() {
  const { session } = useSession();
  const router = useRouter();

  useEffect(() => {
    if (!session) router.replace("/login");
  }, [session]);

  if (!session) return null;

  const role = session.role;

  return (
    <Tabs
      screenOptions={{
        tabBarActiveTintColor:   colors.accent,
        tabBarInactiveTintColor: colors.inkGhost,
        tabBarStyle:             { backgroundColor: colors.surface, borderTopColor: colors.line, paddingTop: 4 },
        headerStyle:             { backgroundColor: colors.ground },
        headerTintColor:         colors.ink,
        headerShadowVisible:     false,
      }}
    >
      <Tabs.Screen name="index"    options={{ title: "Home",     tabBarLabel: "Home" }} />
      <Tabs.Screen name="ops"      options={{ title: "Ops",      tabBarLabel: "Ops",      href: (role === "admin" || role === "ops" || role === "housekeeping" || role === "maintenance") ? undefined : null }} />
      <Tabs.Screen name="requests" options={{ title: "Requests", tabBarLabel: "Requests", href: (role === "admin" || role === "ops" || role === "concierge") ? undefined : null }} />
      <Tabs.Screen name="bookings" options={{ title: "Bookings", tabBarLabel: "Bookings", href: (role === "admin" || role === "ops" || role === "concierge") ? undefined : null }} />
      <Tabs.Screen name="more"     options={{ title: "More",     tabBarLabel: "More" }} />
    </Tabs>
  );
}
