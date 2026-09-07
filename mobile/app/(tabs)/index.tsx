import { ScrollView, RefreshControl, View, Text, StyleSheet } from "react-native";
import { useRouter } from "expo-router";
import { useQuery } from "@tanstack/react-query";
import { api } from "@/lib/api";
import { useSession } from "@/hooks/useSession";
import { SectionHeader, Row, Empty, StatusPill } from "@/components/Ui";
import { colors, spacing } from "@/lib/colors";

function prop(obj: unknown): string {
  if (!obj) return "";
  const p = Array.isArray(obj) ? obj[0] : obj;
  return (p as { name: string })?.name ?? "";
}

export default function HomeTab() {
  const { session } = useSession();
  const router = useRouter();
  const { data, isLoading, refetch, isRefetching } = useQuery({
    queryKey: ["dashboard"],
    queryFn:  api.dashboard,
  });

  const today = new Date().toLocaleDateString("en-GB", { weekday: "long", day: "numeric", month: "long" });

  return (
    <ScrollView
      style={styles.root}
      contentContainerStyle={{ padding: spacing.lg }}
      refreshControl={<RefreshControl refreshing={isRefetching} onRefresh={refetch} tintColor={colors.accent} />}
    >
      {/* Greeting */}
      <View style={styles.greet}>
        <Text style={styles.date}>{today}</Text>
        <Text style={styles.name}>Hey, {session?.name?.split(" ")[0]}.</Text>
      </View>

      {/* Summary pills */}
      {data && (
        <View style={styles.pills}>
          {[
            { label: `${data.arrivals.length} arrivals`,  color: colors.success },
            { label: `${data.departures.length} departures`, color: colors.aqua },
            { label: `${data.openRequests.length} requests`, color: data.openRequests.length > 0 ? colors.accent : colors.inkGhost },
            { label: `${data.activeTurnovers.length} cleaning`, color: colors.warning },
          ].map(({ label, color }) => (
            <View key={label} style={[styles.summaryPill, { borderColor: color }]}>
              <Text style={[styles.summaryPillText, { color }]}>{label}</Text>
            </View>
          ))}
        </View>
      )}

      {/* Arrivals */}
      <SectionHeader title="Arrivals today" count={data?.arrivals.length} />
      {!data?.arrivals.length
        ? <Empty icon="✓" message="No arrivals today" />
        : data.arrivals.map((b) => (
          <Row key={b.id} title={`${b.guest_first_name} ${b.guest_last_name}`} subtitle={prop(b.properties)}
            onPress={() => router.push(`/booking/${b.id}`)} />
        ))
      }

      {/* Departures */}
      <SectionHeader title="Departures today" count={data?.departures.length} />
      {!data?.departures.length
        ? <Empty icon="✓" message="No departures today" />
        : data.departures.map((b) => (
          <Row key={b.id} title={`${b.guest_first_name} ${b.guest_last_name}`} subtitle={prop(b.properties)}
            onPress={() => router.push(`/booking/${b.id}`)} />
        ))
      }

      {/* Open requests */}
      <SectionHeader title="Open requests" count={data?.openRequests.length} />
      {!data?.openRequests.length
        ? <Empty icon="✓" message="No open requests" />
        : data.openRequests.slice(0, 5).map((r) => {
          const booking = Array.isArray(r.bookings) ? r.bookings[0] : r.bookings;
          return (
            <Row key={r.id}
              title={`${booking?.guest_first_name ?? ""} — ${r.category}`}
              subtitle={prop(booking?.properties)}
              accentLeft={r.urgency === "urgent" ? colors.danger : undefined}
              right={<StatusPill value={r.urgency === "urgent" ? "urgent" : r.urgency} />}
              onPress={() => router.push(`/request/guest/${r.id}`)} />
          );
        })
      }

      {/* Cleaning tasks */}
      <SectionHeader title="Cleaning tasks" count={data?.activeTurnovers.length} />
      {!data?.activeTurnovers.length
        ? <Empty icon="🧹" message="No cleaning tasks" />
        : data.activeTurnovers.map((t) => (
          <Row key={t.id} title={prop(t.properties)} subtitle={t.assigned_to ?? "Unassigned"}
            right={<StatusPill value={t.status} />}
            onPress={() => router.push(`/turnover/${t.id}`)} />
        ))
      }

      {/* Critical inventory */}
      {(data?.invAlerts.filter(a => a.severity === "critical").length ?? 0) > 0 && (
        <>
          <SectionHeader title="Critical inventory" count={data!.invAlerts.filter(a => a.severity === "critical").length} />
          {data!.invAlerts.filter(a => a.severity === "critical").map((a) => (
            <Row key={a.id} title={a.message ?? "Inventory alert"}
              accentLeft={colors.danger}
              right={<StatusPill value="critical" />}
              onPress={() => router.push(`/inventory/${a.property_id}`)} />
          ))}
        </>
      )}

      <View style={{ height: 40 }} />
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  root:          { flex: 1, backgroundColor: colors.ground },
  greet:         { marginBottom: spacing.lg },
  date:          { fontSize: 11, color: colors.inkGhost, letterSpacing: 1, textTransform: "uppercase", marginBottom: 4 },
  name:          { fontSize: 26, color: colors.ink, fontWeight: "300" },
  pills:         { flexDirection: "row", flexWrap: "wrap", gap: spacing.sm, marginBottom: spacing.sm },
  summaryPill:   { borderWidth: 1, borderRadius: 999, paddingHorizontal: 10, paddingVertical: 4 },
  summaryPillText: { fontSize: 12, fontWeight: "500" },
});
