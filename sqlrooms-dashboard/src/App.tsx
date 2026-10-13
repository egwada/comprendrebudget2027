import { useEffect, useState } from 'react';
import { initDuckDB } from './duckdb';
import Dashboard from './components/Dashboard';

function App() {
  const [ready, setReady] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [logs, setLogs] = useState<string[]>([]);

  useEffect(() => {
    const origLog = console.log;
    const origErr = console.error;
    const captured: string[] = [];

    console.log = (...args: any[]) => {
      const msg = args.map((a) => (typeof a === 'object' ? JSON.stringify(a) : String(a))).join(' ');
      if (msg.startsWith('[DUCKDB]')) captured.push(msg);
      origLog.apply(console, args);
    };
    console.error = (...args: any[]) => {
      const msg = args.map((a) => (typeof a === 'object' ? JSON.stringify(a) : String(a))).join(' ');
      if (msg.startsWith('[DUCKDB]')) captured.push('ERR: ' + msg);
      origErr.apply(console, args);
    };

    initDuckDB()
      .then(() => {
        setLogs([...captured]);
        setReady(true);
      })
      .catch((e) => {
        setLogs([...captured, 'ERR: ' + String(e.message || e)]);
        setError(e.message || String(e));
      });

    return () => {
      console.log = origLog;
      console.error = origErr;
    };
  }, []);

  if (error) {
    return (
      <div style={{ padding: 20, color: 'red' }}>
        <h2>❌ Erreur au lancement</h2>
        <p>{error}</p>
        <details>
          <summary>Logs de diagnostic</summary>
          <pre style={{ background: '#f5f5f5', padding: 10, fontSize: 12 }}>
            {logs.join('\n') || 'Aucun log capturé'}
          </pre>
        </details>
      </div>
    );
  }
  if (!ready) {
    return (
      <div style={{ padding: 20 }}>
        <div>Chargement de DuckDB...</div>
        {logs.length > 0 && (
          <pre style={{ background: '#f5f5f5', padding: 10, fontSize: 12, marginTop: 10 }}>
            {logs.join('\n')}
          </pre>
        )}
      </div>
    );
  }

  return <Dashboard />;
}

export default App;
