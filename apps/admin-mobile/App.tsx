import React, { useCallback, useEffect, useRef, useState } from "react";
import {
  ActivityIndicator, KeyboardAvoidingView, Modal, Platform, Pressable,
  ScrollView, StatusBar, StyleSheet, Text, View,
} from "react-native";
import { useFonts, Inter_400Regular, Inter_500Medium, Inter_600SemiBold, Inter_700Bold } from "@expo-google-fonts/inter";
import { Ionicons } from "@expo/vector-icons";
import * as Crypto from "expo-crypto";
import type { Session } from "@supabase/supabase-js";
import { Button, Card, Field } from "./src/components/ui/Primitives";
import { colors } from "./src/theme/colors";
import { assertSupabaseConfigured, supabase, supabaseConfigured } from "./src/lib/supabase";
import {
  cacheProducts, enqueueInventoryOperation, getCachedProducts,
  getPendingInventoryOperations, markInventoryOperationError,
  pendingInventoryOperationCount, removeInventoryOperation,
} from "./src/lib/offline";
import { formatHalfUnitsAsGrams, isNetworkError, parseGramsToHalfUnits } from "./src/lib/inventory-format";
import type { PendingInventoryOperation, Product, Profile, StockMovement } from "./src/types";
import LoginScreen from "./src/screens/LoginScreen";
import DashboardScreen from "./src/screens/DashboardScreen";
import InventoryScreen from "./src/screens/InventoryScreen";
import ActivityScreen from "./src/screens/ActivityScreen";
import TeamScreen from "./src/screens/TeamScreen";
import SettingsScreen from "./src/screens/SettingsScreen";

type Tab = "Overview" | "Inventory" | "Activity" | "Team" | "Settings";
type OperationKind = "restock" | "adjustment";
type OperationModal = { kind: OperationKind; product: Product } | null;

async function rpc<T = unknown>(name: string, params: Record<string, unknown> = {}): Promise<T> {
  const { data, error } = await (supabase as any).rpc(name, params);
  if (error) throw new Error(error.message || name + " failed");
  return data as T;
}

