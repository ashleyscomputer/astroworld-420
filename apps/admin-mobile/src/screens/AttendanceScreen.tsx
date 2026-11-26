import React, { useEffect, useRef, useState } from "react";
import { CameraView, useCameraPermissions } from "expo-camera";
import QRCode from "react-native-qrcode-svg";
import { ActivityIndicator, Pressable, StyleSheet, Text, View } from "react-native";
import { Button, Card, Heading } from "../components/ui/Primitives";
import { colors } from "../theme/colors";
import type { AttendanceQr, AttendanceShift } from "../types";

type Props = {
  isSuperAdmin: boolean;
  qr: AttendanceQr | null;
  history: AttendanceShift[];
  busy: boolean;
  onIssueQr: () => void;
  onScan: (payload: string) => Promise<string>;
};

function durationLabel(seconds: number): string {
  const safe = Math.max(0, Math.floor(seconds));
  const hours = Math.floor(safe / 3600);
  const minutes = Math.floor((safe % 3600) / 60);
  return hours + "h " + String(minutes).padStart(2, "0") + "m";
}

export default function AttendanceScreen({ isSuperAdmin, qr, history, busy, onIssueQr, onScan }: Props) {
  const [permission, requestPermission] = useCameraPermissions();
  const [scannerOpen, setScannerOpen] = useState(false);
  const [scanBusy, setScanBusy] = useState(false);
  const [scanMessage, setScanMessage] = useState("");
  const [remainingSeconds, setRemainingSeconds] = useState(0);
  const scanLock = useRef(false);

  useEffect(() => {
    if (!qr) {
      setRemainingSeconds(0);
      return;
    }
    const update = () => {
      setRemainingSeconds(Math.max(0, Math.ceil((new Date(qr.expires_at).getTime() - Date.now()) / 1000)));
    };
    update();
    const timer = setInterval(update, 1000);
    return () => clearInterval(timer);
  }, [qr]);

  const openShift = history.find((shift) => shift.is_open);
  const handleBarcode = async (payload: string) => {
    if (scanLock.current || scanBusy) return;
    scanLock.current = true;
    setScanBusy(true);
    setScanMessage("");
    try {
      if (!/^AW420TIME:[0-9a-f]{64}$/.test(payload)) {
        throw new Error("That is not an Astroworld attendance QR.");
      }
      const result = await onScan(payload);
      setScanMessage(result);
      setScannerOpen(false);
    } catch (error) {
      setScanMessage(error instanceof Error ? error.message : "Attendance scan failed.");
    } finally {
      setScanBusy(false);
      scanLock.current = false;
    }
  };

  return (
    <>
      <Heading title="Staff attendance" hint="Clock in and out with your authenticated staff account." />

      {openShift ? (
        <Card style={styles.openShift}>
          <Text style={styles.eyebrow}>CURRENT SHIFT</Text>
          <Text style={styles.shiftState}>You are clocked in</Text>
          <Text style={styles.muted}>Started {new Date(openShift.clock_in_at).toLocaleString()}</Text>
          <Text style={styles.micro}>Scan a fresh workplace QR when you finish your shift.</Text>
        </Card>
      ) : (
        <Card>
          <Text style={styles.cardTitle}>No active shift</Text>
          <Text style={styles.muted}>Scan the current workplace QR to clock in. Scan a fresh QR again when you leave to clock out.</Text>
        </Card>
      )}

      {isSuperAdmin ? (
        <Card style={styles.qrCard}>
          <View style={styles.qrHeader}>
            <View style={{ flex: 1 }}>
              <Text style={styles.cardTitle}>Workplace QR station</Text>
              <Text style={styles.muted}>Display this code at the staff entrance or shared time-clock tablet.</Text>
            </View>
            <View style={styles.adminPill}><Text style={styles.adminPillText}>ADMIN</Text></View>
          </View>
          {qr && remainingSeconds > 0 ? (
            <View style={styles.qrContainer}>
              <QRCode value={qr.payload} size={232} backgroundColor="#FFFFFF" color="#101014" ecl="H" />
              <Text style={styles.qrTitle}>SCAN TO CLOCK IN / OUT</Text>
              <Text style={styles.expiry}>Refreshes in {remainingSeconds}s</Text>
            </View>
          ) : (
            <View style={styles.qrPlaceholder}>
              <Text style={styles.qrPlaceholderIcon}>▦</Text>
              <Text style={styles.qrPlaceholderText}>Generate a short-lived QR code before employees scan.</Text>
            </View>
          )}
          <Button title={busy ? "Generating..." : qr && remainingSeconds > 0 ? "Generate new QR" : "Generate workplace QR"} disabled={busy} onPress={onIssueQr} />
          <Text style={styles.securityNote}>Codes expire after 90 seconds, are stored server-side as hashes, and each employee can redeem a code only once. Do not share screenshots.</Text>
        </Card>
      ) : null}

      <Card>
        <Text style={styles.cardTitle}>Employee clock</Text>
        <Text style={styles.muted}>Your phone must be signed in with your own staff account. Camera permission is used only to scan the workplace code.</Text>
        {!scannerOpen ? (
          <Button title="Scan workplace QR" onPress={() => {
            setScanMessage("");
            if (permission?.granted) setScannerOpen(true);
            else void requestPermission().then((result) => {
              if (result.granted) setScannerOpen(true);
              else setScanMessage("Camera permission is required to scan attendance codes.");
            });
          }} />
        ) : (
          <View style={styles.cameraWrap}>
            {permission?.granted ? (
              <CameraView
                style={styles.camera}
                facing="back"
                barcodeScannerSettings={{ barcodeTypes: ["qr"] }}
                onBarcodeScanned={(result) => void handleBarcode(result.data)}
              />
            ) : (
              <View style={styles.cameraMessage}>
                <Text style={styles.muted}>Waiting for camera permission...</Text>
                <ActivityIndicator color={colors.accent} />
              </View>
            )}
            {scanBusy ? <View style={styles.scanOverlay}><ActivityIndicator color="#FFFFFF" /><Text style={styles.scanOverlayText}>Recording attendance...</Text></View> : null}
            <Button title="Close scanner" kind="secondary" onPress={() => setScannerOpen(false)} />
          </View>
        )}
        {scanMessage ? <Text style={styles.scanMessage}>{scanMessage}</Text> : null}
      </Card>

      <Heading title={isSuperAdmin ? "Team attendance" : "My attendance"} hint="Shift records for the last 31 days. Times are recorded by the server." />
      {history.length === 0 ? (
        <Card><Text style={styles.muted}>No attendance shifts recorded yet.</Text></Card>
      ) : history.map((shift) => (
        <Card key={shift.id} style={styles.shiftCard}>
          <View style={styles.rowBetween}>
            <View style={{ flex: 1, gap: 3 }}>
              <Text style={styles.employeeName}>{shift.employee_name || shift.username}</Text>
              {isSuperAdmin ? <Text style={styles.micro}>@{shift.username}</Text> : null}
            </View>
            <Text style={[styles.shiftBadge, { color: shift.is_open ? colors.success : colors.muted }]}>
              {shift.is_open ? "ON SHIFT" : "COMPLETED"}
            </Text>
          </View>
          <View style={styles.times}>
            <View style={{ flex: 1 }}>
              <Text style={styles.timeLabel}>CLOCK IN</Text>
              <Text style={styles.timeValue}>{new Date(shift.clock_in_at).toLocaleString()}</Text>
            </View>
            <View style={{ flex: 1 }}>
              <Text style={styles.timeLabel}>CLOCK OUT</Text>
              <Text style={styles.timeValue}>{shift.clock_out_at ? new Date(shift.clock_out_at).toLocaleString() : "Not clocked out"}</Text>
            </View>
          </View>
          <View style={styles.rowBetween}>
            <Text style={styles.micro}>Shift duration</Text>
            <Text style={styles.duration}>{durationLabel(shift.duration_seconds)}{shift.is_open ? " · live at last refresh" : ""}</Text>
          </View>
        </Card>
      ))}
      <Text style={styles.footer}>Hours are calculated from server timestamps. Break deductions, overtime rules and payroll approvals are not included in this attendance tracker.</Text>
    </>
  );
}

