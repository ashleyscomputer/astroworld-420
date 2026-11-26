import React from "react";
import { StyleSheet, Text, View } from "react-native";
import { Button, Card, Heading } from "../components/ui/Primitives";
import { colors } from "../theme/colors";
import type { Profile } from "../types";

type Props = {
  profile: Profile;
  connection: "connected" | "offline" | "loading";
  pendingCount: number;
  lastSyncedAt: string | null;
  busy: boolean;
  onRefresh: () => void;
  onSync: () => void;
  onSignOut: () => void;
};

export default function SettingsScreen({
  profile, connection, pendingCount, lastSyncedAt, busy, onRefresh, onSync, onSignOut,
}: Props) {
  const status = connection === "connected" ? "Connected" : connection === "offline" ? "Offline" : "Checking";
  return (
    <>
      <Heading title="Workspace settings" hint="Account, device sync and application status." />
      <Card>
        <Text style={styles.label}>SIGNED-IN ACCOUNT</Text>
        <Text style={styles.name}>{profile.full_name || profile.username}</Text>
        <Text style={styles.muted}>@{profile.username}</Text>
        <View style={styles.rolePill}>
          <Text style={styles.roleText}>{profile.role === "super_admin" ? "SUPER ADMIN" : "STAFF"}</Text>
        </View>
      </Card>
      <Card>
        <View style={styles.rowBetween}>
          <Text style={styles.label}>DATABASE CONNECTION</Text>
          <Text style={[styles.status, { color: connection === "connected" ? colors.success : connection === "offline" ? colors.warning : colors.muted }]}>{status.toUpperCase()}</Text>
        </View>
        <Text style={styles.muted}>{lastSyncedAt ? "Last verified refresh: " + new Date(lastSyncedAt).toLocaleString() : "No successful refresh yet."}</Text>
        <Text style={styles.muted}>{pendingCount} pending inventory operation(s) on this device.</Text>
        <Button title={busy ? "Working..." : "Refresh inventory"} disabled={busy} onPress={onRefresh} />
        <Button title="Retry pending sync" kind="secondary" disabled={busy || pendingCount === 0} onPress={onSync} />
      </Card>
      <Card>
        <Text style={styles.label}>ABOUT THIS APP</Text>
        <Text style={styles.name}>Astroworld 420 Inventory</Text>
        <Text style={styles.muted}>Internal stock tracking only. Customer-facing checkout, membership and website workflows are separate systems and are not included in this app.</Text>
        <Text style={styles.micro}>Stock unit: integer half-gram increments. Offline changes remain pending until the server confirms them.</Text>
      </Card>
      <Button title="Sign out" kind="danger" onPress={onSignOut} />
    </>
  );
}

const styles = StyleSheet.create({
  rowBetween: { flexDirection: "row", alignItems: "center", justifyContent: "space-between", gap: 10 },
  label: { color: colors.muted, fontSize: 9, fontWeight: "800", letterSpacing: 1.4 },
  name: { color: colors.text, fontSize: 16, fontWeight: "700" },
  muted: { color: colors.muted, fontSize: 12, lineHeight: 18 },
  micro: { color: colors.muted, fontSize: 10, lineHeight: 16 },
  status: { fontSize: 9, fontWeight: "800", letterSpacing: 1 },
  rolePill: { alignSelf: "flex-start", borderWidth: 1, borderColor: "rgba(213,239,134,0.25)", backgroundColor: "rgba(213,239,134,0.08)", borderRadius: 99, paddingHorizontal: 11, paddingVertical: 7 },
  roleText: { color: colors.accent, fontSize: 9, fontWeight: "800", letterSpacing: 1 },
});
