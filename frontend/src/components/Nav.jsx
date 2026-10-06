import { NavLink } from 'react-router-dom';

export default function Nav() {
  return (
    <nav className="nav">
      <div className="nav-mark">
        Ledger<span className="dot">.</span>
      </div>
      <div className="nav-links">
        <NavLink to="/" end className={({ isActive }) => (isActive ? 'active' : '')}>
          Dashboard
        </NavLink>
        <NavLink to="/transactions" className={({ isActive }) => (isActive ? 'active' : '')}>
          Transactions
        </NavLink>
        <NavLink to="/budgets" className={({ isActive }) => (isActive ? 'active' : '')}>
          Budgets
        </NavLink>
        <NavLink to="/categories" className={({ isActive }) => (isActive ? 'active' : '')}>
          Categories
        </NavLink>
        <NavLink to="/analytics" className={({ isActive }) => (isActive ? 'active' : '')}>
          Analytics
        </NavLink>
        <NavLink to="/assets" className={({ isActive }) => (isActive ? 'active' : '')}>
          Assets
        </NavLink>
        <NavLink to="/import" className={({ isActive }) => (isActive ? 'active' : '')}>
          Import statement
        </NavLink>
      </div>
    </nav>
  );
}
