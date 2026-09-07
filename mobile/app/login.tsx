import { useState } from "react";
import { View, Text, TextInput, TouchableOpacity, KeyboardAvoidingView, Platform, StyleSheet, ActivityIndicator } from "react-native";
import { useRouter } from "expo-router";
import { api } from "@/lib/api";
import { saveAuth, type StoredSession } from "@/lib/auth";
import { useSession } from "@/hooks/useSession";
import { colors, radius, spacing } from "@/lib/colors";

export default function LoginScreen() {
  const router = useRouter();
  const { setSession } = useSession();
  const [name, setName]     = useState("");
  const [pass, setPass]     = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError]   = useState("");

  async function login() {
    if (!name.trim() || !pass) return;
    setLoading(true);
    setError("");
    try {
      const res = await api.auth.login(name.trim(), pass);
      const s = res.session as StoredSession;
      await saveAuth(res.token, s);
      setSession(s);
      router.replace("/(tabs)");
    } catch (e: unknown) {
      setError(e instanceof Error ? e.message : "Login failed");
    } finally {
      setLoading(false);
    }
  }

  return (
    <KeyboardAvoidingView behavior={Platform.OS === "ios" ? "padding" : undefined} style={styles.root}>
      <View style={styles.inner}>
        {/* Logo / wordmark */}
        <View style={styles.logoBlock}>
          <Text style={styles.logoWord}>Jood</Text>
          <Text style={styles.logoSub}>Operations</Text>
        </View>

        <Text style={styles.label}>Name</Text>
        <TextInput
          style={styles.input}
          value={name}
          onChangeText={setName}
          autoCapitalize="words"
          autoCorrect={false}
          placeholder="Your name"
          placeholderTextColor={colors.inkGhost}
          returnKeyType="next"
        />

        <Text style={[styles.label, { marginTop: spacing.md }]}>Password</Text>
        <TextInput
          style={styles.input}
          value={pass}
          onChangeText={setPass}
          secureTextEntry
          placeholder="••••••••"
          placeholderTextColor={colors.inkGhost}
          returnKeyType="go"
          onSubmitEditing={login}
        />

        {error ? <Text style={styles.errorText}>{error}</Text> : null}

        <TouchableOpacity
          style={[styles.btn, loading && { opacity: 0.6 }]}
          onPress={login}
          disabled={loading}
          activeOpacity={0.8}
        >
          {loading
            ? <ActivityIndicator color="white" />
            : <Text style={styles.btnText}>Sign in</Text>
          }
        </TouchableOpacity>
      </View>
    </KeyboardAvoidingView>
  );
}

const styles = StyleSheet.create({
  root:      { flex: 1, backgroundColor: colors.ground },
  inner:     { flex: 1, justifyContent: "center", paddingHorizontal: spacing.xl, paddingBottom: 60 },
  logoBlock: { marginBottom: 48, alignItems: "flex-start" },
  logoWord:  { fontSize: 40, color: colors.ink, fontWeight: "300", letterSpacing: -1 },
  logoSub:   { fontSize: 13, color: colors.inkMuted, letterSpacing: 2, textTransform: "uppercase", marginTop: 2 },
  label:     { fontSize: 12, color: colors.inkMuted, marginBottom: spacing.xs, letterSpacing: 0.3 },
  input:     {
    backgroundColor: colors.surface, borderRadius: radius.md, borderWidth: 1, borderColor: colors.line,
    paddingVertical: 14, paddingHorizontal: spacing.md, fontSize: 16, color: colors.ink,
    marginBottom: spacing.xs,
  },
  errorText: { color: colors.danger, fontSize: 13, marginTop: spacing.sm, marginBottom: spacing.sm },
  btn:       {
    marginTop: spacing.xl, backgroundColor: colors.ink, borderRadius: radius.pill,
    paddingVertical: 15, alignItems: "center",
  },
  btnText:   { color: "white", fontSize: 15, fontWeight: "600", letterSpacing: 0.3 },
});
