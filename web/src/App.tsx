import { useCallback, useEffect, useState } from 'react';
import {
  CONTRACT, CHAIN_ID, RPC_URL, EXPLORER_BASE, GITHUB_URL, SOURCIFY_URL,
  read, attemptRugPull, type RugAttempt
} from './dore';

type RowSpec = {
  key: string;
  label: string;
  fn?: string;
  fmt?: (v: any) => string;
  good?: (v: any) => boolean;
  fallback: string;
  staticNote?: string;
};

const ROWS: RowSpec[] = [
  { key: 'mint', label: 'Additional minting', fn: 'canMintMore', fmt: v => (v ? 'POSSIBLE' : 'IMPOSSIBLE'), good: v => v === false, fallback: 'IMPOSSIBLE' },
  { key: 'tax', label: 'Transfer tax', fn: 'taxRateBps', fmt: v => Number(v) / 100 + '%', good: v => Number(v) === 0, fallback: '0%' },
  { key: 'blacklist', label: 'Blacklist', fn: 'blacklistEnabled', fmt: v => (v ? 'PRESENT' : 'NONE'), good: v => v === false, fallback: 'NONE' },
  { key: 'admin', label: 'Admin key', fn: 'adminKeyExists', fmt: v => (v ? 'PRESENT' : 'NONE'), good: v => v === false, fallback: 'NONE' },
  { key: 'restrict', label: 'Transfer restrictions', fallback: 'NONE', staticNote: 'By source' },
  { key: 'supply', label: 'Fixed supply', fn: 'totalSupply', fmt: v => (BigInt(v) / 10n ** 18n).toLocaleString('en-US') + ' RUG', good: () => true, fallback: '1,000,000,000 RUG' },
  { key: 'efficiency', label: 'Rug efficiency', fn: 'efficiencyRating', fmt: v => Number(v) + '%', good: v => Number(v) === 0, fallback: '0%' }
];

const STATEMENTS = [
  { key: 'rugStatus', fallback: 'RUG PULL DENIED BY DEPARTMENT POLICY' },
  { key: 'motto', fallback: 'The only rug that cannot rug.' },
  { key: 'officialStatement', fallback: 'This rug has failed to rug.' }
];

const CHECKS = ['Fixed supply', 'No additional mint', 'No owner function', 'No blacklist',
  'Zero transfer tax', 'Transfers work normally', 'Rug pull denied', 'No admin control',
  'Department statements verified', 'Contract builds successfully'];

const POLICIES = ['No custom transfer logic', 'No mutable taxes', 'No blacklist', 'No pause controls',
  'No owner privileges', 'No hidden mint', 'No trading switch', 'No anti-bot gimmicks'];

const MODAL_COPY: Record<string, { status: string; color: string; headline: string; secondary: string }> = {
  pending: { status: 'PROCESSING', color: '#0e1f3d', headline: 'Request submitted to the Department for review', secondary: 'Please remain seated.' },
  denied: { status: 'DENIED', color: '#b3232b', headline: 'Rug pull denied by Department policy', secondary: '“This rug has failed to rug.”' },
  error: { status: 'UNDETERMINED', color: '#8c6a12', headline: 'The Department could not reach Arc Testnet — the call did not complete', secondary: 'No result may be inferred from this attempt.' },
  unexpected: { status: 'ANOMALY', color: '#8c6a12', headline: 'rugPull() did not revert as expected — please report this to the Department', secondary: 'This is not supposed to happen.' }
};

