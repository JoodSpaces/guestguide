import { useState } from "react";
import { ScrollView, RefreshControl, View, TouchableOpacity, Text, StyleSheet } from "react-native";
import { useRouter } from "expo-router";
import { useQuery } from "@tanstack/react-query";
import { api } from "@/lib/api";
import { SectionHeader, Row, Empty, StatusPill } from "@/components/Ui";
import { colors, spacing } from "@/lib/colors";

type Tab = "guest" | "service";

function prop(obj: unknown): string {
  const p = Array.isArray(obj) ? obj[0] : obj;
  return (p as { name: string } | null)?.name ?? "";
}

export default function RequestsTab() {
  const router = useRouter();
  const [tab, setTab] = useState<Tab>("guest");
  const { data, isRefetching, refetch } = useQuery({ queryKey: ["requests"], queryFn: api.requests.list });

  const guests   = (data?.guestRequests   ?? []).filter(r => r.status !== "resolved");
  const services = (data?.serviceRequests ?? []).filter(r => r.status !== "rejected" && r.status !== "fulfilled");

  return (
    <ScrollView
      style={{ flex: 1, backgroundColor: colors.ground }}
      contentContainerStyle={{ padding: spacing.lg }}
      refreshControl={<RefreshControl refreshing={isRefetching} onRefresh={refetch} tintColor={colors.accent} />}
    >
      <View style={styles.switcher}>
        {(["guest", "service"] as Tab[]).map((t) => (
          <TouchableOpacity key={t} onPress={() => setTab(t)} style={[styles.switchBtn, tab === t && styles.switchActive]}>
            <Text style={[styles.switchText, tab === t && { color: colors.ink }]}>
              {t === "guest" ? `Guest  (${guests.length})` : `Service  (${services.length})`}
            </Text>
          </TouchableOpacity>
        ))}
      </View>

      {tab === "guest" && (
        <>
          <SectionHeader title="Guest requests" count={guests.length} />
          {!guests.length
            ? <Empty icon="✓" message="No open guest requests" />
            : guests.map((r) => {
              const b = Array.isArray(r.bookings) ? r.bookings[0] : r.bookings;
              return (
                <Row key={r.id}
                  title={`${b?.guest_first_name ?? ""} — ${r.category}`}
                  subtitle={prop(b?.properties)}
                  accentLeft={r.urgency === "urgent" ? colors.danger : undefined}
                  right={<StatusPill value={r.status} />}
                  onPress={() => router.push(`/request/guest/${r.id}`)} />
              );
            })
          }
        </>
      )}

      {tab === "service" && (
        <>
          <SectionHeader title="Service requests" count={services.length} />
          {!services.length
            ? <Empty icon="✓" message="No pending service requests" />
            : services.map((r) => {
              const b = Array.isArray(r.bookings) ? r.bookings[0] : r.bookings;
              const svc = Array.isArray(r.services) ? r.services[0] : r.services;
              return (
                <Row key={r.id}
                  title={`${b?.guest_first_name ?? ""} — ${svc?.name_en ?? "Service"}`}
                  subtitle={`${prop(b?.properties)} · ${svc?.price_egp ? `EGP ${svc.price_egp}` : ""}`}
                  accentLeft={colors.aqua}
                  right={<StatusPill value={r.status} />}
                  onPress={() => router.push(`/request/service/${r.id}`)} />
              );
            })
          }
        </>
      )}

      <View style={{ height: 40 }} />
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  switcher:    { flexDirection: "row", backgroundColor: colors.surface, borderRadius: 12, borderWidth: 1, borderColor: colors.line, padding: 3, marginBottom: spacing.md },
  switchBtn:   { flex: 1, paddingVertical: 8, alignItems: "center", borderRadius: 9 },
  switchActive:{ backgroundColor: colors.ground },
  switchText:  { fontSize: 13, color: colors.inkMuted, fontWeight: "500" },
});
