import type { MissionRow } from './Dashboard';
import RankingTable from './RankingTable';
import { evolutionLabel, fmtEUR } from '../lib/format';
import { exportCredits } from '../lib/csv';

export interface QualityRow {
  mission: string;
  type_credit: string;
  annee: number;
  total_mission: number;
  total_programmes: number;
  ecart: number;
}

export default function MissionDetail({ mission, programs, budgetTotal, creditType, loading, quality, onBack }: {
  mission: MissionRow; programs: MissionRow[]; budgetTotal: number; creditType: 'CP' | 'AE';
  loading: boolean; quality: QualityRow[]; onBack: () => void;
}) {
  const ranked = [...programs].sort((a, b) => b.y2027 - a.y2027);
  return <section className="panel mission-detail" aria-labelledby="mission-title">
    <button className="back-btn" onClick={onBack}>← Toutes les missions</button>
    <h2 id="mission-title" tabIndex={-1}>{mission.mission}</h2>
    <p>Une mission regroupe des programmes qui contribuent à une politique publique. Ici, les crédits prévus concernent {ranked.slice(0, 3).map((p) => p.mission).join(' ; ') || 'les programmes ci-dessous'}. Lecture fondée sur les intitulés du récapitulatif, pas sur une évaluation des résultats.</p>
    <dl className="mission-facts">
      <div><dt>Montant prévu — {creditType} 2027</dt><dd>{fmtEUR(mission.y2027)}</dd></div>
      <div><dt>Part du budget général complet</dt><dd>{(budgetTotal ? mission.y2027 / budgetTotal * 100 : 0).toLocaleString('fr-FR', { maximumFractionDigits: 1 })} %</dd></div>
      <div><dt>Depuis la LFI 2026 ({fmtEUR(mission.y2026)})</dt><dd>{evolutionLabel(mission.y2026, mission.y2027)}</dd></div>
      <div><dt>Programmes / dotations</dt><dd>{loading ? 'Chargement…' : programs.length} (lignes sans crédits incluses)</dd></div>
    </dl>
    <p>Source : PLF 2027 de démonstration · budget général · euros · {mission.source_pages?.split(', ').map((p, i) => <span key={p}>{i > 0 ? ', ' : ''}<a href={`/sources/l17b3210_projet-loi.pdf#page=${p}`} target="_blank" rel="noreferrer">PDF p. {p} (nouvel onglet)</a></span>)}. Le total imprimé de la mission fait référence.</p>
    {quality.filter((q) => q.ecart !== 0).map((q) => <p className="mes-warning quality-alert" key={q.annee}>Qualité d’extraction {q.annee} : écart de {q.ecart < 0 ? '−' : '+'}{fmtEUR(Math.abs(q.ecart))} entre le total mission et les programmes extraits. Le détail peut être incomplet ; le total imprimé reste utilisé.</p>)}
    <h3>Programmes — {mission.mission}</h3>
    <button className="export-btn" disabled={loading || !programs.length} onClick={() => exportCredits(programs, creditType, mission.mission)}>Exporter les programmes en CSV</button>
    {loading ? <p role="status">Chargement des programmes…</p> : <RankingTable data={programs} totalRef={mission.y2027} kind="programmes" />}
  </section>;
}
