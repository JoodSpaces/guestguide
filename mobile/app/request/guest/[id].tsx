import { useState, useEffect } from "react";
import { ScrollView, View, Text, TextInput, StyleSheet, ActivityIndicator } from "react-native";
import { useLocalSearchParams, useRouter } from "expo-router";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { api } from "@/lib/api";
import { Card, SectionHeader, StatusPill, Button } from "@/components/Ui";
import { colors, spacing, radius } from "@/lib/colors";

const URGENCY_COLOR: Record<string, string> = {
  urgent: colors.danger, high: colors.accent, normal: colors.aqua, low: colors.inkMuted,
};

export default function GuestRequestDetailScreen() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const router = useRouter();
  const qc = useQueryClient();
  const [notes, setNotes] = useState("");

  const { data, isLoading } = useQuery({
    queryKey: ["guest-request", id],
    queryFn:  () => api.requests.getGuest(id!),
    enabled:  !!id,
  });
  useEffect(() => { if (data?.admin_notes) setNotes(data.admin_notes); }, [data?.admin_notes]);

  const patch = useMutation({
    mutationFn: (body: object) => api.requests.patchGuest(id!, body),
    onSuccess: () => { qc.invalidateQueries({ queryKey: ["guest-request", id] }); qc.invalidateQueries({ queryKey: ["requests"] }); },
  });

  if (isLoading) return <View style={styles.center}><ActivityIndicator color={colors.accent} /></View>;
  if (!data) return <View style={styles.center}><Text style={{ color: colors.inkMuted }}>Not found</Text></View>;

  const booking  = Array.isArray(data.bookings)  ? data.bookings[0]  : data.bookings;
  const property = Array.isArray(booking?.properties) ? booking.properties[0] : booking?.properties;

  const canResolve = data.status !== "resolved";
  const canAck     = data.status === "pending";

  return (
    <ScrollView style={{ flex: 1, backgroundColor: colors.ground }} contentContainerStyle={{ padding: spacing.lg }}>
      {/* Header */}
      <Card>
        <View style={{ flexDirection: "row", justifyContent: "space-between", alignItems: "flex-start" }}>
          <View style={{ flex: 1 }}>
            <Text style={styles.category}>{data.category}</Text>
            {booking && <Text style={styles.guestName}>{booking.guest_first_name} {booking.guest_last_name}</Text>}
            {property && <Text style={styles.propName}>{(property as { name: string }).name}</Text>}
          </View>
          <View style={{ alignItems: "flex-end", gap: 6 }}>
            <StatusPill value={data.status} />
            {data.urgency && (
              <View style={[styles.urgencyBadge, { backgroundColor: `${URGENCY_COLOR[data.urgency]}20`, borderColor: `${URGENCY_COLOR[data.urgency]}40` }]}>
                <Text style={[styles.urgencyText, { color: URGENCY_COLOR[data.urgency] }]}>{data.urgency}</Text>
              </View>
            )}
          </View>
        </View>
        <Text style={styles.createdAt}>Submitted {new Date(data.created_at).toLocaleString("en-GB", { day: "numeric", month: "short", hour: "2-digit", minute: "2-digit" })}</Text>
      </Card>

      {/* Message */}
      <SectionHeader title="Guest message" />
      <Card>
        <Text style={styles.message}>{data.message}</Text>
      </Card>

      {/* Admin notes */}
      <SectionHeader title="Admin notes" />
      <TextInput
        style={[styles.input, { minHeight: 80 }]}
        value={notes}
        onChangeText={setNotes}
        placeholder="Add notes visible only to staff…"
        placeholderTextColor={colors.inkGhost}
        multiline
      />
      {notes !== (data.admin_notes ?? "") && (
        <Button label="Save notes" onPress={() => patch.mutate({ admin_notes: notes })} loading={patch.isPending} style={{ marginTop: spacing.sm }} />
      )}

      {/* Actions */}
      <View style={{ flexDirection: "row", gap: spacing.sm, marginTop: spacing.xl }}>
        {canAck && (
          <Button label="Acknowledge" variant="secondary" onPress={() => patch.mutate({ status: "acknowledged" })} loading={patch.isPending} style={{ flex: 1 }} />
        )}
        {canResolve && (
          <Button label="Mark resolved" onPress={() => patch.mutate({ status: "resolved" })} loading={patch.isPending} style={{ flex: 1 }} />
        )}
      </View>

      <View style={{ height: 40 }} />
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  center:       { flex: 1, alignItems: "center", justifyContent: "center" },
  category:     { fontSize: 20, fontWeight: "600", color: colors.ink, textTransform: "capitalize" },
  guestName:    { fontSize: 14, color: colors.inkMuted, marginTop: 2 },
  propName:     { fontSize: 13, color: colors.inkGhost, marginTop: 1 },
  urgencyBadge: { borderWidth: 1, borderRadius: radius.pill, paddingHorizontal: 10, paddingVertical: 3 },
  urgencyText:  { fontSize: 11, fontWeight: "600", textTransform: "uppercase", letterSpacing: 0.5 },
  createdAt:    { fontSize: 11, color: colors.inkGhost, marginTop: spacing.sm },
  message:      { fontSize: 15, color: colors.ink, lineHeight: 22 },
  input:        { backgroundColor: colors.surface, borderWidth: 1, borderColor: colors.line, borderRadius: radius.md, padding: spacing.md, fontSize: 14, color: colors.ink },
});
