import { sectionLabels } from '../lib/labels';
import { publicUrl } from '../lib/publicUrl';
import type { View } from '../lib/views';

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
              if (e.button !== 0 || e.metaKey || e.ctrlKey || e.shiftKey || e.altKey) return;
              e.preventDefault();
              onNavigate(t.key);
            }}
          >
            {t.label}
          </a>
        ))}
        <a className="tab-link tab-secondary" href={publicUrl('?page=methodologie')}>
          {sectionLabels.methodoLink}
        </a>
      </div>
    </nav>
  );
}
