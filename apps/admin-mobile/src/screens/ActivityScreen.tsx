import React from "react";
import { StyleSheet, Text, View } from "react-native";
import { Card, Heading } from "../components/ui/Primitives";
import { colors } from "../theme/colors";
import type { StockMovement } from "../types";
import { formatHalfUnitsAsGrams } from "../lib/inventory-format";

type Props = { movements: StockMovement[]; loading: boolean };

function movementLabel(kind: StockMovement["kind"]): string {
  switch (kind) {
    case "restock": return "Restock";
    case "adjustment": return "Manual adjustment";
    case "sale": return "Stock issued";
    case "sale_cancel": return "Cancellation return";
    case "sale_refund": return "Refund return";
    default: return "Stock movement";
  }
}

export default function ActivityScreen({ movements, loading }: Props) {
  return (
    <>
      <Heading title="Movement history" hint="A traceable log of stock changes." />
      {loading ? <Card><Text style={styles.muted}>Loading stock movements...</Text></Card> : null}
      {!loading && movements.length === 0 ? (
        <Card><Text style={styles.muted}>No stock movements have been recorded yet.</Text></Card>
      ) : null}
      {movements.map((movement) => {
        const positive = movement.delta_half > 0;
        const delta = Math.abs(movement.delta_half);
        return (
          <Card key={movement.id} style={styles.card}>
            <View style={styles.rowBetween}>
              <View style={{ flex: 1, gap: 4 }}>
                <Text style={styles.name}>{movement.product_name}</Text>
                <Text style={styles.meta}>{movementLabel(movement.kind)} · {movement.actor_username}</Text>
              </View>
              <Text style={[styles.delta, { color: positive ? colors.success : colors.warning }]}>
                {positive ? "+" : "−"}{formatHalfUnitsAsGrams(delta)} g
              </Text>
            </View>
            <View style={styles.rowBetween}>
              <Text style={styles.micro}>
                {formatHalfUnitsAsGrams(movement.previous_half)} g → {formatHalfUnitsAsGrams(movement.new_half)} g
              </Text>
              <Text style={styles.date}>{new Date(movement.created_at).toLocaleString()}</Text>
            </View>
            {movement.reason ? <Text style={styles.reason}>{movement.reason}</Text> : null}
          </Card>
        );
      })}
      <Text style={styles.footer}>The movement history is append-only in the database. Entries cannot be edited or deleted through the app.</Text>
    </>
  );
}

const styles = StyleSheet.create({
  card: { gap: 9 },
  rowBetween: { flexDirection: "row", alignItems: "center", justifyContent: "space-between", gap: 10 },
  name: { color: colors.text, fontSize: 14, fontWeight: "700" },
  meta: { color: colors.muted, fontSize: 10, textTransform: "capitalize" },
  delta: { fontSize: 18, fontWeight: "800", fontVariant: ["tabular-nums"] },
  micro: { color: colors.muted, fontSize: 10 },
  date: { color: colors.muted, fontSize: 9, textAlign: "right" },
  reason: { color: colors.text, fontSize: 11, lineHeight: 17, backgroundColor: colors.elevated, padding: 9, borderRadius: 9 },
  muted: { color: colors.muted, fontSize: 12, lineHeight: 18 },
  footer: { color: colors.muted, fontSize: 10, lineHeight: 16, paddingHorizontal: 3 },
});
