import { useCallback, useEffect, useMemo, useState } from 'react';
import { query } from '../duckdb';
import TreemapChart from './TreemapChart';
import BarChartCompare from './BarChartCompare';
import RankingTable from './RankingTable';
import {
  fmtEUR,
  fmtPct,
  evolutionPct,
  colorFor,
} from '../lib/format';
import '../styles.css';

export interface MissionRow {
  mission: string;
  y2026: number;
  y2027: number;
}

/** Ligne de data/staging/dim_contexte.csv — chiffres éditoriaux du rapport général (ADR-003). */
export interface ContextRow {
  cle: string;
  libelle: string;
  valeur: number;
  unite: string;
  annee: number;
  perimetre: string;
  source_page: number;
  note: string;
}

/** Ordre d’affichage des cartes « chiffres du rapport général ». */
const CTX_KEYS = [
  'total_efforts',
  'mesures_2027',
  'montee_en_charge',
  'depense_sous_norme',
  'deficit_public',
  'dette_publique',
] as const;

export default function Dashboard() {
  const [rows, setRows] = useState<MissionRow[]>([]);
  const [programs, setPrograms] = useState<MissionRow[]>([]);
  const [selected, setSelected] = useState<string | null>(null);
  const [creditType, setCreditType] = useState<'CP' | 'AE'>('CP');
  const [search, setSearch] = useState('');
  const [loading, setLoading] = useState(true);
  const [ctx, setCtx] = useState<Record<string, ContextRow>>({});

  const loadMissions = useCallback(async (ct: 'CP' | 'AE') => {
    setLoading(true);
    const sql = `
      SELECT mission,
        (SUM(CASE WHEN type_credit = '${ct}' AND annee = 2026 THEN montant ELSE 0 END))::DOUBLE as y2026,
        (SUM(CASE WHEN type_credit = '${ct}' AND annee = 2027 THEN montant ELSE 0 END))::DOUBLE as y2027
      FROM fact_credits
      WHERE programme != '(total mission)'
      GROUP BY mission
    `;
    const r = await query<MissionRow>(sql);
    setRows(r);
    setLoading(false);
  }, []);

  const loadPrograms = useCallback(async (mission: string, ct: 'CP' | 'AE') => {
    const esc = mission.replace(/'/g, "''");
    const sql = `
      SELECT programme as mission,
        (SUM(CASE WHEN type_credit = '${ct}' AND annee = 2026 THEN montant ELSE 0 END))::DOUBLE as y2026,
        (SUM(CASE WHEN type_credit = '${ct}' AND annee = 2027 THEN montant ELSE 0 END))::DOUBLE as y2027
      FROM fact_credits
      WHERE mission = '${esc}' AND programme != '(total mission)'
      GROUP BY programme
    `;
    setPrograms(await query<MissionRow>(sql));
  }, []);

  useEffect(() => {
    loadMissions(creditType);
  }, [loadMissions, creditType]);

  // Chiffres de contexte (rapport général) — indépendants du type de crédit.
  useEffect(() => {
    (async () => {
      const r = await query<ContextRow>(
        'SELECT cle, libelle, valeur, unite, annee, perimetre, source_page, note FROM dim_contexte'
      );
      setCtx(Object.fromEntries(r.map((row) => [row.cle, row])));
    })();
  }, []);

  useEffect(() => {
    if (selected) loadPrograms(selected, creditType);
    else setPrograms([]);
  }, [selected, creditType, loadPrograms]);

  const view = useMemo(
    () => rows.filter((r) => r.mission.toLowerCase().includes(search.toLowerCase())),
    [rows, search]
  );
  const sorted = useMemo(() => [...view].sort((a, b) => b.y2027 - a.y2027), [view]);

  const total27 = sorted.reduce((s, r) => s + r.y2027, 0);
  const total26 = sorted.reduce((s, r) => s + r.y2026, 0);
  const delta = total27 - total26;
  const deltaPct = evolutionPct(total26, total27);
  const top1 = sorted[0];

  // Charge de la dette : mission « Engagements financiers de l’État » (l’essentiel, non pilotable)
  const debt = view.find((r) => r.mission === 'Engagements financiers de l’État');
  const debtDelta = debt ? debt.y2027 - debt.y2026 : 0;
  const debtlessDelta = delta - debtDelta;
  const debtless26 = total26 - (debt?.y2026 ?? 0);
  const debtlessPct = evolutionPct(debtless26, debtless26 + debtlessDelta);

  const byGain = useMemo(
    () =>
      [...view]
        .map((r) => ({ r, e: evolutionPct(r.y2026, r.y2027) ?? -Infinity }))
        .sort((a, b) => b.e - a.e),
    [view]
  );
  const topGainer = byGain[0]?.r;
  const topLoser = [...view]
    .map((r) => ({ r, d: r.y2027 - r.y2026 }))
    .sort((a, b) => a.d - b.d)[0]?.r;

  if (loading) return <div className="loading">Chargement des données budgétaires…</div>;

  return (
    <div className="page">
      {/* ---- En-tête ---- */}
      <header className="hero">
        <div className="hero-badge">Projet de loi de finances · Tome 1</div>
        <h1>PLF 2027 — les crédits, d’un coup d’œil</h1>
        <p className="sub">
          {rows.length} missions budgétaires comparées à la LFI 2026, extraites du
          récapitulatif général du PLF. Cliquez sur une mission pour explorer ses programmes.
        </p>
        <div className="toolbar">
          <div className="seg" role="tablist">
            <button className={creditType === 'CP' ? 'on' : ''} onClick={() => setCreditType('CP')}>
              CP — Crédits de paiement
            </button>
            <button className={creditType === 'AE' ? 'on' : ''} onClick={() => setCreditType('AE')}>
              AE — Autorisations d’engagement
            </button>
          </div>
          <span className="search-input">
            <input
              type="text"
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              placeholder="Rechercher une mission…"
            />
          </span>
          {selected && (
            <span className="chip">
              {selected}
              <button title="Retirer la sélection" onClick={() => setSelected(null)}>✕</button>
            </span>
          )}
        </div>
      </header>

      {/* ---- Chiffres clés ---- */}
      <section className="kpis">
        <div className="kpi">
          <div className="label">Total {creditType} — PLF 2027</div>
          <div className="value">{fmtEUR(total27)}</div>
          <div className="sub">
            {sorted.length} mission{sorted.length > 1 ? 's' : ''}
            {search ? ' (filtrées)' : ''}
          </div>
        </div>
        <div className="kpi">
          <div className="label">LFI 2026</div>
          <div className="value">{fmtEUR(total26)}</div>
          <div className="sub">Année de référence, mêmes missions</div>
        </div>
        <div className="kpi">
          <div className="label">Évolution des crédits demandés</div>
          <div className="value">
            {delta >= 0 ? '+' : '−'}{fmtEUR(Math.abs(delta))}
          </div>
          <div className="sub">
            {deltaPct !== null ? (
              <span className={`badge ${delta > 0 ? 'up' : delta < 0 ? 'down' : 'zero'}`}>
                {fmtPct(deltaPct)} vs LFI 2026
              </span>
            ) : (
              '—'
            )}
            {debt && (
              <div style={{ marginTop: 4 }}>
                dont charge de la dette{' '}
                <b>{debtDelta >= 0 ? '+' : '−'}{fmtEUR(Math.abs(debtDelta))}</b>
                {' '}— hors dette :{' '}
                {debtlessDelta >= 0 ? '+' : '−'}{fmtEUR(Math.abs(debtlessDelta))}
                {debtlessPct !== null ? ` (${fmtPct(debtlessPct)})` : ''}
              </div>
            )}
          </div>
        </div>
        <div className="kpi">
          <div className="label">1ᵉʳ poste de dépenses</div>
          <div className="value" style={{ fontSize: 18, lineHeight: 1.3 }}>
            {top1 ? top1.mission : '—'}
          </div>
          <div className="sub">
            {top1 ? (
              <>
                <b>{fmtEUR(top1.y2027)}</b> ·{' '}
                {fmtPct(total27 ? (top1.y2027 / total27) * 100 : 0, 0)} des crédits
              </>
            ) : (
              '—'
            )}
          </div>
        </div>
      </section>

      {/* ---- Note de lecture : réconcilier « 54 Md€ d’efforts » et nos +21 Md€ ---- */}
      <div className="note">
        <b>Pourquoi « +21 Md€ » quand tout le monde parle de « 54 Md€ d’efforts » ?</b>{' '}
        Ces deux montants ne mesurent pas la même chose. Ici, on compare les crédits du{' '}
        <b>budget général de l’État</b> entre la LFI 2026 et le PLF 2027, sur les{' '}
        {view.length} missions de ce périmètre. La hausse est portée par la{' '}
        <b>charge de la dette</b> (mission Engagements financiers de l’État :{' '}
        {debtDelta >= 0 ? '+' : '−'}{fmtEUR(Math.abs(debtDelta))}) et par la <b>Défense</b> ; hors dette,
        les crédits progressent de{' '}
        {debtlessDelta >= 0 ? '+' : '−'}{fmtEUR(Math.abs(debtlessDelta))}
        {debtlessPct !== null ? ` (${fmtPct(debtlessPct)})` : ''} — moins vite que l’inflation.
        Les <b>54 Md€ d’efforts</b> (rapport général du PLF, p. 12) portent un périmètre plus
        large — toutes les administrations publiques, dont la sécurité sociale via le{' '}
        PLFSS, hors de ce tableau de bord — : 43 Md€ de mesures de redressement dans les
        textes financiers 2027, plus la montée en charge de mesures prises en 2026 et
        antérieurement, mesurés par rapport à une trajectoire « à politique inchangée », non
        par rapport à la LFI 2026.
      </div>

      {/* ---- Chiffres du rapport général (périmètre élargi — cf. dim_contexte.csv, ADR-003) ---- */}
      <div className="section-title">
        Les chiffres du rapport général — le décor de ces crédits
      </div>
      <section className="ctx-grid">
        {CTX_KEYS.filter((k) => ctx[k]).map((k) => {
          const c = ctx[k];
          const v = c.valeur.toLocaleString('fr-FR', { maximumFractionDigits: 1 }).replace('-', '−');
          return (
            <div className="ctx-card" key={k} title={c.note}>
              <div className="ctx-val">
                {v} <span className="ctx-unit">{c.unite}</span>
              </div>
              <div className="ctx-lib">{c.libelle}</div>
              <div className="sub">
                {c.perimetre} · {c.annee} · source p. {c.source_page}
                {c.note ? <em> — {c.note}</em> : null}
              </div>
            </div>
          );
        })}
      </section>

      {/* ---- Top 5 ---- */}
      <div className="section-title">Les 5 premiers postes de dépenses</div>
      <section className="top5">
        {sorted.slice(0, 5).map((m, i) => {
          const ev = evolutionPct(m.y2026, m.y2027);
          const share = total27 ? (m.y2027 / total27) * 100 : 0;
          return (
            <div
              key={m.mission}
              className="mcard"
              style={{ '--c': colorFor(m.mission) } as React.CSSProperties}
              onClick={() => setSelected(m.mission)}
              title={`Voir les programmes de « ${m.mission} »`}
            >
              <div className="rank">#{i + 1}</div>
              <div className="name">{m.mission}</div>
              <div className="val">{fmtEUR(m.y2027)}</div>
              <div className="sub">
                {fmtPct(share, 0)} des crédits
                {ev !== null && (
                  <>
                    {' · '}
                    <span className={`badge ${m.y2027 > m.y2026 ? 'up' : m.y2027 < m.y2026 ? 'down' : 'zero'}`}>
                      {fmtPct(ev)}
                    </span>
                  </>
                )}
              </div>
            </div>
          );
        })}
      </section>

      {/* ---- Graphiques ---- */}
      <div className="section-title">Répartition et évolution des crédits</div>
      <p style={{ fontSize: 13, color: 'var(--muted)', margin: '0 0 8px' }}>
        {topGainer && topLoser && topGainer.mission !== topLoser.mission ? (
          <>
            En {creditType}, la plus forte hausse revient à{' '}
            <b>{topGainer.mission}</b> ({evolutionPct(topGainer.y2026, topGainer.y2027) !== null
              ? fmtPct(evolutionPct(topGainer.y2026, topGainer.y2027)!)
              : '—'}),
            la plus forte baisse à{' '}
            <b>{topLoser.mission}</b> ({evolutionPct(topLoser.y2026, topLoser.y2027) !== null
              ? fmtPct(evolutionPct(topLoser.y2026, topLoser.y2027)!)
              : '—'}).
          </>
        ) : (
          <>Chaque rectangle représente une mission à l’échelle de ses crédits {creditType} 2027.</>
        )}
      </p>
      <div className="grid-2">
        <TreemapChart data={sorted} total={total27} onSelect={setSelected} />
        <BarChartCompare
          data={sorted.slice(0, 14)}
          creditType={creditType}
          onSelect={setSelected}
        />
      </div>

      {/* ---- Classement ---- */}
      <div className="section-title">Classement détaillé</div>
      <div className="panel">
        {selected ? (
          <>
            <div className="panel-head" style={{ marginBottom: 12 }}>
              <h3>Programmes — {selected}</h3>
              <button className="back-btn" onClick={() => setSelected(null)}>
                ← Toutes les missions
              </button>
            </div>
            <RankingTable
              data={programs}
              totalRef={programs.reduce((s, p) => s + p.y2027, 0)}
              kind="programmes"
            />
          </>
        ) : (
          <>
            <div className="panel-head" style={{ marginBottom: 12 }}>
              <h3>Les {sorted.length} missions, classées par crédits {creditType} 2027</h3>
            </div>
            <RankingTable
              data={sorted}
              totalRef={total27}
              kind="missions"
              onSelect={setSelected}
            />
          </>
        )}
      </div>

      <footer className="src">
        Source : Projet de loi de finances pour 2027, tome 1 — récapitulatif général des crédits
        (missions et programmes). Montants en euros. Extraction automatique du PDF officiel ;
        quelques libellés peuvent être tronqués. AE = autorisations d’engagement,
        CP = crédits de paiement. Cartes « chiffres du rapport général » : chiffres
        éditoriaux du tome 1 (p. 11-13), périmètre des administrations publiques
        incluant la sécurité sociale — distinct du périmètre des crédits ci-dessus.
      </footer>
    </div>
  );
}