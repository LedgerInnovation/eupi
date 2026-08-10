# @eupi/wallet

Reference wallet for European payment QR codes. It renders and scans codes with
[`@eupi/qr`](../../packages/qr), then hands the result to the payer's own banking app to
authorise the transfer.

The app never holds or routes funds and never submits an order to a bank interface. There are
no accounts and no backend.

## Status

Scaffold only. Neither the request flow nor the pay flow is implemented yet; see the checklist
on the tracking issue.

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
| `App.tsx` | Root component |
| `metro.config.js` | Workspace-aware resolver so `packages/*` resolve and hot-reload |
| `test/` | Plain-TypeScript tests; the React Native surface is covered by typecheck and lint |
