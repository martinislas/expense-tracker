import { useState } from 'react';
import { api } from '../api';

const today = () => new Date().toISOString().slice(0, 10);

export default function TransactionForm({ categories, onCreated }) {
  const [form, setForm] = useState({
    date: today(),
    description: '',
    amount: '',
    category: '',
    kind: 'expense' // 'expense' | 'income', flips the sign of amount
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
    const magnitude = Math.abs(parseFloat(form.amount));
    const signedAmount = form.kind === 'expense' ? -magnitude : magnitude;

    try {
      await api.createTransaction({
        date: form.date,
        description: form.description.trim(),
        amount: signedAmount,
        category: form.category || null
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
        <select value={form.kind} onChange={update('kind')}>
          <option value="expense">Expense</option>
          <option value="income">Income</option>
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
        <select value={form.category} onChange={update('category')}>
          <option value="">No category</option>
          {categories.map((c) => (
            <option key={c._id} value={c._id}>
              {c.name}
            </option>
          ))}
        </select>
        <button type="submit">Add</button>
      </div>
      {error && <div className="status-msg error">{error}</div>}
    </form>
  );
}