export default function App() {
  const [values, setValues] = useState<Record<string, { value: string; good: boolean }>>({});
  const [statements, setStatements] = useState<Record<string, string>>({});
  const [readStatus, setReadStatus] = useState<'pending' | 'live' | 'partial' | 'error'>('pending');
  const [modal, setModal] = useState<{ phase: string; detail?: string; ms?: number } | null>(null);
  const [copied, setCopied] = useState(false);

  useEffect(() => {
    let cancelled = false;
    (async () => {
      const rowJobs = ROWS.filter(r => r.fn).map(async r => {
        try {
          const v = await read<any>(r.fn!);
          return { key: r.key, ok: true, value: r.fmt!(v), good: r.good!(v) };
        } catch {
          return { key: r.key, ok: false };
        }
      });
      const stmtJobs = STATEMENTS.map(async s => {
        try { return { key: s.key, ok: true, value: await read<string>(s.key) }; }
        catch { return { key: s.key, ok: false }; }
      });
      const rowRes = await Promise.all(rowJobs);
      const stmtRes = await Promise.all(stmtJobs);
      if (cancelled) return;
      const nextValues: Record<string, { value: string; good: boolean }> = {};
      rowRes.forEach(r => { if (r.ok) nextValues[r.key] = { value: r.value as string, good: !!r.good }; });
      const nextStatements: Record<string, string> = {};
      stmtRes.forEach(s => { if (s.ok) nextStatements[s.key] = s.value as string; });
      const total = rowRes.length + stmtRes.length;
      const okCount = rowRes.filter(r => r.ok).length + stmtRes.filter(s => s.ok).length;
      setValues(nextValues);
      setStatements(nextStatements);
      setReadStatus(okCount === 0 ? 'error' : okCount < total ? 'partial' : 'live');
    })();
    return () => { cancelled = true; };
  }, []);

  useEffect(() => {
    const onKey = (e: KeyboardEvent) => { if (e.key === 'Escape') setModal(null); };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, []);

  const tryToRug = useCallback(async () => {
    setModal({ phase: 'pending' });
    const res: RugAttempt = await attemptRugPull();
    setModal(res);
  }, []);

  const copyContract = useCallback(async () => {
    try { await navigator.clipboard.writeText(CONTRACT); } catch { /* clipboard unavailable */ }
    setCopied(true);
    setTimeout(() => setCopied(false), 1800);
  }, []);

  const readStatusLabel = {
    pending: 'Reading contract…',
    live: 'Live from chain ' + CHAIN_ID,
    partial: 'Partially verified',
    error: 'RPC unavailable — values unverified'
  }[readStatus];

  const copy = MODAL_COPY[modal?.phase ?? ''] ?? { status: '', color: '#0e1f3d', headline: '', secondary: '' };
  const tech = modal ? [
    'method     eth_call (read-only)',
    'to         ' + CONTRACT,
    'function   rugPull()',
    'chainId    ' + CHAIN_ID,
    'rpc        ' + RPC_URL,
    modal.phase === 'denied' ? 'revert     ' + modal.detail : null,
    modal.phase === 'error' || modal.phase === 'unexpected' ? 'detail     ' + String(modal.detail).slice(0, 300) : null,
    modal.ms != null ? 'elapsed    ' + modal.ms + ' ms' : null,
    'value      0 · no transaction sent · no signature requested'
  ].filter(Boolean).join('\n') : '';

  const milestones = [
    { title: 'Contract v1.0', state: 'Complete', dot: '#1d6b3f' },
    { title: 'Arc Testnet deployment', state: 'Complete', dot: '#1d6b3f' },
    { title: 'Source verification', state: 'Complete · Sourcify', dot: '#1d6b3f' },
    { title: 'Automated test suite', state: 'Complete · 10/10', dot: '#1d6b3f' },
    { title: 'Website', state: 'In progress', dot: '#c9a227' },
    { title: 'Mainnet deployment', state: 'Not started', dot: '#d8d2c0' },
    { title: 'Official liquidity pool', state: 'Not started', dot: '#d8d2c0' }
  ];

  return (
    <>
      <div className="band">Official parody website · Arc Testnet only · No monetary value</div>

      <header className="bar">
        <div className="bar-in">
          <img className="bar-seal" src="./seal.png" alt="Department of Rug Efficiency seal" width={40} height={40} />
          <div style={{ minWidth: 0, flex: 1 }}>
            <div className="bar-name">D.O.R.E.</div>
            <div className="bar-sub">Department of Rug Efficiency</div>
          </div>
          <nav className="bar-links">
            <a href="#audit">Audit</a>
            <a href="#contract">Contract</a>
            <a href="#status">Status</a>
          </nav>
          <button type="button" className="btn btn-rug-sm" onClick={tryToRug}>Try to rug</button>
        </div>
      </header>

      <section className="hero">
        <div className="hero-in">
          <img className="hero-seal" src="./seal.png" alt="Official seal of the Department of Rug Efficiency: an eagle in a suit cutting a red carpet" />
          <div className="badge"><i />Arc Testnet</div>
          <h1 className="dept">Department of<br />Rug Efficiency</h1>
          <div className="ticker-rule">
            <span className="line" />
            <span className="ticker">$RUG</span>
            <span className="line r" />
          </div>
          <p className="slogan">The only rug that cannot rug.</p>
          <p className="lede">An experimental Arc-native ERC-20 dedicated to transparent token mechanics and extremely inefficient rug pulling.</p>
          <div className="cta-stack">
            <button type="button" className="btn-rug" onClick={tryToRug}>Try to rug</button>
            <div className="cta-row">
              <a className="btn btn-ghost" href="#contract">View contract</a>
              <a className="btn btn-ghost" href={GITHUB_URL} target="_blank" rel="noopener noreferrer">GitHub</a>
            </div>
          </div>
          <p className="fineprint">Read-only call · No transaction · No signature · No funds</p>
        </div>
      </section>

      <main className="wrap">
        <section className="sec" id="audit">
          <div className="sec-head">
            <h2 className="sec-title">Department Audit</h2>
            <span className="kicker">Form DORE-0002</span>
          </div>
          <p style={{ fontSize: 14, lineHeight: 1.6, color: 'var(--ink-soft)', maxWidth: 640, margin: '0 0 18px' }}>
            Values below are read live from the deployed testnet contract by read-only <code className="mono">eth_call</code>. Nothing is reported as verified unless the contract answered.
          </p>
          <div className="panel">
            <div className="panel-head">
              <span>Token contract</span>
              <span className="state">{readStatusLabel}</span>
            </div>
            {ROWS.map(r => {
              const got = values[r.key];
              const pending = readStatus === 'pending';
              const value = !r.fn ? r.fallback : got ? got.value : pending ? '……' : r.fallback;
              const note = !r.fn ? r.staticNote : got ? 'Verified' : pending ? 'Reading' : 'Unverified';
              const color = !r.fn ? 'var(--green)' : got ? (got.good ? 'var(--green)' : 'var(--red)') : pending ? 'var(--muted-2)' : 'var(--muted)';
              return (
                <div className="row" key={r.key}>
                  <span className="label">{r.label}</span>
                  <span className="val" style={{ color }}>{value}</span>
                  <span className="note">{note}</span>
                </div>
              );
            })}
          </div>
          <div style={{ display: 'grid', gap: 12, marginTop: 14 }}>
            {STATEMENTS.map(st => (
              <figure className="stmt" key={st.key}>
                <figcaption className="kicker" style={{ marginBottom: 6 }}>
                  {st.key}() · {statements[st.key] ? 'verified on-chain' : 'unverified'}
                </figcaption>
                <blockquote>{statements[st.key] || st.fallback}</blockquote>
              </figure>
            ))}
          </div>
        </section>

        <section className="sec" id="contract">
          <div className="sec-head">
            <h2 className="sec-title">Contract of Record</h2>
            <span className="kicker">Form DORE-0003</span>
          </div>
          <div className="panel" style={{ padding: '16px 14px' }}>
            <div className="chips">
              <span className="chip warn">Testnet only</span>
              <span className="chip warn">No monetary value</span>
              <span className="chip">Source verified · Sourcify</span>
            </div>
            <dl style={{ margin: '0 0 16px', display: 'grid', gap: 14 }}>
              <div>
                <dt className="kicker">Network</dt>
                <dd style={{ margin: '4px 0 0', fontFamily: 'var(--display)', fontWeight: 700, fontSize: 18 }}>Arc Testnet</dd>
              </div>
              <div>
                <dt className="kicker">Contract address</dt>
                <dd className="mono" style={{ margin: '4px 0 0', fontSize: 'clamp(11px, 3.4vw, 15px)', wordBreak: 'break-all', lineHeight: 1.4 }}>{CONTRACT}</dd>
              </div>
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 14 }}>
                <div>
                  <dt className="kicker">Chain ID</dt>
                  <dd className="mono" style={{ margin: '4px 0 0', fontSize: 15 }}>{CHAIN_ID}</dd>
                </div>
                <div>
                  <dt className="kicker">RPC endpoint</dt>
                  <dd className="mono" style={{ margin: '4px 0 0', fontSize: 11, wordBreak: 'break-all' }}>{RPC_URL}</dd>
                </div>
              </div>
            </dl>
            <div className="btn-grid">
              <button type="button" className="btn btn-navy" onClick={copyContract}>{copied ? 'Copied ✓' : 'Copy contract'}</button>
              <a className="btn btn-outline" href={`${EXPLORER_BASE.replace(/\/$/, '')}/address/${CONTRACT}`} target="_blank" rel="noopener noreferrer">View on explorer</a>
              <a className="btn btn-outline" href={SOURCIFY_URL} target="_blank" rel="noopener noreferrer">Verified source</a>
              <a className="btn btn-outline" href={GITHUB_URL} target="_blank" rel="noopener noreferrer">View GitHub</a>
            </div>
          </div>
        </section>

        <section className="sec">
          <div className="sec-head">
            <h2 className="sec-title">Department Internal Audit</h2>
            <span className="kicker">Form DORE-0004</span>
          </div>
          <div className="grid-auto">
            <div className="ci">
              <div className="kicker" style={{ color: 'var(--muted-2)' }}>Continuous integration</div>
              <div className="score">10/10</div>
              <div className="pass">Anti-rug checks: pass</div>
              <p>Executed by the repository's GitHub Actions workflow on every commit. See the run log in the repository for the authoritative result.</p>
              <a href={`${GITHUB_URL.replace(/\/$/, '')}/actions`} target="_blank" rel="noopener noreferrer">Open workflow runs →</a>
            </div>
            <ul className="checks">
              {CHECKS.map(c => (
                <li key={c}><span className="tick" aria-hidden="true">✓</span><span>{c}</span></li>
              ))}
            </ul>
          </div>
        </section>

        <section className="sec" id="status">
          <div className="grid-auto" style={{ gridTemplateColumns: 'repeat(auto-fit, minmax(280px, 1fr))' }}>
            <div>
              <div className="sec-head">
                <h2 className="sec-title">Project Status</h2>
                <span className="kicker">Form DORE-0005</span>
              </div>
              <ol className="timeline">
                {milestones.map(m => (
                  <li key={m.title}>
                    <span className="dot" aria-hidden="true" style={{ background: m.dot }} />
                    <div className="t">{m.title}</div>
                    <div className="s">{m.state}</div>
                  </li>
                ))}
              </ol>
            </div>
            <div>
              <div className="sec-head">
                <h2 className="sec-title">Market Status</h2>
                <span className="kicker">Form DORE-0006</span>
              </div>
              <div className="market">
                <div className="line">
                  <span>Official D.O.R.E. pool</span>
                  <strong style={{ color: 'var(--red-dark)' }}>NOT LAUNCHED</strong>
                </div>
                <div className="line">
                  <span>Third-party pools</span>
                  <strong>POSSIBLE</strong>
                </div>
                <p>RUG is a permissionless ERC-20. Third parties may create pools without approval from D.O.R.E. Only pools explicitly listed by official D.O.R.E. channels should be considered project-associated.</p>
              </div>
            </div>
          </div>
        </section>

        <section className="sec">
          <div className="sec-head">
            <h2 className="sec-title">Department Policy</h2>
            <span className="kicker">Form DORE-0007</span>
          </div>
          <div className="policy-grid">
            {POLICIES.map(p => (
              <div className="policy" key={p}><span className="x" aria-hidden="true">✕</span><span>{p}</span></div>
            ))}
          </div>
          <blockquote className="creed">“The token contract should remain boring.<br />The absurdity belongs in the Department.”</blockquote>
        </section>

        <section className="disclaimer">
          <h2>Disclaimer</h2>
          <p>Department of Rug Efficiency is an experimental parody project.</p>
          <p>“The only rug that cannot rug.” is parody branding referring to token-level controls. It is not a guarantee of token value, liquidity, investment performance, smart-contract security or protection from third-party risks.</p>
          <p>
            Arc Testnet RUG has no monetary value.{' '}
            <a className="mono" style={{ fontSize: 12, letterSpacing: '0.06em', textTransform: 'uppercase' }} href={`${GITHUB_URL.replace(/\/$/, '')}/blob/main/RISKS.md`} target="_blank" rel="noopener noreferrer">RISKS.md</a>
          </p>
        </section>
      </main>

      <footer className="dept">
        <div className="foot-in">
          <div className="foot-brand">
            <img src="./seal.png" alt="" width={52} height={52} />
            <div>
              <div className="n">D.O.R.E.</div>
              <div className="s">Department of Rug Efficiency<br />Est. 2026</div>
            </div>
          </div>
          <nav className="foot-nav">
            <a href={GITHUB_URL} target="_blank" rel="noopener noreferrer">GitHub</a>
            <a href="#contract">Contract</a>
            <a href={`${GITHUB_URL.replace(/\/$/, '')}/blob/main/RISKS.md`} target="_blank" rel="noopener noreferrer">Risks</a>
            <span>Arc Testnet</span>
          </nav>
          <div className="foot-quote">
            <p className="q">“This rug has failed to rug.”</p>
            <p className="form">Form DORE-0001 / Public record<br />rugdepartment.xyz</p>
          </div>
        </div>
      </footer>

      {modal && (
        <div className="overlay" role="dialog" aria-modal="true" aria-label="Rug pull request result" onClick={() => setModal(null)}>
          <div className="modal" onClick={e => e.stopPropagation()}>
            <div className="modal-head">
              <span>Form DORE-0001 · Rug pull request</span>
              <button type="button" aria-label="Close" onClick={() => setModal(null)}>✕</button>
            </div>
            <div className="modal-body">
              <div className="field">Request</div>
              <div className="req">RUG PULL</div>
              <div className="field">Status</div>
              <div className="status" style={{ color: copy.color }}>{copy.status}</div>
              {modal.phase === 'pending' && <div className="spinner" aria-hidden="true" />}
              {modal.phase === 'denied' && <div className="stamp" aria-hidden="true">DENIED</div>}
              <p className="headline">{copy.headline}</p>
              <p className="secondary">{copy.secondary}</p>
              <div className="tech">
                <div className="kicker" style={{ fontSize: 9, marginBottom: 6 }}>Technical record</div>
                <pre>{tech}</pre>
              </div>
            </div>
          </div>
        </div>
      )}
    </>
  );
}
