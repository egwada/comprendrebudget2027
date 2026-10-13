import '../styles.css';

const TERMS = [
  ['Crédits prévus', 'Montants autorisés ou demandés dans un texte budgétaire, pas des dépenses déjà réalisées.'],
  ['Crédits de paiement (CP)', 'Limite des paiements pouvant être effectués pendant l’année. C’est la vue citoyenne par défaut.'],
  ['Autorisations d’engagement (AE)', 'Limite des engagements pouvant être pris, parfois payés sur plusieurs années. Ne pas additionner AE et CP.'],
  ['Mission', 'Grand ensemble de programmes contribuant à une politique publique ; certaines missions financent des remboursements fiscaux ou des charges financières.'],
  ['Programme', 'Regroupement d’actions et de moyens au sein d’une mission.'],
  ['LFI', 'Loi de finances initiale : budget voté pour l’année, avant ses modifications éventuelles.'],
  ['PLF', 'Projet de loi de finances : budget proposé, pas encore une loi votée.'],
  ['Dépenses exécutées', 'Dépenses effectivement réalisées. Aucune donnée d’exécution n’est disponible dans ce prototype.'],
  ['Mesures de redressement', 'Mesures améliorant les finances publiques par rapport à une référence définie par le document, pas nécessairement une baisse des crédits entre deux budgets.'],
  ['Dépense sous norme', 'Indicateur de pilotage sur un périmètre spécifique (PDE), différent du budget général brut, ici hors charge de la dette (PLF p. 13).'],
];

export default function Methodology() {
  return <div className="page">
    <a className="skip-link" href="#methodologie">Aller au contenu</a>
    <header className="hero"><h1>Méthodologie et glossaire budgétaire</h1><p>Prototype citoyen — sources locales et limites de lecture</p></header>
    <nav className="toolbar" aria-label="Navigation"><a href="/">← Retour au tableau de bord</a><a href="#glossaire">Aller au glossaire</a></nav>
    <main id="methodologie" tabIndex={-1}>
      <section className="panel"><h2>Sources et caractère de démonstration</h2><p>Le PLF 2027 fourni est un document fictif / simulé (ADR-001). Ce prototype n’est pas une publication gouvernementale et ses chiffres ne sont pas un budget officiel réel.</p>
        <ul><li><a href="/sources/l17b3210_projet-loi.pdf#page=307">PDF PLF 2027, récapitulatif général, pages 307–313</a> : crédits des missions et programmes. Rapport général, pages 11–13 : chiffres de contexte.</li><li><a href="/sources/plfss_2027_texte.pdf#page=106">PDF PLFSS 2027 local</a> : mesures documentées, articles et exposés des motifs (pages 45 et 106–121). Leur disponibilité locale ne constitue pas une vérification indépendante de leur authenticité.</li></ul>
      </section>
      <section className="panel"><h2>Prévision, comparaison et périmètres</h2><p>Les montants présentés correspondent aux crédits prévus dans le PLF 2027. Ils ne représentent pas encore les dépenses effectivement réalisées.</p><p>La comparaison porte sur la LFI 2026 et le PLF 2027, en euros courants : ce n’est pas une évolution corrigée de l’inflation. Les CP portent sur les paiements de l’année ; les AE sur les engagements. Ils ne s’additionnent pas.</p><ul><li><b>Budget général</b> : crédits bruts des 32 missions, remboursements et dégrèvements inclus. Les remboursements d’impôts ne constituent pas des services publics directement financés.</li><li><b>Administrations publiques</b> : périmètre plus large, incluant État, collectivités et sécurité sociale.</li><li><b>PLFSS</b> : financement de la sécurité sociale, distinct du budget général.</li><li><b>Exécution future</b> : hors données disponibles.</li></ul><p>Les 43 Md€ concernent les textes financiers PLF + PLFSS. Les 54 Md€ agrègent un périmètre plus large et une trajectoire à politique inchangée. Ils ne correspondent pas à la variation des crédits du seul budget général entre 2026 et 2027.</p><p>La ventilation exacte PLF / PLFSS est non publiée dans les documents disponibles. Les mesures PLFSS peuvent se recouper : ne pas additionner leurs lignes. Les objectifs de dépenses, transferts de dette et soldes sont des natures différentes des économies.</p></section>
      <section className="panel"><h2>Calculs, filtres et qualité</h2><p>Les KPI et agrégats mission utilisent exclusivement les lignes « total mission » imprimées. Le détail utilise les lignes programmes. Un contrôle compare les deux, pour chaque mission, année et type de crédits. Les écarts sont affichés dans la fiche mission et la vue experte, sans remplacer les totaux imprimés.</p><p>Les parts et la lecture « pour 100 € » utilisent les crédits 2027 des missions affichées. Une recherche filtre aussi les KPI. La fiche mission indique sa part du budget général complet, indépendamment de la recherche. Les cartes de contexte et mesures PLFSS ne dépendent pas des filtres de crédits.</p><p>L’extraction positionnelle conserve les cellules vides comme zéros marqués « cellules_vides_zero » (programmes nouveaux, anciens ou sans crédits). Les libellés multi-lignes et les missions traversant plusieurs pages sont assemblés. Le contrôle actuel réconcilie les quatre colonnes ; une autre édition du PDF nécessite une nouvelle validation.</p><p>Les arrondis visuels (Md€, M€, pourcentages) peuvent empêcher les parts affichées de sommer exactement à 100. Les CSV fournissent les montants entiers en euros et les pages sources. Les fichiers bruts contiennent totaux et programmes : ne jamais les sommer indistinctement.</p></section>
      <section id="glossaire" className="panel"><h2>Glossaire en langage simple</h2><dl className="glossary">{TERMS.map(([term, definition]) => <div key={term}><dt>{term}</dt><dd>{definition}</dd></div>)}</dl><p>Définitions de lecture adaptées aux tableaux PLF p. 307–313 et au rapport général p. 11–13. Md€ : milliards d’euros ; M€ : millions d’euros ; PLFSS : projet de loi de financement de la sécurité sociale.</p></section>
    </main>
    <footer className="src">Méthode documentée dans docs/contrat-donnees.md et ADR-005. Aucun chiffre d’exécution ni ventilation PLF/PLFSS n’est inventé.</footer>
  </div>;
}
