import { lazy, Suspense, useEffect, useRef, useState, useCallback } from 'react';
import Methodology from './components/Methodology';
import Navigation from './components/Navigation';
import Home from './components/Home';
import { type View, isView } from './lib/views';

const Dashboard = lazy(() => import('./components/Dashboard'));
const BudgetContext = lazy(() => import('./components/BudgetContext'));
const SoldeEtDette = lazy(() => import('./components/SoldeEtDette'));

function getViewFromURL(): View {
  const params = new URLSearchParams(location.search);
  const v = params.get('vue');
  if (v && isView(v)) return v;
  // Avant l’ajout de ?vue=, les fiches mission étaient partagées en #mission=…
  if (new URLSearchParams(location.hash.slice(1)).has('mission')) return 'budget';
  return 'accueil';
}

export default function App() {
  const [view, setView] = useState<View>(getViewFromURL);
  const previousView = useRef(view);
  const [ready, setReady] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [mounted, setMounted] = useState<Record<View, boolean>>({
    accueil: true,
    budget: view === 'budget',
    dette: view === 'dette',
    contexte: view === 'contexte',
  });

  const methodologyPage = new URLSearchParams(location.search).get('page') === 'methodologie';

  useEffect(() => {
    if (methodologyPage) return;
    let cancelled = false;
    import('./duckdb')
      .then(({ initDuckDB }) => initDuckDB())
      .then(() => {
        if (!cancelled) setReady(true);
      })
      .catch((e) => {
        if (!cancelled) setError(e?.message || String(e));
      });
    return () => {
      cancelled = true;
    };
  }, [methodologyPage]);

  useEffect(() => {
    const onPop = () => {
      const next = getViewFromURL();
      setView(next);
      setMounted((prev) => (prev[next] ? prev : { ...prev, [next]: true }));
    };
    window.addEventListener('popstate', onPop);
    return () => window.removeEventListener('popstate', onPop);
  }, []);

  useEffect(() => {
    if (previousView.current === view) return;
    previousView.current = view;
    document.querySelector<HTMLAnchorElement>('.tab-link[aria-current="page"]')?.focus();
  }, [view]);

  const navigate = useCallback((next: View) => {
    const url = new URL(location.href);
    url.searchParams.set('vue', next);
    // keep hash (#mission=...) intact
    history.pushState(null, '', url.toString());
    setView(next);
    setMounted((prev) => (prev[next] ? prev : { ...prev, [next]: true }));
  }, []);

  if (methodologyPage) return <Methodology />;

  if (error) {
    return (
      <div className="page" style={{ padding: 20 }}>
        <h2>❌ Erreur au lancement</h2>
        <p style={{ color: 'red', fontFamily: 'monospace' }}>{error}</p>
        <p style={{ color: '#666' }}>
          Ouvre la console du navigateur (F12 → Console) pour les logs <code>[DUCKDB]</code> de
          diagnostic.
        </p>
      </div>
    );
  }

  if (!ready) {
    return (
      <div className="page" style={{ padding: 20 }}>
        <div>Chargement de DuckDB… (module WASM ~34 Mo)</div>
      </div>
    );
  }

  return (
    <div className="page">
      <a className="skip-link" href="#contenu">
        Aller au contenu
      </a>
      <header className="hero">
        <div className="hero-badge">Prototype indépendant · sources PLF et PLFSS 2027</div>
        <h1>Où va l’argent prévu par l’État en 2027 ?</h1>
        <p className="sub">
          Explorez les crédits, le solde public, la dette et les mesures budgétaires.
        </p>
      </header>
      <Navigation active={view} onNavigate={navigate} />
      {view !== 'accueil' && (
        <a
          className="back-home"
          href="?vue=accueil"
          onClick={(e) => {
            e.preventDefault();
            navigate('accueil');
          }}
        >
          ← Accueil
        </a>
      )}
      <main id="contenu" tabIndex={-1}>
        <div style={{ display: view === 'accueil' ? 'block' : 'none' }}>
          <Home onNavigate={navigate} />
        </div>

        {mounted.budget && (
          <div style={{ display: view === 'budget' ? 'block' : 'none' }}>
            <Suspense fallback={<p role="status">Chargement du budget…</p>}>
              <Dashboard />
            </Suspense>
          </div>
        )}

        {mounted.dette && (
          <div style={{ display: view === 'dette' ? 'block' : 'none' }}>
            <Suspense fallback={<p role="status">Chargement des séries historiques…</p>}>
              <SoldeEtDette />
            </Suspense>
          </div>
        )}

        {mounted.contexte && (
          <div style={{ display: view === 'contexte' ? 'block' : 'none' }}>
            <Suspense fallback={<p role="status">Chargement du contexte…</p>}>
              <BudgetContext />
            </Suspense>
          </div>
        )}
      </main>
      <footer className="src">
        Prototype indépendant. Les crédits affichés pour 2027 sont des prévisions du projet de loi
        de finances présenté au Parlement, et non des dépenses exécutées ; ils peuvent évoluer au
        cours de son examen. Sources des crédits : récapitulatif des domaines et programmes, pages
        307–313 du PLF 2027.
        <p className="currency-note">
          <b>ECU</b> signifie « unité de compte européenne ». AMECO exprime les années antérieures à
          1999 en ECU, puis les suivantes en euros (EUR) ; lors du passage à l’euro, 1 ECU = 1 EUR.
          Ces montants historiques ne sont pas corrigés de l’inflation.
        </p>
      </footer>
    </div>
  );
}
