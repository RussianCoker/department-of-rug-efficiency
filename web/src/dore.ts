import { createPublicClient, defineChain, http, encodeFunctionData, type Abi } from 'viem';

export const CONTRACT = '0x8633081C556EE454D0bdd22c837a7e7CA42eba1D' as const;
export const CHAIN_ID = 5042002;
export const RPC_URL = import.meta.env.VITE_ARC_RPC_URL ?? 'https://rpc.testnet.arc.io';
export const EXPLORER_BASE = import.meta.env.VITE_ARC_EXPLORER ?? 'https://testnet.arcscan.app';
export const GITHUB_URL = import.meta.env.VITE_GITHUB_URL ?? 'https://github.com/RussianCoker/department-of-rug-efficiency';
export const SOURCIFY_URL = `https://repo.sourcify.dev/${CHAIN_ID}/${CONTRACT}`;

// keccak256("RugPullDenied()")[0:4] — the expected custom-error selector.
export const RUG_PULL_DENIED_SELECTOR = '0xfa69a720';

export const arcTestnet = defineChain({
  id: CHAIN_ID,
  name: 'Arc Testnet',
  nativeCurrency: { name: 'USDC', symbol: 'USDC', decimals: 18 },
  rpcUrls: { default: { http: [RPC_URL] } },
  blockExplorers: { default: { name: 'Arcscan', url: EXPLORER_BASE } },
  testnet: true
});

export const client = createPublicClient({ chain: arcTestnet, transport: http(RPC_URL) });

export const abi = [
  { type: 'function', name: 'totalSupply', stateMutability: 'view', inputs: [], outputs: [{ type: 'uint256' }] },
  { type: 'function', name: 'canMintMore', stateMutability: 'view', inputs: [], outputs: [{ type: 'bool' }] },
  { type: 'function', name: 'taxRateBps', stateMutability: 'view', inputs: [], outputs: [{ type: 'uint256' }] },
  { type: 'function', name: 'blacklistEnabled', stateMutability: 'view', inputs: [], outputs: [{ type: 'bool' }] },
  { type: 'function', name: 'adminKeyExists', stateMutability: 'view', inputs: [], outputs: [{ type: 'bool' }] },
  { type: 'function', name: 'efficiencyRating', stateMutability: 'view', inputs: [], outputs: [{ type: 'uint256' }] },
  { type: 'function', name: 'rugStatus', stateMutability: 'view', inputs: [], outputs: [{ type: 'string' }] },
  { type: 'function', name: 'motto', stateMutability: 'view', inputs: [], outputs: [{ type: 'string' }] },
  { type: 'function', name: 'officialStatement', stateMutability: 'view', inputs: [], outputs: [{ type: 'string' }] },
  { type: 'function', name: 'rugPull', stateMutability: 'nonpayable', inputs: [], outputs: [] },
  { type: 'error', name: 'RugPullDenied', inputs: [] }
] as const satisfies Abi;

/** Read-only view call. Never sends a transaction. */
export async function read<T>(functionName: string): Promise<T> {
  return (await client.readContract({ address: CONTRACT, abi, functionName } as any)) as T;
}

export type RugAttempt =
  | { phase: 'denied'; detail: string; ms: number }
  | { phase: 'error'; detail: string; ms: number }
  | { phase: 'unexpected'; detail: string; ms: number };

/**
 * Attempts rugPull() as a READ-ONLY eth_call. No transaction, no signature, no funds.
 * The contract is expected to revert with RugPullDenied().
 */
export async function attemptRugPull(): Promise<RugAttempt> {
  const started = Date.now();
  const data = encodeFunctionData({ abi, functionName: 'rugPull' });
  try {
    const res = await client.call({ to: CONTRACT, data });
    return {
      phase: 'unexpected',
      detail: `eth_call returned data instead of reverting: ${res.data ?? '0x'}`,
      ms: Date.now() - started
    };
  } catch (err: any) {
    const ms = Date.now() - started;
    // The revert selector lives several levels deep in viem's error `cause` chain,
    // and `cause` is a non-enumerable property — JSON.stringify(err) cannot see it.
    // err.walk() traverses the real (non-enumerable) chain to find it.
    const revertSource = typeof err?.walk === 'function'
      ? err.walk((e: any) => typeof e?.data === 'string' && e.data.startsWith('0x'))
      : undefined;
    const revertData: string | undefined = revertSource?.data;
    if (revertData?.toLowerCase().startsWith(RUG_PULL_DENIED_SELECTOR)) {
      return { phase: 'denied', detail: `RugPullDenied() [${RUG_PULL_DENIED_SELECTOR}]`, ms };
    }
    return { phase: 'error', detail: String(err?.shortMessage ?? err?.message ?? 'Unknown RPC failure'), ms };
  }
}
