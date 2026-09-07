import { useState } from "react";
import { ScrollView, RefreshControl, View, Text, TextInput, TouchableOpacity, StyleSheet, Alert, Switch, ActivityIndicator } from "react-native";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { api } from "@/lib/api";
import { SectionHeader, Card, Button } from "@/components/Ui";
import { colors, spacing, radius } from "@/lib/colors";

type Service = Awaited<ReturnType<typeof api.services.list>>[0];

function ServiceCard({ svc }: { svc: Service }) {
  const qc = useQueryClient();
  const patch = useMutation({
    mutationFn: (body: object) => api.services.patch(svc.id, body),
    onSuccess: () => qc.invalidateQueries({ queryKey: ["services"] }),
  });

  return (
    <View style={styles.svcCard}>
      <View style={{ flex: 1 }}>
        <Text style={styles.svcName}>{svc.name_en}</Text>
        {svc.name_ar && <Text style={styles.svcNameAr}>{svc.name_ar}</Text>}
        <Text style={styles.svcMeta}>
          {svc.category ? `${svc.category} · ` : ""}
          {svc.price_egp ? `EGP ${svc.price_egp}` : "Free"}
        </Text>
      </View>
      <Switch
        value={svc.is_active ?? false}
        onValueChange={(v) => patch.mutate({ is_active: v })}
        trackColor={{ true: colors.success, false: colors.line }}
        thumbColor="white"
      />
    </View>
  );
}

export default function ServicesScreen() {
  const qc = useQueryClient();
  const [adding, setAdding] = useState(false);
  const [nameEn, setNameEn] = useState("");
  const [nameAr, setNameAr] = useState("");
  const [category, setCategory] = useState("");
  const [price, setPrice] = useState("");

  const { data, isLoading, isRefetching, refetch } = useQuery({
    queryKey: ["services"],
    queryFn:  api.services.list,
  });

  const create = useMutation({
    mutationFn: () => api.services.create({ name_en: nameEn, name_ar: nameAr || undefined, category: category || undefined, price_egp: price ? parseFloat(price) : undefined }),
    onSuccess: () => { qc.invalidateQueries({ queryKey: ["services"] }); setAdding(false); setNameEn(""); setNameAr(""); setCategory(""); setPrice(""); },
  });

  const cats = [...new Set((data ?? []).map(s => s.category ?? "Other"))].sort();

  if (isLoading) return <View style={styles.center}><ActivityIndicator color={colors.accent} /></View>;

  return (
    <ScrollView
      style={{ flex: 1, backgroundColor: colors.ground }}
      contentContainerStyle={{ padding: spacing.lg }}
      refreshControl={<RefreshControl refreshing={isRefetching} onRefresh={refetch} tintColor={colors.accent} />}
    >
      {!adding ? (
        <TouchableOpacity style={styles.addBtn} onPress={() => setAdding(true)}>
          <Text style={{ color: colors.inkMuted, fontSize: 14 }}>+ Add service</Text>
        </TouchableOpacity>
      ) : (
        <Card>
          <Text style={styles.formLabel}>Name (English) *</Text>
          <TextInput style={styles.input} value={nameEn} onChangeText={setNameEn} placeholder="e.g. Airport transfer" placeholderTextColor={colors.inkGhost} />

          <Text style={[styles.formLabel, { marginTop: spacing.md }]}>Name (Arabic)</Text>
          <TextInput style={styles.input} value={nameAr} onChangeText={setNameAr} placeholder="اسم الخدمة" placeholderTextColor={colors.inkGhost} />

          <Text style={[styles.formLabel, { marginTop: spacing.md }]}>Category</Text>
          <TextInput style={styles.input} value={category} onChangeText={setCategory} placeholder="e.g. Transport, Food, Cleaning" placeholderTextColor={colors.inkGhost} />

          <Text style={[styles.formLabel, { marginTop: spacing.md }]}>Price (EGP)</Text>
          <TextInput style={styles.input} value={price} onChangeText={setPrice} placeholder="Leave blank for free" keyboardType="decimal-pad" placeholderTextColor={colors.inkGhost} />

          <View style={{ flexDirection: "row", gap: spacing.sm, marginTop: spacing.md }}>
            <Button label="Create" onPress={() => create.mutate()} loading={create.isPending}
              style={{ flex: 1 }} disabled={!nameEn.trim()} />
            <Button label="Cancel" variant="ghost" onPress={() => setAdding(false)} style={{ flex: 1 }} />
          </View>
        </Card>
      )}

      {cats.map((cat) => {
        const svcs = (data ?? []).filter(s => (s.category ?? "Other") === cat);
        return (
          <View key={cat}>
            <SectionHeader title={cat} count={svcs.length} />
            {svcs.map(s => <ServiceCard key={s.id} svc={s} />)}
          </View>
        );
      })}

      <View style={{ height: 40 }} />
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  center:    { flex: 1, alignItems: "center", justifyContent: "center" },
  addBtn:    { borderWidth: 1.5, borderStyle: "dashed", borderColor: colors.line, borderRadius: radius.md, padding: spacing.lg, alignItems: "center", marginBottom: spacing.sm },
  formLabel: { fontSize: 12, color: colors.inkMuted, fontWeight: "600", letterSpacing: 0.4, marginBottom: 6 },
  input:     { backgroundColor: colors.ground, borderWidth: 1, borderColor: colors.line, borderRadius: radius.md, padding: spacing.md, fontSize: 14, color: colors.ink },
  svcCard:   { flexDirection: "row", alignItems: "center", gap: spacing.md, backgroundColor: colors.surface, borderRadius: radius.md, borderWidth: 1, borderColor: colors.line, padding: spacing.md, marginBottom: 6 },
  svcName:   { fontSize: 15, color: colors.ink, fontWeight: "500" },
  svcNameAr: { fontSize: 13, color: colors.inkMuted },
  svcMeta:   { fontSize: 12, color: colors.inkGhost, marginTop: 2, textTransform: "capitalize" },
});
