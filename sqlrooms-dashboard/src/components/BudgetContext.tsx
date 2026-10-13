import { useEffect, useState } from 'react';
import { query } from '../duckdb';
import MesuresPLFSS from './MesuresPLFSS';
import { downloadCsv } from '../lib/csv';

interface ContextRow {
  cle: string;
  libelle: string;
  valeur: number;
  unite: string;
  annee: number;
  perimetre: string;
  source_page: number;
  note: string;
}
const KEYS = [
  'total_efforts',
  'mesures_2027',
  'montee_en_charge',
  'depense_sous_norme',
  'deficit_public',
  'dette_publique',
];

export default function BudgetContext() {
  const [rows, setRows] = useState<ContextRow[]>([]);
  const [error, setError] = useState('');
  useEffect(() => {
    let cancelled = false;
    query<ContextRow>('SELECT * FROM dim_contexte')
      .then((r) => {
        if (!cancelled) setRows(r.sort((a, b) => KEYS.indexOf(a.cle) - KEYS.indexOf(b.cle)));
      })
      .catch((e) => {
        if (!cancelled) setError(String(e));
      });
    return () => {
      cancelled = true;
    };
  }, []);
  return (
    <section className="budget-context" aria-labelledby="context-title">
      <h2 id="context-title" className="section-title">
        Comprendre les 43 et 54 Md€ — des périmètres distincts
      </h2>
      <p className="note">
        Les 43 Md€ concernent les textes financiers PLF + PLFSS. Les 54 Md€ agrègent un périmètre
        plus large et une trajectoire à politique inchangée. Ils ne correspondent pas à la variation
        des crédits du seul budget général entre 2026 et 2027.
      </p>
      <p>
        Ces chiffres de contexte ne s’ajoutent pas aux crédits du budget général et ne sont pas
        affectés par les filtres CP / AE ou la recherche. La ventilation exacte PLF / PLFSS est{' '}
        <b>non publiée</b> dans les documents disponibles.
      </p>
      {error && <p role="alert">Contexte indisponible : {error}</p>}
      <h3>Les chiffres du rapport général</h3>
      <div className="ctx-grid">
        {rows.map((r) => (
          <article className="ctx-card" key={r.cle}>
            <div className="ctx-val">
              {r.valeur.toLocaleString('fr-FR', { maximumFractionDigits: 1 }).replace('-', '−')}{' '}
              <span className="ctx-unit">{r.unite}</span>
            </div>
            <h4 className="ctx-lib">{r.libelle}</h4>
            <p className="sub">
              {r.perimetre} · {r.annee} ·{' '}
              <a
                href={`/sources/l17b3210_projet-loi.pdf#page=${r.source_page}`}
                target="_blank"
                rel="noreferrer"
              >
                source p. {r.source_page} (PLF, nouvel onglet)
              </a>
              {r.note && <em> — {r.note}</em>}
            </p>
          </article>
        ))}
      </div>
      <button
        className="context-export export-btn"
        disabled={!rows.length}
        onClick={() =>
          downloadCsv(
            'contexte-budget.csv',
            rows.map((r) => ({
              ...r,
              source_document: 'l17b3210_projet-loi.pdf',
              qualite_extraction: r.cle === 'montee_en_charge' ? 'derive' : 'curation_sourcee',
            }))
          )
        }
      >
        Exporter les chiffres de contexte en CSV
      </button>
      <section aria-labelledby="plfss-title">
        <h3 id="plfss-title">Sécurité sociale — mesures documentées du PLFSS 2027</h3>
        <MesuresPLFSS />
      </section>
    </section>
  );
}
