import type { MissionRow } from '../components/Dashboard';

export function downloadCsv(filename: string, rows: Record<string, unknown>[]) {
  if (!rows.length) return;
  const headers = Object.keys(rows[0]);
  const escape = (v: unknown) => {
    const text = String(v ?? '');
    // Neutralise les formules de tableur dans les champs textuels.
    const safe = typeof v === 'string' && /^[=+\-@\t\r]/.test(text) ? `'${text}` : text;
    return `"${safe.replaceAll('"', '""')}"`;
  };
  const csv = '\uFEFF' + [headers.map(escape).join(','), ...rows.map((r) => headers.map((h) => escape(r[h])).join(','))].join('\r\n') + '\r\n';
  const url = URL.createObjectURL(new Blob([csv], { type: 'text/csv;charset=utf-8' }));
  const a = document.createElement('a');
  a.href = url;
  a.download = filename;
  document.body.append(a);
  a.click();
  a.remove();
  setTimeout(() => URL.revokeObjectURL(url), 1000);
}

export function exportCredits(data: MissionRow[], creditType: 'CP' | 'AE', parent?: string) {
  downloadCsv(parent ? 'programmes-budget.csv' : 'missions-budget.csv', data.flatMap((r) => [2026, 2027].map((year) => ({
    scope: 'budget_general', nature: 'credits_prevus', annee: year,
    type_credit: creditType, mission: parent ?? r.mission,
    programme: parent ? r.mission : '(total mission)',
    montant: year === 2026 ? r.y2026 : r.y2027,
    unite: 'EUR', source_document: 'l17b3210_projet-loi.pdf', source_page: r.source_pages,
    qualite_extraction: 'agregat_extraction_pdf',
  }))));
}
