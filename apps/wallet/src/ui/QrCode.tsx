import { StyleSheet, View } from "react-native";
import Svg, { Path, Rect } from "react-native-svg";

import { toSvgPath, type QrSymbol } from "../qr/symbol";

/** Quiet zone in modules. ISO/IEC 18004 requires four on every side. */
const QUIET_ZONE = 4;

interface QrCodeProps {
  symbol: QrSymbol;
  /** Rendered edge length in points, quiet zone included. */
  size: number;
}

/**
 * Draws a QR symbol at whatever size the layout gives it. The viewBox is in
 * module units, so the symbol scales without the path being recomputed and
 * without rounding each module to a whole point.
 */
export function QrCode({ symbol, size }: QrCodeProps) {
  const extent = symbol.size + QUIET_ZONE * 2;

  // The viewBox origin sits at the top left of the quiet zone, so the path can
  // use plain module coordinates with no transform of its own.
  return (
    <View style={[styles.frame, { width: size, height: size }]}>
      <Svg width={size} height={size} viewBox={`${-QUIET_ZONE} ${-QUIET_ZONE} ${extent} ${extent}`}>
        <Rect
          x={-QUIET_ZONE}
          y={-QUIET_ZONE}
          width={extent}
          height={extent}
          fill="#ffffff"
        />
        <Path d={toSvgPath(symbol)} fill="#000000" />
      </Svg>
    </View>
  );
}

const styles = StyleSheet.create({
  frame: {
    alignSelf: "center",
    backgroundColor: "#ffffff",
  },
});
