import { ScrollView, View, Text, TouchableOpacity, StyleSheet, ActivityIndicator, Alert } from "react-native";
import * as Clipboard from "expo-clipboard";
import { useLocalSearchParams } from "expo-router";
import { useQuery } from "@tanstack/react-query";
import { api } from "@/lib/api";
import { Card, SectionHeader, StatusPill } from "@/components/Ui";
import { colors, spacing, radius } from "@/lib/colors";

function fmtDate(iso: string) {
  return new Date(iso).toLocaleDateString("en-GB", { day: "numeric", month: "short", year: "numeric" });
}

function Field({ label, value, secret }: { label: string; value?: string | null; secret?: boolean }) {
  if (!value) return null;
  return (
    <TouchableOpacity style={styles.field} activeOpacity={secret ? 0.6 : 1}
      onPress={secret ? () => { Clipboard.setStringAsync(value); Alert.alert("Copied", `${label} copied`); } : undefined}>
      <Text style={styles.fieldLabel}>{label}</Text>
      <Text style={styles.fieldValue}>{secret ? "••••••" : value}</Text>
      {secret && <Text style={styles.copyHint}>tap to copy</Text>}
    </TouchableOpacity>
  );
}

export default function BookingDetailScreen() {
  const { id } = useLocalSearchParams<{ id: string }>();

  const { data, isLoading } = useQuery({
    queryKey: ["booking", id],
    queryFn:  () => api.bookings.get(id!),
    enabled:  !!id,
  });

  if (isLoading) return <View style={styles.center}><ActivityIndicator color={colors.accent} /></View>;
  if (!data) return <View style={styles.center}><Text style={{ color: colors.inkMuted }}>Not found</Text></View>;

  const property = Array.isArray(data.properties) ? data.properties[0] : data.properties;
  const nights   = Math.round((new Date(data.check_out).getTime() - new Date(data.check_in).getTime()) / 86400000);
  const tokens   = data.tokens ?? [];
  const arrPrefs = data.arrivalPrefs;
  const rating   = data.rating;

  return (
    <ScrollView style={{ flex: 1, backgroundColor: colors.ground }} contentContainerStyle={{ padding: spacing.lg }}>

      {/* Header */}
      <Card>
        <View style={{ flexDirection: "row", justifyContent: "space-between", alignItems: "flex-start" }}>
          <View style={{ flex: 1 }}>
            <Text style={styles.guestName}>{data.guest_first_name} {data.guest_last_name}</Text>
            <Text style={styles.propName}>{(property as { name: string })?.name}</Text>
          </View>
          <StatusPill value={data.status} />
        </View>
        <View style={styles.dateLine}>
          <View style={styles.dateChip}><Text style={styles.dateLabel}>CHECK-IN</Text><Text style={styles.dateValue}>{fmtDate(data.check_in)}</Text></View>
          <View style={styles.dateSep}><Text style={styles.dateSepText}>{nights}n</Text></View>
          <View style={styles.dateChip}><Text style={styles.dateLabel}>CHECK-OUT</Text><Text style={styles.dateValue}>{fmtDate(data.check_out)}</Text></View>
        </View>
        {data.guests_count && <Text style={styles.meta}>{data.guests_count} guest{data.guests_count > 1 ? "s" : ""}</Text>}
      </Card>

      {/* Contact */}
      <SectionHeader title="Guest" />
      <Card>
        <Field label="Phone" value={data.guestPhone} secret />
        {data.guest_email && <Field label="Email" value={data.guest_email} />}
        {data.guest_nationality && <Field label="Nationality" value={data.guest_nationality} />}
      </Card>

      {/* Door / Access */}
      <SectionHeader title="Access" />
      <Card>
        {data.doorCode && (
          <TouchableOpacity style={styles.doorCode} onPress={() => { void Clipboard.setStringAsync(data.doorCode!); Alert.alert("Copied", "Door code copied"); }}>
            <Text style={styles.doorCodeLabel}>DOOR CODE</Text>
            <Text style={styles.doorCodeValue}>{data.doorCode}</Text>
            <Text style={styles.copyHint}>tap to copy</Text>
          </TouchableOpacity>
        )}
        {tokens.map((t) => (
          <Field key={t.id} label={`Token · ${t.type}`} value={t.token_value} secret />
        ))}
        {!data.doorCode && tokens.length === 0 && <Text style={styles.noData}>No access codes recorded</Text>}
      </Card>

      {/* Arrival preferences */}
      {arrPrefs && (
        <>
          <SectionHeader title="Arrival preferences" />
          <Card>
            {arrPrefs.arrival_time && <Field label="Arrival time" value={arrPrefs.arrival_time} />}
            {arrPrefs.transport_mode && <Field label="Transport" value={arrPrefs.transport_mode} />}
            {arrPrefs.special_requests && <Field label="Special requests" value={arrPrefs.special_requests} />}
          </Card>
        </>
      )}

      {/* DND / notes */}
      {(data.dnd_active || data.internal_notes) && (
        <>
          <SectionHeader title="Notes" />
          <Card>
            {data.dnd_active && (
              <View style={styles.dndBanner}>
                <Text style={styles.dndText}>⛔ Do Not Disturb active</Text>
              </View>
            )}
            {data.internal_notes && <Text style={styles.notesText}>{data.internal_notes}</Text>}
          </Card>
        </>
      )}

      {/* Rating */}
      {rating && (
        <>
          <SectionHeader title="Rating" />
          <Card>
            <View style={styles.ratingRow}>
              {[1, 2, 3, 4, 5].map((s) => (
                <Text key={s} style={[styles.star, s <= (rating.overall_rating ?? 0) && { color: colors.accent }]}>★</Text>
              ))}
              {rating.overall_rating && <Text style={styles.ratingNum}>{rating.overall_rating}/5</Text>}
            </View>
            {rating.public_comment && <Text style={styles.notesText}>"{rating.public_comment}"</Text>}
          </Card>
        </>
      )}

      <View style={{ height: 40 }} />
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  center:        { flex: 1, alignItems: "center", justifyContent: "center" },
  guestName:     { fontSize: 22, fontWeight: "600", color: colors.ink },
  propName:      { fontSize: 14, color: colors.inkMuted, marginTop: 2 },
  dateLine:      { flexDirection: "row", alignItems: "center", marginTop: spacing.lg, gap: spacing.sm },
  dateChip:      { flex: 1, alignItems: "center" },
  dateLabel:     { fontSize: 9, color: colors.inkGhost, letterSpacing: 1.2, fontWeight: "600" },
  dateValue:     { fontSize: 15, fontWeight: "500", color: colors.ink, marginTop: 2 },
  dateSep:       { alignItems: "center", justifyContent: "center", paddingHorizontal: spacing.sm },
  dateSepText:   { fontSize: 11, color: colors.inkMuted },
  meta:          { marginTop: spacing.sm, fontSize: 13, color: colors.inkMuted },
  field:         { paddingVertical: 10, borderBottomWidth: 1, borderBottomColor: colors.line, flexDirection: "row", alignItems: "center", gap: spacing.sm },
  fieldLabel:    { fontSize: 12, color: colors.inkMuted, width: 100 },
  fieldValue:    { fontSize: 14, color: colors.ink, flex: 1 },
  copyHint:      { fontSize: 10, color: colors.inkGhost },
  doorCode:      { paddingVertical: spacing.md, alignItems: "center", borderBottomWidth: 1, borderBottomColor: colors.line },
  doorCodeLabel: { fontSize: 9, color: colors.inkGhost, letterSpacing: 1.2, fontWeight: "600" },
  doorCodeValue: { fontSize: 32, fontWeight: "700", color: colors.ink, letterSpacing: 6, marginVertical: 4 },
  noData:        { fontSize: 13, color: colors.inkGhost, textAlign: "center", paddingVertical: spacing.md },
  dndBanner:     { backgroundColor: `${colors.danger}15`, borderRadius: radius.sm, padding: spacing.md, marginBottom: spacing.sm },
  dndText:       { fontSize: 14, color: colors.danger, fontWeight: "500" },
  notesText:     { fontSize: 14, color: colors.inkMuted, lineHeight: 20, fontStyle: "italic", paddingTop: spacing.sm },
  ratingRow:     { flexDirection: "row", alignItems: "center", gap: 4 },
  star:          { fontSize: 22, color: colors.line },
  ratingNum:     { fontSize: 14, color: colors.inkMuted, marginLeft: spacing.sm },
});
