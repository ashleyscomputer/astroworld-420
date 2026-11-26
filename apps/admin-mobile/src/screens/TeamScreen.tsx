import React, { useState } from "react";
import { StyleSheet, Text, View } from "react-native";
import { Button, Card, Field, Heading } from "../components/ui/Primitives";
import { colors } from "../theme/colors";
import type { Profile } from "../types";

type Props = {
  profiles: Profile[];
  isSuperAdmin: boolean;
  busy: boolean;
  onInvite: (details: { email: string; username: string; fullName: string }) => void;
  onToggle: (profile: Profile) => void;
};

export default function TeamScreen({ profiles, isSuperAdmin, busy, onInvite, onToggle }: Props) {
  const [email, setEmail] = useState("");
  const [username, setUsername] = useState("");
  const [fullName, setFullName] = useState("");

  if (!isSuperAdmin) {
    return <Card><Text style={styles.muted}>Team management is restricted to Super Admin accounts.</Text></Card>;
  }

  return (
    <>
      <Heading title="Team access" hint="Invite staff and manage active accounts." />
      <Card>
        <Text style={styles.cardTitle}>Invite a staff member</Text>
        <Field label="Email address" value={email} onChange={setEmail} type="email-address" placeholder="staff@example.co.za" />
        <Field label="Username" value={username} onChange={setUsername} placeholder="staff.username" />
        <Field label="Full name" value={fullName} onChange={setFullName} placeholder="Team member name" />
        <Button
          title={busy ? "Sending invite..." : "Send invitation"}
          disabled={busy || !email.trim() || !username.trim() || !fullName.trim()}
          onPress={() => {
            onInvite({ email: email.trim(), username: username.trim(), fullName: fullName.trim() });
            setEmail("");
            setUsername("");
            setFullName("");
          }}
        />
      </Card>

      <Heading title="Accounts" hint={String(profiles.length) + " registered profile(s)"} />
      {profiles.map((profile) => (
        <Card key={profile.id} style={styles.account}>
          <View style={{ flex: 1, gap: 4 }}>
            <Text style={styles.cardTitle}>{profile.full_name || profile.username}</Text>
            <Text style={styles.meta}>@{profile.username} · {profile.role.replace("_", " ")}</Text>
          </View>
          <View style={{ alignItems: "flex-end", gap: 8 }}>
            <Text style={[styles.status, { color: profile.active ? colors.success : colors.danger }]}>
              {profile.active ? "ACTIVE" : "DISABLED"}
            </Text>
            {profile.role !== "super_admin" ? (
              <Button
                title={profile.active ? "Deactivate" : "Reactivate"}
                small
                kind="secondary"
                onPress={() => onToggle(profile)}
              />
            ) : null}
          </View>
        </Card>
      ))}
      <Text style={styles.footer}>Staff can view inventory and movement history. Only Super Admin accounts can change stock or manage team access.</Text>
    </>
  );
}

const styles = StyleSheet.create({
  account: { flexDirection: "row", alignItems: "center", justifyContent: "space-between" },
  cardTitle: { color: colors.text, fontSize: 14, fontWeight: "700" },
  meta: { color: colors.muted, fontSize: 10, textTransform: "capitalize" },
  status: { fontSize: 9, fontWeight: "800", letterSpacing: 1 },
  muted: { color: colors.muted, fontSize: 12, lineHeight: 18 },
  footer: { color: colors.muted, fontSize: 10, lineHeight: 16, paddingHorizontal: 3 },
});
