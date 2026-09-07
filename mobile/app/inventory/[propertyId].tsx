import { useState } from "react";
import { ScrollView, RefreshControl, View, Text, TextInput, TouchableOpacity, StyleSheet, ActivityIndicator } from "react-native";
import { useLocalSearchParams } from "expo-router";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { api } from "@/lib/api";
import { SectionHeader, Card } from "@/components/Ui";
import { colors, spacing, radius } from "@/lib/colors";

type Item = Awaited<ReturnType<typeof api.inventory.list>>[0];

function StockStepper({ item, propertyId }: { item: Item; propertyId: string }) {
  const qc = useQueryClient();
  const patch = useMutation({
    mutationFn: (qty: number) => api.inventory.patch(propertyId, item.id, { current_stock: qty }),
    onSuccess: () => qc.invalidateQueries({ queryKey: ["inventory", propertyId] }),
  });

  const stock = item.current_stock ?? 0;
  const isLow = item.par_level && stock < item.par_level;
  const isEmpty = stock <= 0;

  return (
    <View style={styles.stockRow}>
      <View style={[styles.stockDot, { backgroundColor: isEmpty ? colors.danger : isLow ? colors.accent : colors.success }]} />
      <TouchableOpacity style={styles.stepBtn} onPress={() => patch.mutate(Math.max(0, stock - 1))} disabled={stock <= 0}>
        <Text style={[styles.stepBtnText, stock <= 0 && { color: colors.inkGhost }]}>−</Text>
      </TouchableOpacity>
      <Text style={styles.stockNum}>{stock}</Text>
      <TouchableOpacity style={styles.stepBtn} onPress={() => patch.mutate(stock + 1)}>
        <Text style={styles.stepBtnText}>+</Text>
      </TouchableOpacity>
      {item.par_level && <Text style={styles.parText}>par {item.par_level}</Text>}
    </View>
  );
}

export default function InventoryScreen() {
  const { propertyId } = useLocalSearchParams<{ propertyId: string }>();
  const [q, setQ] = useState("");

  const { data, isLoading, isRefetching, refetch } = useQuery({
    queryKey: ["inventory", propertyId],
    queryFn:  () => api.inventory.list(propertyId!),
    enabled:  !!propertyId,
  });

  if (isLoading) return <View style={styles.center}><ActivityIndicator color={colors.accent} /></View>;

  const items  = (data ?? []).filter(i => !q || i.name.toLowerCase().includes(q.toLowerCase()));
  const cats   = [...new Set(items.map(i => i.category ?? "Other"))].sort();
  const low    = items.filter(i => i.par_level && (i.current_stock ?? 0) < i.par_level);
  const empty  = items.filter(i => (i.current_stock ?? 0) <= 0);

  return (
    <ScrollView
      style={{ flex: 1, backgroundColor: colors.ground }}
      contentContainerStyle={{ padding: spacing.lg }}
      refreshControl={<RefreshControl refreshing={isRefetching} onRefresh={refetch} tintColor={colors.accent} />}
    >
      <TextInput style={styles.search} value={q} onChangeText={setQ}
        placeholder="Search items…" placeholderTextColor={colors.inkGhost} clearButtonMode="while-editing" />

      {!q && (empty.length > 0 || low.length > 0) && (
        <View style={styles.alertsRow}>
          {empty.length > 0 && (
            <View style={[styles.alertChip, { backgroundColor: `${colors.danger}15`, borderColor: `${colors.danger}30` }]}>
              <Text style={[styles.alertChipText, { color: colors.danger }]}>{empty.length} empty</Text>
            </View>
          )}
          {low.length > 0 && (
            <View style={[styles.alertChip, { backgroundColor: `${colors.accent}15`, borderColor: `${colors.accent}30` }]}>
              <Text style={[styles.alertChipText, { color: colors.accent }]}>{low.length} low stock</Text>
            </View>
          )}
        </View>
      )}

      {cats.map((cat) => {
        const catItems = items.filter(i => (i.category ?? "Other") === cat);
        return (
          <View key={cat}>
            <SectionHeader title={cat} count={catItems.length} />
            {catItems.map((item) => (
              <View key={item.id} style={styles.itemRow}>
                <View style={{ flex: 1 }}>
                  <Text style={styles.itemName}>{item.name}</Text>
                  {item.unit && <Text style={styles.itemUnit}>{item.unit}</Text>}
                </View>
                <StockStepper item={item} propertyId={propertyId!} />
              </View>
            ))}
          </View>
        );
      })}

      {items.length === 0 && q && (
        <Text style={styles.noData}>No items match "{q}"</Text>
      )}

      <View style={{ height: 40 }} />
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  center:       { flex: 1, alignItems: "center", justifyContent: "center" },
  search:       { backgroundColor: colors.surface, borderRadius: radius.md, borderWidth: 1, borderColor: colors.line, paddingVertical: 11, paddingHorizontal: spacing.md, fontSize: 15, color: colors.ink, marginBottom: spacing.sm },
  alertsRow:    { flexDirection: "row", gap: spacing.sm, marginBottom: spacing.sm },
  alertChip:    { borderWidth: 1, borderRadius: radius.pill, paddingHorizontal: 12, paddingVertical: 5 },
  alertChipText:{ fontSize: 12, fontWeight: "600" },
  itemRow:      { flexDirection: "row", alignItems: "center", backgroundColor: colors.surface, borderRadius: radius.md, borderWidth: 1, borderColor: colors.line, padding: spacing.md, marginBottom: 6 },
  itemName:     { fontSize: 14, color: colors.ink, fontWeight: "500" },
  itemUnit:     { fontSize: 11, color: colors.inkGhost, marginTop: 2 },
  stockRow:     { flexDirection: "row", alignItems: "center", gap: spacing.sm },
  stockDot:     { width: 8, height: 8, borderRadius: 4 },
  stepBtn:      { width: 30, height: 30, borderRadius: 15, backgroundColor: colors.ground, borderWidth: 1, borderColor: colors.line, alignItems: "center", justifyContent: "center" },
  stepBtnText:  { fontSize: 18, color: colors.ink, lineHeight: 20 },
  stockNum:     { fontSize: 16, fontWeight: "600", color: colors.ink, minWidth: 28, textAlign: "center" },
  parText:      { fontSize: 11, color: colors.inkGhost },
  noData:       { textAlign: "center", color: colors.inkGhost, fontSize: 14, marginTop: spacing.xl },
});
