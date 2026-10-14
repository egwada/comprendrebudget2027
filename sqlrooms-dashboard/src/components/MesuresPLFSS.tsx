import { useEffect, useState } from 'react';
import { query } from '../duckdb';
import { downloadCsv } from '../lib/csv';
import { plfssPageUrl } from '../lib/sourceLinks';

export interface MesureRow {
  branche: string;
  article: string;
  intitule: string;
  montant_md: number;
  effet: string;
  annee: number;
  source_page: number;
  note: string;
}

/** Libellés FR + classes décrivant la nature/sens de la mesure, sans code couleur évaluatif. */
const EFFET: Record<string, { label: string; cls: string }> = {
  economie: { label: 'économies', cls: 'down' },
  recette: { label: 'recettes nouvelles', cls: 'down' },
  depense: { label: 'dépense en plus', cls: 'up' },
  transfert: { label: 'transfert de dette', cls: 'zero' },
  objectif: { label: 'objectif', cls: 'zero' },
  solde: { label: 'solde', cls: 'zero' }, // classe ajustée selon le signe
};

const fmt = (m: number) =>
  m.toLocaleString('fr-FR', { maximumFractionDigits: 1 }).replace('-', '−') + ' Md€';

function badge(r: MesureRow) {
  const e = EFFET[r.effet] ?? { label: r.effet, cls: 'zero' };
  let cls = e.cls;
  if (r.effet === 'solde') cls = r.montant_md < 0 ? 'up' : r.montant_md > 0 ? 'down' : 'zero';
  return { label: e.label, cls };
}

export default function MesuresPLFSS() {
  const [rows, setRows] = useState<MesureRow[] | null>(null);
  const [error, setError] = useState('');
  useEffect(() => {
    let cancelled = false;
    (async () => {
      const r = await query<MesureRow>(
        `SELECT branche, article, intitule, montant_md, effet, annee, source_page, note
         FROM fact_mesures_plfss
         ORDER BY CASE effet
            WHEN 'economie' THEN 1 WHEN 'recette' THEN 2 WHEN 'depense' THEN 3
            WHEN 'transfert' THEN 4 WHEN 'objectif' THEN 5 ELSE 6 END,
           ABS(montant_md) DESC`
      );
      if (!cancelled) setRows(r);
    })().catch((e) => { if (!cancelled) setError(String(e)); });
    return () => { cancelled = true; };
  }, []);

  if (error) return <p role="alert">Mesures indisponibles : {error}</p>;
  if (!rows) return <p role="status">Chargement des mesures PLFSS…</p>;
  if (rows.length === 0) return null;

  return (
    <div className="panel">
      <div className="panel-head">
        <h3>Des exemples de mesures pour la Sécurité sociale, par branche</h3>
      </div>
      <p className="hint">
        Le PLFSS (projet de loi de financement de la Sécurité sociale) est distinct du budget de
        l’État. Chaque ligne décrit une mesure et son montant tel qu’il est présenté dans le
        document ; une mesure peut concerner une année différente de 2027. Ces exemples ne
        détaillent pas les 43 Md€ : la répartition précise entre l’État et la Sécurité sociale n’est
        pas publiée. Les données ont été relevées dans le texte soumis au Conseil des ministres
        (NOR CPPX2620963L/Bleue-1).
      </p>
      <p className="hint">
        Les mesures peuvent se recouper : additionner les lignes donnerait un total trompeur. Les
        montants ne représentent pas tous la même chose : économies, recettes ou dépenses en plus.
      </p>
      <button className="plfss-export export-btn" onClick={() => downloadCsv('mesures-plfss.csv', rows.map((r) => ({ ...r, scope: 'securite_sociale', unite: 'Md€', source_document: 'PLFSS_2027_web.pdf', qualite_extraction: 'curation_sourcee_non_additive' })))}>Télécharger les mesures et leurs sources (CSV, sans total)</button>
      <div className="tbl-wrap" role="region" tabIndex={0} aria-label="Mesures PLFSS, défilement horizontal possible">
        <table className="tbl plfss-table">
          <caption>Mesures du projet de budget de la Sécurité sociale. Les montants sont en Md€ ; l’année et la page source sont indiquées pour chaque mesure. Ne pas additionner les lignes : elles peuvent se recouper.</caption>
          <thead>
            <tr>
              <th>Branche</th>
              <th>Mesure (art. · année)</th>
              <th>Nature</th>
              <th>Montant</th>
              <th>Source</th>
            </tr>
          </thead>
          <tbody>
            {rows.map((r, i) => {
              const b = badge(r);
              return (
                <tr key={i} title={r.note}>
                  <td className="name-cell">{r.branche}</td>
                  <td className="name-cell">
                    {r.intitule}
                    <span className="mes-meta">
                      {' '}
                      {r.article !== '—' ? `· ${r.article} ` : ''}· {r.annee}
                    </span>
                    {r.note && <div className="mes-note">{r.note}</div>}
                  </td>
                  <td className="num">
                    <span className={`badge ${b.cls}`}>{b.label}</span>
                  </td>
                  <td className="num">
                    <b>{fmt(r.montant_md)}</b>
                  </td>
                  <td className="num"><a href={plfssPageUrl(r.source_page)} target="_blank" rel="noreferrer" aria-label={`PLFSS, page ${r.source_page}, nouvel onglet`}>p. {r.source_page}</a></td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>
      <p className="mes-warning">
        <b>Pourquoi ne pas additionner ces lignes ?</b> Certaines mesures se prolongent d’une année
        à l’autre, et les montants peuvent décrire des effets différents. À titre de repère, le
        document prévoit un solde de <b>−12,7 Md€</b> pour les régimes de base en 2027, soit une
        amélioration annoncée de <b>9,1 Md€</b> par rapport à 2026. Il mentionne aussi environ{' '}
        <b>9 Md€</b> de rendement des mesures sur les dépenses, plus de <b>6 Md€</b> de recettes
        nouvelles et environ <b>3 Md€</b> liés aux mesures prises en 2026. Ces repères ne s’ajoutent
        pas mécaniquement : ils peuvent porter sur des effets différents.
      </p>
    </div>
  );
}