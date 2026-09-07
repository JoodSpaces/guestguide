import { useState } from "react";
import { ScrollView, RefreshControl, View, Text, TouchableOpacity, StyleSheet } from "react-native";
import { useRouter } from "expo-router";
import { useQuery } from "@tanstack/react-query";
import { api } from "@/lib/api";
import { SectionHeader, Row, Empty, StatusPill } from "@/components/Ui";
import { colors, spacing } from "@/lib/colors";
import { useSession } from "@/hooks/useSession";

type Tab = "cleaning" | "maintenance";

function prop(obj: unknown): string {
  const p = Array.isArray(obj) ? obj[0] : obj;
  return (p as { name: string } | null)?.name ?? "";
}

export default function OpsTab() {
  const { session } = useSession();
  const router = useRouter();
  const [tab, setTab] = useState<Tab>("cleaning");

  const turnovers = useQuery({ queryKey: ["turnovers"], queryFn: api.turnovers.list });
  const tickets   = useQuery({ queryKey: ["tickets"],   queryFn: () => api.maintenance.list() });

  const isHousekeeping = session?.role === "housekeeping";
  const isMaintenance  = session?.role === "maintenance";
  const myTurnovers = (turnovers.data ?? []).filter(t => !session?.name || t.assigned_to === session.name);
  const otherTurnovers = (turnovers.data ?? []).filter(t => t.assigned_to !== session?.name);

  const refetching = tab === "cleaning" ? turnovers.isRefetching : tickets.isRefetching;
  const refetch    = tab === "cleaning" ? turnovers.refetch       : tickets.refetch;

  return (
    <ScrollView
      style={{ flex: 1, backgroundColor: colors.ground }}
      contentContainerStyle={{ padding: spacing.lg }}
      refreshControl={<RefreshControl refreshing={refetching} onRefresh={refetch} tintColor={colors.accent} />}
    >
      {/* Tab switcher */}
      {!isHousekeeping && !isMaintenance && (
        <View style={styles.switcher}>
          {(["cleaning", "maintenance"] as Tab[]).map((t) => (
            <TouchableOpacity key={t} onPress={() => setTab(t)} style={[styles.switchBtn, tab === t && styles.switchActive]}>
              <Text style={[styles.switchText, tab === t && { color: colors.ink }]}>
                {t === "cleaning" ? "Cleaning" : "Maintenance"}
              </Text>
            </TouchableOpacity>
          ))}
        </View>
      )}

      {/* Turnovers */}
      {(tab === "cleaning" || isHousekeeping) && (
        <>
          {myTurnovers.length > 0 && (
            <>
              <SectionHeader title="My tasks" count={myTurnovers.length} />
              {myTurnovers.map((t) => (
                <Row key={t.id} title={prop(t.properties)}
                  subtitle={(Array.isArray(t.bookings) ? t.bookings[0] : t.bookings)?.guest_first_name ?? ""}
                  accentLeft={colors.accent}
                  right={<StatusPill value={t.status} />}
                  onPress={() => router.push(`/turnover/${t.id}`)} />
              ))}
            </>
          )}

          <SectionHeader title={myTurnovers.length > 0 ? "All other" : "Cleaning tasks"} count={otherTurnovers.length} />
          {!otherTurnovers.length
            ? <Empty icon="🧹" message="No cleaning tasks" />
            : otherTurnovers.map((t) => (
              <Row key={t.id} title={prop(t.properties)}
                subtitle={t.assigned_to ?? "Unassigned"}
                right={<StatusPill value={t.status} />}
                onPress={() => router.push(`/turnover/${t.id}`)} />
            ))
          }
        </>
      )}

      {/* Maintenance */}
      {(tab === "maintenance" || isMaintenance) && (
        <>
          <SectionHeader title="Open tickets" count={tickets.data?.length} />
          {!tickets.data?.length
            ? <Empty icon="🔧" message="No open tickets" />
            : tickets.data.map((t) => (
              <Row key={t.id} title={t.title}
                subtitle={prop(t.properties)}
                accentLeft={t.priority === "urgent" ? colors.danger : colors.line}
                right={<StatusPill value={t.priority} />}
                onPress={() => router.push(`/maintenance/${t.id}`)} />
            ))
          }

          {(session?.role === "admin" || session?.role === "ops") && (
            <TouchableOpacity style={styles.newTicketBtn} onPress={() => router.push("/maintenance/new")}>
              <Text style={styles.newTicketText}>+ New ticket</Text>
            </TouchableOpacity>
          )}
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
  newTicketBtn:{ marginTop: spacing.md, borderWidth: 1.5, borderStyle: "dashed", borderColor: colors.line, borderRadius: 12, padding: spacing.lg, alignItems: "center" },
  newTicketText:{ color: colors.inkMuted, fontSize: 14 },
});
