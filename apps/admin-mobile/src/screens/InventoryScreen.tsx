import React from "react";
import { StyleSheet, Text, View } from "react-native";
import { Button, Card, Field, Heading } from "../components/ui/Primitives";
import { colors } from "../theme/colors";
import type { Product } from "../types";
import { formatHalfUnitsAsGrams } from "../lib/inventory-format";

type Props = {
  products: Product[];
  query: string;
  onQueryChange: (value: string) => void;
  isSuperAdmin: boolean;
  pendingProductIds: string[];
  onRestock: (product: Product) => void;
  onAdjust: (product: Product) => void;
  onThreshold: (product: Product) => void;
};

export default function InventoryScreen({
  products, query, onQueryChange, isSuperAdmin, pendingProductIds, onRestock, onAdjust, onThreshold,
}: Props) {
  const filtered = products
    .filter((product) => (product.name + " " + product.id).toLowerCase().includes(query.trim().toLowerCase()))
    .sort((a, b) => {
      const aLow = a.half_units <= a.low_stock_half_units ? 0 : 1;
      const bLow = b.half_units <= b.low_stock_half_units ? 0 : 1;
      return aLow - bLow || a.sort_order - b.sort_order;
    });

  return (
    <>
      <Heading title="Inventory" hint="Stock is stored in integer half-gram units." />
      <Field label="Search stock" value={query} onChange={onQueryChange} placeholder="Search by product or ID..." />
      {filtered.length === 0 ? (
        <Card><Text style={styles.muted}>No products match that search.</Text></Card>
      ) : filtered.map((product) => {
        const low = product.half_units <= product.low_stock_half_units;
        const pending = pendingProductIds.includes(product.id);
        const threshold = Math.max(product.low_stock_half_units, 1);
        const progress = Math.max(0, Math.min(100, Math.round(product.half_units / threshold * 100)));
        return (
          <Card key={product.id} style={[styles.productCard, low && styles.lowCard]}>
            <View style={styles.rowBetween}>
              <View style={{ flex: 1, gap: 3 }}>
                <Text style={styles.name}>{product.name}</Text>
                <Text style={styles.muted}>{product.id}</Text>
              </View>
              <View style={{ alignItems: "flex-end", gap: 3 }}>
                <Text style={[styles.stock, low && styles.stockLow]}>{formatHalfUnitsAsGrams(product.half_units)} g</Text>
                <Text style={[styles.status, low ? styles.statusLow : styles.statusOkay]}>{low ? "LOW STOCK" : "IN STOCK"}</Text>
              </View>
            </View>
            <View style={styles.track}>
              <View style={[styles.fill, { width: progress + "%", backgroundColor: low ? colors.danger : colors.accent }]} />
            </View>
            <View style={styles.rowBetween}>
              <Text style={styles.micro}>Alert at {formatHalfUnitsAsGrams(product.low_stock_half_units)} g</Text>
              {pending ? <Text style={styles.pending}>PENDING SYNC</Text> : <Text style={styles.micro}>Live stock</Text>}
            </View>
            {isSuperAdmin ? (
              <View style={styles.actions}>
                <Button title="Restock" small onPress={() => onRestock(product)} />
                <Button title="Set quantity" small kind="secondary" onPress={() => onAdjust(product)} />
                <Button title="Alert level" small kind="quiet" onPress={() => onThreshold(product)} />
              </View>
            ) : (
              <Text style={styles.micro}>Staff access · Read-only stock view.</Text>
            )}
          </Card>
        );
      })}
      <Text style={styles.footer}>Stock changes are recorded by the database and appear in the movement log after server confirmation.</Text>
    </>
  );
}

const styles = StyleSheet.create({
  productCard: { gap: 11 },
  lowCard: { borderColor: "rgba(248,113,113,0.30)" },
  rowBetween: { flexDirection: "row", alignItems: "center", justifyContent: "space-between", gap: 12 },
  name: { color: colors.text, fontSize: 15, fontWeight: "700" },
  muted: { color: colors.muted, fontSize: 12, lineHeight: 18 },
  micro: { color: colors.muted, fontSize: 10, lineHeight: 15 },
  stock: { color: colors.accent, fontSize: 24, fontWeight: "800", fontVariant: ["tabular-nums"] },
  stockLow: { color: colors.danger },
  status: { fontSize: 9, fontWeight: "800", letterSpacing: 1 },
  statusLow: { color: colors.danger },
  statusOkay: { color: colors.success },
  track: { height: 6, borderRadius: 6, backgroundColor: colors.elevated, overflow: "hidden" },
  fill: { height: 6, borderRadius: 6 },
  pending: { color: colors.warning, fontSize: 9, fontWeight: "800", letterSpacing: 0.8 },
  actions: { flexDirection: "row", gap: 8 },
  footer: { color: colors.muted, fontSize: 10, lineHeight: 16, paddingHorizontal: 3 },
});
