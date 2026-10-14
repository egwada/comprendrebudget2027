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

/** Mission mise en évidence pour rendre le détail de la dette plus découvrable. */
export const debtMissionName = 'Engagements financiers de l’État';
export const debtDetailCue = 'Voir le détail de la dette et des intérêts';

/** Intitulés et aides courtes des deux types de crédits. */
export const creditTypeLabels: Record<CreditType, { button: string; acronym: string; help: string }> = {
  CP: {
    button: 'Ce que l’État prévoit de payer en 2027',
    acronym: 'CP',
    help: 'CP (crédits de paiement) : sommes qui peuvent être payées pendant l’année.',
  },
  AE: {
    button: 'Ce que l’État peut engager en 2027',
    acronym: 'AE',
    help:
      'AE (autorisations d’engagement) : plafond des dépenses que l’État peut décider d’engager ; leur paiement peut s’étaler sur plusieurs années.',
  },
};

/** Aide visible sur les sigles et périmètres, placée sous les filtres. */
export const acronymHelp = {
  intro: 'Pour lire les chiffres :',
  LFI: 'LFI (loi de finances initiale) : le budget voté par le Parlement pour 2026.',
  PLF: 'PLF (projet de loi de finances) : le projet de budget pour 2027, qui n’est pas encore voté.',
  budgetGeneral:
    'Budget général : les crédits de l’État présentés ici, remboursements et dégrèvements d’impôts compris.',
};

/** Titres des quatre cartes KPI. */
export const kpiLabels: Record<CreditType, { total27: string; total26: string; change: string; first: string }> = {
  CP: {
    total27: 'Montant que l’État prévoit de payer en 2027',
    total26: 'Crédits votés pour 2026',
    change: 'Écart avec les crédits votés en 2026',
    first: 'Le domaine avec le montant prévu le plus élevé',
  },
  AE: {
    total27: 'Montant maximal que l’État peut engager en 2027',
    total26: 'Crédits votés pour 2026',
    change: 'Écart avec les crédits votés en 2026',
    first: 'Le domaine avec le montant prévu le plus élevé',
  },
};

export const kpiSubLabels = {
  total27: 'Pour le budget général, remboursements et dégrèvements d’impôts compris',
  total26: 'Même périmètre et même type de crédits qu’en 2027 (LFI)',
  first: 'Crédits prévus pour 2027',
};

/** Titres et explications des sections de la vue citoyenne. */
export const sectionLabels = {
  heroSub:
    'Explorez les crédits que l’État prévoit pour 2027, comparez-les au budget voté pour 2026 et découvrez ce que recouvre chaque domaine.',
  note:
    'Ces montants sont des prévisions du projet de budget 2027, pas l’argent déjà dépensé. Le Parlement doit encore voter ce projet. La comparaison avec 2026 ne tient pas compte de l’inflation.',
  top5: {
    title: 'Quels sont les cinq domaines avec le plus de crédits prévus ?',
    takeIntro: 'À retenir :',
    explore: 'Voir tous les domaines d’action',
  },
  hundred: {
    title: 'Si le budget faisait 100 €, quelle part correspondrait à chaque domaine ?',
    note:
      'C’est une façon de comparer les parts du budget, pas la part de vos impôts affectée individuellement à chaque domaine.',
    others: 'Tous les autres domaines',
  },
  ranking: {
    title: 'Quels domaines ont le plus de crédits prévus pour 2027 ?',
    explanation:
      'Chaque domaine correspond à une « mission » dans le budget. Une mission rassemble plusieurs programmes, c’est-à-dire les actions auxquelles les crédits sont attribués.',
    export: 'Télécharger le classement des domaines en CSV (avec pages sources)',
    empty: 'Aucun domaine ne correspond à votre recherche. Essayez un autre mot.',
  },
  detail: {
    kicker: 'Que recouvre ce domaine dans le budget ?',
    intro:
      'Dans le budget, ce domaine est appelé une « mission ». Le montant affiché regroupe les crédits de ses différents programmes.',
    reserve:
      'Les intitulés montrent comment les crédits sont répartis ; ils ne permettent pas, à eux seuls, de savoir quels résultats les politiques publiques ont obtenus.',
    back: '← Retour à la liste des domaines',
    facts: {
      amount: 'Crédits prévus en 2027',
      share: 'Part des crédits du budget général 2027',
      change: 'Différence avec les crédits votés en 2026',
      lines: 'Nombre de programmes de ce domaine',
    },
    programsTitle: 'Détail des actions financées dans',
    programsIntro:
      'Les lignes ci-dessous détaillent les programmes de ce domaine. Un programme regroupe des actions et les crédits prévus pour les financer.',
    export: 'Télécharger le détail des actions financées, avec leurs sources (CSV)',
  },
  expert: {
    toggle: 'Voir les données détaillées',
    toggleOff: 'Masquer les données détaillées',
    title: 'Les détails derrière les chiffres',
    explanation:
      'Cette vue permet de vérifier d’où viennent les chiffres : graphiques, lignes relevées dans les documents et contrôles entre les totaux imprimés et leurs détails.',
  },
  methodoLink: 'Comprendre les chiffres et leur méthode de calcul',
  search: 'Quel domaine souhaitez-vous explorer ?',
};

/** En-têtes de colonnes du tableau de classement. */
export const columnLabels = {
  mission: 'Domaine (mission dans le budget)',
  programme: 'Action financée (programme)',
  y2026: 'Crédits votés en 2026 (LFI)',
  y2027: 'Crédits prévus en 2027 (PLF)',
  evol: 'Évolution des crédits (%)',
  share: 'Part des crédits affichés',
  source: 'Document source',
};

/** Contexte budgétaire (cartes 43/54 Md€) et mesures PLFSS. */
export const contextLabels = {
  title: 'À quoi correspondent les montants de 43 et 54 Md€ ?',
  intro:
    'Les 43 Md€ regroupent les mesures annoncées dans les projets de budget 2027 de l’État et de la Sécurité sociale. Les 54 Md€ comprennent aussi 11 Md€ liés à des mesures prises en 2026 ou avant. Ces montants couvrent les administrations publiques, un périmètre plus large que le budget général présenté plus haut.',
  notAdditive:
    'Ces montants ne sont pas des crédits à ajouter au budget général. Les 43 Md€ sont déjà compris dans les 54 Md€ : ne les additionnez pas. Ils restent affichés même lorsque vous filtrez les domaines ou les types de crédits. La répartition précise entre l’État et la Sécurité sociale n’est pas publiée.',
  plfssTitle: 'Quelles mesures sont prévues pour la Sécurité sociale ?',
  plfssExplanation:
    'Le PLFSS est le projet de budget de la Sécurité sociale. Il est distinct du budget général de l’État ; les mesures ci-dessous ne détaillent donc pas les crédits des domaines affichés plus haut.',
  export: 'Télécharger les chiffres de contexte avec leurs sources (CSV)',
};
