import { useEffect, useState } from "react";
import { Stack } from "expo-router";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { StatusBar } from "expo-status-bar";
import { SessionContext } from "@/hooks/useSession";
import { getSession, type StoredSession } from "@/lib/auth";
import { colors } from "@/lib/colors";
import * as SplashScreen from "expo-splash-screen";

SplashScreen.preventAutoHideAsync();

const queryClient = new QueryClient({
  defaultOptions: { queries: { staleTime: 30_000, retry: 1 } },
});

export default function RootLayout() {
  const [session, setSession] = useState<StoredSession | null>(null);
  const [ready, setReady] = useState(false);

  useEffect(() => {
    getSession().then((s) => { setSession(s); setReady(true); SplashScreen.hideAsync(); });
  }, []);

  if (!ready) return null;

  return (
    <QueryClientProvider client={queryClient}>
      <SessionContext.Provider value={{ session, setSession }}>
        <StatusBar style="dark" />
        <Stack
          screenOptions={{
            headerStyle:     { backgroundColor: colors.ground },
            headerTintColor: colors.ink,
            headerBackTitle: "Back",
            contentStyle:    { backgroundColor: colors.ground },
            headerShadowVisible: false,
          }}
        >
          <Stack.Screen name="login" options={{ headerShown: false }} />
          <Stack.Screen name="(tabs)" options={{ headerShown: false }} />
          <Stack.Screen name="turnover/[id]"    options={{ title: "Cleaning Task" }} />
          <Stack.Screen name="maintenance/[id]" options={{ title: "Ticket" }} />
          <Stack.Screen name="maintenance/new"  options={{ title: "New Ticket" }} />
          <Stack.Screen name="booking/[id]"     options={{ title: "Booking" }} />
          <Stack.Screen name="request/guest/[id]"   options={{ title: "Guest Request" }} />
          <Stack.Screen name="request/service/[id]" options={{ title: "Service Request" }} />
          <Stack.Screen name="inventory/[propertyId]" options={{ title: "Inventory" }} />
          <Stack.Screen name="team/index"    options={{ title: "Team" }} />
          <Stack.Screen name="services/index" options={{ title: "Services" }} />
        </Stack>
      </SessionContext.Provider>
    </QueryClientProvider>
  );
}
