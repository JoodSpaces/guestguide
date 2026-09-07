import { ScrollView, View, Text, TouchableOpacity, StyleSheet, Alert } from "react-native";
import { useRouter } from "expo-router";
import { useQuery } from "@tanstack/react-query";
import { api } from "@/lib/api";
import { clearAuth } from "@/lib/auth";
import { useSession } from "@/hooks/useSession";
import { colors, spacing, radius } from "@/lib/colors";

function MenuItem({ icon, label, onPress, danger }: { icon: string; label: string; onPress: () => void; danger?: boolean }) {
  return (
    <TouchableOpacity style={styles.item} onPress={onPress} activeOpacity={0.7}>
      <Text style={styles.itemIcon}>{icon}</Text>
      <Text style={[styles.itemLabel, danger && { color: colors.danger }]}>{label}</Text>
      <Text style={styles.chevron}>›</Text>
    </TouchableOpacity>
  );
}

export default function MoreTab() {
  const router = useRouter();
  const { session, setSession } = useSession();
  const { data: properties } = useQuery({ queryKey: ["properties"], queryFn: api.properties });

  async function logout() {
    Alert.alert("Sign out", "Are you sure?", [
      { text: "Cancel", style: "cancel" },
      { text: "Sign out", style: "destructive", onPress: async () => {
        await api.auth.logout().catch(() => {});
        await clearAuth();
        setSession(null);
        router.replace("/login");
      }},
    ]);
  }

  const role = session?.role;
  const isAdmin = role === "admin";
  const isOps   = role === "admin" || role === "ops";

  return (
    <ScrollView style={{ flex: 1, backgroundColor: colors.ground }} contentContainerStyle={{ padding: spacing.lg }}>
      {/* Session card */}
      <View style={styles.sessionCard}>
        <View>
          <Text style={styles.sessionName}>{session?.name}</Text>
          <Text style={styles.sessionRole}>{session?.role?.replace("_", " ")}</Text>
        </View>
        <View style={styles.roleBadge}>
          <Text style={styles.roleBadgeText}>{session?.role}</Text>
        </View>
      </View>

      {/* Inventory — all roles can access */}
      <Text style={styles.groupLabel}>INVENTORY</Text>
      <View style={styles.group}>
        {(properties ?? []).map((p) => (
          <MenuItem key={p.id} icon="📦" label={p.name} onPress={() => router.push(`/inventory/${p.id}`)} />
        ))}
        {!properties?.length && (
          <Text style={{ color: colors.inkGhost, padding: spacing.md, fontSize: 13 }}>Loading properties…</Text>
        )}
      </View>

      {/* Admin-only */}
      {isAdmin && (
        <>
          <Text style={styles.groupLabel}>ADMIN</Text>
          <View style={styles.group}>
            <MenuItem icon="👥" label="Team members"   onPress={() => router.push("/team")} />
            <MenuItem icon="🛎"  label="Services catalog" onPress={() => router.push("/services")} />
          </View>
        </>
      )}

      {/* Account */}
      <Text style={styles.groupLabel}>ACCOUNT</Text>
      <View style={styles.group}>
        <MenuItem icon="🚪" label="Sign out" onPress={logout} danger />
      </View>

      <View style={{ height: 40 }} />
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  sessionCard:  { backgroundColor: colors.ink, borderRadius: radius.lg, padding: spacing.lg, flexDirection: "row", alignItems: "center", justifyContent: "space-between", marginBottom: spacing.xl },
  sessionName:  { fontSize: 18, color: "white", fontWeight: "500" },
  sessionRole:  { fontSize: 12, color: "rgba(255,255,255,0.5)", marginTop: 2, textTransform: "capitalize" },
  roleBadge:    { borderWidth: 1, borderColor: "rgba(255,255,255,0.2)", borderRadius: radius.pill, paddingHorizontal: 10, paddingVertical: 4 },
  roleBadgeText:{ fontSize: 11, color: "rgba(255,255,255,0.6)", textTransform: "uppercase", letterSpacing: 0.8 },
  groupLabel:   { fontSize: 9, color: colors.inkGhost, letterSpacing: 1.4, fontWeight: "600", marginBottom: spacing.sm, marginTop: spacing.lg },
  group:        { backgroundColor: colors.surface, borderRadius: radius.lg, borderWidth: 1, borderColor: colors.line, overflow: "hidden" },
  item:         { flexDirection: "row", alignItems: "center", padding: spacing.lg, borderBottomWidth: 1, borderBottomColor: colors.line },
  itemIcon:     { fontSize: 18, marginRight: spacing.md, width: 28, textAlign: "center" },
  itemLabel:    { flex: 1, fontSize: 15, color: colors.ink },
  chevron:      { fontSize: 20, color: colors.inkGhost },
});
