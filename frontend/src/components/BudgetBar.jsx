const fmt = (n) => `$${n.toFixed(2)}`;

export default function BudgetBar({ name, spent, budget }) {
  const hasBudget = budget > 0;
  const pct = hasBudget ? Math.min((spent / budget) * 100, 100) : Math.min((spent / 50) * 100, 100);
  const over = hasBudget && spent > budget;

  return (
    <div className="budget-item">
      <div className="budget-header">
        <span>{name}</span>
        <span className="amounts">
          {fmt(spent)} {hasBudget ? `/ ${fmt(budget)}` : '(no budget set)'}
        </span>
      </div>
      <div className="budget-track">
        <div className={`budget-fill${over ? ' over' : ''}`} style={{ width: `${pct}%` }} />
      </div>
    </div>
  );
}
