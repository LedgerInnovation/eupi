import { useCallback, useEffect, useState } from "react";
import { ActivityIndicator, SafeAreaView, StyleSheet } from "react-native";
import { StatusBar } from "expo-status-bar";

import { EMPTY_PAYEE, type Payee } from "./src/epc/request";
import { loadPayee, savePayee } from "./src/settings/storage";
import { PayeeScreen } from "./src/ui/PayeeScreen";
import { RequestScreen } from "./src/ui/RequestScreen";

type Screen = "request" | "payee";

export default function App() {
  const [payee, setPayee] = useState<Payee>(EMPTY_PAYEE);
  const [loaded, setLoaded] = useState(false);
  const [screen, setScreen] = useState<Screen>("request");

  useEffect(() => {
    let cancelled = false;
    void loadPayee().then((stored) => {
      if (cancelled) return;
      setPayee(stored);
      setLoaded(true);
      // A first run has nothing to build a code from, so start in settings.
      if (stored.iban === "") setScreen("payee");
    });
    return () => {
      cancelled = true;
    };
  }, []);

  const onSave = useCallback((next: Payee) => {
    setPayee(next);
    setScreen("request");
    void savePayee(next);
  }, []);

  return (
    <SafeAreaView style={styles.root}>
      <StatusBar style="auto" />
      {!loaded ? (
        <ActivityIndicator style={styles.loading} />
      ) : screen === "payee" ? (
        <PayeeScreen payee={payee} onSave={onSave} onCancel={() => setScreen("request")} />
      ) : (
        <RequestScreen payee={payee} onEditPayee={() => setScreen("payee")} />
      )}
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  root: {
    flex: 1,
  },
  loading: {
    flex: 1,
  },
});
