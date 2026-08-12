import { StatusBar } from "expo-status-bar";
import { StyleSheet, Text, View } from "react-native";

export default function App() {
  return (
    <View style={styles.container}>
      <StatusBar style="auto" />
      <Text style={styles.title}>EUPI Wallet</Text>
      <Text style={styles.body}>
        Reference wallet for European payment QR codes. It renders and scans codes, then hands
        off to the payer&apos;s own banking app. It never holds or routes funds.
      </Text>
      <Text style={styles.note}>Request and pay flows are not implemented yet.</Text>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    alignItems: "center",
    justifyContent: "center",
    paddingHorizontal: 32,
    gap: 12,
  },
  title: {
    fontSize: 28,
    fontWeight: "600",
  },
  body: {
    fontSize: 15,
    lineHeight: 22,
    textAlign: "center",
  },
  note: {
    fontSize: 13,
    opacity: 0.6,
    textAlign: "center",
  },
});
