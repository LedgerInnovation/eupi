import { useState } from "react";
import { Pressable, ScrollView, StyleSheet, Text, TextInput, View } from "react-native";
import { isValidIban } from "@eupi/qr";

import { formatIbanForDisplay, type Payee } from "../epc/request";

interface PayeeScreenProps {
  payee: Payee;
  /** Rejects when the settings could not be written to the device. */
  onSave: (payee: Payee) => Promise<void>;
  onCancel: () => void;
  notice?: string | null;
}

const SAVE_FAILED = "Settings could not be saved to this device. Nothing was stored.";

/**
 * Edits the beneficiary details the request codes are built from.
 *
 * These are settings on the device, not an account: nothing is registered
 * anywhere and no interface is called to verify them.
 */
export function PayeeScreen({ payee, onSave, onCancel, notice = null }: PayeeScreenProps) {
  const [draft, setDraft] = useState<Payee>(payee);
  const [saving, setSaving] = useState(false);
  const [saveFailed, setSaveFailed] = useState(false);

  const iban = draft.iban.replace(/\s+/g, "").toUpperCase();
  const ibanValid = iban === "" || isValidIban(iban);
  const complete = draft.name.trim() !== "" && iban !== "" && ibanValid;

  // The draft is kept on failure so a full retype is never the cost of a failed write.
  const submit = async () => {
    setSaving(true);
    setSaveFailed(false);
    try {
      await onSave({ name: draft.name.trim(), iban, bic: draft.bic.trim().toUpperCase() });
    } catch {
      setSaveFailed(true);
    } finally {
      setSaving(false);
    }
  };

  return (
    <ScrollView contentContainerStyle={styles.content} keyboardShouldPersistTaps="handled">
      <Text style={styles.title}>Payee settings</Text>
      <Text style={styles.intro}>
        Held on this device only. The wallet has no accounts and no backend and never routes
        funds.
      </Text>

      {notice === null ? null : <Text style={styles.error}>{notice}</Text>}

      <View style={styles.field}>
        <Text style={styles.label}>Name</Text>
        <TextInput
          style={styles.input}
          value={draft.name}
          onChangeText={(name) => setDraft({ ...draft, name })}
          placeholder="Beneficiary name, up to 70 characters"
          autoCorrect={false}
        />
      </View>

      <View style={styles.field}>
        <Text style={styles.label}>IBAN</Text>
        <TextInput
          style={styles.input}
          value={draft.iban}
          onChangeText={(value) => setDraft({ ...draft, iban: value })}
          placeholder="DE33 1002 0500 0001 1947 00"
          autoCapitalize="characters"
          autoCorrect={false}
        />
        {ibanValid ? (
          iban === "" ? null : <Text style={styles.hint}>{formatIbanForDisplay(iban)}</Text>
        ) : (
          <Text style={styles.error}>Check digits or length do not match ISO 13616</Text>
        )}
      </View>

      <View style={styles.field}>
        <Text style={styles.label}>BIC</Text>
        <TextInput
          style={styles.input}
          value={draft.bic}
          onChangeText={(bic) => setDraft({ ...draft, bic })}
          placeholder="Optional inside the EEA"
          autoCapitalize="characters"
          autoCorrect={false}
        />
        <Text style={styles.hint}>
          Version 002 codes leave the BIC out for EEA beneficiaries. It stays mandatory for
          accounts in SEPA countries outside the EEA.
        </Text>
      </View>

      {saveFailed ? <Text style={styles.error}>{SAVE_FAILED}</Text> : null}

      <View style={styles.actions}>
        <Pressable
          onPress={onCancel}
          accessibilityRole="button"
          disabled={saving}
          style={styles.secondary}
        >
          <Text style={styles.secondaryLabel}>Cancel</Text>
        </Pressable>
        <Pressable
          onPress={() => {
            void submit();
          }}
          accessibilityRole="button"
          accessibilityState={{ disabled: !complete || saving, busy: saving }}
          disabled={!complete || saving}
          style={[styles.primary, complete && !saving ? null : styles.primaryDisabled]}
        >
          <Text style={styles.primaryLabel}>{saving ? "Saving" : "Save"}</Text>
        </Pressable>
      </View>
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  content: {
    paddingHorizontal: 24,
    paddingVertical: 32,
    gap: 24,
  },
  title: {
    fontSize: 26,
    fontWeight: "600",
  },
  intro: {
    fontSize: 14,
    lineHeight: 20,
    opacity: 0.7,
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
  hint: {
    fontSize: 12,
    opacity: 0.6,
    lineHeight: 17,
  },
  error: {
    fontSize: 12,
    color: "#b3261e",
  },
  actions: {
    flexDirection: "row",
    justifyContent: "flex-end",
    gap: 12,
  },
  secondary: {
    paddingHorizontal: 18,
    paddingVertical: 10,
  },
  secondaryLabel: {
    fontSize: 15,
  },
  primary: {
    backgroundColor: "#1b64c8",
    borderRadius: 8,
    paddingHorizontal: 18,
    paddingVertical: 10,
  },
  primaryDisabled: {
    opacity: 0.4,
  },
  primaryLabel: {
    fontSize: 15,
    fontWeight: "600",
    color: "#ffffff",
  },
});
