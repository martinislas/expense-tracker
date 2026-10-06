const express = require('express');
const router = express.Router();
const Transaction = require('../models/Transaction');
const Category = require('../models/Category');
const StartingBalance = require('../models/StartingBalance');

// GET transactions, optionally filtered by month (YYYY-MM) and/or category
router.get('/', async (req, res, next) => {
  try {
    const { month, category } = req.query;
    const filter = {};
    if (month) {
      const [year, mon] = month.split('-').map(Number);
      const start = new Date(Date.UTC(year, mon - 1, 1));
      const end = new Date(Date.UTC(year, mon, 1));
      filter.date = { $gte: start, $lt: end };
    }
    if (category) filter.category = category;

    const transactions = await Transaction.find(filter)
      .populate('category', 'name color')
      .populate('asset', 'name')
      .sort({ date: -1 });
    res.json(transactions);
  } catch (err) {
    next(err);
  }
});

// POST create a manual transaction
router.post('/', async (req, res, next) => {
  try {
    const { date, description, amount, category, notes, asset } = req.body;
    const type = Number(amount) >= 0 ? 'income' : 'expense';
    const transaction = await Transaction.create({
      date,
      description,
      amount,
      category: asset ? null : category || null,
      asset: asset || null,
      type,
      notes,
      source: 'manual'
    });
    res.status(201).json(transaction);
  } catch (err) {
    next(err);
  }
});

// PUT update a transaction (e.g. assign a category)
router.put('/:id', async (req, res, next) => {
  try {
    const updates = {};
    for (const field of ['date', 'description', 'amount', 'category', 'notes', 'asset']) {
      if (Object.prototype.hasOwnProperty.call(req.body, field)) {
        updates[field] = req.body[field];
      }
    }
    if (updates.amount !== undefined) {
      updates.amount = Number(updates.amount);
      if (!Number.isFinite(updates.amount)) {
        return res.status(400).json({ error: 'Amount must be a valid number' });
      }
      updates.type = updates.amount >= 0 ? 'income' : 'expense';
    }
    if (updates.category === '') updates.category = null;
    if (updates.asset === '') updates.asset = null;
    if (updates.asset) updates.category = null;
    const transaction = await Transaction.findByIdAndUpdate(req.params.id, updates, {
      new: true,
      runValidators: true
    }).populate('category', 'name color').populate('asset', 'name');
    if (!transaction) return res.status(404).json({ error: 'Transaction not found' });
    res.json(transaction);
  } catch (err) {
    next(err);
  }
});

// DELETE a transaction
router.delete('/:id', async (req, res, next) => {
  try {
    const transaction = await Transaction.findByIdAndDelete(req.params.id);
    if (!transaction) return res.status(404).json({ error: 'Transaction not found' });
    res.json({ success: true });
  } catch (err) {
    next(err);
  }
});

// GET /summary?month=YYYY-MM - totals for the dashboard
router.get('/monthly-summary', async (req, res, next) => {
  try {
    const startingBalance = await StartingBalance.findOne({ key: 'primary' });
    const startDate = startingBalance?.effectiveDate || new Date(Date.UTC(2026, 5, 1));
    const transactions = await Transaction.find({ date: { $gte: startDate }, asset: null }).select('date amount');
    const monthlyTotals = new Map();

    for (const transaction of transactions) {
      const date = new Date(transaction.date);
      const key = `${date.getUTCFullYear()}-${String(date.getUTCMonth() + 1).padStart(2, '0')}`;
      const totals = monthlyTotals.get(key) || { income: 0, expenses: 0 };
      if (transaction.amount >= 0) totals.income += transaction.amount;
      else totals.expenses += Math.abs(transaction.amount);
      monthlyTotals.set(key, totals);
    }

    const now = new Date();
    const latestTransactionMonth = [...monthlyTotals.keys()].sort().at(-1);
    const lastMonth = latestTransactionMonth && latestTransactionMonth > now.toISOString().slice(0, 7)
      ? latestTransactionMonth
      : now.toISOString().slice(0, 7);
    const firstYear = startDate.getUTCFullYear();
    const firstMonth = startDate.getUTCMonth();
    const [lastYear, lastMonthNumber] = lastMonth.split('-').map(Number);
    const months = [];

    let year = firstYear;
    let monthIndex = firstMonth;
    while (year < lastYear || (year === lastYear && monthIndex <= lastMonthNumber - 1)) {
      const month = `${year}-${String(monthIndex + 1).padStart(2, '0')}`;
      months.push({ month, ...(monthlyTotals.get(month) || { income: 0, expenses: 0 }) });
      monthIndex++;
      if (monthIndex === 12) {
        monthIndex = 0;
        year++;
      }
    }

    res.json(months.reverse());
  } catch (err) {
    next(err);
  }
});

