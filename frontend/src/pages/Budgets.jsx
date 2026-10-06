import { useEffect, useState } from 'react';
import { api } from '../api';

const currentMonth = () => new Date().toISOString().slice(0, 7);
const money = (value) => `$${Number(value).toFixed(2)}`;

export default function Budgets() {
  const [categories, setCategories] = useState([]);
  const [totalBudget, setTotalBudget] = useState('');
  const [loading, setLoading] = useState(true);
  const month = currentMonth();

  const load = async () => {
    const [cats, budget] = await Promise.all([api.getCategories(), api.getBudget(month)]);
    setCategories(cats);
    setTotalBudget(budget.totalBudget || '');
    setLoading(false);
  };

  useEffect(() => {
    load();
  }, []);

  const updateCategoryBudget = async (id, value) => {
    setCategories((cats) =>
      cats.map((c) => (c._id === id ? { ...c, monthlyBudget: value } : c))
    );
  };

  const saveCategoryBudget = async (id, value) => {
    await api.updateCategory(id, { monthlyBudget: Number(value) || 0 });
  };

  const saveTotalBudget = async () => {
    await api.setBudget(month, Number(totalBudget) || 0);
  };

  const expenseBudgetTotal = categories
    .filter((category) => category.type !== 'income')
    .reduce((total, category) => total + (Number(category.monthlyBudget) || 0), 0);
  const incomeBudgetTotal = categories
    .filter((category) => category.type === 'income')
    .reduce((total, category) => total + (Number(category.monthlyBudget) || 0), 0);

  if (loading) return <div className="main">Loading…</div>;

  return (
    <>
      <h1 className="page-title">Budgets</h1>
      <p className="page-subtitle">Set spending limits for this month, overall and by category.</p>

      <div className="section-label">Overall expense cap</div>
      <div className="form-row">
        <input
          type="number"
          step="1"
          placeholder="0.00"
          value={totalBudget}
          onChange={(e) => setTotalBudget(e.target.value)}
          style={{ width: 140 }}
        />
        <button onClick={saveTotalBudget}>Save</button>
      </div>

      <div className="section-label">Category budgets</div>
      <div className="budget-allocation-totals">
        <div>
          <span>Expense allocations</span>
          <strong>{money(expenseBudgetTotal)}</strong>
        </div>
        <div>
          <span>Income allocations</span>
          <strong>{money(incomeBudgetTotal)}</strong>
        </div>
      </div>
      <div className="ledger">
        {categories.map((c) => (
          <div className="ledger-row" key={c._id}>
            <div className="ledger-desc">
              <span className="tag" style={{ background: c.color + '22', color: c.color }}>
                {c.name}
              </span>
            </div>
            <input
              type="number"
              step="1"
              value={c.monthlyBudget}
              onChange={(e) => updateCategoryBudget(c._id, e.target.value)}
              onBlur={(e) => saveCategoryBudget(c._id, e.target.value)}
              style={{ width: 100 }}
            />
          </div>
        ))}
      </div>
    </>
  );
}
