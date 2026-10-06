import { useEffect, useState } from 'react';
import { api } from '../api';

const blankCategory = { name: '', type: 'expense', color: '#5B7553', monthlyBudget: '0' };

export default function Categories() {
  const [categories, setCategories] = useState([]);
  const [drafts, setDrafts] = useState({});
  const [newCategory, setNewCategory] = useState(blankCategory);
  const [savingId, setSavingId] = useState(null);
  const [savingNew, setSavingNew] = useState(false);
  const [error, setError] = useState('');
  const [message, setMessage] = useState('');

  const load = async () => {
    const result = await api.getCategories();
    setCategories(result);
    setDrafts(Object.fromEntries(result.map((category) => [category._id, {
      name: category.name,
      type: category.type,
      color: category.color,
      monthlyBudget: String(category.monthlyBudget || 0)
    }])));
  };

  useEffect(() => {
    load().catch((err) => setError(err.message));
  }, []);

  const saveCategory = async (id) => {
    const draft = drafts[id];
    if (!draft.name.trim()) {
      setError('Category name is required.');
      return;
    }
    setSavingId(id);
    setError('');
    setMessage('');
    try {
      await api.updateCategory(id, {
        ...draft,
        name: draft.name.trim(),
        monthlyBudget: Number(draft.monthlyBudget) || 0
      });
      await load();
      setMessage('Category saved.');
    } catch (err) {
      setError(err.message);
    } finally {
      setSavingId(null);
    }
  };

  const createCategory = async (event) => {
    event.preventDefault();
    if (!newCategory.name.trim()) return;
    setSavingNew(true);
    setError('');
    setMessage('');
    try {
      await api.createCategory({
        ...newCategory,
        name: newCategory.name.trim(),
        monthlyBudget: Number(newCategory.monthlyBudget) || 0
      });
      setNewCategory({ ...blankCategory });
      await load();
      setMessage('Category created.');
    } catch (err) {
      setError(err.message);
    } finally {
      setSavingNew(false);
    }
  };

  return (
    <>
      <h1 className="page-title">Categories</h1>
      <p className="page-subtitle">Edit category names, colors, types, and monthly budgets.</p>
      {error && <div className="status-msg error">{error}</div>}
      {message && !error && <div className="status-msg success">{message}</div>}

      <form className="category-create" onSubmit={createCategory}>
        <h2 className="section-heading">Add category</h2>
        <div className="category-fields">
          <input
            value={newCategory.name}
            onChange={(event) => setNewCategory({ ...newCategory, name: event.target.value })}
            placeholder="Category name"
            aria-label="New category name"
            required
          />
          <select
            value={newCategory.type}
            onChange={(event) => setNewCategory({ ...newCategory, type: event.target.value })}
            aria-label="New category type"
          >
            <option value="expense">Expense</option>
            <option value="income">Income</option>
          </select>
          <input
            type="color"
            value={newCategory.color}
            onChange={(event) => setNewCategory({ ...newCategory, color: event.target.value })}
            aria-label="New category color"
          />
          <input
            type="number"
            min="0"
            step="0.01"
            value={newCategory.monthlyBudget}
            onChange={(event) => setNewCategory({ ...newCategory, monthlyBudget: event.target.value })}
            aria-label="New category monthly budget"
          />
          <button type="submit" disabled={savingNew}>{savingNew ? 'Adding…' : 'Add category'}</button>
        </div>
      </form>

      <div className="section-label">Existing categories</div>
      <div className="category-list">
        {categories.map((category) => {
          const draft = drafts[category._id] || {};
          return (
            <div className="category-row" key={category._id}>
              <input
                value={draft.name || ''}
                onChange={(event) => setDrafts({ ...drafts, [category._id]: { ...draft, name: event.target.value } })}
                aria-label={`Name for ${category.name}`}
              />
              <select
                value={draft.type || 'expense'}
                onChange={(event) => setDrafts({ ...drafts, [category._id]: { ...draft, type: event.target.value } })}
                aria-label={`Type for ${category.name}`}
              >
                <option value="expense">Expense</option>
                <option value="income">Income</option>
              </select>
              <input
                type="color"
                value={draft.color || '#5B7553'}
                onChange={(event) => setDrafts({ ...drafts, [category._id]: { ...draft, color: event.target.value } })}
                aria-label={`Color for ${category.name}`}
              />
              <label className="category-budget">
                <span>Monthly budget</span>
                <input
                  type="number"
                  min="0"
                  step="0.01"
                  value={draft.monthlyBudget ?? '0'}
                  onChange={(event) => setDrafts({ ...drafts, [category._id]: { ...draft, monthlyBudget: event.target.value } })}
                  aria-label={`Monthly budget for ${category.name}`}
                />
              </label>
              <button onClick={() => saveCategory(category._id)} disabled={savingId === category._id}>
                {savingId === category._id ? 'Saving…' : 'Save'}
              </button>
            </div>
          );
        })}
      </div>
    </>
  );
}