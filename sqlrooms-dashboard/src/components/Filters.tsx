interface Props {
  creditType: 'CP' | 'AE';
  onCreditTypeChange: (t: 'CP' | 'AE') => void;
  search: string;
  onSearchChange: (s: string) => void;
}

export default function Filters({ creditType, onCreditTypeChange, search, onSearchChange }: Props) {
  return (
    <div style={{ display: 'flex', gap: 16, alignItems: 'center', marginBottom: 16, flexWrap: 'wrap' }}>
      <div style={{ display: 'flex', gap: 4, alignItems: 'center' }}>
        <span>Type de crédit :</span>
        <button
          onClick={() => onCreditTypeChange('CP')}
          style={{
            padding: '6px 12px',
            borderRadius: 4,
            border: '1px solid #ccc',
            background: creditType === 'CP' ? '#1976d2' : '#fff',
            color: creditType === 'CP' ? '#fff' : '#333',
            cursor: 'pointer',
          }}
        >
          CP (Crédits de paiement)
        </button>
        <button
          onClick={() => onCreditTypeChange('AE')}
          style={{
            padding: '6px 12px',
            borderRadius: 4,
            border: '1px solid #ccc',
            background: creditType === 'AE' ? '#1976d2' : '#fff',
            color: creditType === 'AE' ? '#fff' : '#333',
            cursor: 'pointer',
          }}
        >
          AE (Autorisations d'engagement)
        </button>
      </div>

      <div style={{ display: 'flex', gap: 4, alignItems: 'center' }}>
        <span>Recherche mission :</span>
        <input
          type="text"
          value={search}
          onChange={(e) => onSearchChange(e.target.value)}
          placeholder="Tapez un nom de mission..."
          style={{ padding: '6px 10px', borderRadius: 4, border: '1px solid #ccc', minWidth: 250 }}
        />
      </div>
    </div>
  );
}
