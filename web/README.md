# D.O.R.E. website (/web)

Static frontend for **Department of Rug Efficiency** ($RUG). Vite + React + TypeScript + viem.
No backend, no database, no API keys, no wallet write operations, no private keys.

## Local

```bash
cd web
npm install
npm run dev      # http://localhost:5173
```

## Production build

```bash
cd web
npm install
npm run build    # tsc -b && vite build  -> web/dist
npm run preview  # serve the built output locally
```

`base: './'` in `vite.config.ts` makes `dist` deployable as-is on Cloudflare Pages, Vercel or GitHub Pages
(build command `npm run build`, output directory `web/dist`).

## Arc RPC dependencies

Everything network-dependent lives in `src/dore.ts`. All calls are **read-only** `eth_call`.

| Place | Call | Fallback if RPC fails |
| --- | --- | --- |
| Department Audit rows | `canMintMore()`, `taxRateBps()`, `blacklistEnabled()`, `adminKeyExists()`, `efficiencyRating()`, `totalSupply()` | shows expected value marked **Unverified**, panel header shows "RPC unavailable" |
| Department statements | `rugStatus()`, `motto()`, `officialStatement()` | shows expected string labelled *unverified* |
| TRY TO RUG | `rugPull()` — expected to revert with `RugPullDenied()` (`0xfa69a720`) | modal shows **UNDETERMINED** plus the RPC error; it never pretends the call succeeded |

Overridable via `.env` (see `.env.example`): `VITE_ARC_RPC_URL`, `VITE_ARC_EXPLORER`, `VITE_GITHUB_URL`.

Explorer: https://testnet.arcscan.app · Repository: https://github.com/RussianCoker/department-of-rug-efficiency · Verified source: https://repo.sourcify.dev/5042002/0x8633081C556EE454D0bdd22c837a7e7CA42eba1D

## What this does NOT do

No buy/swap UI, no wallet connection, no `eth_sendTransaction`, no signature requests, no analytics.
`/contracts`, `/test`, `/deployments` and `/.github` are untouched.
