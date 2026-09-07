import { ScrollView, View, Text, StyleSheet, ActivityIndicator, Linking, Alert } from "react-native";
import { useLocalSearchParams } from "expo-router";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { api } from "@/lib/api";
import { Card, SectionHeader, StatusPill, Button } from "@/components/Ui";
import { colors, spacing, radius } from "@/lib/colors";

function Field({ label, value }: { label: string; value?: string | number | null }) {
  if (value == null || value === "") return null;
  return (
    <View style={styles.field}>
      <Text style={styles.fieldLabel}>{label}</Text>
      <Text style={styles.fieldValue}>{String(value)}</Text>
    </View>
  );
}

export default function ServiceRequestDetailScreen() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const qc = useQueryClient();

  const { data, isLoading } = useQuery({
    queryKey: ["service-request", id],
    queryFn:  () => api.requests.getService(id!),
    enabled:  !!id,
  });

  const patch = useMutation({
    mutationFn: (body: object) => api.requests.patchService(id!, body),
    onSuccess: () => { qc.invalidateQueries({ queryKey: ["service-request", id] }); qc.invalidateQueries({ queryKey: ["requests"] }); },
  });

  const regenerate = useMutation({
    mutationFn: () => api.requests.regeneratePayment(id!),
    onSuccess: () => qc.invalidateQueries({ queryKey: ["service-request", id] }),
  });

  if (isLoading) return <View style={styles.center}><ActivityIndicator color={colors.accent} /></View>;
  if (!data) return <View style={styles.center}><Text style={{ color: colors.inkMuted }}>Not found</Text></View>;

  const booking  = Array.isArray(data.bookings)  ? data.bookings[0]  : data.bookings;
  const service  = Array.isArray(data.services)  ? data.services[0]  : data.services;
  const property = Array.isArray(booking?.properties) ? booking.properties[0] : booking?.properties;

  const isPending   = data.status === "pending";
  const isProcessing= data.status === "payment_processing";
  const isFulfilled = data.status === "fulfilled";
  const isRejected  = data.status === "rejected";

  return (
    <ScrollView style={{ flex: 1, backgroundColor: colors.ground }} contentContainerStyle={{ padding: spacing.lg }}>

      {/* Header */}
      <Card>
        <View style={{ flexDirection: "row", justifyContent: "space-between", alignItems: "flex-start" }}>
          <View style={{ flex: 1 }}>
            <Text style={styles.svcName}>{(service as { name_en: string })?.name_en ?? "Service"}</Text>
            {booking && <Text style={styles.guestName}>{booking.guest_first_name} {booking.guest_last_name}</Text>}
            {property && <Text style={styles.propName}>{(property as { name: string }).name}</Text>}
          </View>
          <StatusPill value={data.status} />
        </View>
        <Text style={styles.createdAt}>{new Date(data.created_at).toLocaleString("en-GB", { day: "numeric", month: "short", hour: "2-digit", minute: "2-digit" })}</Text>
      </Card>

      {/* Service details */}
      <SectionHeader title="Service" />
      <Card>
        <Field label="Price" value={(service as { price_egp?: number })?.price_egp ? `EGP ${(service as { price_egp?: number }).price_egp}` : null} />
        <Field label="Category" value={(service as { category?: string })?.category} />
        {data.notes && <Field label="Guest note" value={data.notes} />}
        {data.scheduled_at && <Field label="Scheduled" value={new Date(data.scheduled_at).toLocaleString("en-GB")} />}
      </Card>

      {/* Payment */}
      <SectionHeader title="Payment" />
      <Card>
        <Field label="Status" value={data.payment_status} />
        <Field label="Amount" value={data.payment_amount_egp ? `EGP ${data.payment_amount_egp}` : null} />
        {data.payment_link && (
          <View style={styles.field}>
            <Text style={styles.fieldLabel}>Link</Text>
            <Text style={[styles.fieldValue, { color: colors.aqua }]} onPress={() => Linking.openURL(data.payment_link!)} numberOfLines={1}>Open link</Text>
          </View>
        )}
        {data.paid_at && <Field label="Paid at" value={new Date(data.paid_at).toLocaleString("en-GB")} />}
      </Card>

      {/* Actions */}
      <View style={{ gap: spacing.sm, marginTop: spacing.xl }}>
        {isPending && (
          <Button label="Fulfill" onPress={() => patch.mutate({ status: "fulfilled" })} loading={patch.isPending} />
        )}
        {(isPending || isProcessing) && (
          <Button label="Reject" variant="danger" onPress={() => {
            Alert.alert("Reject request", "Reject this service request?", [
              { text: "Cancel", style: "cancel" },
              { text: "Reject", style: "destructive", onPress: () => patch.mutate({ status: "rejected" }) },
            ]);
          }} loading={patch.isPending} />
        )}
        {!isFulfilled && !isRejected && data.payment_link && (
          <Button label="Regenerate payment link" variant="secondary" onPress={() => regenerate.mutate()} loading={regenerate.isPending} />
        )}
      </View>

      <View style={{ height: 40 }} />
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  center:     { flex: 1, alignItems: "center", justifyContent: "center" },
  svcName:    { fontSize: 20, fontWeight: "600", color: colors.ink },
  guestName:  { fontSize: 14, color: colors.inkMuted, marginTop: 2 },
  propName:   { fontSize: 13, color: colors.inkGhost },
  createdAt:  { fontSize: 11, color: colors.inkGhost, marginTop: spacing.sm },
  field:      { flexDirection: "row", alignItems: "center", gap: spacing.sm, paddingVertical: 10, borderBottomWidth: 1, borderBottomColor: colors.line },
  fieldLabel: { fontSize: 12, color: colors.inkMuted, width: 100 },
  fieldValue: { fontSize: 14, color: colors.ink, flex: 1 },
});