export default function App() {
  const [fontsLoaded] = useFonts({
    Inter_400Regular, Inter_500Medium, Inter_600SemiBold, Inter_700Bold,
  });
  const [session, setSession] = useState<Session | null>(null);
  const [profile, setProfile] = useState<Profile | null>(null);
  const profileRef = useRef<Profile | null>(null);
  const [booting, setBooting] = useState(true);
  const [busy, setBusy] = useState(false);
  const [tab, setTab] = useState<Tab>("Overview");
  const [products, setProducts] = useState<Product[]>([]);
  const [movements, setMovements] = useState<StockMovement[]>([]);
  const [team, setTeam] = useState<Profile[]>([]);
  const [query, setQuery] = useState("");
  const [pendingCount, setPendingCount] = useState(0);
  const [pendingProductIds, setPendingProductIds] = useState<string[]>([]);
  const [connection, setConnection] = useState<"connected" | "offline" | "loading">("loading");
  const [lastSyncedAt, setLastSyncedAt] = useState<string | null>(null);
  const [notice, setNotice] = useState("");
  const [loginNotice, setLoginNotice] = useState("");
  const [operationModal, setOperationModal] = useState<OperationModal>(null);
  const [quantityGrams, setQuantityGrams] = useState("");
  const [reason, setReason] = useState("");
  const [confirmProfile, setConfirmProfile] = useState<Profile | null>(null);

  const isSuperAdmin = profile?.role === "super_admin";

  useEffect(() => {
    let mounted = true;
    const { data } = supabase.auth.onAuthStateChange((_event, nextSession) => {
      if (mounted) setSession(nextSession);
    });
    void supabase.auth.getSession()
      .then(({ data: sessionData, error }) => {
        if (!mounted) return;
        if (error) setLoginNotice("Your saved session could not be restored. Please sign in again.");
        setSession(sessionData.session);
      })
      .catch(() => {
        if (mounted) setLoginNotice("Your saved session could not be restored. Please sign in again.");
      })
      .finally(() => {
        if (mounted) setBooting(false);
      });
    return () => {
      mounted = false;
      data.subscription.unsubscribe();
    };
  }, []);

  const syncPendingOperations = useCallback(async (): Promise<void> => {
    if (!session?.user || !supabaseConfigured) return;
    const pending = await getPendingInventoryOperations();
    for (const operation of pending) {
      try {
        if (operation.kind === "restock") {
          await rpc("restock_inventory_idempotent", {
            p_request_id: operation.requestId,
            p_product_id: operation.productId,
            p_add_half: operation.quantityHalf,
            p_reason: operation.reason,
          });
        } else {
          await rpc("adjust_inventory_idempotent", {
            p_request_id: operation.requestId,
            p_product_id: operation.productId,
            p_new_half: operation.quantityHalf,
            p_revision: operation.revision,
            p_reason: operation.reason,
          });
        }
        await removeInventoryOperation(operation.requestId);
      } catch (error) {
        const message = error instanceof Error ? error.message : "Inventory sync failed.";
        await markInventoryOperationError(operation.requestId, message);
        if (isNetworkError(message)) break;
        setNotice("A queued stock change needs attention: " + message);
        break;
      }
    }
    const remaining = await getPendingInventoryOperations();
    setPendingCount(remaining.length);
    setPendingProductIds(remaining.map((item) => item.productId));
  }, [session]);

  const refresh = useCallback(async (): Promise<void> => {
    if (!session?.user) return;
    setBusy(true);
    setConnection("loading");
    try {
      assertSupabaseConfigured();
      const { data: person, error: personError } = await supabase
        .from("profiles")
        .select("id,username,full_name,role,active")
        .eq("id", session.user.id)
        .single();

      if (personError || !person || !(person as Profile).active) {
        await supabase.auth.signOut();
        throw new Error("This account is not active in the inventory workspace.");
      }

      const me = person as Profile;
      setProfile(me);

      // Retry queued writes before fetching the authoritative stock snapshot.
      await syncPendingOperations();

      const [productResult, stockResult] = await Promise.all([
        supabase.from("products")
          .select("id,name,sort_order,active,low_stock_half_units,revision")
          .eq("active", true)
          .order("sort_order"),
        supabase.from("stock").select("product_id,half_units,revision"),
      ]);

      if (productResult.error) throw new Error(productResult.error.message);
      if (stockResult.error) throw new Error(stockResult.error.message);

      const stockMap = new Map<string, { half_units: number; revision: number }>(
        (stockResult.data ?? []).map((row: any) => [
          row.product_id,
          { half_units: Number(row.half_units), revision: Number(row.revision) },
        ])
      );
      const joined: Product[] = (productResult.data ?? []).map((row: any) => {
        const stock = stockMap.get(row.id);
        return {
          id: row.id,
          name: row.name,
          sort_order: Number(row.sort_order),
          active: Boolean(row.active),
          low_stock_half_units: Number(row.low_stock_half_units),
          revision: Number(row.revision),
          half_units: stock?.half_units ?? 0,
          stock_revision: stock?.revision ?? 0,
        };
      });
      setProducts(joined);
      await cacheProducts(joined);

      const [movementResult, staffResult] = await Promise.all([
        rpc<StockMovement[]>("inventory_movement_history", { p_limit: 60, p_product_id: null })
          .then((data) => ({ data, error: null as string | null }))
          .catch((error) => ({ data: [] as StockMovement[], error: error instanceof Error ? error.message : "Movement history unavailable." })),
        me.role === "super_admin"
          ? supabase.from("profiles").select("id,username,full_name,role,active").order("created_at")
          : Promise.resolve({ data: [], error: null }),
      ]);

      if (!movementResult.error) setMovements(movementResult.data);
      else setNotice("Stock is current, but movement history could not be loaded. Apply migration 0006 if it has not been run.");

      if (me.role === "super_admin") {
        if (!staffResult.error && staffResult.data) setTeam(staffResult.data as Profile[]);
        else setNotice("Inventory loaded, but team accounts could not be refreshed.");
      } else {
        setTeam([]);
      }

      setConnection("connected");
      setLastSyncedAt(new Date().toISOString());
      const remaining = await getPendingInventoryOperations();
      setPendingCount(remaining.length);
      setPendingProductIds(remaining.map((item) => item.productId));
    } catch (error) {
      const message = error instanceof Error ? error.message : "Could not refresh inventory.";
      if (isNetworkError(message) && profileRef.current) {
        const cached = await getCachedProducts();
        if (cached.length) setProducts(cached);
        setConnection("offline");
        setNotice("Offline mode: showing the last saved stock snapshot. New stock changes will stay pending until confirmed.");
      } else {
        setConnection("offline");
        setNotice(message);
      }
      const remaining = await getPendingInventoryOperations().catch(() => []);
      setPendingCount(remaining.length);
      setPendingProductIds(remaining.map((item) => item.productId));
    } finally {
      setBusy(false);
    }
  }, [session, syncPendingOperations]);

  useEffect(() => {
    if (!session) {
      setProfile(null);
      profileRef.current = null;
      setProducts([]);
      setMovements([]);
      setTeam([]);
      setPendingCount(0);
      setConnection("loading");
      return;
    }
    void refresh();
  }, [session, refresh]);

  const handleSignIn = useCallback(async (email: string, password: string) => {
    setBusy(true);
    setLoginNotice("");
    try {
      assertSupabaseConfigured();
      const { error } = await supabase.auth.signInWithPassword({ email, password });
      if (error) throw new Error(error.message);
    } catch (error) {
      setLoginNotice(error instanceof Error ? error.message : "Sign in failed.");
    } finally {
      setBusy(false);
    }
  }, []);

  const handleSync = useCallback(async () => {
    setBusy(true);
    try {
      await syncPendingOperations();
      await refresh();
    } finally {
      setBusy(false);
    }
  }, [refresh, syncPendingOperations]);

  const saveInventoryOperation = useCallback(async () => {
    if (!operationModal) return;
    if (!isSuperAdmin) {
      setNotice("Only a Super Admin can change stock.");
      setOperationModal(null);
      return;
    }

    let quantityHalf: number;
    try {
      quantityHalf = parseGramsToHalfUnits(quantityGrams);
      if (operationModal.kind === "restock" && quantityHalf < 1) {
        throw new Error("Restock quantity must be at least 0.5 g.");
      }
      if (operationModal.kind === "adjustment" && reason.trim().length < 3) {
        throw new Error("Please enter a reason of at least 3 characters.");
      }
    } catch (error) {
      setNotice(error instanceof Error ? error.message : "Check the quantity and try again.");
      return;
    }

    const operation: PendingInventoryOperation = {
      requestId: Crypto.randomUUID(),
      kind: operationModal.kind,
      productId: operationModal.product.id,
      quantityHalf,
      revision: operationModal.product.stock_revision,
      reason: reason.trim() || (operationModal.kind === "restock" ? "Mobile restock" : ""),
      queuedAt: new Date().toISOString(),
    };

    setBusy(true);
    try {
      assertSupabaseConfigured();
      if (operation.kind === "restock") {
        await rpc("restock_inventory_idempotent", {
          p_request_id: operation.requestId,
          p_product_id: operation.productId,
          p_add_half: operation.quantityHalf,
          p_reason: operation.reason,
        });
      } else {
        await rpc("adjust_inventory_idempotent", {
          p_request_id: operation.requestId,
          p_product_id: operation.productId,
          p_new_half: operation.quantityHalf,
          p_revision: operation.revision,
          p_reason: operation.reason,
        });
      }
      setNotice(operation.kind === "restock" ? "Restock confirmed by the server." : "Stock adjustment confirmed by the server.");
      setOperationModal(null);
      setQuantityGrams("");
      setReason("");
      await refresh();
    } catch (error) {
      const message = error instanceof Error ? error.message : "Stock change failed.";
      if (isNetworkError(message)) {
        await enqueueInventoryOperation(operation);
        const remaining = await getPendingInventoryOperations();
        setPendingCount(remaining.length);
        setPendingProductIds(remaining.map((item) => item.productId));
        setNotice("Saved on this device. Stock will update only after the server confirms the change.");
        setOperationModal(null);
        setQuantityGrams("");
        setReason("");
      } else {
        setNotice(message);
      }
    } finally {
      setBusy(false);
    }
  }, [operationModal, isSuperAdmin, quantityGrams, reason, refresh]);

  const inviteStaff = useCallback(async (details: { email: string; username: string; fullName: string }) => {
    setBusy(true);
    try {
      const { data, error } = await supabase.functions.invoke("invite-staff", {
        body: { email: details.email, username: details.username, full_name: details.fullName },
      });
      if (error) throw new Error(error.message);
      if (data?.error) throw new Error(data.error);
      setNotice("Staff invitation sent.");
      await refresh();
    } catch (error) {
      setNotice(error instanceof Error ? error.message : "Staff invitation failed.");
    } finally {
      setBusy(false);
    }
  }, [refresh]);

  const toggleStaff = useCallback(async () => {
    if (!confirmProfile) return;
    const selected = confirmProfile;
    setConfirmProfile(null);
    setBusy(true);
    try {
      await rpc("set_staff_active", { p_user_id: selected.id, p_active: !selected.active });
      setNotice(selected.active ? "Staff access deactivated." : "Staff access reactivated.");
      await refresh();
    } catch (error) {
      setNotice(error instanceof Error ? error.message : "Could not update staff access.");
    } finally {
      setBusy(false);
    }
  }, [confirmProfile, refresh]);

  const openOperation = (product: Product, kind: OperationKind) => {
    setOperationModal({ product, kind });
    setQuantityGrams(kind === "adjustment" ? formatHalfUnitsAsGrams(product.half_units) : "");
    setReason("");
  };

  if (booting || !fontsLoaded) {
    return (
      <View style={styles.loading}>
        <StatusBar barStyle="light-content" />
        <ActivityIndicator size="large" color={colors.accent} />
        <Text style={styles.loadingText}>Opening inventory workspace...</Text>
      </View>
    );
  }

  if (!session) {
    return (
      <LoginScreen
        configured={supabaseConfigured}
        busy={busy}
        notice={loginNotice}
        onSignIn={(email, password) => void handleSignIn(email, password)}
      />
    );
  }

  if (!profile) {
    return (
      <View style={styles.loading}>
        <StatusBar barStyle="light-content" />
        <ActivityIndicator size="large" color={colors.accent} />
        <Text style={styles.loadingText}>{notice || "Verifying your inventory account..."}</Text>
        <Button title="Retry" onPress={() => void refresh()} />
        <Button title="Sign out" kind="secondary" onPress={() => void supabase.auth.signOut()} />
      </View>
    );
  }

  const tabs: Tab[] = isSuperAdmin
    ? ["Overview", "Inventory", "Activity", "Team", "Settings"]
    : ["Overview", "Inventory", "Activity", "Settings"];

  const renderScreen = () => {
    switch (tab) {
      case "Overview":
        return (
          <DashboardScreen
            products={products}
            pendingCount={pendingCount}
            connection={connection}
            lastSyncedAt={lastSyncedAt}
            onOpenInventory={() => setTab("Inventory")}
            onSync={() => void handleSync()}
          />
        );
      case "Inventory":
        return (
          <InventoryScreen
            products={products}
            query={query}
            onQueryChange={setQuery}
            isSuperAdmin={Boolean(isSuperAdmin)}
            pendingProductIds={pendingProductIds}
            onRestock={(product) => openOperation(product, "restock")}
            onAdjust={(product) => openOperation(product, "adjustment")}
          />
        );
      case "Activity":
        return <ActivityScreen movements={movements} loading={busy && movements.length === 0} />;
      case "Team":
        return (
          <TeamScreen
            profiles={team}
            isSuperAdmin={Boolean(isSuperAdmin)}
            busy={busy}
            onInvite={(details) => void inviteStaff(details)}
            onToggle={(person) => setConfirmProfile(person)}
          />
        );
      case "Settings":
        return (
          <SettingsScreen
            profile={profile}
            connection={connection}
            pendingCount={pendingCount}
            lastSyncedAt={lastSyncedAt}
            busy={busy}
            onRefresh={() => void refresh()}
            onSync={() => void handleSync()}
            onSignOut={() => void supabase.auth.signOut()}
          />
        );
      default:
        return null;
    }
  };

  const iconByTab: Record<Tab, string> = {
    Overview: "grid-outline",
    Inventory: "cube-outline",
    Activity: "time-outline",
    Team: "people-outline",
    Settings: "settings-outline",
  };

  return (
    <View style={styles.app}>
      <StatusBar barStyle="light-content" />
      <View style={styles.topBar}>
        <View>
          <Text style={styles.brand}>ASTROWORLD <Text style={{ color: colors.accent }}>420</Text></Text>
          <Text style={styles.topSub}>{isSuperAdmin ? "SUPER ADMIN" : "STAFF"} · INVENTORY WORKSPACE</Text>
        </View>
        <View style={[styles.connectionPill, { borderColor: connection === "connected" ? "rgba(74,222,128,0.24)" : "rgba(251,191,36,0.24)" }]}>
          <View style={[styles.connectionDot, { backgroundColor: connection === "connected" ? colors.success : colors.warning }]} />
          <Text style={styles.connectionText}>{connection === "connected" ? "ONLINE" : connection === "offline" ? "OFFLINE" : "SYNCING"}</Text>
        </View>
      </View>

      {notice ? (
        <Pressable onPress={() => setNotice("")} style={styles.notice}>
          <Text style={styles.noticeText}>{notice}  ×</Text>
        </Pressable>
      ) : null}
      {busy ? (
        <View style={styles.busyLine}>
          <ActivityIndicator size="small" color={colors.accent} />
          <Text style={styles.micro}>Updating inventory...</Text>
        </View>
      ) : null}

      <ScrollView contentContainerStyle={styles.content} showsVerticalScrollIndicator={false}>
        {renderScreen()}
      </ScrollView>

      <View style={styles.tabBar}>
        {tabs.map((item) => {
          const active = tab === item;
          return (
            <Pressable
              key={item}
              accessibilityRole="button"
              accessibilityState={{ selected: active }}
              onPress={() => setTab(item)}
              style={styles.tabItem}
            >
              <Ionicons name={iconByTab[item] as any} size={19} color={active ? colors.accent : "#777181"} />
              <Text style={[styles.tabLabel, active && styles.tabLabelActive]}>{item}</Text>
            </Pressable>
          );
        })}
      </View>

      <Modal transparent animationType="slide" visible={!!operationModal} onRequestClose={() => setOperationModal(null)}>
        <KeyboardAvoidingView behavior={Platform.OS === "ios" ? "padding" : undefined} style={styles.modalBackdrop}>
          <View style={styles.modalCard}>
            <View style={styles.modalHeader}>
              <View style={{ flex: 1 }}>
                <Text style={styles.modalTitle}>{operationModal?.kind === "restock" ? "Restock product" : "Adjust stock level"}</Text>
                <Text style={styles.modalSubtitle}>{operationModal?.product.name}</Text>
              </View>
              <Pressable onPress={() => setOperationModal(null)}><Text style={styles.close}>Close ✕</Text></Pressable>
            </View>
            <Field
              label={operationModal?.kind === "restock" ? "Quantity to add (g)" : "New stock level (g)"}
              value={quantityGrams}
              onChange={setQuantityGrams}
              type="decimal-pad"
              placeholder="Example: 2.5"
            />
            <Field
              label={operationModal?.kind === "restock" ? "Reason (optional)" : "Reason (required)"}
              value={reason}
              onChange={setReason}
              placeholder="Stock count / delivery / correction"
            />
            <Text style={styles.modalHint}>Use 0.5 g steps only. The app converts this to integer half-gram units before sending it to the database.</Text>
            <View style={styles.modalActions}>
              <Button title="Cancel" kind="secondary" onPress={() => setOperationModal(null)} />
              <Button title={busy ? "Saving..." : "Confirm change"} disabled={busy || !quantityGrams.trim()} onPress={() => void saveInventoryOperation()} />
            </View>
          </View>
        </KeyboardAvoidingView>
      </Modal>

      <Modal transparent animationType="fade" visible={!!confirmProfile} onRequestClose={() => setConfirmProfile(null)}>
        <View style={styles.confirmBackdrop}>
          <View style={styles.confirmCard}>
            <Text style={styles.modalTitle}>{confirmProfile?.active ? "Deactivate staff access?" : "Reactivate staff access?"}</Text>
            <Text style={styles.modalSubtitle}>
              {confirmProfile?.full_name || confirmProfile?.username} will {confirmProfile?.active ? "no longer be able to sign in." : "be able to sign in again."}
            </Text>
            <View style={styles.modalActions}>
              <Button title="Cancel" kind="secondary" onPress={() => setConfirmProfile(null)} />
              <Button title="Confirm" kind="danger" onPress={() => void toggleStaff()} />
            </View>
          </View>
        </View>
      </Modal>
    </View>
  );
}