router.get('/analytics', async (req, res, next) => {
  try {
    const { month, interval = 'day' } = req.query;
    if (!/^\d{4}-(0[1-9]|1[0-2])$/.test(month || '') || !['day', 'week', 'month'].includes(interval)) {
      return res.status(400).json({ error: 'Provide a valid month and interval (day, week, or month).' });
    }

    const [year, monthNumber] = month.split('-').map(Number);
    const selectedMonthStart = new Date(Date.UTC(year, monthNumber - 1, 1));
    const end = new Date(Date.UTC(year, monthNumber, 1));
    const startingBalance = await StartingBalance.findOne({ key: 'primary' });
    const effectiveDate = startingBalance?.effectiveDate || new Date(Date.UTC(2026, 5, 1));
    const start = interval === 'month'
      ? new Date(Date.UTC(effectiveDate.getUTCFullYear(), effectiveDate.getUTCMonth(), 1))
      : selectedMonthStart;

    const transactions = await Transaction.find({
      date: { $gte: start, $lt: end },
      asset: null,
      amount: { $lt: 0 }
    }).populate('category', 'name color').sort({ date: 1 });

    const categoriesById = new Map();
    const totals = new Map();
    for (const transaction of transactions) {
      const id = transaction.category?._id.toString() || 'uncategorized';
      categoriesById.set(id, transaction.category
        ? { id, name: transaction.category.name, color: transaction.category.color }
        : { id, name: 'Uncategorized', color: '#9A9689' });

      const date = new Date(transaction.date);
      let key;
      let label;
      if (interval === 'day') {
        key = date.toISOString().slice(0, 10);
        label = String(date.getUTCDate());
      } else if (interval === 'week') {
        const weekStart = new Date(Date.UTC(date.getUTCFullYear(), date.getUTCMonth(), date.getUTCDate()));
        weekStart.setUTCDate(weekStart.getUTCDate() - ((weekStart.getUTCDay() + 6) % 7));
        key = weekStart.toISOString().slice(0, 10);
        label = `Week of ${weekStart.toLocaleDateString('en-US', { month: 'short', day: 'numeric', timeZone: 'UTC' })}`;
      } else {
        key = date.toISOString().slice(0, 7);
        label = date.toLocaleDateString('en-US', { month: 'short', year: 'numeric', timeZone: 'UTC' });
      }

      const point = totals.get(key) || { period: key, label };
      point[id] = (point[id] || 0) + Math.abs(transaction.amount);
      totals.set(key, point);
    }

    const periods = [];
    if (interval === 'day') {
      const daysInMonth = new Date(Date.UTC(year, monthNumber, 0)).getUTCDate();
      for (let day = 1; day <= daysInMonth; day++) {
        const key = `${month}-${String(day).padStart(2, '0')}`;
        periods.push(totals.get(key) || { period: key, label: String(day) });
      }
    } else if (interval === 'week') {
      const cursor = new Date(selectedMonthStart);
      while (cursor < end) {
        const weekStart = new Date(cursor);
        weekStart.setUTCDate(weekStart.getUTCDate() - ((weekStart.getUTCDay() + 6) % 7));
        const key = weekStart.toISOString().slice(0, 10);
        periods.push(totals.get(key) || {
          period: key,
          label: `Week of ${weekStart.toLocaleDateString('en-US', { month: 'short', day: 'numeric', timeZone: 'UTC' })}`
        });
        cursor.setUTCDate(cursor.getUTCDate() + 7);
      }
    } else {
      const cursor = new Date(start);
      while (cursor < end) {
        const key = cursor.toISOString().slice(0, 7);
        periods.push(totals.get(key) || {
          period: key,
          label: cursor.toLocaleDateString('en-US', { month: 'short', year: 'numeric', timeZone: 'UTC' })
        });
        cursor.setUTCMonth(cursor.getUTCMonth() + 1);
      }
    }

    res.json({
      month,
      interval,
      categories: [...categoriesById.values()].sort((a, b) => a.name.localeCompare(b.name)),
      periods
    });
  } catch (err) {
    next(err);
  }
});

router.get('/summary/:month', async (req, res, next) => {
  try {
    const [year, mon] = req.params.month.split('-').map(Number);
    const start = new Date(Date.UTC(year, mon - 1, 1));
    const end = new Date(Date.UTC(year, mon, 1));
    const startingBalance = await StartingBalance.findOne({ key: 'primary' });
    const effectiveDate = startingBalance?.effectiveDate || new Date(Date.UTC(2026, 5, 1));

    const transactions = await Transaction.find({ date: { $gte: start, $lt: end }, asset: null }).populate(
      'category',
      'name color monthlyBudget'
    );
    const balanceTransactions = await Transaction.find({
      date: { $gte: effectiveDate, $lt: end }
    }).select('amount');

    const income = transactions
      .filter((t) => t.amount > 0)
      .reduce((sum, t) => sum + t.amount, 0);
    const expenses = transactions
      .filter((t) => t.amount < 0)
      .reduce((sum, t) => sum + Math.abs(t.amount), 0);

    const byCategory = {};
    const byIncomeCategory = {};
    for (const t of transactions) {
      if (t.amount === 0) continue;
      const key = t.category ? t.category._id.toString() : 'uncategorized';
      const target = t.amount < 0 ? byCategory : byIncomeCategory;
      if (!target[key]) {
        target[key] = {
          categoryId: t.category ? t.category._id : null,
          name: t.category ? t.category.name : 'Uncategorized',
          color: t.category ? t.category.color : '#9A9689',
          budget: t.category ? t.category.monthlyBudget : 0,
          amount: 0
        };
      }
      target[key].amount += Math.abs(t.amount);
    }

    res.json({
      month: req.params.month,
      income,
      expenses,
      net: income - expenses,
      startingBalance: startingBalance?.amount || 0,
      accountBalance:
        (startingBalance?.amount || 0) + balanceTransactions.reduce((sum, t) => sum + t.amount, 0),
      byCategory: Object.values(byCategory)
        .map(({ amount, ...category }) => ({ ...category, spent: amount }))
        .sort((a, b) => b.spent - a.spent),
      byIncomeCategory: Object.values(byIncomeCategory)
        .map(({ amount, ...category }) => ({ ...category, income: amount }))
        .sort((a, b) => b.income - a.income),
      transactionCount: transactions.length
    });
  } catch (err) {
    next(err);
  }
});

module.exports = router;
