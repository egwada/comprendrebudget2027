import { useEffect, useState } from 'react';
import { query } from '../duckdb';
import type { QualityRow } from './MissionDetail';
import { downloadCsv } from '../lib/csv';
import { fmtEUR } from '../lib/format';

export default function ExpertData({ quality }: { quality: QualityRow[] }) {
  const [raw, setRaw] = useState<Record<string, unknown>[]>([]);
  const [error, setError] = useState('');
  useEffect(() => {
    let cancelled = false;
    query<Record<string, unknown>>(
      'SELECT * FROM fact_credits ORDER BY mission, programme, type_credit, annee'
    )
      .then((r) => {
        if (!cancelled) setRaw(r);
      })
      .catch((e) => {
        if (!cancelled) setError(String(e));
      });
    return () => {
      cancelled = true;
    };
  }, []);
  const gaps = quality.filter((q) => q.ecart !== 0);
  return (
    <div className="panel expert-data">
      <h3>Qualité d’extraction et données brutes</h3>
      <p className="quality-summary">
        {gaps.length
          ? `${gaps.length} écarts détectés entre totaux imprimés et programmes.`
          : 'Aucun écart entre les totaux imprimés et les programmes pour le type de crédits choisi (2026 et 2027).'}
      </p>
      {gaps.length > 0 && (
        <ul>
          {gaps.map((q) => (
            <li className="quality-alert" key={`${q.mission}-${q.annee}`}>
              {q.mission}, {q.annee}, {q.type_credit} : total imprimé {fmtEUR(q.total_mission)},
              programmes {fmtEUR(q.total_programmes)}, écart {q.ecart < 0 ? '−' : '+'}
              {fmtEUR(Math.abs(q.ecart))}.
            </li>
          ))}
        </ul>
      )}
      <p>
        Les cellules vides du récapitulatif valent zéro et sont marquées{' '}
        <code>cellules_vides_zero</code>. Les CSV bruts contiennent aussi les lignes totaux : ne pas
        additionner indistinctement les programmes et leurs totaux.
      </p>
      {error && <p role="alert">Export indisponible : {error}</p>}
      <button
        className="raw-export"
        disabled={!raw.length}
        onClick={() => downloadCsv('credits-bruts.csv', raw)}
      >
        Exporter les {raw.length} faits bruts en CSV (CP et AE, 2026 et 2027)
      </button>
      <details>
        <summary>Voir les faits bruts et leurs sources</summary>
        <div className="tbl-wrap" role="region" tabIndex={0} aria-label="Faits bruts">
          <table className="tbl">
            <caption>
              Extraction PDF complète — montants en euros, budget général, crédits prévus
            </caption>
            <thead>
              <tr>
                {Object.keys(raw[0] ?? {}).map((h) => (
                  <th scope="col" key={h}>
                    {h}
                  </th>
                ))}
              </tr>
            </thead>
            <tbody>
              {raw.map((r, i) => (
                <tr key={i}>
                  {Object.values(r).map((v, j) => (
                    <td key={j}>{String(v)}</td>
                  ))}
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </details>
      <details>
        <summary>SQL des agrégats et du contrôle qualité</summary>
        <pre>{`-- Agrégats mission : totaux imprimés exclusivement\nSELECT mission, annee, type_credit, SUM(montant) AS montant\nFROM fact_credits\nWHERE scope = 'budget_general' AND programme = '(total mission)'\nGROUP BY mission, annee, type_credit;\n\n-- Écart = total imprimé - somme des programmes\nSELECT * FROM v_qualite WHERE ecart != 0;`}</pre>
      </details>
    </div>
  );
}
