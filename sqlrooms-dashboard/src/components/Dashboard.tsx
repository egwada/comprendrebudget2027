import { lazy, Suspense, useEffect, useMemo, useRef, useState } from 'react';
import { query } from '../duckdb';
import RankingTable from './RankingTable';
import MissionDetail, { type QualityRow } from './MissionDetail';
import ExpertData from './ExpertData';
import BudgetContext from './BudgetContext';
import { exportCredits } from '../lib/csv';
import { fmtEUR, fmtPct, evolutionPct, evolutionLabel, evolutionPhrase } from '../lib/format';
import {
  creditTypeLabels,
  acronymHelp,
  kpiLabels,
  kpiSubLabels,
  sectionLabels,
} from '../lib/labels';
import '../styles.css';

const TreemapChart = lazy(() => import('./TreemapChart'));
const BarChartCompare = lazy(() => import('./BarChartCompare'));

export interface MissionRow {
  mission: string;
  y2026: number;
  y2027: number;
  source_pages?: string;
}

export default function Dashboard() {
  const [missionData, setMissionData] = useState<{ creditType: string | null; rows: MissionRow[] }>(
    { creditType: null, rows: [] }
  );
  const [programData, setProgramData] = useState<{
    mission: string | null;
    creditType: string | null;
    rows: MissionRow[];
  }>({ mission: null, creditType: null, rows: [] });
  const [selected, setSelected] = useState<string | null>(() =>
    new URLSearchParams(location.hash.slice(1)).get('mission')
  );
  const [qualityData, setQuality] = useState<QualityRow[]>([]);
  const returnFocus = useRef<string>('missions-title');
  const navigationPending = useRef(false);
  const [creditType, setCreditType] = useState<'CP' | 'AE'>('CP');
  const [search, setSearch] = useState('');
  const [expert, setExpert] = useState(false);
  const quality = qualityData.filter((row) => row.type_credit === creditType);
  const rows = missionData.rows;
  const loading = missionData.creditType !== creditType;
  const programLoading =
    selected !== null &&
    (programData.mission !== selected || programData.creditType !== creditType);
  const programs = programLoading ? [] : programData.rows;
  const [error, setError] = useState('');

  useEffect(() => {
    let cancelled = false;
    query<MissionRow>(`
      SELECT mission,
        SUM(CASE WHEN annee = 2026 THEN montant ELSE 0 END)::DOUBLE AS y2026,
        SUM(CASE WHEN annee = 2027 THEN montant ELSE 0 END)::DOUBLE AS y2027,
        string_agg(DISTINCT source_page::VARCHAR, ', ') AS source_pages
      FROM fact_credits
      WHERE programme = '(total mission)' AND type_credit = '${creditType}' AND scope = 'budget_general'
      GROUP BY mission
    `)
      .then((r) => {
        if (!cancelled) {
          setMissionData({ creditType, rows: r });
          setError('');
        }
      })
      .catch((e) => {
        if (!cancelled) {
          setError(String(e));
          setMissionData({ creditType, rows: [] });
        }
      });
    return () => {
      cancelled = true;
    };
  }, [creditType]);

  useEffect(() => {
    const onHash = () => {
      navigationPending.current = true;
      setSelected(new URLSearchParams(location.hash.slice(1)).get('mission'));
    };
    window.addEventListener('hashchange', onHash);
    return () => window.removeEventListener('hashchange', onHash);
  }, []);

  useEffect(() => {
    if (!navigationPending.current || loading) return;
    navigationPending.current = false;
    document.getElementById(selected ? 'mission-title' : returnFocus.current)?.focus();
  }, [selected, loading]);

  useEffect(() => {
    let cancelled = false;
    query<QualityRow>(`SELECT * FROM v_qualite WHERE type_credit = '${creditType}'`)
      .then((r) => {
        if (!cancelled) setQuality(r);
      })
      .catch((e) => {
        if (!cancelled) setError(String(e));
      });
    return () => {
      cancelled = true;
    };
  }, [creditType]);

  useEffect(() => {
    let cancelled = false;
    if (selected) {
      const esc = selected.replace(/'/g, "''");
      query<MissionRow>(`
        SELECT programme AS mission,
          SUM(CASE WHEN annee = 2026 THEN montant ELSE 0 END)::DOUBLE AS y2026,
          SUM(CASE WHEN annee = 2027 THEN montant ELSE 0 END)::DOUBLE AS y2027,
          string_agg(DISTINCT source_page::VARCHAR, ', ') AS source_pages
        FROM fact_credits WHERE mission = '${esc}' AND programme != '(total mission)'
          AND type_credit = '${creditType}' AND scope = 'budget_general'
        GROUP BY programme
      `)
        .then((r) => {
          if (!cancelled) setProgramData({ mission: selected, creditType, rows: r });
        })
        .catch((e) => {
          if (!cancelled) {
            setError(String(e));
            setProgramData({ mission: selected, creditType, rows: [] });
          }
        });
    }
    return () => {
      cancelled = true;
    };
  }, [selected, creditType]);

  const sorted = useMemo(
    () =>
      rows
        .filter((r) => r.mission.toLocaleLowerCase('fr').includes(search.toLocaleLowerCase('fr')))
        .sort((a, b) => b.y2027 - a.y2027),
    [rows, search]
  );
  const total27 = sorted.reduce((s, r) => s + r.y2027, 0);
  const total26 = sorted.reduce((s, r) => s + r.y2026, 0);
  const delta = total27 - total26;
  const top = sorted.slice(0, 5);
  const topShare = total27 ? (top.reduce((s, r) => s + r.y2027, 0) / total27) * 100 : 0;
  const mission = rows.find((r) => r.mission === selected);
  const largestGains = [...sorted]
    .filter((r) => r.y2027 > r.y2026)
    .sort((a, b) => b.y2027 - b.y2026 - (a.y2027 - a.y2026))
    .slice(0, 2);
  const budgetTotal = rows.reduce((s, r) => s + r.y2027, 0);
  const navigate = (name: string | null) => {
    navigationPending.current = true;
    history.pushState(null, '', name ? `#mission=${encodeURIComponent(name)}` : location.pathname);
    setSelected(name);
  };
  const selectMission = (name: string) => {
    returnFocus.current = document.activeElement?.id || 'missions-title';
    navigate(name);
  };
  const reset = () => {
    setSearch('');
    navigate(null);
    setCreditType('CP');
  };
  const creditLabels = creditTypeLabels[creditType];

  return (
    <div className="page">
      <a className="skip-link" href="#contenu">
        Aller au contenu
      </a>
      <header className="hero">
        <div className="hero-badge">Prototype · données de démonstration PLF 2027</div>
        <h1>Où va l’argent prévu par l’État en 2027 ?</h1>
        <p className="sub">{sectionLabels.heroSub}</p>
      </header>
      <nav className="toolbar" aria-label="Filtres budgétaires">
        <div className="seg" role="group" aria-label="Type de crédits">
          {(Object.keys(creditTypeLabels) as ('CP' | 'AE')[]).map((ct) => (
            <button
              key={ct}
              aria-pressed={creditType === ct}
              className={creditType === ct ? 'on' : ''}
              onClick={() => setCreditType(ct)}
              aria-label={creditTypeLabels[ct].button}
            >
              {creditTypeLabels[ct].button}
              <span className="seg-acro">{creditTypeLabels[ct].acronym}</span>
            </button>
          ))}
        </div>
        <label className="search-input">
          {sectionLabels.search}
          <input
            type="search"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="Ex. : enseignement"
          />
        </label>
        <button className="reset-btn" onClick={reset}>
          Réinitialiser
        </button>
        <button
          className="expert-toggle"
          aria-pressed={expert}
          onClick={() => setExpert(!expert)}
        >
          {expert ? sectionLabels.expert.toggleOff : sectionLabels.expert.toggle}
        </button>
        <a href="/?page=methodologie">{sectionLabels.methodoLink}</a>
      </nav>
      <p className="acro-help">
        <b>{acronymHelp.intro}</b> {creditLabels.help} {acronymHelp.LFI} {acronymHelp.PLF}{' '}
        {acronymHelp.budgetGeneral}
      </p>
      <main id="contenu" tabIndex={-1}>
        <p className="note">{sectionLabels.note}</p>
        <p className="hint">
          Périmètre : budget général de l’État, remboursements et dégrèvements compris ·{' '}
          {creditLabels.help} · montants en euros · source : PDF de démonstration PLF 2027,
          p. 307–313.{' '}
          {search && 'Tous les totaux et parts ci-dessous portent sur les domaines filtrés.'}
        </p>
        {error && <p role="alert">Impossible de charger les données : {error}</p>}
        <div role="status" aria-live="polite" className="sr-only">
          {loading ? 'Chargement' : `${sorted.length} domaines d’action affichés, ${creditLabels.acronym}`}
        </div>
        {loading ? (
          <p className="loading">Chargement des données budgétaires…</p>
        ) : (
          <>
            <section className="kpis" aria-label="Chiffres clés du budget général">
              <div className="kpi">
                <div className="label">{kpiLabels[creditType].total27}</div>
                <div className="value">{fmtEUR(total27)}</div>
                <div className="sub">
                  {kpiSubLabels.total27} · {sorted.length} domaines {search ? '(filtrés)' : ''} ·{' '}
                  {creditLabels.acronym}
                </div>
              </div>
              <div className="kpi">
                <div className="label">{kpiLabels[creditType].total26}</div>
                <div className="value">{fmtEUR(total26)}</div>
                <div className="sub">{kpiSubLabels.total26}</div>
              </div>
              <div className="kpi">
                <div className="label">{kpiLabels[creditType].change}</div>
                <div className="value">
                  {delta >= 0 ? '+' : '−'}
                  {fmtEUR(Math.abs(delta))}
                </div>
                <div className="sub">
                  {fmtPct(evolutionPct(total26, total27) ?? 0)} ·{' '}
                  {evolutionPhrase(total26, total27)}
                </div>
              </div>
              <div className="kpi">
                <div className="label">{kpiLabels[creditType].first}</div>
                <div className="value mission-name">{top[0]?.mission ?? '—'}</div>
                <div className="sub">
                  {top[0] ? `${kpiSubLabels.first} : ${fmtEUR(top[0].y2027)}` : 'Aucune mission'}
                </div>
              </div>
            </section>
            {!selected ? (
              <>
                <section aria-labelledby="top-title">
                  <h2 id="top-title" className="section-title">
                    {sectionLabels.top5.title}
                  </h2>
                  <p className="takeaway">
                    <b>{sectionLabels.top5.takeIntro}</b> ces cinq domaines représentent{' '}
                    {topShare.toLocaleString('fr-FR', { maximumFractionDigits: 1 })} % des crédits{' '}
                    {search ? 'filtrés' : 'du budget général'} en {creditType} 2027.{' '}
                    {largestGains.length > 0 && (
                      <>
                        Les hausses en euros les plus importantes concernent{' '}
                        {largestGains.map((r) => r.mission).join(' et ')}.{' '}
                      </>
                    )}
                    Les remboursements d’impôts ne sont pas des services publics directement
                    financés.
                  </p>
                  <div className="top5">
                    {top.map((r, i) => (
                      <button
                        id={`top-${r.mission}`}
                        className="mcard"
                        key={r.mission}
                        onClick={() => selectMission(r.mission)}
                      >
                        <span className="rank">#{i + 1}</span>
                        <span className="name">{r.mission}</span>
                        <span className="val">{fmtEUR(r.y2027)}</span>
                        <span className="sub">{evolutionLabel(r.y2026, r.y2027)}</span>
                      </button>
                    ))}
                  </div>
                  <a className="explore-btn" href="#missions">
                    {sectionLabels.top5.explore}
                  </a>
                </section>
                <section className="panel" aria-labelledby="hundred-title">
                  <h2 id="hundred-title">{sectionLabels.hundred.title}</h2>
                  <p>
                    Répartition des crédits prévus en 2027 du budget général{' '}
                    {search
                      ? 'sur les domaines filtrés'
                      : '(remboursements d’impôts inclus)'}
                    . {sectionLabels.hundred.note}
                  </p>
                  <ul className="hundred">
                    {top.map((r) => (
                      <li key={r.mission}>
                        {r.mission} :{' '}
                        <b>
                          {(total27 ? (r.y2027 / total27) * 100 : 0).toLocaleString('fr-FR', {
                            maximumFractionDigits: 2,
                          })}{' '}
                          €
                        </b>
                      </li>
                    ))}
                    <li>
                      {sectionLabels.hundred.others} :{' '}
                      <b>
                        {(sorted.length ? 100 - topShare : 0).toLocaleString('fr-FR', {
                          maximumFractionDigits: 2,
                        })}{' '}
                        €
                      </b>
                    </li>
                  </ul>
                </section>
                <section id="missions" aria-labelledby="missions-title">
                  <h2 id="missions-title" tabIndex={-1} className="section-title">
                    {sectionLabels.ranking.title} — {creditType} 2027
                  </h2>
                  <p>
                    Chaque ligne compare un montant au plus grand domaine.
                    {' '}
                    {sectionLabels.ranking.explanation} La part porte sur le total affiché ; la
                    comparaison porte sur le budget voté en 2026 (LFI) et le projet pour 2027 (PLF).
                    Source : récapitulatif p. 307–313.
                  </p>
                  <ol className="horizontal-ranking">
                    {sorted.map((r) => (
                      <li key={r.mission}>
                        <button
                          id={`ranking-${r.mission}`}
                          onClick={() => selectMission(r.mission)}
                        >
                          <span className="ranking-name">{r.mission}</span>
                          <span className="ranking-amount">{fmtEUR(r.y2027)}</span>
                          <span className="ranking-bar" aria-hidden="true">
                            <i
                              style={{
                                width: `${top[0]?.y2027 ? (r.y2027 / top[0].y2027) * 100 : 0}%`,
                              }}
                            />
                          </span>
                          <span className="ranking-meta">
                            {(total27 ? (r.y2027 / total27) * 100 : 0).toLocaleString('fr-FR', {
                              maximumFractionDigits: 1,
                            })}{' '}
                            % du total · {evolutionLabel(r.y2026, r.y2027)}
                          </span>
                        </button>
                      </li>
                    ))}
                  </ol>
                  {!sorted.length && <p className="empty">{sectionLabels.ranking.empty}</p>}
                  <button
                    className="export-btn missions-export"
                    disabled={!sorted.length}
                    onClick={() => exportCredits(sorted, creditType)}
                  >
                    {sectionLabels.ranking.export}
                  </button>
                  <div className="panel">
                    <RankingTable
                      data={sorted}
                      totalRef={total27}
                      kind="missions"
                      onSelect={selectMission}
                    />
                  </div>
                </section>
                {expert && (
                  <section aria-labelledby="expert-title">
                    <h2 id="expert-title" className="section-title">
                      {sectionLabels.expert.title}
                    </h2>
                    <p>{sectionLabels.expert.explanation}</p>
                    <p>
                      Carte : surfaces proportionnelles aux crédits prévus en 2027. Comparatif : les
                      quatorze premiers domaines, budget voté 2026 face au projet pour 2027.
                      Alternative complète : le tableau de classement ci-dessus.
                    </p>
                    <Suspense fallback={<p role="status">Chargement des graphiques…</p>}>
                      <div className="grid-2">
                        <TreemapChart data={sorted} total={total27} onSelect={selectMission} />
                        <BarChartCompare
                          data={sorted.slice(0, 14)}
                          creditType={creditType}
                          onSelect={selectMission}
                        />
                      </div>
                    </Suspense>
                    <ExpertData quality={quality} />
                  </section>
                )}
              </>
            ) : mission ? (
              <MissionDetail
                mission={mission}
                programs={programs}
                budgetTotal={budgetTotal}
                creditType={creditType}
                loading={programLoading}
                quality={quality.filter((q) => q.mission === selected)}
                onBack={() => navigate(null)}
              />
            ) : (
              <section className="panel">
                <h2 id="mission-title" tabIndex={-1}>
                  Mission introuvable
                </h2>
                <button className="back-btn" onClick={() => navigate(null)}>
                  {sectionLabels.detail.back}
                </button>
              </section>
            )}
            {!selected && <BudgetContext />}
            {!selected && quality.some((q) => q.ecart !== 0) && (
              <p className="mes-warning quality-alert">
                Des écarts entre totaux mission et programmes sont détectés pour {creditType}. Les
                KPI utilisent les totaux imprimés ; consulter la vue experte pour les écarts
                détaillés.
              </p>
            )}
          </>
        )}
      </main>
      <footer className="src">
        Prototype non officiel : le PDF PLF 2027 est un document fictif / simulé (ADR-001). Ces
        données ne constituent pas une annonce gouvernementale. Sources : récapitulatif des missions
        et programmes, pages 307–313.
      </footer>
    </div>
  );
}
