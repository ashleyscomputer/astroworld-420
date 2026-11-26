import React from "react";
import { StyleSheet, Text, View } from "react-native";
import { Button, Card, Heading, Metric } from "../components/ui/Primitives";
import { colors } from "../theme/colors";
import type { Product } from "../types";
import { formatHalfUnitsAsGrams } from "../lib/inventory-format";

type Props = {
  products: Product[];
  pendingCount: number;
  connection: "connected" | "offline" | "loading";
  lastSyncedAt: string | null;
  onOpenInventory: () => void;
  onSync: () => void;
};

export default function DashboardScreen({
  products, pendingCount, connection, lastSyncedAt, onOpenInventory, onSync,
}: Props) {
  const lowStock = products.filter((item) => item.half_units <= item.low_stock_half_units);
  const totalHalfUnits = products.reduce((sum, item) => sum + item.half_units, 0);
  const totalGrams = formatHalfUnitsAsGrams(totalHalfUnits);

  return (
    <>
      <View style={styles.hero}>
        <Text style={styles.eyebrow}>ASTROWORLD 420 · INVENTORY</Text>
        <Text style={styles.title}>Stock control.</Text>
        <Text style={styles.subtitle}>Know what is on the shelf, what is running low and what needs attention.</Text>
        <View style={styles.heroAccent} />
      </View>

      <View style={styles.metrics}>
        <Metric label="Active products" value={String(products.length)} accent={colors.accent} />
        <Metric label="Low-stock alerts" value={String(lowStock.length)} accent={colors.danger} />
        <Metric label="Stock on hand" value={totalGrams + " g"} accent={colors.purple} />
        <Metric label="Pending sync" value={String(pendingCount)} accent={colors.warning} />
      </View>

      {pendingCount > 0 ? (
        <Card style={styles.syncCard}>
          <Text style={styles.cardTitle}>{pendingCount} stock change{pendingCount === 1 ? "" : "s"} waiting to sync</Text>
          <Text style={styles.muted}>These changes are saved on this device, but the server has not confirmed them yet. They are not included in the live stock totals.</Text>
          <Button title="Sync now" onPress={onSync} />
        </Card>
      ) : null}

      <Card>
        <View style={styles.rowBetween}>
          <View>
            <Text style={styles.cardTitle}>Connection</Text>
            <Text style={styles.muted}>{connection === "connected" ? "Connected to the inventory database" : connection === "offline" ? "Offline · showing last saved inventory" : "Checking connection..."}</Text>
          </View>
          <View style={[styles.dot, { backgroundColor: connection === "connected" ? colors.success : connection === "offline" ? colors.warning : colors.muted }]} />
        </View>
        <Text style={styles.micro}>{lastSyncedAt ? "Last successful refresh: " + new Date(lastSyncedAt).toLocaleString() : "No successful refresh in this session yet."}</Text>
        <Button title="Open inventory" kind="secondary" onPress={onOpenInventory} />
      </Card>

      <Heading title="Needs attention" hint="Products at or below their low-stock threshold" />
      {lowStock.length === 0 ? (
        <Card><Text style={styles.muted}>No low-stock alerts. The shelves are behaving.</Text></Card>
      ) : lowStock.slice(0, 6).map((item) => (
        <Card key={item.id} style={styles.lowCard}>
          <View style={styles.rowBetween}>
            <View style={{ flex: 1 }}>
              <Text style={styles.cardTitle}>{item.name}</Text>
              <Text style={styles.muted}>Alert level: {formatHalfUnitsAsGrams(item.low_stock_half_units)} g</Text>
            </View>
            <Text style={styles.lowValue}>{formatHalfUnitsAsGrams(item.half_units)} g</Text>
          </View>
        </Card>
      ))}
    </>
  );
}

const styles = StyleSheet.create({
  hero: { padding: 22, borderRadius: 24, backgroundColor: "#191623", borderWidth: 1, borderColor: "rgba(213,239,134,0.22)", marginBottom: 2 },
  eyebrow: { color: colors.accent, fontSize: 10, fontWeight: "800", letterSpacing: 2.2 },
  title: { color: colors.text, fontSize: 37, fontWeight: "800", letterSpacing: -1.5, marginTop: 10 },
  subtitle: { color: colors.muted, fontSize: 13, lineHeight: 20, marginTop: 7 },
  heroAccent: { width: 86, height: 4, borderRadius: 4, backgroundColor: colors.accent, marginTop: 19 },
  metrics: { flexDirection: "row", flexWrap: "wrap", gap: 10 },
  rowBetween: { flexDirection: "row", alignItems: "center", justifyContent: "space-between", gap: 12 },
  cardTitle: { color: colors.text, fontSize: 14, fontWeight: "700" },
  muted: { color: colors.muted, fontSize: 12, lineHeight: 18 },
  micro: { color: colors.muted, fontSize: 10, lineHeight: 16 },
  dot: { width: 9, height: 9, borderRadius: 8 },
  syncCard: { borderColor: "rgba(251,191,36,0.25)" },
  lowCard: { borderColor: "rgba(248,113,113,0.22)" },
  lowValue: { color: colors.danger, fontSize: 23, fontWeight: "800", fontVariant: ["tabular-nums"] },
});
