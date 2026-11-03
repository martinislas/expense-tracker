import { useState } from 'react';
import { api } from '../api';

const today = () => new Date().toISOString().slice(0, 10);

export default function TransactionForm({ categories, assets = [], onCreated }) {
  const [form, setForm] = useState({
    date: today(),
    description: '',
    amount: '',
    category: '',
    kind: 'expense' // 'expense' | 'income' | 'transfer'; expense and transfer are negative
  });
  const [error, setError] = useState('');

  const update = (field) => (e) => setForm({ ...form, [field]: e.target.value });

  const submit = async (e) => {
    e.preventDefault();
    setError('');
    if (!form.description.trim() || !form.amount) {
      setError('Description and amount are required.');
      return;
    }
    const isTransfer = form.kind === 'transfer';
    if (isTransfer && !form.category.startsWith('asset:')) {
      setError('Choose the asset to transfer to.');
      return;
    }
    const magnitude = Math.abs(parseFloat(form.amount));
    const signedAmount = form.kind === 'income' ? magnitude : -magnitude;

    const isAsset = form.category.startsWith('asset:');
    try {
      await api.createTransaction({
        date: form.date,
        description: form.description.trim(),
        amount: signedAmount,
        category: isAsset ? null : form.category || null,
        asset: isAsset ? form.category.slice(6) : null
      });
      setForm({ date: today(), description: '', amount: '', category: '', kind: 'expense' });
      onCreated();
    } catch (err) {
      setError(err.message);
    }
  };

  return (
    <form onSubmit={submit}>
      <div className="form-row">
        <input type="date" value={form.date} onChange={update('date')} required />
        <input
          type="text"
          placeholder="Description"
          value={form.description}
          onChange={update('description')}
          style={{ flex: 1, minWidth: 160 }}
          required
        />
        <select value={form.kind} onChange={(e) => setForm({ ...form, kind: e.target.value, category: '' })}>
          <option value="expense">Expense</option>
          <option value="income">Income</option>
          <option value="transfer">Transfer to asset</option>
        </select>
        <input
          type="number"
          step="0.01"
          placeholder="Amount"
          value={form.amount}
          onChange={update('amount')}
          style={{ width: 110 }}
          required
        />
        <select value={form.category} onChange={update('category')} required={form.kind === 'transfer'}>
          {form.kind === 'transfer' ? (
            <>
              <option value="">Select asset…</option>
              {assets.map((a) => (
                <option key={a._id} value={`asset:${a._id}`}>{a.name}</option>
              ))}
            </>
          ) : (
            <>
              <option value="">No category</option>
              {categories.map((c) => (
                <option key={c._id} value={c._id}>{c.name}</option>
              ))}
            </>
          )}
        </select>
        <button type="submit">Add</button>
      </div>
      {error && <div className="status-msg error">{error}</div>}
    </form>
  );
}
