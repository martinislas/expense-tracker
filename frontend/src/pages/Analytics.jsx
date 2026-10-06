import { useEffect, useState } from 'react';
import {
  Cell,
  Line,
  LineChart,
  Pie,
  PieChart,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis
} from 'recharts';
import { api } from '../api';

const currentMonth = () => new Date().toISOString().slice(0, 7);
const money = (value) => `$${Number(value).toFixed(2)}`;
const longDate = (date) =>
  new Date(`${date}T00:00:00Z`).toLocaleDateString('en-US', {
    weekday: 'short',
    month: 'short',
    day: 'numeric',
    year: 'numeric',
    timeZone: 'UTC'
  });

export default function Analytics() {
  const [month, setMonth] = useState(currentMonth());
  const [interval, setInterval] = useState('day');
  const [summary, setSummary] = useState(null);
  const [trend, setTrend] = useState(null);
  const [transactions, setTransactions] = useState([]);
  const [categories, setCategories] = useState([]);
  const [budget, setBudget] = useState(0);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [hiddenLines, setHiddenLines] = useState(new Set());

  const toggleLine = (key) =>
    setHiddenLines((current) => {
      const next = new Set(current);
      if (!next.delete(key)) next.add(key);
      return next;
    });
  useEffect(() => {
    let active = true;
    setLoading(true);
    setError('');
    Promise.all([
      api.getSummary(month),
      api.getAnalytics(month, interval),
      api.getCategories(),
      api.getBudget(month),
      api.getTransactions(month)
    ])
      .then(([monthSummary, analytics, monthCategories, monthBudget, monthTransactions]) => {
        if (!active) return;
        setSummary(monthSummary);
        setTrend(analytics);
        setCategories(monthCategories);
        setBudget(monthBudget.totalBudget || 0);
        setTransactions(monthTransactions);
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
  }, [month, interval]);

  const pieData = summary?.byCategory || [];
  const spendingByCategory = new Map(pieData.map((category) => [String(category.categoryId), category]));
  const incomeByCategory = new Map(
    (summary?.byIncomeCategory || []).map((category) => [String(category.categoryId), category])
  );
  const expenseCategories = categories.filter((category) => category.type !== 'income');
  const incomeCategories = categories.filter((category) => category.type === 'income');
  const expenseCategoryBudget = expenseCategories.reduce(
    (total, category) => total + (Number(category.monthlyBudget) || 0),
    0
  );
  const incomeCategoryBudget = incomeCategories.reduce(
    (total, category) => total + (Number(category.monthlyBudget) || 0),
    0
  );
  const budgetDifference = budget - (summary?.expenses || 0);
  const categoryBudgetDifference = expenseCategoryBudget - (summary?.expenses || 0);
  const incomeBudgetDifference = incomeCategoryBudget - (summary?.income || 0);
  const dailyTotals = Object.values(transactions.filter((transaction) => !transaction.asset).reduce((days, transaction) => {
    const date = new Date(transaction.date).toISOString().slice(0, 10);
    const day = days[date] || { date, expenses: 0, income: 0 };
    if (transaction.amount < 0) day.expenses += Math.abs(transaction.amount);
    else day.income += transaction.amount;
    days[date] = day;
    return days;
  }, {})).sort((a, b) => b.date.localeCompare(a.date));

  const periodExpenses = dailyTotals.reduce((sum, day) => sum + day.expenses, 0);
  const periodIncome = dailyTotals.reduce((sum, day) => sum + day.income, 0);
  const [selectedYear, selectedMonthNumber] = month.split('-').map(Number);
  const daysInMonth = new Date(Date.UTC(selectedYear, selectedMonthNumber, 0)).getUTCDate();
  // For the current month, average only over days elapsed so far
  const daysCounted = month === currentMonth() ? new Date().getUTCDate() : daysInMonth;

  const trendKeys = trend?.categories.map((category) => category.id) || [];
  const trendData = (trend?.periods || []).map((period) => ({
    ...period,
    __total: trendKeys.reduce((sum, key) => sum + (period[key] || 0), 0)
  }));
  const trendAverage = trendData.length
    ? trendData.reduce((sum, period) => sum + period.__total, 0) / trendData.length
    : 0;
  const trendChartData = trendData.map((period) => ({ ...period, __avg: trendAverage }));
  const legendItems = [
    ...(trend?.categories || []).map((category) => ({ key: category.id, name: category.name, color: category.color })),
    { key: '__total', name: 'All expenses', color: '#2B2B2B' },
    { key: '__avg', name: `Average (${money(trendAverage)})`, color: '#9A9689', dashed: true }
  ];
  return (
    <>
      <div className="dashboard-heading">
        <div>
          <h1 className="page-title">Expense analytics</h1>
          <p className="page-subtitle">Category spending over time, from your saved transactions.</p>
        </div>
        <label className="month-picker">
          Selected month
          <input type="month" value={month} onChange={(event) => setMonth(event.target.value)} />
        </label>
      </div>

      {error && <div className="status-msg error">Could not load analytics: {error}</div>}
      {loading ? <div className="empty-state">Loading analytics…</div> : (
        <>
          <section className="analytics-section">
            <div className="analytics-title-row">
              <div>
                <h2 className="section-heading">Budget vs actual</h2>
                <p className="chart-caption">Allocated spending limits compared with {month} activity</p>
              </div>
            </div>
            <div className="budget-comparison-wrap">
              <table className="budget-comparison">
                <thead>
                  <tr>
                    <th scope="col">Category</th>
                    <th scope="col">Allocated</th>
                    <th scope="col">Actual</th>
                    <th scope="col">Difference</th>
                  </tr>
                </thead>
                <tbody>
                  <tr className="budget-total-row">
                    <th scope="row">Overall expense budget</th>
                    <td>{money(budget)}</td>
                    <td>{money(summary?.expenses || 0)}</td>
                    <td className={budgetDifference < 0 ? 'over-budget' : 'under-budget'}>
                      {money(Math.abs(budgetDifference))} {budgetDifference < 0 ? 'over' : 'left'}
                    </td>
                  </tr>
                  {expenseCategories.map((category) => {
                    const actual = spendingByCategory.get(category._id)?.spent || 0;
                    const difference = (category.monthlyBudget || 0) - actual;
                    return (
                      <tr key={category._id}>
                        <th scope="row">
                          <span className="comparison-category">
                            <span className="legend-swatch" style={{ backgroundColor: category.color }} />
                            {category.name}
                          </span>
                        </th>
                        <td>{money(category.monthlyBudget || 0)}</td>
                        <td>{money(actual)}</td>
                        <td className={difference < 0 ? 'over-budget' : 'under-budget'}>
                          {money(Math.abs(difference))} {difference < 0 ? 'over' : 'left'}
                        </td>
                      </tr>
                    );
                  })}
                  <tr className="budget-total-row">
                    <th scope="row">Total expense category budgets</th>
                    <td>{money(expenseCategoryBudget)}</td>
                    <td>{money(summary?.expenses || 0)}</td>
                    <td className={categoryBudgetDifference < 0 ? 'over-budget' : 'under-budget'}>
                      {money(Math.abs(categoryBudgetDifference))} {categoryBudgetDifference < 0 ? 'over' : 'left'}
                    </td>
                  </tr>
                  {incomeCategories.map((category) => {
                    const actual = incomeByCategory.get(category._id)?.income || 0;
                    const difference = (category.monthlyBudget || 0) - actual;
                    return (
                      <tr key={category._id}>
                        <th scope="row">
                          <span className="comparison-category">
                            <span className="legend-swatch" style={{ backgroundColor: category.color }} />
                            {category.name}
                          </span>
                        </th>
                        <td>{money(category.monthlyBudget || 0)}</td>
                        <td>{money(actual)}</td>
                        <td className={difference > 0 ? 'over-budget' : 'under-budget'}>
                          {money(Math.abs(difference))} {difference > 0 ? 'below' : 'above'}
                        </td>
                      </tr>
                    );
                  })}
                  <tr className="budget-total-row">
                    <th scope="row">Total income category budgets</th>
                    <td>{incomeCategoryBudget > 0 ? money(incomeCategoryBudget) : <span className="not-budgeted">Not set</span>}</td>
                    <td>{money(summary?.income || 0)}</td>
                    <td className={incomeCategoryBudget === 0 ? 'not-budgeted' : incomeBudgetDifference > 0 ? 'over-budget' : 'under-budget'}>
                      {incomeCategoryBudget === 0
                        ? '—'
                        : `${money(Math.abs(incomeBudgetDifference))} ${incomeBudgetDifference > 0 ? 'below' : 'above'}`}
                    </td>
                  </tr>
                </tbody>
              </table>
            </div>
          </section>

          <section className="analytics-section">
            <div className="analytics-title-row">
              <div>
                <h2 className="section-heading">Spending mix</h2>
                <p className="chart-caption">Expenses by category for {month}</p>
              </div>
              <strong className="chart-total">{money(summary?.expenses || 0)}</strong>
            </div>
            {pieData.length === 0 ? (
              <div className="empty-state">No expenses recorded for this month.</div>
            ) : (
              <div className="pie-layout">
                <div className="pie-chart">
                  <ResponsiveContainer width="100%" height="100%">
                    <PieChart>
                      <Pie data={pieData} dataKey="spent" nameKey="name" outerRadius="88%">
                        {pieData.map((category) => (
                          <Cell key={category.categoryId || 'uncategorized'} fill={category.color} />
                        ))}
                      </Pie>
                      <Tooltip formatter={(value) => money(value)} />
                    </PieChart>
                  </ResponsiveContainer>
                </div>
                <div className="chart-legend">
                  {pieData.map((category) => (
                    <div className="legend-row" key={category.categoryId || 'uncategorized'}>
                      <span className="legend-swatch" style={{ backgroundColor: category.color }} />
                      <span>{category.name}</span>
                      <strong>{money(category.spent)}</strong>
                    </div>
                  ))}
                </div>
              </div>
            )}
          </section>

          <section className="analytics-section trend-section">
            <div className="analytics-title-row trend-heading">
              <div>
                <h2 className="section-heading">Category trends</h2>
                <p className="chart-caption">
                  {interval === 'month' ? 'Monthly totals across saved history' : `Daily totals by ${interval} for ${month}`}
                </p>
              </div>
              <div className="segmented-control" aria-label="Trend interval">
                {['day', 'week', 'month'].map((option) => (
                  <button
                    className={interval === option ? 'selected' : ''}
                    key={option}
                    onClick={() => setInterval(option)}
                    aria-pressed={interval === option}
                  >
                    {option === 'day' ? 'Day' : option === 'week' ? 'Week' : 'Month'}
                  </button>
                ))}
              </div>
            </div>
            {!trend?.categories.length ? (
              <div className="empty-state">No expense history available for this period.</div>
            ) : (
              <div className="trend-chart">
                <ResponsiveContainer width="100%" height="100%">
                  <LineChart data={trendChartData} margin={{ top: 12, right: 20, left: 8, bottom: 8 }}>
                    <XAxis dataKey="label" tickLine={false} axisLine={false} minTickGap={24} />
                    <YAxis tickFormatter={(value) => `$${value}`} tickLine={false} axisLine={false} width={68} />
                    <Tooltip formatter={(value) => money(value)} />
                    {trend.categories.map((category) => (
                      <Line
                        key={category.id}
                        type="monotone"
                        dataKey={category.id}
                        name={category.name}
                        stroke={category.color}
                        strokeWidth={2}
                        dot={false}
                        activeDot={{ r: 4 }}
                        hide={hiddenLines.has(category.id)}
                      />
                    ))}
                    <Line
                      type="monotone"
                      dataKey="__total"
                      name="All expenses"
                      stroke="#2B2B2B"
                      strokeWidth={3}
                      dot={false}
                      hide={hiddenLines.has('__total')}
                    />
                    <Line
                      type="linear"
                      dataKey="__avg"
                      name="Average"
                      stroke="#9A9689"
                      strokeWidth={2}
                      strokeDasharray="6 4"
                      dot={false}
                      activeDot={false}
                      hide={hiddenLines.has('__avg')}
                    />
                  </LineChart>
                </ResponsiveContainer>
              </div>
            )}
            {!!trend?.categories.length && (
              <div className="trend-toggles">
                {legendItems.map((item) => (
                  <label key={item.key} className={hiddenLines.has(item.key) ? 'off' : ''}>
                    <input
                      type="checkbox"
                      checked={!hiddenLines.has(item.key)}
                      onChange={() => toggleLine(item.key)}
                    />
                    <span className="legend-swatch" style={{ backgroundColor: item.color }} />
                    {item.name}
                  </label>
                ))}
              </div>
            )}
          </section>

          <section className="analytics-section trend-section">
            <div className="analytics-title-row">
              <div>
                <h2 className="section-heading">Daily totals</h2>
                <p className="chart-caption">Income and spending by day for {month}</p>
              </div>
            </div>
            {dailyTotals.length === 0 ? (
              <div className="empty-state">No transactions recorded for this month.</div>
            ) : (
              <div className="monthly-table-wrap">
                <table className="monthly-table">
                  <thead>
                    <tr><th>Day</th><th>Spent</th><th>Income</th><th>Net</th></tr>
                  </thead>
                  <tbody>
                    {dailyTotals.map((day) => {
                      const net = day.income - day.expenses;
                      return (
                        <tr key={day.date}>
                          <td>{longDate(day.date)}</td>
                          <td className="negative">{money(day.expenses)}</td>
                          <td className="positive">{money(day.income)}</td>
                          <td className={net >= 0 ? 'positive' : 'negative'}>{money(net)}</td>
                        </tr>
                      );
                    })}
                  </tbody>
                  <tfoot>
                    <tr>
                      <th scope="row">Total</th>
                      <td className="negative">{money(periodExpenses)}</td>
                      <td className="positive">{money(periodIncome)}</td>
                      <td className={periodIncome - periodExpenses >= 0 ? 'positive' : 'negative'}>
                        {money(periodIncome - periodExpenses)}
                      </td>
                    </tr>
                    <tr>
                      <th scope="row">Average per day ({daysCounted} days)</th>
                      <td className="negative">{money(periodExpenses / daysCounted)}</td>
                      <td className="positive">{money(periodIncome / daysCounted)}</td>
                      <td className={periodIncome - periodExpenses >= 0 ? 'positive' : 'negative'}>
                        {money((periodIncome - periodExpenses) / daysCounted)}
                      </td>
                    </tr>
                  </tfoot>
                </table>
              </div>
            )}
          </section>
        </>
      )}
    </>
  );
}