import * as duckdb from '@duckdb/duckdb-wasm';

let db: duckdb.AsyncDuckDB | null = null;
let conn: duckdb.AsyncDuckDBConnection | null = null;

export async function initDuckDB(): Promise<duckdb.AsyncDuckDBConnection> {
  if (conn) return conn;

  const JSDELIVR_BUNDLES = duckdb.getJsDelivrBundles();
  const bundle = await duckdb.selectBundle(JSDELIVR_BUNDLES);

  const worker = new Worker(bundle.mainWorker!);
  const logger = new duckdb.ConsoleLogger();
  db = new duckdb.AsyncDuckDB(logger, worker);
  await db.instantiate(bundle.mainModule, bundle.pthreadWorker);

  conn = await db.connect();

  // Load CSV
  const csvText = await fetch('/data/fact_credits.csv').then((r) => r.text());
  await db.registerFileText('fact_credits.csv', csvText);
  await conn.query(`CREATE TABLE fact_credits AS FROM read_csv_auto('fact_credits.csv')`);

  // Create views for easy querying
  await conn.query(`
    CREATE VIEW v_missions_cp_2027 AS
    SELECT mission, SUM(montant) as total
    FROM fact_credits
    WHERE type_credit = 'CP' AND annee = 2027 AND programme != '(total mission)'
    GROUP BY mission
    ORDER BY total DESC
  `);

  await conn.query(`
    CREATE VIEW v_missions_cp_2026 AS
    SELECT mission, SUM(montant) as total
    FROM fact_credits
    WHERE type_credit = 'CP' AND annee = 2026 AND programme != '(total mission)'
    GROUP BY mission
    ORDER BY total DESC
  `);

  await conn.query(`
    CREATE VIEW v_compare_missions AS
    SELECT
      m2027.mission,
      m2026.total as cp_2026,
      m2027.total as cp_2027
    FROM v_missions_cp_2027 m2027
    LEFT JOIN v_missions_cp_2026 m2026 ON m2027.mission = m2026.mission
    ORDER BY m2027.total DESC
  `);

  await conn.query(`
    CREATE VIEW v_programs AS
    SELECT mission, programme,
      SUM(CASE WHEN type_credit = 'CP' AND annee = 2026 THEN montant ELSE 0 END) as cp_2026,
      SUM(CASE WHEN type_credit = 'CP' AND annee = 2027 THEN montant ELSE 0 END) as cp_2027,
      SUM(CASE WHEN type_credit = 'AE' AND annee = 2026 THEN montant ELSE 0 END) as ae_2026,
      SUM(CASE WHEN type_credit = 'AE' AND annee = 2027 THEN montant ELSE 0 END) as ae_2027
    FROM fact_credits
    WHERE programme != '(total mission)'
    GROUP BY mission, programme
  `);

  return conn;
}

export async function query<T = any>(sql: string): Promise<T[]> {
  if (!conn) throw new Error('DuckDB not initialized');
  const result = await conn.query(sql);
  return result.toArray().map((row: any) => {
    const obj: any = {};
    for (const field of result.schema.fields) {
      obj[field.name] = row[field.name];
    }
    return obj;
  });
}