const styles = StyleSheet.create({
  app: { flex: 1, backgroundColor: colors.background },
  loading: { flex: 1, backgroundColor: colors.background, alignItems: "center", justifyContent: "center", gap: 14, padding: 24 },
  loadingText: { color: colors.muted, fontSize: 12, textAlign: "center" },
  topBar: { flexDirection: "row", justifyContent: "space-between", alignItems: "center", paddingHorizontal: 20, paddingTop: Platform.OS === "android" ? 42 : 56, paddingBottom: 14, borderBottomWidth: 1, borderBottomColor: colors.border },
  brand: { color: colors.text, fontSize: 15, fontWeight: "900", letterSpacing: 1.1 },
  topSub: { color: colors.muted, fontSize: 9, letterSpacing: 1.3, marginTop: 4 },
  connectionPill: { flexDirection: "row", alignItems: "center", gap: 6, borderWidth: 1, borderRadius: 30, paddingHorizontal: 10, paddingVertical: 7 },
  connectionDot: { width: 6, height: 6, borderRadius: 5 },
  connectionText: { color: colors.muted, fontSize: 8, fontWeight: "800", letterSpacing: 1 },
  content: { padding: 18, paddingBottom: 36, gap: 14 },
  notice: { marginHorizontal: 14, marginTop: 8, padding: 10, borderRadius: 9, backgroundColor: "#29213F" },
  noticeText: { color: "#D5C9FF", fontSize: 11, lineHeight: 17 },
  busyLine: { flexDirection: "row", alignItems: "center", gap: 8, paddingHorizontal: 18, paddingTop: 7 },
  micro: { color: colors.muted, fontSize: 10, lineHeight: 15 },
  tabBar: { flexDirection: "row", justifyContent: "space-around", alignItems: "center", backgroundColor: colors.surface, borderTopWidth: 1, borderTopColor: colors.border, paddingTop: 9, paddingBottom: Platform.OS === "ios" ? 26 : 12 },
  tabItem: { alignItems: "center", justifyContent: "center", gap: 5, minWidth: 55, flex: 1 },
  tabLabel: { fontSize: 9, color: "#777181", fontWeight: "700" },
  tabLabelActive: { color: colors.text },
  modalBackdrop: { flex: 1, justifyContent: "flex-end", backgroundColor: "rgba(0,0,0,0.72)" },
  modalCard: { backgroundColor: colors.surface, padding: 20, borderTopLeftRadius: 24, borderTopRightRadius: 24, borderWidth: 1, borderColor: colors.border, gap: 13 },
  modalHeader: { flexDirection: "row", alignItems: "flex-start", justifyContent: "space-between", gap: 12 },
  modalTitle: { color: colors.text, fontSize: 20, fontWeight: "800" },
  modalSubtitle: { color: colors.muted, fontSize: 12, lineHeight: 18, marginTop: 5 },
  close: { color: colors.muted, fontSize: 11 },
  modalHint: { color: colors.muted, fontSize: 10, lineHeight: 16 },
  modalActions: { flexDirection: "row", gap: 8 },
  confirmBackdrop: { flex: 1, justifyContent: "center", alignItems: "center", padding: 22, backgroundColor: "rgba(5,4,8,0.78)" },
  confirmCard: { width: "100%", maxWidth: 440, backgroundColor: colors.elevated, borderWidth: 1, borderColor: colors.border, borderRadius: 22, padding: 22, gap: 16 },
});
