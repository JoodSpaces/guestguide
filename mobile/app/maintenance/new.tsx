import { useState } from "react";
import { ScrollView, View, Text, TextInput, TouchableOpacity, StyleSheet } from "react-native";
import { useRouter } from "expo-router";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { api } from "@/lib/api";
import { Card, Button } from "@/components/Ui";
import { colors, spacing, radius } from "@/lib/colors";

const PRIORITIES = ["low", "medium", "high", "urgent"] as const;
type Priority = typeof PRIORITIES[number];

export default function NewMaintenanceTicketScreen() {
  const router = useRouter();
  const qc = useQueryClient();

  const [title, setTitle] = useState("");
  const [description, setDescription] = useState("");
  const [priority, setPriority] = useState<Priority>("medium");
  const [propertyId, setPropertyId] = useState<string | null>(null);

  const { data: properties } = useQuery({ queryKey: ["properties"], queryFn: api.properties });

  const create = useMutation({
    mutationFn: () => api.maintenance.create({ title, description: description || undefined, priority, property_id: propertyId ?? undefined }),
    onSuccess: () => { qc.invalidateQueries({ queryKey: ["tickets"] }); router.back(); },
  });

  const canSubmit = title.trim().length >= 3;

  const PRIORITY_COLORS: Record<Priority, string> = {
    low: colors.success, medium: colors.aqua, high: colors.accent, urgent: colors.danger,
  };

  return (
    <ScrollView style={{ flex: 1, backgroundColor: colors.ground }} contentContainerStyle={{ padding: spacing.lg }}>
      <Card>
        <Text style={styles.label}>Title *</Text>
        <TextInput style={styles.input} value={title} onChangeText={setTitle}
          placeholder="e.g. Broken AC in bedroom" placeholderTextColor={colors.inkGhost} />

        <Text style={[styles.label, { marginTop: spacing.md }]}>Priority</Text>
        <View style={styles.priorityRow}>
          {PRIORITIES.map((p) => (
            <TouchableOpacity key={p} onPress={() => setPriority(p)}
              style={[styles.priorityBtn, priority === p && { backgroundColor: PRIORITY_COLORS[p], borderColor: PRIORITY_COLORS[p] }]}>
              <Text style={[styles.priorityText, priority === p && { color: "white" }]}>{p}</Text>
            </TouchableOpacity>
          ))}
        </View>

        <Text style={[styles.label, { marginTop: spacing.md }]}>Property</Text>
        <ScrollView horizontal showsHorizontalScrollIndicator={false} style={{ marginBottom: spacing.sm }}>
          <View style={{ flexDirection: "row", gap: spacing.sm }}>
            {(properties ?? []).map((p) => (
              <TouchableOpacity key={p.id} onPress={() => setPropertyId(propertyId === p.id ? null : p.id)}
                style={[styles.propChip, propertyId === p.id && { backgroundColor: colors.ink, borderColor: colors.ink }]}>
                <Text style={[styles.propChipText, propertyId === p.id && { color: "white" }]}>{p.name}</Text>
              </TouchableOpacity>
            ))}
          </View>
        </ScrollView>

        <Text style={[styles.label, { marginTop: spacing.md }]}>Description</Text>
        <TextInput style={[styles.input, { minHeight: 80 }]} value={description} onChangeText={setDescription}
          placeholder="Describe the issue…" placeholderTextColor={colors.inkGhost} multiline />
      </Card>

      <View style={{ flexDirection: "row", gap: spacing.sm, marginTop: spacing.lg }}>
        <Button label="Cancel" variant="ghost" onPress={() => router.back()} style={{ flex: 1 }} />
        <Button label="Create ticket" onPress={() => create.mutate()} loading={create.isPending}
          style={{ flex: 2 }} disabled={!canSubmit} />
      </View>

      <View style={{ height: 40 }} />
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  label:        { fontSize: 12, color: colors.inkMuted, fontWeight: "600", letterSpacing: 0.4, marginBottom: 6 },
  input:        { backgroundColor: colors.ground, borderWidth: 1, borderColor: colors.line, borderRadius: radius.md, padding: spacing.md, fontSize: 14, color: colors.ink },
  priorityRow:  { flexDirection: "row", gap: spacing.sm },
  priorityBtn:  { borderWidth: 1, borderColor: colors.line, borderRadius: radius.pill, paddingHorizontal: 14, paddingVertical: 7 },
  priorityText: { fontSize: 13, color: colors.ink, textTransform: "capitalize" },
  propChip:     { borderWidth: 1, borderColor: colors.line, borderRadius: radius.pill, paddingHorizontal: 12, paddingVertical: 6 },
  propChipText: { fontSize: 13, color: colors.ink },
});