const styles = StyleSheet.create({
  openShift: { borderColor: "rgba(74,222,128,0.28)", backgroundColor: "rgba(74,222,128,0.06)" },
  eyebrow: { color: colors.success, fontSize: 9, fontWeight: "800", letterSpacing: 1.5 },
  shiftState: { color: colors.text, fontSize: 22, fontWeight: "800" },
  cardTitle: { color: colors.text, fontSize: 14, fontWeight: "700" },
  muted: { color: colors.muted, fontSize: 12, lineHeight: 18 },
  micro: { color: colors.muted, fontSize: 10, lineHeight: 15 },
  qrCard: { alignItems: "stretch" },
  qrHeader: { flexDirection: "row", alignItems: "flex-start", gap: 10 },
  adminPill: { borderWidth: 1, borderColor: "rgba(213,239,134,0.35)", backgroundColor: "rgba(213,239,134,0.08)", paddingHorizontal: 9, paddingVertical: 5, borderRadius: 20 },
  adminPillText: { color: colors.accent, fontSize: 8, fontWeight: "800", letterSpacing: 1 },
  qrContainer: { alignItems: "center", gap: 10, backgroundColor: "#FFFFFF", borderRadius: 18, padding: 17, alignSelf: "center" },
  qrTitle: { color: "#101014", fontSize: 10, fontWeight: "900", letterSpacing: 1.1 },
  expiry: { color: "#42424A", fontSize: 11, fontWeight: "700" },
  qrPlaceholder: { minHeight: 190, alignItems: "center", justifyContent: "center", gap: 8, borderWidth: 1, borderColor: colors.border, borderStyle: "dashed", borderRadius: 16, padding: 20 },
  qrPlaceholderIcon: { color: colors.muted, fontSize: 40 },
  qrPlaceholderText: { color: colors.muted, fontSize: 11, textAlign: "center", lineHeight: 17 },
  securityNote: { color: colors.muted, fontSize: 10, lineHeight: 16 },
  cameraWrap: { gap: 10 },
  camera: { height: 320, borderRadius: 16, overflow: "hidden" },
  cameraMessage: { height: 180, justifyContent: "center", alignItems: "center", gap: 10 },
  scanOverlay: { position: "absolute", top: 0, left: 0, right: 0, bottom: 48, backgroundColor: "rgba(0,0,0,0.55)", alignItems: "center", justifyContent: "center", gap: 8, borderRadius: 16 },
  scanOverlayText: { color: "#FFFFFF", fontSize: 12, fontWeight: "700" },
  scanMessage: { color: colors.accent, fontSize: 11, lineHeight: 17 },
  shiftCard: { gap: 10 },
  rowBetween: { flexDirection: "row", alignItems: "center", justifyContent: "space-between", gap: 10 },
  employeeName: { color: colors.text, fontSize: 13, fontWeight: "700" },
  shiftBadge: { fontSize: 9, fontWeight: "800", letterSpacing: 1 },
  times: { flexDirection: "row", gap: 8 },
  timeLabel: { color: colors.muted, fontSize: 8, fontWeight: "800", letterSpacing: 1 },
  timeValue: { color: colors.text, fontSize: 10, lineHeight: 16, marginTop: 4 },
  duration: { color: colors.accent, fontSize: 12, fontWeight: "800", fontVariant: ["tabular-nums"] },
  footer: { color: colors.muted, fontSize: 10, lineHeight: 16, paddingHorizontal: 3 },
});
