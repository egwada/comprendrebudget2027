import '../styles.css';
import { publicUrl } from '../lib/publicUrl';
import { plfPageUrl, plfssPageUrl } from '../lib/sourceLinks';

const TERMS = [
  [
    'Crédits prévus',
    'Sommes inscrites dans un projet ou un budget voté. Elles indiquent ce qui est autorisé ou prévu, pas ce qui a déjà été payé.',
  ],
  [
    'Crédits de paiement (CP)',
    'Montant maximal que l’État peut payer pendant l’année au titre du budget concerné. C’est la vue affichée par défaut.',
  ],
  [
    'Autorisations d’engagement (AE)',
    'Montant maximal des dépenses que l’État peut engager. Leur paiement peut s’étaler sur plusieurs années. Les AE et les CP décrivent deux aspects différents du budget : ne les additionnez pas.',
  ],
  [
    'Mission',
    'Grand domaine du budget, par exemple l’enseignement ou la défense. Une mission rassemble plusieurs programmes ; certaines regroupent aussi des remboursements d’impôts ou des charges financières.',
  ],
  ['Programme', 'Partie d’une mission qui rassemble des actions et les crédits prévus pour les financer. C’est le niveau de détail affiché dans la fiche d’un domaine.'],
  [
    'LFI',
    'Loi de finances initiale : le budget de départ voté par le Parlement pour l’année. Il peut ensuite être modifié.',
  ],
  ['PLF', 'Projet de loi de finances : proposition de budget présentée au Parlement. Elle n’est pas encore votée et peut changer.'],
  [
    'Dépenses exécutées',
    'Argent effectivement payé ou utilisé. Les crédits du PLF indiquent des montants prévus, pas les dépenses exécutées ; des séries historiques distinctes sont présentées dans la section solde et dette.',
  ],
  [
    'Mesures de redressement',
    'Mesures auxquelles le document attribue un effet sur les finances publiques par rapport à une situation de référence. Cela ne signifie pas toujours que les crédits d’un domaine baissent.',
  ],
  [
    'Dépense sous norme',
    'Mesure de dépenses qui suit des règles et un périmètre particuliers. Elle ne correspond pas au total du budget général affiché ici et exclut notamment la charge de la dette.',
  ],
  [
    'Charge de la dette',
    'Coût budgétaire lié à la dette. Il peut comprendre les intérêts, l’indexation et d’autres éléments ; il ne correspond pas nécessairement aux seuls intérêts payés.',
  ],
  [
    'Remboursement du principal',
    'Remboursement du montant emprunté lorsqu’une dette arrive à échéance. C’est un flux de financement, distinct des intérêts, et il ne s’ajoute pas aux dépenses ordinaires.',
  ],
];

