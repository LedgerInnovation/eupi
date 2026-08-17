import { useMemo, useState } from "react";
import {
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  View,
  useWindowDimensions,
} from "react-native";
import { EPC069_MAX_BYTES, byteLength, type EpcQrData } from "@eupi/qr";

import {
  EMPTY_FORM,
  buildPaymentRequest,
  formatAmountForDisplay,
  formatIbanForDisplay,
  type Payee,
  type RemittanceKind,
  type RequestForm,
} from "../epc/request";
import {
  EPC069_ERROR_CORRECTION,
  EPC069_MAX_VERSION,
  toQrSymbol,
  type QrSymbol,
} from "../qr/symbol";
import { QrCode } from "./QrCode";

interface RequestScreenProps {
  payee: Payee;
  onEditPayee: () => void;
}

const REMITTANCE_KINDS: {
  kind: RemittanceKind;
  label: string;
  placeholder: string;
  hint: string;
}[] = [
  {
    kind: "text",
    label: "Text",
    placeholder: "What the payment is for",
    hint: "Unstructured text, up to 140 characters",
  },
  {
    kind: "reference",
    label: "Reference",
    placeholder: "RF18539007547034",
    hint: "Structured creditor reference, up to 35 characters",
  },
];

type SymbolResult = { symbol: QrSymbol } | { error: string };

function buildSymbol(payload: string): SymbolResult {
  try {
    return { symbol: toQrSymbol(payload) };
  } catch (error) {
    return { error: error instanceof Error ? error.message : "the code could not be rendered" };
  }
}

/**
 * Composes a payment request and renders it as an EPC069-12 QR code.
 *
 * The values printed below the code are decoded back out of the payload rather
 * than read from the form, so what the payer reads is what a scanner reads. The
 * guidelines recommend showing them in an invoice-style presentation next to
 * the code, which also gives the payer a way to check the code before scanning.
 */
export function RequestScreen({ payee, onEditPayee }: RequestScreenProps) {
  const [form, setForm] = useState<RequestForm>(EMPTY_FORM);
  const { width } = useWindowDimensions();

  const request = useMemo(() => buildPaymentRequest(payee, form), [payee, form]);
  const rendered = useMemo(
    () => (request.ok ? buildSymbol(request.payload) : undefined),
    [request],
  );

  const remittanceKind = REMITTANCE_KINDS.find((entry) => entry.kind === form.remittanceKind);
  const codeSize = Math.min(width - 64, 320);

  return (
    <ScrollView contentContainerStyle={styles.content} keyboardShouldPersistTaps="handled">
      <View style={styles.header}>
        <Text style={styles.title}>Request money</Text>
        <Pressable onPress={onEditPayee} accessibilityRole="button">
          <Text style={styles.link}>Payee settings</Text>
        </Pressable>
      </View>

      <View style={styles.field}>
        <Text style={styles.label}>Amount in euro</Text>
        <TextInput
          style={styles.input}
          value={form.amount}
          onChangeText={(amount) => setForm({ ...form, amount })}
          placeholder="Leave empty to let the payer decide"
          keyboardType="decimal-pad"
          inputMode="decimal"
          autoCorrect={false}
        />
      </View>

      <View style={styles.field}>
        <Text style={styles.label}>Remittance information</Text>
        <View style={styles.segmented}>
          {REMITTANCE_KINDS.map((entry) => {
            const selected = entry.kind === form.remittanceKind;
            return (
              <Pressable
                key={entry.kind}
                style={[styles.segment, selected && styles.segmentSelected]}
                onPress={() => setForm({ ...form, remittanceKind: entry.kind })}
                accessibilityRole="button"
                accessibilityState={{ selected }}
              >
                <Text style={[styles.segmentLabel, selected && styles.segmentLabelSelected]}>
                  {entry.label}
                </Text>
              </Pressable>
            );
          })}
        </View>
        <TextInput
          style={[styles.input, styles.multiline]}
          value={form.remittance}
          onChangeText={(remittance) => setForm({ ...form, remittance })}
          placeholder={remittanceKind?.placeholder}
          multiline
          autoCapitalize={form.remittanceKind === "reference" ? "characters" : "sentences"}
          autoCorrect={false}
        />
        <Text style={styles.hint}>
          {remittanceKind?.hint}. A code carries one or the other, never both.
        </Text>
      </View>

      {request.ok ? null : (
        <View style={styles.issues}>
          {request.issues.map((issue) => (
            <Text key={`${issue.element}:${issue.message}`} style={styles.issue}>
              {issue.element}: {issue.message}
            </Text>
          ))}
        </View>
      )}

      {request.ok && rendered !== undefined ? (
        "error" in rendered ? (
          <View style={styles.issues}>
            <Text style={styles.issue}>{rendered.error}</Text>
          </View>
        ) : (
          <View style={styles.code}>
            <QrCodeCard symbol={rendered.symbol} size={codeSize} />
            <DecodedSummary payload={request.payload} data={request.data} />
          </View>
        )
      ) : null}
    </ScrollView>
  );
}

