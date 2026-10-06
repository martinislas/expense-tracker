import { useEffect, useState } from 'react';
import { api } from '../api';
import BudgetBar from '../components/BudgetBar';

const currentMonth = () => new Date().toISOString().slice(0, 7);
const fmt = (n) => `$${Math.abs(n).toFixed(2)}`;
const monthLabel = (m) =>
  new Date(`${m}-01T00:00:00Z`).toLocaleDateString('en-US', {
    month: 'long',
    year: 'numeric',
    timeZone: 'UTC'
  });

export default function Dashboard() {
  const [month, setMonth] = useState(currentMonth());
  const [summary, setSummary] = useState(null);
  const [monthlySummary, setMonthlySummary] = useState([]);
  const [assetsTotal, setAssetsTotal] = useState(0);
  const [startingAmount, setStartingAmount] = useState('');
  const [savingBalance, setSavingBalance] = useState(false);
  const [balanceMessage, setBalanceMessage] = useState('');
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  useEffect(() => {
    let active = true;
    setLoading(true);
    setError('');
    api
      .getSummary(month)
      .then((data) => {
        if (active) setSummary(data);
      })
      .catch((err) => {
        if (active) setError(err.message);
      })
      .finally(() => {
        if (active) setLoading(false);
      });
    return () => {
      active = false;
    };
  }, [month]);

  useEffect(() => {
    let active = true;
    Promise.all([api.getStartingBalance(), api.getMonthlySummary(), api.getAssets()])
      .then(([balance, months, assets]) => {
        if (!active) return;
        setAssetsTotal(assets.reduce((sum, a) => sum + a.currentValue, 0));
        setStartingAmount(balance.configured === false ? '' : String(balance.amount));
        setMonthlySummary(months);
      })
      .catch((err) => {
        if (active) setBalanceMessage(`Could not load balance and monthly totals: ${err.message}`);
      });
    return () => {
      active = false;
    };
  }, []);

  const saveStartingBalance = async (event) => {
    event.preventDefault();
    const amount = Number(startingAmount);
    if (!Number.isFinite(amount)) {
      setBalanceMessage('Enter a valid starting balance.');
      return;
    }
    setSavingBalance(true);
    setBalanceMessage('');
    try {
      await api.setStartingBalance(amount);
      const [updatedSummary, updatedMonths] = await Promise.all([
        api.getSummary(month),
        api.getMonthlySummary()
      ]);
      setSummary(updatedSummary);
      setMonthlySummary(updatedMonths);
      setBalanceMessage('Starting balance saved.');
    } catch (err) {
      setBalanceMessage(`Could not save starting balance: ${err.message}`);
    } finally {
      setSavingBalance(false);
    }
  };

  if (loading) return <div className="main">Loading…</div>;
  if (error) return <div className="main status-msg error">Could not load dashboard: {error}</div>;

  return (
    <>
      <div className="dashboard-heading">
        <div>
          <h1 className="page-title">{monthLabel(month)}</h1>
          <p className="page-subtitle">Your spending snapshot for this month.</p>
        </div>
        <label className="month-picker">
          View month
          <input type="month" value={month} onChange={(e) => setMonth(e.target.value)} />
        </label>
      </div>

      <div className="hero-row">
        <div className="hero-figure">
          <div className="label">Income</div>
          <div className="value positive">{fmt(summary.income)}</div>
        </div>
        <div className="hero-figure">
          <div className="label">Expenses</div>
          <div className="value negative">{fmt(summary.expenses)}</div>
        </div>
        <div className="hero-figure">
          <div className="label">Net</div>
          <div className={`value ${summary.net >= 0 ? 'positive' : 'negative'}`}>
            {summary.net >= 0 ? '' : '-'}
            {fmt(summary.net)}
          </div>
        </div>
        <div className="hero-figure">
          <div className="label">Cash balance at month end</div>
          <div className={`value ${summary.accountBalance >= 0 ? 'positive' : 'negative'}`}>
            {summary.accountBalance < 0 ? '-' : ''}
            {fmt(summary.accountBalance)}
          </div>
        </div>
        <div className="hero-figure">
          <div className="label">Non-liquid assets</div>
          <div className="value positive">{fmt(assetsTotal)}</div>
        </div>
        <div className="hero-figure">
          <div className="label">Net worth</div>
          <div className={`value ${summary.accountBalance + assetsTotal >= 0 ? 'positive' : 'negative'}`}>
            {summary.accountBalance + assetsTotal < 0 ? '-' : ''}
            {fmt(summary.accountBalance + assetsTotal)}
          </div>
        </div>
      </div>

      <section className="starting-balance-card">
        <div>
          <div className="section-label">Starting balance</div>
          <p className="balance-help">Set the account balance as of June 1, 2026. This is separate from monthly income.</p>
        </div>
        <form className="starting-balance-form" onSubmit={saveStartingBalance}>
          <label htmlFor="starting-balance">Balance on June 1, 2026</label>
          <div className="balance-input-row">
            <span>$</span>
            <input
              id="starting-balance"
              type="number"
              step="0.01"
              value={startingAmount}
              onChange={(e) => setStartingAmount(e.target.value)}
              placeholder="0.00"
              required
            />
            <button type="submit" disabled={savingBalance}>
              {savingBalance ? 'Saving…' : 'Save balance'}
            </button>
          </div>
          {balanceMessage && <div className="balance-message">{balanceMessage}</div>}
        </form>
      </section>

      <section>
        <div className="section-label">Monthly overview</div>
        <div className="monthly-table-wrap">
          <table className="monthly-table">
            <thead>
              <tr><th>Month</th><th>Income</th><th>Expenses</th><th>Net</th></tr>
            </thead>
            <tbody>
              {monthlySummary.map((row) => (
                <tr key={row.month} className={row.month === month ? 'selected-month' : ''}>
                  <td>
                    <button className="month-link" onClick={() => setMonth(row.month)}>
                      {monthLabel(row.month)}
                    </button>
                  </td>
                  <td className="positive">{fmt(row.income)}</td>
                  <td className="negative">{fmt(row.expenses)}</td>
                  <td className={row.income - row.expenses >= 0 ? 'positive' : 'negative'}>
                    {row.income - row.expenses < 0 ? '-' : ''}{fmt(row.income - row.expenses)}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </section>

      <div className="section-label">Spending by category</div>
      {summary.byCategory.length === 0 ? (
        <div className="empty-state">No expenses recorded yet this month.</div>
      ) : (
        <div>
          {summary.byCategory.map((c) => (
            <BudgetBar
              key={c.categoryId || 'uncategorized'}
              name={c.name}
              spent={c.spent}
              budget={c.budget}
            />
          ))}
        </div>
      )}
    </>
  );
}