export default function Methodology() {
  return (
    <div className="page">
      <a className="skip-link" href="#methodologie">
        Aller au contenu
      </a>
      <header className="hero">
        <h1>Comprendre les chiffres du budget</h1>
        <p>Leur origine, leur signification et les limites de ce qu’on peut en conclure</p>
      </header>
      <nav className="toolbar" aria-label="Navigation">
        <a href={publicUrl('?vue=accueil')}>← Retour au tableau de bord</a>
        <a href="#glossaire">Aller au glossaire</a>
      </nav>
      <main id="methodologie" tabIndex={-1}>
        <section className="panel">
          <h2>D’où viennent les chiffres ?</h2>
          <p>
            Les crédits prévisionnels sont extraits du projet de loi de finances pour 2027 publié
            sur le site de l’Assemblée nationale. Ce tableau de bord est une présentation indépendante
            des documents sources ; il décrit des crédits proposés, pas des dépenses déjà exécutées.
          </p>
          <ul>
            <li>
              <a href={plfPageUrl(307)} target="_blank" rel="noreferrer">
                PLF 2027 de l’Assemblée nationale, récapitulatif général, pages 307–313 (nouvel onglet)
              </a>{' '}
              : crédits des missions et programmes. Rapport général, pages 11–13 : chiffres de
              contexte.
            </li>
            <li>
              <a href={plfssPageUrl(106)} target="_blank" rel="noreferrer">
                PLFSS_2027_web.pdf, source officielle du ministère du Budget (nouvel onglet)
              </a>{' '}
              : mesures documentées, articles et exposés des motifs (pages 45 et 106–121).
            </li>
          </ul>
        </section>
        <section className="panel">
          <h2>Ce que les montants permettent de comprendre</h2>
          <p>
            Les montants présentés correspondent aux crédits prévus dans le PLF 2027. Ils ne
            représentent pas encore les dépenses effectivement réalisées.
          </p>
          <p>
            Pour comparer les années, le tableau met côte à côte le budget voté pour 2026 et le
            projet pour 2027. Les montants sont en euros courants : l’inflation n’est pas prise en
            compte. Les paiements prévus (CP) et les engagements autorisés (AE) décrivent deux
            aspects différents ; il ne faut pas les additionner.
          </p>
          <ul>
            <li>
              <b>Budget général</b> : les crédits des 32 grands domaines de l’État, remboursements
              et dégrèvements d’impôts compris. Une partie du total correspond donc à des
              remboursements, pas au financement direct d’un service public.
            </li>
            <li>
              <b>Administrations publiques</b> : ensemble plus large que l’État, qui comprend aussi
              les collectivités locales et la Sécurité sociale.
            </li>
            <li>
              <b>PLFSS</b> : projet de budget de la Sécurité sociale. Il est distinct du projet de
              budget de l’État (PLF).
            </li>
            <li>
              <b>Dépenses réellement effectuées</b> : ces données ne sont pas disponibles ici. Un
              montant prévu ne garantit donc pas qu’il sera dépensé en totalité.
            </li>
          </ul>
          <p>
            Les 43 Md€ correspondent aux mesures annoncées dans les projets de budget 2027 de l’État
            et de la Sécurité sociale. Les 54 Md€ comprennent aussi 11 Md€ liés à des mesures prises
            en 2026 ou avant. Ce sont des repères sur les finances publiques au sens large, pas une
            hausse du seul budget général entre 2026 et 2027. Les 43 Md€ sont déjà compris dans les
            54 Md€ : ne les additionnez pas.
          </p>
          <p>
            Les documents ne précisent pas la part exacte des mesures qui revient à l’État et à la
            Sécurité sociale. Les lignes du PLFSS peuvent aussi se recouper. Un objectif de dépense,
            un transfert de dette, une recette et un solde sont des types de chiffres différents ;
            les additionner ne donne pas un total utile.
          </p>
        </section>
        <section className="panel">
          <h2>Solde public, intérêts et remboursement de la dette</h2>
          <p>
            La série historique du solde provient de la base AMECO de la Commission européenne
            (code FRA.1.0.319.0.UBLGE), pour 1974–2024. Elle mesure le solde net de financement des
            <b> administrations publiques</b> selon la procédure de déficit excessif : elle comprend
            l’État, les collectivités locales et la Sécurité sociale. Elle ne décrit donc pas le
            seul budget de l’État. Dans cette série, le dernier solde non déficitaire est celui de
            1974 ; les observations de 1975 à 2024 sont négatives. Les séries AMECO peuvent être
            révisées.
          </p>
          <p>
            <a
              href="https://economy-finance.ec.europa.eu/economic-research-and-databases/economic-databases/ameco-database/download-annual-data-set-macro-economic-database-ameco_en"
              target="_blank"
              rel="noreferrer"
            >
              Consulter et télécharger la base AMECO (Commission européenne)
            </a>
            . Les intérêts et l’encours présentés dans les graphiques relèvent eux aussi des APU et
            des comptes nationaux ; ils ne sont pas les seuls chiffres budgétaires de l’État.
          </p>
          <p>
            Une série INSEE distincte (001717255) montre le solde exécuté du budget général de l’État
            pour 2009–2025, en retenant l’observation de décembre de chaque année complète. Elle ne
            remonte pas à 1974 ; les comptes spéciaux sont publiés dans une autre série et l’année
            2026, incomplète, est exclue.{' '}
            <a href="https://www.insee.fr/fr/statistiques/serie/001717255" target="_blank" rel="noreferrer">
              Consulter la série INSEE (nouvel onglet)
            </a>
            .
          </p>
          <p>
            Le tableau de financement de l’État provient du rapport de la Cour des comptes sur les
            résultats et la gestion budgétaire 2024 (synthèse p. 6 et tableau 1, pages imprimées
            14–15 ; données de
            l’Agence France Trésor). Il distingue le principal amorti, le nominal remboursé,
            l’indexation, les émissions à moyen/long terme nettes des rachats et, quand la source les publie, les
            intérêts payés et la charge totale de la dette. Les valeurs d’intérêts et de charge
            totale pour 2019–2022 ne sont pas publiées dans ce tableau : elles restent manquantes,
            et non égales à zéro.
          </p>
          <p>
            Rembourser le principal est une opération de financement et non une dépense ordinaire à
            ajouter aux crédits. Les intérêts, le principal, les émissions et l’encours sont des
            notions différentes.{' '}
            <a
              href={publicUrl('sources/neb-2024-gestion-dette-tresorerie-etat.pdf')}
              target="_blank"
              rel="noreferrer"
            >
              Lire le rapport source de la Cour des comptes (PDF)
            </a>
            .
          </p>
          <p>
            Cette série historique documente le solde des administrations publiques, mais ne permet
            pas à elle seule d’affirmer que le seul budget de l’État n’a pas été à l’équilibre depuis
            1974. Les crédits prévisionnels du PLF 2027 restent distincts de ces données historiques
            d’exécution.
          </p>
          <p>
            La mission « Engagements financiers de l’État » est signalée par un accent bleu et un
            lien « Voir le détail de la dette et des intérêts ». C’est un repère de navigation vers
            ses programmes, pas une alerte ni une appréciation de leur importance.
          </p>
        </section>
        <section className="panel">
          <h2>Comment lire les totaux, les parts et les différences ?</h2>
          <p>
            Pour chaque domaine, le chiffre principal reprend le total publié dans le document. La
            fiche détaille ensuite les programmes qui composent ce domaine. Un contrôle compare la
            somme de ces programmes au total publié ; si les montants diffèrent, l’écart est signalé
            sans remplacer le chiffre du document.
          </p>
          <p>
            Les pourcentages et la répartition « pour 100 € » sont calculés à partir des crédits
            prévus pour 2027. Une recherche réduit la liste et recalcule les totaux de la page. Dans
            la fiche d’un domaine, sa part reste calculée sur le budget général complet. Les repères
            sur la Sécurité sociale et les finances publiques ne changent pas avec ces filtres.
          </p>
          <p>
            Lorsqu’une case est vide dans le récapitulatif, elle est traitée comme zéro et signalée
            dans les données brutes. Cela peut correspondre à un programme nouveau, ancien ou sans
            crédits cette année. Les lignes coupées entre plusieurs pages sont reconstituées ; une
            nouvelle version du document devra être vérifiée à nouveau.
          </p>
          <p>
            Les montants affichés en milliards ou en millions et les pourcentages sont arrondis : les
            parts peuvent donc ne pas totaliser exactement 100 %. Les fichiers CSV donnent les
            montants en euros et les pages sources. Les données brutes contiennent à la fois les
            totaux et les programmes : les additionner ensemble compterait certaines sommes deux fois.
          </p>
        </section>
        <section id="glossaire" className="panel">
          <h2>Quelques mots du budget, expliqués simplement</h2>
          <dl className="glossary">
            {TERMS.map(([term, definition]) => (
              <div key={term}>
                <dt>{term}</dt>
                <dd>{definition}</dd>
              </div>
            ))}
          </dl>
          <p>
            Ces définitions aident à lire les tableaux et les documents sources. Md€ signifie
            milliards d’euros ; M€ signifie millions d’euros.
          </p>
        </section>
      </main>
      <footer className="src">
        Méthode documentée dans docs/contrat-donnees.md et ADR-005. Aucun chiffre d’exécution ni
        ventilation PLF/PLFSS n’est inventé.
      </footer>
    </div>
  );
}
