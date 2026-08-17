# @eupi/wallet

Reference wallet for European payment QR codes. It renders and scans codes with
[`@eupi/qr`](../../packages/qr), then hands the result to the payer's own banking app to
authorise the transfer.

The app never holds or routes funds and never submits an order to a bank interface. There are
no accounts and no backend.

## Status

The request flow is implemented. Enter an amount and remittance information to get an EPC069-12
code with the decoded values printed beside it. Sharing, scanning and handoff are not implemented
yet; see the checklist on the tracking issue.

## The request flow

Payee name, IBAN and optional BIC are settings on the device. There is no account to register and
no interface is called to verify them. The first run opens the settings screen because a code
cannot be built without an IBAN.

The amount is optional. Leaving it empty omits element 8 of the payload, which lets the payer
enter the amount in their own banking app. Remittance information goes into either the structured
reference element or the unstructured text element, never both, so the form offers a choice of
which one the field fills.

The code is rendered at error correction level M and never above version 13, as EPC069-12
requires. A conformant payload is at most 331 bytes, which is exactly the byte-mode capacity of a
version 13 symbol at level M, so a valid request always fits. The payload is placed in a single
byte-mode segment holding its UTF-8 bytes rather than split into shorter numeric and alphanumeric
segments, because byte mode is what the character set element of the payload describes.

The values shown below the code are decoded back out of the payload rather than read from the
form, so what the payer reads is what a scanner reads.

## Running it

From the repository root:

```sh
pnpm install
pnpm --filter @eupi/qr build
pnpm --filter @eupi/wallet start
```

Then open the project in [Expo Go](https://expo.dev/go) on a physical device, which needs no
Android Studio or Xcode install. The emulator paths are `a` for Android, which requires Android
Studio, and `i` for the iOS simulator, which requires Xcode on macOS.

`@eupi/qr` has to be built before the app can resolve it, which the second command does.

## Checks

```sh
pnpm --filter @eupi/wallet lint
pnpm --filter @eupi/wallet typecheck
pnpm --filter @eupi/wallet test
pnpm --filter @eupi/wallet build   # bundles the JS, no native toolchain required
```

## Layout

| Path | Purpose |
| --- | --- |
| `App.tsx` | Root component, loads the payee settings and switches between the two screens |
| `src/epc/` | Form state to EPC069-12 payload, plus the display formatting |
| `src/qr/` | QR symbol construction and its SVG path |
| `src/settings/` | Payee settings, on-device only |
| `src/ui/` | Screens and the QR view |
| `metro.config.js` | Workspace-aware resolver so `packages/*` resolve and hot-reload |
| `test/` | Plain-TypeScript tests; the React Native surface is covered by typecheck and lint |

Everything under `src/epc`, `src/qr` and `src/settings` is plain TypeScript with no React Native
imports, which is what keeps it testable in `test/`.
