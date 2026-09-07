import { useState } from "react";
import { ScrollView, View, Text, TouchableOpacity, TextInput, StyleSheet, ActivityIndicator } from "react-native";
import { useLocalSearchParams } from "expo-router";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { api } from "@/lib/api";
import { Card, SectionHeader, StatusPill, Button } from "@/components/Ui";
import { colors, spacing, radius } from "@/lib/colors";

const STATUS_FLOW: Record<string, string | null> = {
  scheduled: "pending", pending: "in_progress", in_progress: "ready", ready: "approved", approved: null,
};
const STATUS_ACTIONS: Record<string, string> = {
  scheduled: "Open task", pending: "Start cleaning", in_progress: "Mark as done", ready: "Approve", approved: "",
};
const CONDITION_OPTIONS = ["excellent", "good", "fair", "damaged"] as const;

export default function TurnoverDetailScreen() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const qc = useQueryClient();
  const [notes, setNotes] = useState("");
  const [damageNotes, setDamageNotes] = useState("");
  const [condition, setCondition] = useState<string>("good");
  const [addingDamage, setAddingDamage] = useState(false);
  const [damageItemId, setDamageItemId] = useState("");
  const [damageQty, setDamageQty] = useState("1");

  const { data, isLoading } = useQuery({
    queryKey: ["turnover", id],
    queryFn:  () => api.turnovers.get(id!),
    enabled:  !!id,
  });

  const patchStatus = useMutation({
    mutationFn: (status: string) => api.turnovers.patch(id!, { status }),
    onSuccess: () => { qc.invalidateQueries({ queryKey: ["turnover", id] }); qc.invalidateQueries({ queryKey: ["turnovers"] }); },
  });

  const patchItem = useMutation({
    mutationFn: ({ itemId, done }: { itemId: string; done: boolean }) =>
      api.turnovers.patchItem(id!, itemId, { is_done: done }),
    onSuccess: () => qc.invalidateQueries({ queryKey: ["turnover", id] }),
  });

  const addDamage = useMutation({
    mutationFn: (body: object) => api.turnovers.addDamage(id!, body),
    onSuccess: () => { qc.invalidateQueries({ queryKey: ["turnover", id] }); setAddingDamage(false); setDamageItemId(""); setDamageQty("1"); setDamageNotes(""); },
  });

  if (isLoading) return <View style={styles.center}><ActivityIndicator color={colors.accent} /></View>;
  if (!data) return <View style={styles.center}><Text style={{ color: colors.inkMuted }}>Not found</Text></View>;

  const property = Array.isArray(data.properties) ? data.properties[0] : data.properties;
  const booking  = Array.isArray(data.bookings)   ? data.bookings[0]   : data.bookings;
  const nextStatus = STATUS_FLOW[data.status];
  const doneCount  = data.turnover_items.filter(i => i.is_done).length;
  const totalCount = data.turnover_items.length;

  const ROOMS = [...new Set(data.turnover_items.map(i => i.room))];

  return (
    <ScrollView style={{ flex: 1, backgroundColor: colors.ground }} contentContainerStyle={{ padding: spacing.lg }}>
      {/* Header */}
      <Card>
        <Text style={styles.propName}>{(property as { name: string })?.name}</Text>
        {booking && <Text style={styles.guestName}>{(booking as { guest_first_name: string; guest_last_name: string }).guest_first_name} {(booking as { guest_first_name: string; guest_last_name: string }).guest_last_name}</Text>}
        <View style={{ flexDirection: "row", alignItems: "center", gap: spacing.sm, marginTop: spacing.sm }}>
          <StatusPill value={data.status} />
          {data.assigned_to && <Text style={styles.assignee}>👤 {data.assigned_to}</Text>}
        </View>
        {totalCount > 0 && (
          <View style={{ marginTop: spacing.md }}>
            <View style={styles.progressBar}>
              <View style={[styles.progressFill, { width: `${(doneCount / totalCount) * 100}%` }]} />
            </View>
            <Text style={styles.progressText}>{doneCount}/{totalCount} items done</Text>
          </View>
        )}
      </Card>

      {/* Condition */}
      {(data.status === "in_progress" || data.status === "ready") && (
        <Card>
          <Text style={styles.subheading}>Property condition</Text>
          <View style={{ flexDirection: "row", gap: spacing.sm, flexWrap: "wrap", marginTop: spacing.sm }}>
            {CONDITION_OPTIONS.map((c) => (
              <TouchableOpacity key={c} onPress={() => setCondition(c)}
                style={[styles.conditionBtn, condition === c && { backgroundColor: colors.ink, borderColor: colors.ink }]}>
                <Text style={[styles.conditionText, condition === c && { color: "white" }]}>{c}</Text>
              </TouchableOpacity>
            ))}
          </View>
        </Card>
      )}

      {/* Checklist */}
      {ROOMS.map((room) => {
        const roomItems = data.turnover_items.filter(i => i.room === room).sort((a, b) => a.sort_order - b.sort_order);
        return (
          <View key={room}>
            <SectionHeader title={room} />
            {roomItems.map((item) => (
              <TouchableOpacity key={item.id} onPress={() => patchItem.mutate({ itemId: item.id, done: !item.is_done })}
                style={styles.checkRow} activeOpacity={0.7}>
                <View style={[styles.checkbox, item.is_done && { backgroundColor: colors.success, borderColor: colors.success }]}>
                  {item.is_done && <Text style={{ color: "white", fontSize: 12, fontWeight: "700" }}>✓</Text>}
                </View>
                <Text style={[styles.checkLabel, item.is_done && { color: colors.inkGhost, textDecorationLine: "line-through" }]}>{item.label}</Text>
              </TouchableOpacity>
            ))}
          </View>
        );
      })}

      {/* Damage items */}
      <SectionHeader title="Missing or damaged items" count={data.turnover_damage_items.length} />
      {data.turnover_damage_items.map((d) => (
        <View key={d.id} style={styles.damageRow}>
          <Text style={styles.damageName}>{(d.inventory_items as { name: string }).name}</Text>
          <Text style={styles.damageMeta}>{d.condition} · ×{d.quantity}</Text>
          {d.notes && <Text style={styles.damageNote}>{d.notes}</Text>}
        </View>
      ))}

      {!addingDamage ? (
        <TouchableOpacity style={styles.addDamageBtn} onPress={() => setAddingDamage(true)}>
          <Text style={{ color: colors.inkMuted, fontSize: 14 }}>+ Report damage or missing item</Text>
        </TouchableOpacity>
      ) : (
        <Card>
          <Text style={styles.subheading}>Report damage</Text>
          <TextInput style={styles.input} value={damageItemId} onChangeText={setDamageItemId}
            placeholder="Item name or ID" placeholderTextColor={colors.inkGhost} />
          <TextInput style={[styles.input, { marginTop: spacing.sm }]} value={damageQty} onChangeText={setDamageQty}
            placeholder="Quantity" keyboardType="numeric" placeholderTextColor={colors.inkGhost} />
          <TextInput style={[styles.input, { marginTop: spacing.sm }]} value={damageNotes} onChangeText={setDamageNotes}
            placeholder="Notes (optional)" placeholderTextColor={colors.inkGhost} multiline />
          <View style={{ flexDirection: "row", gap: spacing.sm, marginTop: spacing.md }}>
            <Button label="Report" onPress={() => addDamage.mutate({ itemId: damageItemId, quantity: parseInt(damageQty) || 1, condition: "damaged", notes: damageNotes || undefined })} loading={addDamage.isPending} style={{ flex: 1 }} />
            <Button label="Cancel" variant="ghost" onPress={() => setAddingDamage(false)} style={{ flex: 1 }} />
          </View>
        </Card>
      )}

      {/* Notes */}
      <SectionHeader title="Notes" />
      <TextInput style={[styles.input, { minHeight: 80 }]} value={notes || data.notes || ""} onChangeText={setNotes}
        placeholder="Add notes…" placeholderTextColor={colors.inkGhost} multiline />
      {notes !== (data.notes ?? "") && (
        <Button label="Save notes" onPress={() => api.turnovers.patch(id!, { notes }).then(() => qc.invalidateQueries({ queryKey: ["turnover", id] }))} style={{ marginTop: spacing.sm }} />
      )}

      {/* Action */}
      {nextStatus && (
        <Button
          label={STATUS_ACTIONS[data.status]}
          onPress={() => patchStatus.mutate(nextStatus)}
          loading={patchStatus.isPending}
          style={{ marginTop: spacing.xl }}
        />
      )}

      <View style={{ height: 40 }} />
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  center:       { flex: 1, alignItems: "center", justifyContent: "center" },
  propName:     { fontSize: 20, fontWeight: "600", color: colors.ink },
  guestName:    { fontSize: 14, color: colors.inkMuted, marginTop: 4 },
  assignee:     { fontSize: 13, color: colors.inkMuted },
  subheading:   { fontSize: 12, color: colors.inkMuted, fontWeight: "600", letterSpacing: 0.5 },
  progressBar:  { height: 4, backgroundColor: colors.line, borderRadius: 2, overflow: "hidden", marginBottom: 4 },
  progressFill: { height: 4, backgroundColor: colors.success, borderRadius: 2 },
  progressText: { fontSize: 11, color: colors.inkMuted },
  conditionBtn: { borderWidth: 1, borderColor: colors.line, borderRadius: radius.pill, paddingHorizontal: 14, paddingVertical: 7 },
  conditionText:{ fontSize: 13, color: colors.ink, textTransform: "capitalize" },
  checkRow:     { flexDirection: "row", alignItems: "center", gap: spacing.md, padding: spacing.md, backgroundColor: colors.surface, borderRadius: radius.md, borderWidth: 1, borderColor: colors.line, marginBottom: 6 },
  checkbox:     { width: 22, height: 22, borderRadius: 6, borderWidth: 1.5, borderColor: colors.line, alignItems: "center", justifyContent: "center" },
  checkLabel:   { fontSize: 14, color: colors.ink, flex: 1 },
  damageRow:    { backgroundColor: colors.surface, borderRadius: radius.md, borderWidth: 1, borderColor: colors.line, borderLeftWidth: 3, borderLeftColor: colors.danger, padding: spacing.md, marginBottom: 6 },
  damageName:   { fontSize: 14, fontWeight: "500", color: colors.ink },
  damageMeta:   { fontSize: 12, color: colors.inkMuted, marginTop: 2, textTransform: "capitalize" },
  damageNote:   { fontSize: 12, color: colors.inkMuted, marginTop: 4, fontStyle: "italic" },
  addDamageBtn: { borderWidth: 1.5, borderStyle: "dashed", borderColor: colors.line, borderRadius: radius.md, padding: spacing.lg, alignItems: "center", marginBottom: spacing.sm },
  input:        { backgroundColor: colors.surface, borderWidth: 1, borderColor: colors.line, borderRadius: radius.md, padding: spacing.md, fontSize: 14, color: colors.ink },
});
