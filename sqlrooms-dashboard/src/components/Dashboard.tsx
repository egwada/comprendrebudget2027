import { useState, useEffect, useCallback } from 'react';
import { query } from '../duckdb';
import Filters from './Filters';
import TreemapChart from './TreemapChart';
import BarChartCompare from './BarChartCompare';
import ProgramTable from './ProgramTable';

export interface MissionData {
  mission: string;
  total: number;
}

export interface CompareData {
  mission: string;
  cp_2026: number;
  cp_2027: number;
}

export interface ProgramData {
  mission: string;
  programme: string;
  cp_2026: number;
  cp_2027: number;
  ae_2026: number;
  ae_2027: number;
}

export default function Dashboard() {
  const [missions, setMissions] = useState<MissionData[]>([]);
  const [compareData, setCompareData] = useState<CompareData[]>([]);
  const [selectedMission, setSelectedMission] = useState<string | null>(null);
  const [creditType, setCreditType] = useState<'CP' | 'AE'>('CP');
  const [search, setSearch] = useState('');
  const [programs, setPrograms] = useState<ProgramData[]>([]);

  const loadMissions = useCallback(async () => {
    const sql = `
      SELECT mission, SUM(CASE WHEN annee = 2027 THEN montant ELSE 0 END) as total
      FROM fact_credits
      WHERE type_credit = '${creditType}' AND programme != '(total mission)'
      GROUP BY mission
      ORDER BY total DESC
    `;
    const rows = await query<{ mission: string; total: number }>(sql);
    setMissions(rows);
  }, [creditType]);

  const loadCompare = useCallback(async () => {
    const sql = `
      SELECT mission,
        SUM(CASE WHEN type_credit = '${creditType}' AND annee = 2026 THEN montant ELSE 0 END) as prev,
        SUM(CASE WHEN type_credit = '${creditType}' AND annee = 2027 THEN montant ELSE 0 END) as curr
      FROM fact_credits
      WHERE programme != '(total mission)'
      GROUP BY mission
      ORDER BY curr DESC
    `;
    const rows = await query<{ mission: string; prev: number; curr: number }>(sql);
    setCompareData(
      rows.map((r) => ({
        mission: r.mission,
        cp_2026: r.prev,
        cp_2027: r.curr,
      }))
    );
  }, [creditType]);

  const loadPrograms = useCallback(async () => {
    if (!selectedMission) {
      setPrograms([]);
      return;
    }
    const sql = `
      SELECT mission, programme,
        SUM(CASE WHEN type_credit = 'CP' AND annee = 2026 THEN montant ELSE 0 END) as cp_2026,
        SUM(CASE WHEN type_credit = 'CP' AND annee = 2027 THEN montant ELSE 0 END) as cp_2027,
        SUM(CASE WHEN type_credit = 'AE' AND annee = 2026 THEN montant ELSE 0 END) as ae_2026,
        SUM(CASE WHEN type_credit = 'AE' AND annee = 2027 THEN montant ELSE 0 END) as ae_2027
      FROM fact_credits
      WHERE mission = '${selectedMission.replace(/'/g, "''")}' AND programme != '(total mission)'
      GROUP BY mission, programme
      ORDER BY cp_2027 DESC
    `;
    const rows = await query<ProgramData>(sql);
    setPrograms(rows);
  }, [selectedMission]);

  useEffect(() => {
    loadMissions();
    loadCompare();
  }, [loadMissions, loadCompare]);

  useEffect(() => {
    loadPrograms();
  }, [loadPrograms]);

  const filteredMissions = missions.filter((m) =>
    m.mission.toLowerCase().includes(search.toLowerCase())
  );

  const totalBudget = filteredMissions.reduce((sum, m) => sum + (m.total || 0), 0);

  return (
    <div style={{ padding: 20, fontFamily: 'system-ui, sans-serif' }}>
      <h1>📊 PLF 2027 — Crédits par mission et programme</h1>

      <Filters
        creditType={creditType}
        onCreditTypeChange={setCreditType}
        search={search}
        onSearchChange={setSearch}
      />

      <div style={{ display: 'flex', gap: 8, marginBottom: 16 }}>
        <div style={{ padding: '8px 16px', background: '#f0f0f0', borderRadius: 8 }}>
          <strong>Budget total {creditType} 2027 :</strong>{' '}
          {(totalBudget / 1e9).toFixed(2)} Md€
        </div>
        {selectedMission && (
          <div style={{ padding: '8px 16px', background: '#e3f2fd', borderRadius: 8 }}>
            <strong>Mission sélectionnée :</strong> {selectedMission}
            <button
              onClick={() => setSelectedMission(null)}
              style={{ marginLeft: 8, cursor: 'pointer' }}
            >
              ✕
            </button>
          </div>
        )}
      </div>

      <div
        style={{
          display: 'grid',
          gridTemplateColumns: '1fr 1fr',
          gap: 20,
          marginBottom: 20,
        }}
      >
        <TreemapChart
          data={filteredMissions}
          onMissionClick={setSelectedMission}
        />
        <BarChartCompare data={compareData.slice(0, 15)} />
      </div>

      <ProgramTable data={programs} />
    </div>
  );
}