function QrCodeCard({ symbol, size }: { symbol: QrSymbol; size: number }) {
  return (
    <View style={styles.card}>
      <QrCode symbol={symbol} size={size} />
      <Text style={styles.caption}>
        QR version {symbol.version} of {EPC069_MAX_VERSION}, error correction level{" "}
        {EPC069_ERROR_CORRECTION}
      </Text>
    </View>
  );
}

/**
 * The decoded payload, in the invoice-style presentation the guidelines
 * recommend printing beside the code.
 */
function DecodedSummary({ payload, data }: { payload: string; data: EpcQrData }) {
  const rows: { label: string; value: string }[] = [
    { label: "Payee", value: data.name },
    { label: "IBAN", value: formatIbanForDisplay(data.iban) },
  ];
  if (data.bic !== undefined) rows.push({ label: "BIC", value: data.bic });
  rows.push({
    label: "Amount",
    value: data.amount === undefined ? "entered by the payer" : `EUR ${formatAmountForDisplay(data.amount)}`,
  });
  if (data.reference !== undefined) rows.push({ label: "Reference", value: data.reference });
  if (data.text !== undefined) rows.push({ label: "Text", value: data.text });

  return (
    <View style={styles.summary}>
      {rows.map((row) => (
        <View key={row.label} style={styles.row}>
          <Text style={styles.rowLabel}>{row.label}</Text>
          <Text style={styles.rowValue}>{row.value}</Text>
        </View>
      ))}
      <Text style={styles.hint}>
        EPC069-12 version {data.version}, character set UTF-8,{" "}
        {byteLength(payload, data.charset)} bytes of {EPC069_MAX_BYTES}
      </Text>
    </View>
  );
}

const styles = StyleSheet.create({
  content: {
    paddingHorizontal: 24,
    paddingVertical: 32,
    gap: 24,
  },
  header: {
    flexDirection: "row",
    alignItems: "baseline",
    justifyContent: "space-between",
  },
  title: {
    fontSize: 26,
    fontWeight: "600",
  },
  link: {
    fontSize: 15,
    color: "#1b64c8",
  },
  field: {
    gap: 8,
  },
  label: {
    fontSize: 13,
    fontWeight: "600",
    textTransform: "uppercase",
    letterSpacing: 0.6,
    opacity: 0.6,
  },
  input: {
    borderWidth: 1,
    borderColor: "#c7c7cc",
    borderRadius: 8,
    paddingHorizontal: 12,
    paddingVertical: 10,
    fontSize: 16,
  },
  multiline: {
    minHeight: 72,
    textAlignVertical: "top",
  },
  segmented: {
    flexDirection: "row",
    gap: 8,
  },
  segment: {
    borderWidth: 1,
    borderColor: "#c7c7cc",
    borderRadius: 999,
    paddingHorizontal: 14,
    paddingVertical: 6,
  },
  segmentSelected: {
    backgroundColor: "#1b64c8",
    borderColor: "#1b64c8",
  },
  segmentLabel: {
    fontSize: 14,
  },
  segmentLabelSelected: {
    color: "#ffffff",
    fontWeight: "600",
  },
  hint: {
    fontSize: 12,
    opacity: 0.6,
    lineHeight: 17,
  },
  issues: {
    gap: 4,
  },
  issue: {
    fontSize: 13,
    color: "#b3261e",
  },
  code: {
    gap: 20,
  },
  card: {
    gap: 8,
    alignItems: "center",
  },
  caption: {
    fontSize: 12,
    opacity: 0.6,
  },
  summary: {
    gap: 8,
  },
  row: {
    flexDirection: "row",
    gap: 12,
  },
  rowLabel: {
    width: 84,
    fontSize: 13,
    opacity: 0.6,
  },
  rowValue: {
    flex: 1,
    fontSize: 15,
  },
});
