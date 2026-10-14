/**
 * Dictionnaire éditorial de la vue citoyenne (docs/plan-comprehension-citoyenne.md).
 *
 * Règle : un intitulé courant en premier, le terme budgétaire précis ensuite
 * (acronyme conservé entre parenthèses ou dans une aide visible). Les libellés
 * officiels des missions et programmes restent inchangés dans les données : ce
 * dictionnaire ne concerne que les titres, contrôles et explications d'interface.
 *
 * Tout libellé visible de la vue citoyenne doit passer par ici pour éviter les
 * variantes entre Dashboard, RankingTable, MissionDetail et BudgetContext.
 *
 * Libellés qui restent strictement conformes au document source (à ne pas
 * modifier via ce dictionnaire) : noms officiels des missions et programmes,
 * montants, années, périmètres (budget général, administrations publiques,
 * sécurité sociale), sources et pages PDF, contenu des exports CSV.
 */

export type CreditType = 'CP' | 'AE';

/** Intitulés et aides courtes des deux types de crédits. */
export const creditTypeLabels: Record<CreditType, { button: string; acronym: string; help: string }> = {
  CP: {
    button: 'Paiements que l’État prévoit de faire en 2027',
    acronym: 'CP',
    help: 'CP : paiements pouvant être effectués pendant l’année.',
  },
  AE: {
    button: 'Dépenses que l’État peut engager',
    acronym: 'AE',
    help: 'AE : engagements pouvant produire des paiements sur plusieurs années.',
  },
};

/** Aide visible sur les sigles et périmètres, placée sous les filtres. */
export const acronymHelp = {
  intro: 'Sigles utilisés :',
  LFI: 'LFI signifie loi de finances initiale — le budget voté pour l’année.',
  PLF: 'PLF signifie projet de loi de finances — le budget proposé, pas encore voté.',
  budgetGeneral:
    'Budget général : crédits des missions de l’État, remboursements et dégrèvements d’impôts compris.',
};

/** Titres des quatre cartes KPI. */
export const kpiLabels: Record<CreditType, { total27: string; total26: string; change: string; first: string }> = {
  CP: {
    total27: 'Total des paiements prévus en 2027',
    total26: 'Budget voté pour 2026',
    change: 'Ce qui change par rapport à 2026',
    first: 'Le domaine qui reçoit le plus de crédits',
  },
  AE: {
    total27: 'Total des dépenses que l’État peut engager',
    total26: 'Budget voté pour 2026',
    change: 'Ce qui change par rapport à 2026',
    first: 'Le domaine qui reçoit le plus de crédits',
  },
};

export const kpiSubLabels = {
  total27: 'Budget général, remboursements et dégrèvements compris',
  total26: 'LFI : loi de finances initiale — mêmes domaines et même type de crédits',
  first: 'Montant prévu en 2027',
};

/** Titres et explications des sections de la vue citoyenne. */
export const sectionLabels = {
  heroSub:
    'Budget général de l’État, y compris remboursements et dégrèvements d’impôts. Comparaison avec les crédits votés pour 2026.',
  note:
    'Les montants présentés correspondent aux crédits prévus dans le PLF 2027 (projet de loi de finances). Ils ne représentent pas encore les dépenses effectivement réalisées.',
  top5: {
    title: 'Les cinq domaines qui reçoivent le plus de crédits',
    takeIntro: 'À retenir :',
    explore: 'Voir tous les domaines d’action',
  },
  hundred: {
    title: 'Sur 100 € de budget prévu, quelle part revient à chaque domaine ?',
    note: 'Cette répartition ne correspond pas à l’usage individuel des impôts.',
    others: 'Autres missions',
  },
  ranking: {
    title: 'Les domaines d’action de l’État, du plus financé au moins financé',
    explanation:
      'Terme budgétaire : une mission regroupe plusieurs programmes — le nom officiel « mission » est conservé dans les tableaux et les sources.',
    export: 'Télécharger le classement des domaines en CSV (avec pages sources)',
    empty: 'Aucune mission ne correspond à la recherche.',
  },
  detail: {
    kicker: 'Que finance ce domaine ?',
    intro:
      'Le mot officiel « mission » est conservé : une mission regroupe plusieurs programmes qui contribuent à une politique publique.',
    reserve:
      'Lecture fondée sur les intitulés du récapitulatif, pas sur une évaluation des résultats.',
    back: '← Retour à la liste des domaines',
    facts: {
      amount: 'Crédits prévus en 2027',
      share: 'Part du budget général complet',
      change: 'Par rapport au budget voté en 2026',
      lines: 'Actions financées dans ce domaine (programmes)',
    },
    programsTitle: 'Programmes officiels de',
    programsIntro:
      'Chaque ligne ci-dessous est un programme : une action financée dans ce domaine.',
    export: 'Télécharger les programmes de cette mission en CSV (avec pages sources)',
  },
  expert: {
    toggle: 'Voir les données détaillées',
    toggleOff: 'Masquer les données détaillées',
    title: 'Données détaillées — vue experte',
    explanation:
      'Cette zone regroupe les graphiques, les lignes sources, les contrôles qualité et les requêtes. À quoi cela sert : vérifier le détail qui se trouve derrière chaque chiffre de la vue citoyenne.',
  },
  methodoLink: 'Comment les chiffres sont calculés',
  search: 'Rechercher un domaine d’action (mission)',
};

/** En-têtes de colonnes du tableau de classement. */
export const columnLabels = {
  mission: 'Domaine d’action (mission)',
  programme: 'Action financée (programme)',
  y2026: 'Voté 2026 (LFI)',
  y2027: 'Prévu 2027 (PLF)',
  evol: 'Par rapport à 2026',
  share: 'Part du budget affiché',
  source: 'Source PDF',
};

/** Contexte budgétaire (cartes 43/54 Md€) et mesures PLFSS. */
export const contextLabels = {
  title: 'Les 43 et 54 Md€ : deux périmètres, deux montants distincts',
  intro:
    'Les 43 Md€ concernent les textes financiers PLF + PLFSS. Les 54 Md€ agrègent un périmètre plus large et une trajectoire à politique inchangée. Ils ne correspondent pas à la variation des crédits du seul budget général entre 2026 et 2027.',
  notAdditive:
    'Ces chiffres de contexte ne s’ajoutent pas aux crédits du budget général et ne sont pas affectés par les filtres CP / AE ou la recherche. La ventilation exacte PLF / PLFSS est non publiée dans les documents disponibles.',
  plfssTitle: 'Mesures prévues pour la Sécurité sociale',
  plfssExplanation:
    'Le PLFSS (projet de loi de financement de la sécurité sociale) est un texte distinct du budget général de l’État.',
  export: 'Télécharger les chiffres de contexte en CSV (avec sources)',
};