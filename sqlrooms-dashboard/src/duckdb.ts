import * as duckdb from '@duckdb/duckdb-wasm';

let db: duckdb.AsyncDuckDB | null = null;
let conn: duckdb.AsyncDuckDBConnection | null = null;

/**
 * Cached init promise: guarantees a SINGLE initialization even when
 * React StrictMode double-invokes effects (dev) or several components
 * call initDuckDB() concurrently.
 */
let initPromise: Promise<duckdb.AsyncDuckDBConnection> | null = null;

async function doInit(): Promise<duckdb.AsyncDuckDBConnection> {
  console.log('[DUCKDB] Loading local bundles...');
  // Local files (same origin) — avoids cross-origin Worker restrictions
  const bundle: duckdb.DuckDBBundle = {
    mainModule: '/duckdb/duckdb-eh.wasm',
    mainWorker: '/duckdb/duckdb-browser-eh.worker.js',
    pthreadWorker: null,
  };

  const worker = new Worker(bundle.mainWorker!);
  const logger = new duckdb.ConsoleLogger();
  db = new duckdb.AsyncDuckDB(logger, worker);
  await db.instantiate(bundle.mainModule, bundle.pthreadWorker);
  console.log('[DUCKDB] WASM instantiated');

  const c = await db.connect();
  conn = c;

  // Load CSV
  console.log('[DUCKDB] Fetching CSV...');
  const csvText = await fetch('/data/fact_credits.csv').then((r) => {
    if (!r.ok) throw new Error(`HTTP ${r.status} pour /data/fact_credits.csv`);
    return r.text();
  });
  console.log('[DUCKDB] CSV fetched, length:', csvText.length);
  await db.registerFileText('fact_credits.csv', csvText);
  console.log('[DUCKDB] CSV registered');

  // Idempotent DDL — safe to re-run (StrictMode, HMR, refresh)
  await c.query(
    `CREATE OR REPLACE TABLE fact_credits AS FROM read_csv_auto('fact_credits.csv')`
  );
  console.log('[DUCKDB] Table created');

  // Contexte éditorial : chiffres du rapport général (cf. ADR-003)
  console.log('[DUCKDB] Fetching context CSV...');
  const ctxText = await fetch('/data/dim_contexte.csv').then((r) => {
    if (!r.ok) throw new Error(`HTTP ${r.status} pour /data/dim_contexte.csv`);
    return r.text();
  });
  await db.registerFileText('dim_contexte.csv', ctxText);
  await c.query(
    `CREATE OR REPLACE TABLE dim_contexte AS FROM read_csv_auto('dim_contexte.csv')`
  );
  console.log('[DUCKDB] Context table created');

  await c.query(`
    CREATE OR REPLACE VIEW v_missions_cp_2027 AS
    SELECT mission, SUM(montant) as total
    FROM fact_credits
    WHERE type_credit = 'CP' AND annee = 2027 AND programme != '(total mission)'
    GROUP BY mission
    ORDER BY total DESC
  `);

  await c.query(`
    CREATE OR REPLACE VIEW v_missions_cp_2026 AS
    SELECT mission, SUM(montant) as total
    FROM fact_credits
    WHERE type_credit = 'CP' AND annee = 2026 AND programme != '(total mission)'
    GROUP BY mission
    ORDER BY total DESC
  `);

  await c.query(`
    CREATE OR REPLACE VIEW v_compare_missions AS
    SELECT
      m2027.mission,
      m2026.total as cp_2026,
      m2027.total as cp_2027
    FROM v_missions_cp_2027 m2027
    LEFT JOIN v_missions_cp_2026 m2026 ON m2027.mission = m2026.mission
    ORDER BY m2027.total DESC
  `);

  await c.query(`
    CREATE OR REPLACE VIEW v_programs AS
    SELECT mission, programme,
      SUM(CASE WHEN type_credit = 'CP' AND annee = 2026 THEN montant ELSE 0 END) as cp_2026,
      SUM(CASE WHEN type_credit = 'CP' AND annee = 2027 THEN montant ELSE 0 END) as cp_2027,
      SUM(CASE WHEN type_credit = 'AE' AND annee = 2026 THEN montant ELSE 0 END) as ae_2026,
      SUM(CASE WHEN type_credit = 'AE' AND annee = 2027 THEN montant ELSE 0 END) as ae_2027
    FROM fact_credits
    WHERE programme != '(total mission)'
    GROUP BY mission, programme
  `);

  console.log('[DUCKDB] Views created — init complete');
  return c;
}

export function initDuckDB(): Promise<duckdb.AsyncDuckDBConnection> {
  if (!initPromise) {
    initPromise = doInit();
    // On failure, allow a later call to retry the initialization.
    initPromise.catch(() => {
      initPromise = null;
      conn = null;
    });
  }
  return initPromise;
}

/**
 * DuckDB renvoie HUGEINT/DECIMAL128 → Arrow rend des BigInt/DecimalBigNum.
 * Recharts et l’UI attendent des Number : conversion défensive ici,
 * en plus des casts ::DOUBLE côté SQL (contrat explicite, cf. ADR-002).
 */
function toJs(v: any): any {
  if (typeof v === 'bigint') return Number(v);
  if (v && typeof v === 'object' && typeof v[Symbol.toPrimitive] === 'function') {
    const n = Number(v);
    if (Number.isFinite(n)) return n;
  }
  return v;
}

export async function query<T = any>(sql: string): Promise<T[]> {
  const c = conn ?? (await initDuckDB());
  const result = await c.query(sql);
  return result.toArray().map((row: any) => {
    const obj: any = {};
    for (const field of result.schema.fields) {
      obj[field.name] = toJs(row[field.name]);
    }
    return obj;
  });
}