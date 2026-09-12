# D.O.R.E. Mainnet Deployment

## Source of truth

Contract:
`contracts/DepartmentOfRugEfficiency.sol`

Testnet deployment:
`0x8633081C556EE454D0bdd22c837a7e7CA42eba1D`

Testnet compiler:
`solc 0.8.34`

Optimizer:
`enabled`

Optimizer runs:
`200`

## Before deployment

- Confirm official Arc Mainnet RPC
- Confirm official Arc Mainnet Chain ID
- Confirm official explorer
- Confirm wallet is connected to Arc Mainnet
- Confirm deployer address is correct
- Confirm sufficient real USDC for gas
- Confirm GitHub CI is green
- Do not modify contract source

## Deployment

1. Open verified D.O.R.E. source in Remix.
2. Select Solidity compiler 0.8.34.
3. Enable optimizer with 200 runs.
4. Connect Rabby through Browser Extension.
5. Switch Rabby to Arc Mainnet.
6. Confirm correct network and deployer.
7. Select DepartmentOfRugEfficiency.
8. Value = 0.
9. Deploy.
10. Confirm transaction manually in Rabby.

## Post-deployment checks

- name() = Department of Rug Efficiency
- symbol() = RUG
- totalSupply() = 1000000000000000000000000000
- canMintMore() = false
- taxRateBps() = 0
- blacklistEnabled() = false
- adminKeyExists() = false
- efficiencyRating() = 0
- rugPull() reverts

## After verification

Record:
- mainnet contract address
- deployment tx hash
- block number
- compiler
- explorer URL

Then create/update:
`deployments/arc-mainnet.json`
