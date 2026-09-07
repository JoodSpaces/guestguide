import { View, Text, TouchableOpacity, StyleSheet, ActivityIndicator } from "react-native";
import { colors, radius, spacing } from "@/lib/colors";

// ─── Card ─────────────────────────────────────────────────────────────────────
export function Card({ children, style }: { children: React.ReactNode; style?: object }) {
  return <View style={[styles.card, style]}>{children}</View>;
}

// ─── Section header ───────────────────────────────────────────────────────────
export function SectionHeader({ title, count }: { title: string; count?: number }) {
  return (
    <View style={styles.sectionRow}>
      <Text style={styles.sectionTitle}>{title.toUpperCase()}</Text>
      {count !== undefined && (
        <View style={[styles.badge, { backgroundColor: count > 0 ? colors.accent : colors.line }]}>
          <Text style={[styles.badgeText, { color: count > 0 ? "white" : colors.inkGhost }]}>{count}</Text>
        </View>
      )}
    </View>
  );
}

// ─── Status pill ──────────────────────────────────────────────────────────────
const STATUS_COLORS: Record<string, string> = {
  pending: colors.warning, in_progress: colors.accent, ready: colors.success,
  approved: colors.aqua, scheduled: colors.aqua, resolved: colors.success,
  open: colors.warning, received: colors.warning, fulfilled: colors.success,
  rejected: colors.danger, cancelled: colors.danger, completed: colors.inkGhost,
  urgent: colors.danger, normal: colors.inkMuted, low: colors.inkGhost,
};

export function StatusPill({ value }: { value: string }) {
  const color = STATUS_COLORS[value] ?? colors.inkGhost;
  return (
    <View style={[styles.pill, { borderColor: color }]}>
      <View style={[styles.pillDot, { backgroundColor: color }]} />
      <Text style={[styles.pillText, { color }]}>{value.replace(/_/g, " ")}</Text>
    </View>
  );
}

// ─── Empty state ──────────────────────────────────────────────────────────────
export function Empty({ icon = "✓", message }: { icon?: string; message: string }) {
  return (
    <View style={styles.empty}>
      <Text style={styles.emptyIcon}>{icon}</Text>
      <Text style={styles.emptyText}>{message}</Text>
    </View>
  );
}

// ─── Button ───────────────────────────────────────────────────────────────────
interface ButtonProps { label: string; onPress: () => void; loading?: boolean; disabled?: boolean; variant?: "primary" | "secondary" | "ghost" | "danger"; style?: object; }
export function Button({ label, onPress, loading, disabled, variant = "primary", style }: ButtonProps) {
  const bg     = variant === "primary"   ? colors.ink
               : variant === "danger"    ? colors.danger
               : variant === "secondary" ? `${colors.ink}12`
               : "transparent";
  const fg     = variant === "ghost" || variant === "secondary" ? colors.ink : "white";
  const border = (variant === "ghost" || variant === "secondary") ? { borderWidth: 1, borderColor: colors.line } : {};
  const off    = disabled || loading;
  return (
    <TouchableOpacity onPress={onPress} disabled={!!off} style={[styles.btn, { backgroundColor: bg, opacity: off ? 0.45 : 1 }, border, style]} activeOpacity={0.75}>
      {loading ? <ActivityIndicator color={fg} size="small" /> : <Text style={[styles.btnText, { color: fg }]}>{label}</Text>}
    </TouchableOpacity>
  );
}

// ─── Row item ─────────────────────────────────────────────────────────────────
export function Row({ title, subtitle, right, onPress, accentLeft }: { title: string; subtitle?: string; right?: React.ReactNode; onPress?: () => void; accentLeft?: string }) {
  const inner = (
    <View style={[styles.row, accentLeft ? { borderLeftWidth: 3, borderLeftColor: accentLeft, paddingLeft: spacing.md } : {}]}>
      <View style={{ flex: 1, minWidth: 0 }}>
        <Text style={styles.rowTitle} numberOfLines={1}>{title}</Text>
        {subtitle ? <Text style={styles.rowSub} numberOfLines={1}>{subtitle}</Text> : null}
      </View>
      {right}
    </View>
  );
  return onPress ? (
    <TouchableOpacity onPress={onPress} activeOpacity={0.7}>{inner}</TouchableOpacity>
  ) : inner;
}

const styles = StyleSheet.create({
  card:        { backgroundColor: colors.surface, borderRadius: radius.lg, borderWidth: 1, borderColor: colors.line, padding: spacing.lg, marginBottom: spacing.sm },
  sectionRow:  { flexDirection: "row", alignItems: "center", gap: spacing.sm, marginBottom: spacing.sm, marginTop: spacing.lg },
  sectionTitle:{ fontSize: 9, letterSpacing: 1.4, color: colors.inkMuted, fontWeight: "600" },
  badge:       { borderRadius: radius.pill, paddingHorizontal: 7, paddingVertical: 2, minWidth: 20, alignItems: "center" },
  badgeText:   { fontSize: 11, fontWeight: "600" },
  pill:        { flexDirection: "row", alignItems: "center", gap: 5, borderRadius: radius.pill, borderWidth: 1, paddingHorizontal: 8, paddingVertical: 3 },
  pillDot:     { width: 5, height: 5, borderRadius: 3 },
  pillText:    { fontSize: 9, letterSpacing: 1, textTransform: "uppercase", fontWeight: "600" },
  empty:       { alignItems: "center", padding: spacing.xxl },
  emptyIcon:   { fontSize: 28, marginBottom: spacing.sm },
  emptyText:   { fontSize: 14, color: colors.inkMuted, textAlign: "center" },
  btn:         { borderRadius: radius.pill, paddingVertical: 11, paddingHorizontal: spacing.xl, alignItems: "center", justifyContent: "center", minHeight: 44 },
  btnText:     { fontSize: 14, fontWeight: "600", letterSpacing: 0.3 },
  row:         { flexDirection: "row", alignItems: "center", backgroundColor: colors.surface, borderRadius: radius.lg, borderWidth: 1, borderColor: colors.line, padding: spacing.lg, marginBottom: spacing.sm },
  rowTitle:    { fontSize: 15, color: colors.ink, fontWeight: "500", marginBottom: 2 },
  rowSub:      { fontSize: 13, color: colors.inkMuted },
});
