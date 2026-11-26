import React, { useState } from "react";
import { KeyboardAvoidingView, Platform, ScrollView, StyleSheet, Text, View } from "react-native";
import { Button, Card, Field, Heading } from "../components/ui/Primitives";
import { colors } from "../theme/colors";

type Props = {
  configured: boolean;
  busy: boolean;
  notice: string;
  onSignIn: (email: string, password: string) => void;
};

export default function LoginScreen({ configured, busy, notice, onSignIn }: Props) {
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");

  return (
    <KeyboardAvoidingView
      style={styles.root}
      behavior={Platform.OS === "ios" ? "padding" : undefined}
    >
      <ScrollView contentContainerStyle={styles.content} keyboardShouldPersistTaps="handled">
        <View style={styles.orbit} />
        <Text style={styles.eyebrow}>ASTROWORLD 420 · OPERATIONS</Text>
        <Text style={styles.title}>Stock room.</Text>
        <Text style={styles.subtitle}>A private inventory workspace for the team.</Text>

        {!configured ? (
          <Card>
            <Text style={styles.warning}>Supabase is not configured. Add the project URL and public anon/publishable key to your private .env file.</Text>
          </Card>
        ) : null}

        <Card>
          <Heading title="Sign in" hint="Use the account created by your Super Admin." />
          <Field label="Email" value={email} onChange={setEmail} type="email-address" placeholder="name@company.co.za" />
          <Field label="Password" value={password} onChange={setPassword} secure />
          {notice ? <Text style={styles.warning}>{notice}</Text> : null}
          <Button
            title={busy ? "Signing in..." : "Sign in"}
            disabled={!configured || busy || !email.trim() || !password}
            onPress={() => onSignIn(email.trim(), password)}
          />
        </Card>

        <Text style={styles.footer}>Inventory only. No customer checkout, memberships or client-facing features.</Text>
      </ScrollView>
    </KeyboardAvoidingView>
  );
}

const styles = StyleSheet.create({
  root: { flex: 1, backgroundColor: colors.background },
  content: { flexGrow: 1, justifyContent: "center", padding: 24, gap: 18 },
  orbit: { position: "absolute", width: 280, height: 280, borderRadius: 200, right: -130, top: 40, backgroundColor: colors.purple, opacity: 0.12 },
  eyebrow: { color: colors.accent, fontSize: 10, fontWeight: "800", letterSpacing: 2.4 },
  title: { color: colors.text, fontSize: 42, fontWeight: "800", letterSpacing: -1.7 },
  subtitle: { color: colors.muted, fontSize: 14, lineHeight: 21, marginTop: -10 },
  warning: { color: colors.warning, fontSize: 12, lineHeight: 18 },
  footer: { color: colors.muted, fontSize: 11, lineHeight: 17, textAlign: "center", marginTop: 8 },
});
