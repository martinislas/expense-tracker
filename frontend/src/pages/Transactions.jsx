import { useEffect, useState } from 'react';
import { api } from '../api';
import TransactionForm from '../components/TransactionForm';

const fmt = (n) => `${n < 0 ? '-' : ''}$${Math.abs(n).toFixed(2)}`;
const fmtDate = (d) =>
  new Date(d).toLocaleDateString('en-US', {
    month: 'short',
    day: 'numeric',
    timeZone: 'UTC'
  });
export default function Transactions() {
  const [transactions, setTransactions] = useState([]);
  const [categories, setCategories] = useState([]);
  const [assets, setAssets] = useState([]);
  const [categoryFilter, setCategoryFilter] = useState('all');
  const [loading, setLoading] = useState(true);
  const [editingId, setEditingId] = useState(null);
  const [editForm, setEditForm] = useState(null);
  const [savingId, setSavingId] = useState(null);
  const [categorySavingId, setCategorySavingId] = useState(null);
  const [error, setError] = useState('');
  const [message, setMessage] = useState('');

  const load = async () => {
    try {
      const [txs, cats, assetList] = await Promise.all([
        api.getTransactions(),
        api.getCategories(),
        api.getAssets()
      ]);
      setTransactions(txs);
      setCategories(cats);
      setAssets(assetList);
      setError('');
    } catch (err) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    load();
  }, []);

  const remove = async (id) => {
    try {
      await api.deleteTransaction(id);
      setTransactions((current) => current.filter((transaction) => transaction._id !== id));
    } catch (err) {
      setError(err.message);
    }
  };

  const setCategory = async (transaction, value) => {
    setCategorySavingId(transaction._id);
    setError('');
    setMessage('');
    try {
      const isAsset = value.startsWith('asset:');
      const updated = await api.updateTransaction(transaction._id, {
        category: isAsset ? null : value || null,
        asset: isAsset ? value.slice(6) : null
      });
      setTransactions((current) =>
        current.map((item) => (item._id === transaction._id ? updated : item))
      );
      setMessage('Category updated.');
    } catch (err) {
      setError(err.message);
    } finally {
      setCategorySavingId(null);
    }
  };

  const beginEdit = (transaction) => {
    setEditingId(transaction._id);
    setEditForm({
      date: new Date(transaction.date).toISOString().slice(0, 10),
      description: transaction.description,
      amount: String(transaction.amount),
      category: transaction.category?._id || ''
    });
    setError('');
    setMessage('');
  };

  const saveEdit = async (transaction) => {
    if (!editForm.description.trim() || editForm.amount === '') {
      setError('Description and amount are required.');
      return;
    }
    setSavingId(transaction._id);
    setError('');
    try {
      const updated = await api.updateTransaction(transaction._id, {
        date: editForm.date,
        description: editForm.description.trim(),
        amount: Number(editForm.amount),
        category: editForm.category || null
      });
      setTransactions((current) =>
        current.map((item) => (item._id === transaction._id ? updated : item))
      );
      setEditingId(null);
      setEditForm(null);
      setMessage('Transaction updated.');
    } catch (err) {
      setError(err.message);
    } finally {
      setSavingId(null);
    }
  };

  const visibleTransactions = transactions.filter((transaction) => {
    if (categoryFilter === 'uncategorized') return !transaction.category && !transaction.asset;
    if (categoryFilter !== 'all') return transaction.category?._id === categoryFilter;
    return true;
  });
  return (
    <>
      <h1 className="page-title">Transactions</h1>
      <p className="page-subtitle">Edit any transaction or assign its category directly from the list.</p>

      <TransactionForm categories={categories} onCreated={load} />

      {error && <div className="status-msg error">{error}</div>}
      {message && !error && <div className="status-msg success">{message}</div>}

      {loading ? (
        <div className="empty-state">Loading…</div>
      ) : transactions.length === 0 ? (
        <div className="empty-state">
          No transactions yet. Add one above, or import a bank statement.
        </div>
      ) : (
        <>
          <div className="transaction-toolbar">
            <span>{visibleTransactions.length} of {transactions.length} transactions</span>
            <label>
              Category filter
              <select value={categoryFilter} onChange={(e) => setCategoryFilter(e.target.value)}>
                <option value="all">All categories</option>
                <option value="uncategorized">Uncategorized only</option>
                {categories.map((category) => (
                  <option key={category._id} value={category._id}>{category.name}</option>
                ))}
              </select>
            </label>
          </div>
          <div className="ledger">
          {visibleTransactions.length === 0 ? (
            <div className="empty-state">No transactions match this category filter.</div>
          ) : visibleTransactions.map((t) => (
            <div className="transaction-entry" key={t._id}>
              {editingId === t._id ? (
                <div className="transaction-edit-form">
                  <input
                    type="date"
                    value={editForm.date}
                    onChange={(e) => setEditForm({ ...editForm, date: e.target.value })}
                    aria-label="Transaction date"
                  />
                  <input
                    type="text"
                    value={editForm.description}
                    onChange={(e) => setEditForm({ ...editForm, description: e.target.value })}
                    aria-label="Transaction description"
                    required
                  />
                  <input
                    type="number"
                    step="0.01"
                    value={editForm.amount}
                    onChange={(e) => setEditForm({ ...editForm, amount: e.target.value })}
                    aria-label="Transaction amount; expenses are negative"
                    required
                  />
                  <select
                    value={editForm.category}
                    onChange={(e) => setEditForm({ ...editForm, category: e.target.value })}
                    aria-label="Transaction category"
                  >
                    <option value="">Uncategorized</option>
                    {categories.map((category) => (
                      <option key={category._id} value={category._id}>{category.name}</option>
                    ))}
                  </select>
                  <div className="transaction-actions">
                    <button onClick={() => saveEdit(t)} disabled={savingId === t._id}>
                      {savingId === t._id ? 'Saving…' : 'Save'}
                    </button>
                    <button className="secondary" onClick={() => setEditingId(null)}>Cancel</button>
                  </div>
                </div>
              ) : (
                <div className="ledger-row">
                  <div className="ledger-date">{fmtDate(t.date)}</div>
                  <div className="ledger-desc">
                    <div className="title">{t.description}</div>
                    <div className="meta">{t.source === 'import' ? 'Imported statement' : 'Manual transaction'}</div>
                  </div>
                  <div className={`ledger-amount ${t.amount >= 0 ? 'income' : 'expense'}`}>
                    {fmt(t.amount)}
                  </div>
                  <select
                    className="transaction-category-select"
                    value={t.asset ? `asset:${t.asset._id}` : t.category?._id || ''}
                    onChange={(e) => setCategory(t, e.target.value)}
                    disabled={categorySavingId === t._id}
                    aria-label={`Category for ${t.description}`}
                  >
                    <option value="">Uncategorized</option>
                    {categories.map((category) => (
                      <option key={category._id} value={category._id}>{category.name}</option>
                    ))}
                    {assets.length > 0 && (
                      <optgroup label="Transfer to asset">
                        {assets.map((a) => (
                          <option key={a._id} value={`asset:${a._id}`}>{a.name}</option>
                        ))}
                      </optgroup>
                    )}
                  </select>
                  <button className="secondary" onClick={() => beginEdit(t)}>Edit</button>
                  <button className="secondary" onClick={() => remove(t._id)}>Remove</button>
                </div>
              )}
            </div>
          ))}
          </div>
        </>
      )}
    </>
  );
}
