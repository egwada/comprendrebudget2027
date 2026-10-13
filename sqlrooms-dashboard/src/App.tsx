import { useEffect, useState } from 'react';
import { initDuckDB } from './duckdb';
import Dashboard from './components/Dashboard';
import Methodology from './components/Methodology';

const methodologyPage = new URLSearchParams(location.search).get('page') === 'methodologie';

function App() {
  const [ready, setReady] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (methodologyPage) return;
    let cancelled = false;
    initDuckDB()
      .then(() => {
        if (!cancelled) setReady(true);
      })
      .catch((e) => {
        if (!cancelled) setError(e?.message || String(e));
      });
    return () => {
      cancelled = true;
    };
  }, []);

  if (methodologyPage) return <Methodology />;

  if (error) {
    return (
      <div style={{ padding: 20 }}>
        <h2>❌ Erreur au lancement</h2>
        <p style={{ color: 'red', fontFamily: 'monospace' }}>{error}</p>
        <p style={{ color: '#666' }}>
          Ouvre la console du navigateur (F12 → Console) pour les logs{' '}
          <code>[DUCKDB]</code> de diagnostic.
        </p>
      </div>
    );
  }

  if (!ready) {
    return (
      <div style={{ padding: 20 }}>
        <div>Chargement de DuckDB… (module WASM ~34 Mo)</div>
      </div>
    );
  }

  return <Dashboard />;
}

export default App;