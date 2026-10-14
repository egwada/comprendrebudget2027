export type View = 'accueil' | 'budget' | 'dette' | 'contexte';
const ALL_VIEWS: View[] = ['accueil', 'budget', 'dette', 'contexte'];

export function isView(v: string): v is View {
  return ALL_VIEWS.includes(v as View);
}

interface NavigationProps {
  active: View;
  onNavigate: (view: View) => void;
}

const tabs: { key: View; label: string }[] = [
  { key: 'accueil', label: 'Accueil' },
  { key: 'budget', label: 'Budget de l’État' },
  { key: 'dette', label: 'Solde et dette' },
  { key: 'contexte', label: 'Mesures et contexte' },
];

export default function Navigation({ active, onNavigate }: NavigationProps) {
  return (
    <nav className="tab-nav" aria-label="Navigation principale">
      <div className="tab-list">
        {tabs.map((t) => (
          <a
            key={t.key}
            href={`?vue=${t.key}`}
            className={`tab-link ${active === t.key ? 'tab-active' : ''}`}
            aria-current={active === t.key ? 'page' : undefined}
            onClick={(e) => {
              e.preventDefault();
              onNavigate(t.key);
            }}
          >
            {t.label}
          </a>
        ))}
        <a className="tab-link tab-secondary" href="/?page=methodologie">
          Méthode
        </a>
      </div>
    </nav>
  );
}
