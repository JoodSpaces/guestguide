import { useState } from "react";
import { ScrollView, RefreshControl, View, TextInput, StyleSheet, Text } from "react-native";
import { useRouter } from "expo-router";
import { useQuery } from "@tanstack/react-query";
import { api } from "@/lib/api";
import { SectionHeader, Row, Empty, StatusPill } from "@/components/Ui";
import { colors, spacing, radius } from "@/lib/colors";

function prop(obj: unknown): string {
  const p = Array.isArray(obj) ? obj[0] : obj;
  return (p as { name: string } | null)?.name ?? "";
}

function fmtDate(iso: string) {
  return new Date(iso).toLocaleDateString("en-GB", { day: "numeric", month: "short" });
}

export default function BookingsTab() {
  const router = useRouter();
  const [q, setQ] = useState("");
  const { data, isRefetching, refetch } = useQuery({
    queryKey: ["bookings", q],
    queryFn:  () => api.bookings.list(q || undefined),
  });

  const today = new Date().toISOString().slice(0, 10);
  const current   = (data ?? []).filter(b => b.check_in <= today && b.check_out >= today);
  const upcoming  = (data ?? []).filter(b => b.check_in > today);
  const past      = (data ?? []).filter(b => b.check_out < today);

  return (
    <ScrollView
      style={{ flex: 1, backgroundColor: colors.ground }}
      contentContainerStyle={{ padding: spacing.lg }}
      refreshControl={<RefreshControl refreshing={isRefetching} onRefresh={refetch} tintColor={colors.accent} />}
    >
      <TextInput
        style={styles.search}
        value={q}
        onChangeText={setQ}
        placeholder="Search guest name…"
        placeholderTextColor={colors.inkGhost}
        clearButtonMode="while-editing"
      />

      {current.length > 0 && (
        <>
          <SectionHeader title="Currently staying" count={current.length} />
          {current.map((b) => (
            <Row key={b.id}
              title={`${b.guest_first_name} ${b.guest_last_name}`}
              subtitle={`${prop(b.properties)} · out ${fmtDate(b.check_out)}`}
              accentLeft={colors.success}
              right={<StatusPill value={b.status} />}
              onPress={() => router.push(`/booking/${b.id}`)} />
          ))}
        </>
      )}

      {upcoming.length > 0 && (
        <>
          <SectionHeader title="Upcoming" count={upcoming.length} />
          {upcoming.map((b) => (
            <Row key={b.id}
              title={`${b.guest_first_name} ${b.guest_last_name}`}
              subtitle={`${prop(b.properties)} · in ${fmtDate(b.check_in)}`}
              right={<StatusPill value={b.status} />}
              onPress={() => router.push(`/booking/${b.id}`)} />
          ))}
        </>
      )}

      {!current.length && !upcoming.length && !past.length && (
        <Empty icon="📅" message="No bookings found" />
      )}

      {past.length > 0 && (
        <>
          <SectionHeader title="Past" count={past.length} />
          {past.slice(0, 20).map((b) => (
            <Row key={b.id}
              title={`${b.guest_first_name} ${b.guest_last_name}`}
              subtitle={`${prop(b.properties)} · ${fmtDate(b.check_in)} – ${fmtDate(b.check_out)}`}
              right={<StatusPill value={b.status} />}
              onPress={() => router.push(`/booking/${b.id}`)} />
          ))}
        </>
      )}

      <View style={{ height: 40 }} />
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  search: {
    backgroundColor: colors.surface, borderRadius: radius.md, borderWidth: 1, borderColor: colors.line,
    paddingVertical: 11, paddingHorizontal: spacing.md, fontSize: 15, color: colors.ink,
    marginBottom: spacing.sm,
  },
});
