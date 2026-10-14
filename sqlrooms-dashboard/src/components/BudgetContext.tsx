import { useEffect, useState } from 'react';
import { query } from '../duckdb';
import MesuresPLFSS from './MesuresPLFSS';
import { downloadCsv } from '../lib/csv';
import { contextLabels } from '../lib/labels';
import { publicUrl } from '../lib/publicUrl';

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
        {contextLabels.title}
      </h2>
      <p className="note">{contextLabels.intro}</p>
      <p className="note">
        <b>{contextLabels.notAdditive}</b>
      </p>
      {error && <p role="alert">Ces repères ne sont pas disponibles pour le moment : {error}</p>}
      <h3>Autres repères sur les finances publiques</h3>
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
                href={publicUrl(`sources/l17b3210_projet-loi.pdf#page=${r.source_page}`)}
                target="_blank"
                rel="noreferrer"
              >
                Voir la source, page {r.source_page} (nouvel onglet)
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
        Télécharger ces repères avec leurs sources (CSV)
      </button>
      <section aria-labelledby="plfss-title">
        <h3 id="plfss-title">{contextLabels.plfssTitle}</h3>
        <p className="hint">{contextLabels.plfssExplanation}</p>
        <MesuresPLFSS />
      </section>
    </section>
  );
}
