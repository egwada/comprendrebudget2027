import { useEffect, useMemo, useState } from 'react';
import { query } from '../duckdb';
import TreemapChart from './TreemapChart';
import BarChartCompare from './BarChartCompare';
import RankingTable from './RankingTable';
import { fmtEUR, fmtPct, evolutionPct, evolutionLabel } from '../lib/format';
import '../styles.css';

export interface MissionRow {
  mission: string;
  y2026: number;
  y2027: number;
  source_pages?: string;
}

export default function Dashboard() {
  const [rows, setRows] = useState<MissionRow[]>([]);
  const [programs, setPrograms] = useState<MissionRow[]>([]);
  const [selected, setSelected] = useState<string | null>(null);
  const [creditType, setCreditType] = useState<'CP' | 'AE'>('CP');
  const [search, setSearch] = useState('');
  const [expert, setExpert] = useState(false);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  useEffect(() => {
    let cancelled = false;
    setLoading(true);
    query<MissionRow>(`
      SELECT mission,
        SUM(CASE WHEN annee = 2026 THEN montant ELSE 0 END)::DOUBLE AS y2026,
        SUM(CASE WHEN annee = 2027 THEN montant ELSE 0 END)::DOUBLE AS y2027,
        string_agg(DISTINCT source_page::VARCHAR, ', ') AS source_pages
      FROM fact_credits
      WHERE programme = '(total mission)' AND type_credit = '${creditType}' AND scope = 'budget_general'
      GROUP BY mission
    `).then((r) => { if (!cancelled) { setRows(r); setLoading(false); setError(''); } })
      .catch((e) => { if (!cancelled) { setError(String(e)); setLoading(false); } });
    return () => { cancelled = true; };
  }, [creditType]);

  useEffect(() => {
    let cancelled = false;
    setPrograms([]);
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
      `).then((r) => { if (!cancelled) setPrograms(r); })
        .catch((e) => { if (!cancelled) setError(String(e)); });
    }
    return () => { cancelled = true; };
  }, [selected, creditType]);

  const sorted = useMemo(() => rows.filter((r) => r.mission.toLocaleLowerCase('fr').includes(search.toLocaleLowerCase('fr')))
    .sort((a, b) => b.y2027 - a.y2027), [rows, search]);
  const total27 = sorted.reduce((s, r) => s + r.y2027, 0);
  const total26 = sorted.reduce((s, r) => s + r.y2026, 0);
  const delta = total27 - total26;
  const top = sorted.slice(0, 5);
  const topShare = total27 ? top.reduce((s, r) => s + r.y2027, 0) / total27 * 100 : 0;
  const selectMission = (name: string) => { setSelected(name); };
  const reset = () => { setSearch(''); setSelected(null); setCreditType('CP'); };

  return (
    <div className="page">
      <a className="skip-link" href="#contenu">Aller au contenu</a>
      <header className="hero">
        <div className="hero-badge">Prototype · données de démonstration PLF 2027</div>
        <h1>Où va l’argent prévu par l’État en 2027 ?</h1>
        <p className="sub">Budget général de l’État, y compris remboursements et dégrèvements d’impôts. Comparaison avec les crédits votés pour 2026.</p>
      </header>
      <nav className="toolbar" aria-label="Filtres budgétaires">
        <div className="seg" role="group" aria-label="Type de crédits">
          <button aria-pressed={creditType === 'CP'} className={creditType === 'CP' ? 'on' : ''} onClick={() => setCreditType('CP')}>Paiements prévus (CP)</button>
          <button aria-pressed={creditType === 'AE'} className={creditType === 'AE' ? 'on' : ''} onClick={() => setCreditType('AE')}>Engagements autorisés (AE)</button>
        </div>
        <label className="search-input">Rechercher une mission
          <input type="search" value={search} onChange={(e) => setSearch(e.target.value)} placeholder="Ex. : enseignement" />
        </label>
        <button className="reset-btn" onClick={reset}>Réinitialiser</button>
        <button aria-pressed={expert} onClick={() => setExpert(!expert)}>Vue {expert ? 'citoyenne' : 'experte'}</button>
      </nav>
      <main id="contenu" tabIndex={-1}>
        <p className="note">Les montants présentés correspondent aux crédits prévus dans le PLF 2027. Ils ne représentent pas encore les dépenses effectivement réalisées.</p>
        <p className="hint">Périmètre : budget général · {creditType} · montants en euros · source : PDF de démonstration PLF 2027, p. 307–313. {search && 'Tous les totaux et parts ci-dessous portent sur les missions filtrées.'}</p>
        {error && <p role="alert">Impossible de charger les données : {error}</p>}
        <div role="status" aria-live="polite" className="sr-only">{loading ? 'Chargement' : `${sorted.length} missions affichées, ${creditType}`}</div>
        {loading ? <p className="loading">Chargement des données budgétaires…</p> : <>
          <section className="kpis" aria-label="Chiffres clés du budget général">
            <div className="kpi"><div className="label">Budget total prévu — {creditType} 2027</div><div className="value">{fmtEUR(total27)}</div><div className="sub">{sorted.length} missions {search ? '(filtrées)' : ''} · crédits bruts</div></div>
            <div className="kpi"><div className="label">Crédits votés — LFI 2026</div><div className="value">{fmtEUR(total26)}</div><div className="sub">Mêmes missions et même type de crédits</div></div>
            <div className="kpi"><div className="label">Évolution depuis 2026</div><div className="value">{delta >= 0 ? '+' : '−'}{fmtEUR(Math.abs(delta))}</div><div className="sub">{fmtPct(evolutionPct(total26, total27) ?? 0)} · {evolutionLabel(total26, total27)}</div></div>
            <div className="kpi"><div className="label">Premier poste</div><div className="value mission-name">{top[0]?.mission ?? '—'}</div><div className="sub">{top[0] ? fmtEUR(top[0].y2027) : 'Aucune mission'}</div></div>
          </section>
          {!selected ? <>
            <section aria-labelledby="top-title">
              <h2 id="top-title" className="section-title">Les cinq principaux postes</h2>
              <p className="takeaway"><b>À retenir :</b> les cinq premiers postes représentent {topShare.toLocaleString('fr-FR', { maximumFractionDigits: 1 })} % des crédits {search ? 'filtrés' : 'du budget général'} en {creditType} 2027. Les remboursements d’impôts ne sont pas des services publics directement financés.</p>
              <div className="top5">{top.map((r, i) => <button className="mcard" key={r.mission} onClick={() => selectMission(r.mission)}><span className="rank">#{i + 1}</span><span className="name">{r.mission}</span><span className="val">{fmtEUR(r.y2027)}</span><span className="sub">{evolutionLabel(r.y2026, r.y2027)}</span></button>)}</div>
              <a className="explore-btn" href="#missions">Explorer les missions</a>
            </section>
            <section className="panel" aria-labelledby="hundred-title">
              <h2 id="hundred-title">Pour 100 € de crédits prévus</h2>
              <p>Répartition des {creditType} 2027 du budget général {search ? 'sur les missions filtrées' : '(crédits bruts, remboursements d’impôts inclus)'}. Les parts ne décrivent pas l’usage de vos impôts personnels.</p>
              <ul className="hundred">{top.map((r) => <li key={r.mission}>{r.mission} : <b>{(total27 ? r.y2027 / total27 * 100 : 0).toLocaleString('fr-FR', { maximumFractionDigits: 2 })} €</b></li>)}<li>Autres missions : <b>{(sorted.length ? 100 - topShare : 0).toLocaleString('fr-FR', { maximumFractionDigits: 2 })} €</b></li></ul>
            </section>
            <section id="missions" aria-labelledby="missions-title">
              <h2 id="missions-title" className="section-title">Classement des missions — {creditType} 2027</h2>
              <p>Chaque barre compare un montant au plus grand poste. La part porte sur le total affiché ; l’évolution compare la LFI 2026 au PLF 2027. Source : récapitulatif p. 307–313.</p>
              <ol className="horizontal-ranking">{sorted.map((r) => <li key={r.mission}><button onClick={() => selectMission(r.mission)}><span className="ranking-name">{r.mission}</span><span className="ranking-amount">{fmtEUR(r.y2027)}</span><span className="ranking-bar" aria-hidden="true"><i style={{ width: `${top[0]?.y2027 ? r.y2027 / top[0].y2027 * 100 : 0}%` }} /></span><span className="ranking-meta">{(total27 ? r.y2027 / total27 * 100 : 0).toLocaleString('fr-FR', { maximumFractionDigits: 1 })} % du total · {evolutionLabel(r.y2026, r.y2027)}</span></button></li>)}</ol>
              {!sorted.length && <p className="empty">Aucune mission ne correspond à la recherche.</p>}
              <div className="panel"><RankingTable data={sorted} totalRef={total27} kind="missions" onSelect={selectMission} /></div>
            </section>
            {expert && <section aria-labelledby="expert-title"><h2 id="expert-title" className="section-title">Explorer — vue experte</h2><p>Carte : surfaces proportionnelles aux {creditType} 2027. Comparatif : les quatorze premiers postes en 2026 et 2027. Alternative complète : le tableau de classement ci-dessus.</p><div className="grid-2"><TreemapChart data={sorted} total={total27} onSelect={selectMission} /><BarChartCompare data={sorted.slice(0, 14)} creditType={creditType} onSelect={selectMission} /></div></section>}
          </> : <section className="panel" aria-labelledby="mission-title"><button className="back-btn" onClick={() => setSelected(null)}>← Toutes les missions</button><h2 id="mission-title">Programmes — {selected}</h2><RankingTable data={programs} totalRef={programs.reduce((s, r) => s + r.y2027, 0)} kind="programmes" /></section>}
        </>}
      </main>
      <footer className="src">Prototype non officiel : le PDF PLF 2027 est un document fictif / simulé (ADR-001). Ces données ne constituent pas une annonce gouvernementale. Sources : récapitulatif des missions et programmes, pages 307–313.</footer>
    </div>
  );
}
