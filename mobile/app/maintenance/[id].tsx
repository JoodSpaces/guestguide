import { useState, useEffect } from "react";
import { ScrollView, View, Text, TextInput, StyleSheet, ActivityIndicator } from "react-native";
import { useLocalSearchParams } from "expo-router";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { api } from "@/lib/api";
import { Card, SectionHeader, StatusPill, Button } from "@/components/Ui";
import { colors, spacing, radius } from "@/lib/colors";

const PRIORITY_COLORS: Record<string, string> = { urgent: colors.danger, high: colors.accent, medium: colors.aqua, low: colors.success };
const STATUS_FLOW: Record<string, string | null> = {
  open: "in_progress", in_progress: "resolved", resolved: null,
};
const STATUS_ACTIONS: Record<string, string> = {
  open: "Start work", in_progress: "Mark resolved", resolved: "",
};

function Field({ label, value }: { label: string; value?: string | null }) {
  if (!value) return null;
  return (
    <View style={styles.field}>
      <Text style={styles.fieldLabel}>{label}</Text>
      <Text style={styles.fieldValue}>{value}</Text>
    </View>
  );
}

export default function MaintenanceDetailScreen() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const qc = useQueryClient();
  const [notes, setNotes] = useState("");

  const { data, isLoading } = useQuery({
    queryKey: ["ticket", id],
    queryFn:  () => api.maintenance.get(id!),
    enabled:  !!id,
  });
  useEffect(() => { if (data?.notes) setNotes(data.notes); }, [data?.notes]);

  const patch = useMutation({
    mutationFn: (body: object) => api.maintenance.patch(id!, body),
    onSuccess: () => { qc.invalidateQueries({ queryKey: ["ticket", id] }); qc.invalidateQueries({ queryKey: ["tickets"] }); },
  });

  if (isLoading) return <View style={styles.center}><ActivityIndicator color={colors.accent} /></View>;
  if (!data) return <View style={styles.center}><Text style={{ color: colors.inkMuted }}>Not found</Text></View>;

  const property   = Array.isArray(data.properties) ? data.properties[0] : data.properties;
  const nextStatus = STATUS_FLOW[data.status];
  const priColor   = PRIORITY_COLORS[data.priority] ?? colors.inkMuted;

  return (
    <ScrollView style={{ flex: 1, backgroundColor: colors.ground }} contentContainerStyle={{ padding: spacing.lg }}>

      {/* Header */}
      <Card>
        <View style={{ flexDirection: "row", justifyContent: "space-between", alignItems: "flex-start", gap: spacing.sm }}>
          <Text style={[styles.title, { flex: 1 }]}>{data.title}</Text>
          <StatusPill value={data.status} />
        </View>
        <View style={{ flexDirection: "row", alignItems: "center", gap: spacing.sm, marginTop: spacing.sm }}>
          <View style={[styles.priorityDot, { backgroundColor: priColor }]} />
          <Text style={[styles.priority, { color: priColor }]}>{data.priority}</Text>
          {(property as { name: string })?.name && <Text style={styles.propName}> · {(property as { name: string }).name}</Text>}
        </View>
        {data.assigned_to && <Text style={styles.assignee}>Assigned to {data.assigned_to}</Text>}
        <Text style={styles.createdAt}>Opened {new Date(data.created_at).toLocaleString("en-GB", { day: "numeric", month: "short", hour: "2-digit", minute: "2-digit" })}</Text>
      </Card>

      {/* Description */}
      {data.description && (
        <>
          <SectionHeader title="Description" />
          <Card>
            <Text style={styles.description}>{data.description}</Text>
          </Card>
        </>
      )}

      {/* Notes */}
      <SectionHeader title="Work notes" />
      <TextInput
        style={[styles.input, { minHeight: 80 }]}
        value={notes}
        onChangeText={setNotes}
        placeholder="Add work notes…"
        placeholderTextColor={colors.inkGhost}
        multiline
      />
      {notes !== (data.notes ?? "") && (
        <Button label="Save notes" onPress={() => patch.mutate({ notes })} loading={patch.isPending} style={{ marginTop: spacing.sm }} />
      )}

      {/* Action */}
      {nextStatus && (
        <Button
          label={STATUS_ACTIONS[data.status]}
          onPress={() => patch.mutate({ status: nextStatus })}
          loading={patch.isPending}
          style={{ marginTop: spacing.xl }}
        />
      )}

      <View style={{ height: 40 }} />
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  center:      { flex: 1, alignItems: "center", justifyContent: "center" },
  title:       { fontSize: 20, fontWeight: "600", color: colors.ink },
  priorityDot: { width: 8, height: 8, borderRadius: 4 },
  priority:    { fontSize: 13, fontWeight: "500", textTransform: "capitalize" },
  propName:    { fontSize: 13, color: colors.inkMuted },
  assignee:    { fontSize: 13, color: colors.inkMuted, marginTop: 4 },
  createdAt:   { fontSize: 11, color: colors.inkGhost, marginTop: 4 },
  description: { fontSize: 15, color: colors.ink, lineHeight: 22 },
  field:       { flexDirection: "row", alignItems: "center", paddingVertical: 9, borderBottomWidth: 1, borderBottomColor: colors.line },
  fieldLabel:  { width: 110, fontSize: 12, color: colors.inkMuted },
  fieldValue:  { flex: 1, fontSize: 14, color: colors.ink },
  input:       { backgroundColor: colors.surface, borderWidth: 1, borderColor: colors.line, borderRadius: radius.md, padding: spacing.md, fontSize: 14, color: colors.ink },
});
