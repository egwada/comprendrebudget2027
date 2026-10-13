import { useEffect, useState } from 'react';
import { initDuckDB } from './duckdb';
import Dashboard from './components/Dashboard';

function App() {
  const [ready, setReady] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    initDuckDB()
      .then(() => setReady(true))
      .catch((e) => setError(e.message));
  }, []);

  if (error) return <div style={{ padding: 20, color: 'red' }}>Erreur: {error}</div>;
  if (!ready) return <div style={{ padding: 20 }}>Chargement de DuckDB...</div>;

  return <Dashboard />;
}

export default App;
