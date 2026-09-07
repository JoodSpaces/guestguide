import { useState } from "react";
import { ScrollView, RefreshControl, View, Text, TextInput, TouchableOpacity, StyleSheet, Alert, ActivityIndicator } from "react-native";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { api } from "@/lib/api";
import { SectionHeader, Card, Button } from "@/components/Ui";
import { colors, spacing, radius } from "@/lib/colors";

const ROLES = ["admin", "ops", "housekeeping", "maintenance", "concierge"] as const;
type Role = typeof ROLES[number];

const ROLE_COLOR: Record<Role, string> = {
  admin: colors.danger, ops: colors.accent, housekeeping: colors.aqua,
  maintenance: colors.warning ?? "#F59E0B", concierge: colors.success,
};

export default function TeamScreen() {
  const qc = useQueryClient();
  const [adding, setAdding] = useState(false);
  const [name, setName] = useState("");
  const [password, setPassword] = useState("");
  const [role, setRole] = useState<Role>("housekeeping");

  const { data, isLoading, isRefetching, refetch } = useQuery({
    queryKey: ["team"],
    queryFn:  api.team.list,
  });

  const create = useMutation({
    mutationFn: () => api.team.create({ name, password, role }),
    onSuccess: () => { qc.invalidateQueries({ queryKey: ["team"] }); setAdding(false); setName(""); setPassword(""); setRole("housekeeping"); },
  });

  const deactivate = useMutation({
    mutationFn: (id: string) => api.team.patch(id, { is_active: false }),
    onSuccess: () => qc.invalidateQueries({ queryKey: ["team"] }),
  });

  const groups = ROLES.reduce<Record<Role, typeof data>>((acc, r) => {
    acc[r] = (data ?? []).filter(m => m.role === r);
    return acc;
  }, {} as Record<Role, typeof data>);

  if (isLoading) return <View style={styles.center}><ActivityIndicator color={colors.accent} /></View>;

  return (
    <ScrollView
      style={{ flex: 1, backgroundColor: colors.ground }}
      contentContainerStyle={{ padding: spacing.lg }}
      refreshControl={<RefreshControl refreshing={isRefetching} onRefresh={refetch} tintColor={colors.accent} />}
    >
      {/* Add member */}
      {!adding ? (
        <TouchableOpacity style={styles.addBtn} onPress={() => setAdding(true)}>
          <Text style={{ color: colors.inkMuted, fontSize: 14 }}>+ Add team member</Text>
        </TouchableOpacity>
      ) : (
        <Card>
          <Text style={styles.formLabel}>Name</Text>
          <TextInput style={styles.input} value={name} onChangeText={setName} placeholder="Full name" placeholderTextColor={colors.inkGhost} />

          <Text style={[styles.formLabel, { marginTop: spacing.md }]}>Role</Text>
          <View style={{ flexDirection: "row", flexWrap: "wrap", gap: 6 }}>
            {ROLES.map((r) => (
              <TouchableOpacity key={r} onPress={() => setRole(r)}
                style={[styles.roleChip, role === r && { backgroundColor: colors.ink, borderColor: colors.ink }]}>
                <Text style={[styles.roleChipText, role === r && { color: "white" }]}>{r}</Text>
              </TouchableOpacity>
            ))}
          </View>

          <Text style={[styles.formLabel, { marginTop: spacing.md }]}>Password</Text>
          <TextInput style={styles.input} value={password} onChangeText={setPassword}
            placeholder="Set a password" placeholderTextColor={colors.inkGhost} secureTextEntry />

          <View style={{ flexDirection: "row", gap: spacing.sm, marginTop: spacing.md }}>
            <Button label="Create" onPress={() => create.mutate()} loading={create.isPending}
              style={{ flex: 1 }} disabled={!name.trim() || !password.trim()} />
            <Button label="Cancel" variant="ghost" onPress={() => setAdding(false)} style={{ flex: 1 }} />
          </View>
        </Card>
      )}

      {/* Members grouped by role */}
      {ROLES.map((r) => {
        const members = groups[r] ?? [];
        if (!members.length) return null;
        return (
          <View key={r}>
            <SectionHeader title={r} count={members.length} />
            {members.map((m) => (
              <View key={m.id} style={styles.memberRow}>
                <View style={[styles.avatar, { backgroundColor: `${ROLE_COLOR[r as Role]}20` }]}>
                  <Text style={[styles.avatarText, { color: ROLE_COLOR[r as Role] }]}>{m.name.charAt(0).toUpperCase()}</Text>
                </View>
                <View style={{ flex: 1 }}>
                  <Text style={styles.memberName}>{m.name}</Text>
                  <Text style={[styles.memberRole, { color: ROLE_COLOR[r as Role] }]}>{m.role}</Text>
                </View>
                {m.is_active && (
                  <TouchableOpacity onPress={() => Alert.alert("Deactivate", `Remove ${m.name}?`, [
                    { text: "Cancel", style: "cancel" },
                    { text: "Deactivate", style: "destructive", onPress: () => deactivate.mutate(m.id) },
                  ])}>
                    <Text style={{ color: colors.danger, fontSize: 13 }}>Remove</Text>
                  </TouchableOpacity>
                )}
                {!m.is_active && <Text style={{ color: colors.inkGhost, fontSize: 12 }}>Inactive</Text>}
              </View>
            ))}
          </View>
        );
      })}

      <View style={{ height: 40 }} />
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  center:       { flex: 1, alignItems: "center", justifyContent: "center" },
  addBtn:       { borderWidth: 1.5, borderStyle: "dashed", borderColor: colors.line, borderRadius: radius.md, padding: spacing.lg, alignItems: "center", marginBottom: spacing.sm },
  formLabel:    { fontSize: 12, color: colors.inkMuted, fontWeight: "600", letterSpacing: 0.4, marginBottom: 6 },
  input:        { backgroundColor: colors.ground, borderWidth: 1, borderColor: colors.line, borderRadius: radius.md, padding: spacing.md, fontSize: 14, color: colors.ink },
  roleChip:     { borderWidth: 1, borderColor: colors.line, borderRadius: radius.pill, paddingHorizontal: 12, paddingVertical: 6 },
  roleChipText: { fontSize: 13, color: colors.ink, textTransform: "capitalize" },
  memberRow:    { flexDirection: "row", alignItems: "center", gap: spacing.md, backgroundColor: colors.surface, borderRadius: radius.md, borderWidth: 1, borderColor: colors.line, padding: spacing.md, marginBottom: 6 },
  avatar:       { width: 40, height: 40, borderRadius: 20, alignItems: "center", justifyContent: "center" },
  avatarText:   { fontSize: 17, fontWeight: "600" },
  memberName:   { fontSize: 15, color: colors.ink, fontWeight: "500" },
  memberRole:   { fontSize: 12, marginTop: 1, textTransform: "capitalize" },
});
