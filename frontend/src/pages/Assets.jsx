import { useEffect, useState } from 'react';
import { api } from '../api';

const TYPES = [
  ['real-estate', 'Real estate'],
  ['vehicle', 'Vehicle'],
  ['investment', 'Investment'],
  ['retirement', 'Retirement'],
  ['business', 'Business'],
  ['other', 'Other']
];
const blank = { name: '', type: 'real-estate', value: '' };
const fmt = (n) => `$${Number(n).toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;

export default function Assets() {
  const [assets, setAssets] = useState([]);
  const [drafts, setDrafts] = useState({});
  const [newAsset, setNewAsset] = useState(blank);
  const [error, setError] = useState('');
  const [message, setMessage] = useState('');

  const load = async () => {
    const result = await api.getAssets();
    setAssets(result);
    setDrafts(Object.fromEntries(result.map((a) => [a._id, { name: a.name, type: a.type, value: String(a.value) }])));
  };

  useEffect(() => {
    load().catch((err) => setError(err.message));
  }, []);

  const run = async (action, success) => {
    setError('');
    setMessage('');
    try {
      await action();
      await load();
      setMessage(success);
    } catch (err) {
      setError(err.message);
    }
  };

  const create = (event) => {
    event.preventDefault();
    run(async () => {
      await api.createAsset({ ...newAsset, value: Number(newAsset.value) });
      setNewAsset(blank);
    }, 'Asset added.');
  };

  const total = assets.reduce((sum, a) => sum + a.currentValue, 0);

  return (
    <>
      <h1 className="page-title">Assets</h1>
      <p className="page-subtitle">Non-liquid holdings counted toward your net worth.</p>
      {error && <div className="status-msg error">{error}</div>}
      {message && !error && <div className="status-msg success">{message}</div>}

      <div className="hero-row">
        <div className="hero-figure">
          <div className="label">Total non-liquid assets</div>
          <div className="value positive">{fmt(total)}</div>
        </div>
      </div>

      <form className="category-create" onSubmit={create}>
        <h2 className="section-heading">Add asset</h2>
        <div className="asset-fields">
          <input
            value={newAsset.name}
            onChange={(e) => setNewAsset({ ...newAsset, name: e.target.value })}
            placeholder="Asset name"
            aria-label="New asset name"
            required
          />
          <select
            value={newAsset.type}
            onChange={(e) => setNewAsset({ ...newAsset, type: e.target.value })}
            aria-label="New asset type"
          >
            {TYPES.map(([v, l]) => <option key={v} value={v}>{l}</option>)}
          </select>
          <input
            type="number"
            min="0"
            step="0.01"
            value={newAsset.value}
            onChange={(e) => setNewAsset({ ...newAsset, value: e.target.value })}
            placeholder="Starting value"
            aria-label="New asset value"
            required
          />
          <button type="submit">Add asset</button>
        </div>
      </form>

      <div className="section-label">Your assets</div>
      {assets.length === 0 && <div className="empty-state">No assets yet.</div>}
      <div className="category-list">
        {assets.map((asset) => {
          const draft = drafts[asset._id] || {};
          const set = (patch) => setDrafts({ ...drafts, [asset._id]: { ...draft, ...patch } });
          return (
            <div className="asset-fields asset-row" key={asset._id}>
              <input value={draft.name || ''} onChange={(e) => set({ name: e.target.value })} aria-label={`Name for ${asset.name}`} />
              <select value={draft.type || 'other'} onChange={(e) => set({ type: e.target.value })} aria-label={`Type for ${asset.name}`}>
                {TYPES.map(([v, l]) => <option key={v} value={v}>{l}</option>)}
              </select>
              <input
                type="number"
                min="0"
                step="0.01"
                value={draft.value ?? ''}
                onChange={(e) => set({ value: e.target.value })}
                aria-label={`Value for ${asset.name}`}
              />
              <div>
                {asset.contributions !== 0 && (
                  <div className="meta">Worth {fmt(asset.currentValue)} incl. {fmt(asset.contributions)} transferred</div>
                )}
                <button onClick={() => run(() => api.updateAsset(asset._id, { ...draft, value: Number(draft.value) }), 'Asset saved.')}>
                  Save
                </button>{' '}
                <button onClick={() => run(() => api.deleteAsset(asset._id), 'Asset deleted.')}>Delete</button>
              </div>
            </div>
          );
        })}
      </div>
    </>
  );
}
