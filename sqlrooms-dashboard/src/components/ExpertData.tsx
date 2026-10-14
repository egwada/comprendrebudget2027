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
      <h3>Vérifier les chiffres et consulter les données sources</h3>
      <p className="hint">
        Cette partie permet de retrouver les lignes relevées dans le document et de vérifier que
        leur somme correspond au total publié pour chaque domaine. Elle s’adresse surtout aux
        personnes qui souhaitent examiner le détail des calculs.
      </p>
      <p className="quality-summary">
        {gaps.length
          ? `${gaps.length} différences entre un total publié et la somme de ses programmes ont été repérées.`
          : 'Pour le type de crédits choisi, les totaux publiés correspondent à la somme des programmes en 2026 et en 2027.'}
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
        Dans le document, une case vide est traitée comme zéro et signalée dans les données brutes.
        Les fichiers téléchargés contiennent les totaux des domaines et le détail des programmes :
        ne les additionnez pas ensemble, car cela compterait certaines sommes deux fois.
      </p>
      {error && <p role="alert">Export indisponible : {error}</p>}
      <button
        className="raw-export"
        disabled={!raw.length}
        onClick={() => downloadCsv('credits-bruts.csv', raw)}
      >
        Télécharger les {raw.length} lignes de données en CSV (CP et AE, 2026 et 2027)
      </button>
      <details>
        <summary>Voir les lignes de données relevées et leurs sources</summary>
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
        <summary>Détails techniques des calculs (SQL)</summary>
        <pre>{`-- Agrégats mission : totaux imprimés exclusivement\nSELECT mission, annee, type_credit, SUM(montant) AS montant\nFROM fact_credits\nWHERE scope = 'budget_general' AND programme = '(total mission)'\nGROUP BY mission, annee, type_credit;\n\n-- Écart = total imprimé - somme des programmes\nSELECT * FROM v_qualite WHERE ecart != 0;`}</pre>
      </details>
    </div>
  );
}
