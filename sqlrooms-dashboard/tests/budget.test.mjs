import test from 'node:test';
import assert from 'node:assert/strict';
import {
  fmtEUR,
  evolutionPct,
  evolutionLabel,
  evolutionPhrase,
  labelColorFor,
  colorFor,
} from '../src/lib/format.ts';
import { serializeCsv } from '../src/lib/csv.ts';

const luminance = (hex) => {
  const c = [1, 3, 5]
    .map((i) => parseInt(hex.slice(i, i + 2), 16) / 255)
    .map((n) => (n <= 0.04045 ? n / 12.92 : ((n + 0.055) / 1.055) ** 2.4));
  return c[0] * 0.2126 + c[1] * 0.7152 + c[2] * 0.0722;
};

test('montants français et unité explicite', () => {
  assert.equal(fmtEUR(615139875333), '615,1 Md€');
  assert.equal(fmtEUR(1000000), '1 M€');
  assert.equal(fmtEUR(0), '0 €');
  assert.equal(fmtEUR(NaN), '—');
});

test('évolution sans division par zéro et sans code couleur seul', () => {
  assert.equal(evolutionPct(0, 1), null);
  assert.equal(evolutionLabel(0, 1), 'Crédits prévus en 2027, aucun crédit voté en 2026');
  assert.equal(evolutionLabel(0, 0), 'Aucun crédit en 2026 ni en 2027');
  assert.equal(
    evolutionLabel(100, 110),
    '↑ Crédits en hausse de 10,0 % par rapport aux crédits votés en 2026'
  );
  assert.equal(
    evolutionLabel(100, 90),
    '↓ Crédits en baisse de 10,0 % par rapport aux crédits votés en 2026'
  );
  assert.equal(
    evolutionLabel(100, 100),
    '→ Montant inchangé par rapport aux crédits votés en 2026 (0 %)'
  );
  // Le libellé explicite ne dépend ni de la couleur ni du symbole seul.
  for (const label of [
    evolutionLabel(100, 110),
    evolutionLabel(100, 90),
    evolutionPhrase(100, 110),
    evolutionPhrase(100, 90),
  ]) {
    assert.ok(label.includes('2026'), label);
  }
  assert.equal(evolutionPhrase(100, 110), 'hausse des crédits par rapport à ceux votés en 2026');
  assert.equal(evolutionPhrase(100, 90), 'baisse des crédits par rapport à ceux votés en 2026');
  assert.equal(
    evolutionPhrase(0, 1),
    'aucun crédit voté en 2026 pour ce domaine'
  );
});

test('contraste des libellés treemap >= 4,5 sur toute la palette', () => {
  const seen = new Set();
  for (let i = 0; i < 100; i++) {
    const bg = colorFor(`mission-${i}`);
    const fg = labelColorFor(bg);
    seen.add(bg);
    const l1 = luminance(bg),
      l2 = luminance(fg);
    assert.ok((Math.max(l1, l2) + 0.05) / (Math.min(l1, l2) + 0.05) >= 4.5, `${fg} sur ${bg}`);
  }
  assert.equal(seen.size, 10);
});

test('CSV UTF-8, virgules, guillemets et nouvelles lignes échappés', () => {
  assert.equal(
    serializeCsv([{ mission: 'État, « exemple »\n"suite"', montant: 123 }]),
    '\uFEFF"mission","montant"\r\n"État, « exemple »\n""suite""","123"\r\n'
  );
  assert.equal(serializeCsv([]), '');
});

test('CSV neutralise les formules sans modifier les montants numériques négatifs', () => {
  const csv = serializeCsv([
    { libelle: '=1+1', solde: -12.7 },
    { libelle: '+commande', solde: 1 },
  ]);
  assert.ok(csv.includes('"\'=1+1","-12.7"'));
  assert.ok(csv.includes('"\'+commande","1"'));
});
