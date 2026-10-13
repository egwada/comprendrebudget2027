import { useEffect, useState } from 'react';
import { query } from '../duckdb';
import { downloadCsv } from '../lib/csv';

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

/** Libellés FR + classes de badge par nature de la mesure (sémantique finances publiques). */
const EFFET: Record<string, { label: string; cls: string }> = {
  economie: { label: 'économies', cls: 'down' }, // vert : baisse des dépenses
  recette: { label: 'recettes nouvelles', cls: 'down' }, // vert : amélioration du solde
  depense: { label: 'dépense en plus', cls: 'up' }, // rouge : hausse des dépenses
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
        <h3>Mesures de redressement — sécurité sociale (PLFSS 2027)</h3>
      </div>
      <p className="hint">
        Mesures documentées sur le périmètre sécurité sociale, branche par branche.
        Elles ne constituent pas une ventilation chiffrée des 43 Md€. Ventilation exacte PLF / PLFSS{' '}
        <b>non publiée</b> à ce stade — chiffres curation page par page depuis le texte soumis
        au Conseil des ministres (NOR CPPX2620963L/Bleue-1).
      </p>
      <button className="plfss-export export-btn" onClick={() => downloadCsv('mesures-plfss.csv', rows.map((r) => ({ ...r, scope: 'securite_sociale', unite: 'Md€', source_document: 'plfss_2027_texte.pdf', qualite_extraction: 'curation_sourcee_non_additive' })))}>Exporter les mesures documentées en CSV (sans total)</button>
      <div className="tbl-wrap" role="region" tabIndex={0} aria-label="Mesures PLFSS, défilement horizontal possible">
        <table className="tbl plfss-table">
          <caption>Mesures PLFSS — montants en Md€, années indiquées par ligne, périmètre sécurité sociale. Ne pas additionner.</caption>
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
                  <td className="num"><a href={`/sources/plfss_2027_texte.pdf#page=${r.source_page}`} target="_blank" rel="noreferrer" aria-label={`PLFSS, page ${r.source_page}, nouvel onglet`}>p. {r.source_page}</a></td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>
      <p className="mes-warning">
        ⚠︎ Les lignes se recoupent (montée en charge des mesures 2026, montants encaissés vs
        rendement…) : <b>ne pas additionner</b>. Repères publiés : solde des régimes de base{' '}
        <b>−12,7 Md€</b> en 2027, soit <b>+9,1 Md€ d’amélioration</b> vs 2026, dont ~{' '}
        <b>9 Md€</b> de rendement des mesures sur les dépenses et <b>plus de 6 Md€</b> de recettes
        nouvelles (plus ~3 Md€ de reprise en base des mesures 2026).
      </p>
    </div>
  );
}