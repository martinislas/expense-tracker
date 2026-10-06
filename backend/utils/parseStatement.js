const { parse } = require('csv-parse/sync');
const XLSX = require('xlsx');
const crypto = require('crypto');

/**
 * Turns an uploaded bank statement (CSV or XLSX) into a normalized
 * array of { date, description, amount } rows.
 *
 * Bank export column names vary, so this looks for common header
 * patterns (date / description / debit / credit / amount) rather
 * than assuming an exact schema. Adjust HEADER_MAP if your ABA
 * export uses different column titles.
 */

const HEADER_MAP = {
  date: ['date', 'transaction date', 'posting date', 'value date'],
  description: ['description', 'details', 'narrative', 'memo', 'transaction details'],
  debit: ['debit', 'withdrawal', 'money out', 'out', 'expense'],
  credit: ['credit', 'deposit', 'money in', 'in', 'income'],
  amount: ['amount', 'transaction amount']
};

function normalizeHeader(h) {
  return String(h || '').replace(/^\uFEFF/, '').trim().toLowerCase();
}

function findColumn(headers, candidates) {
  const normalized = headers.map(normalizeHeader);
  for (const candidate of candidates) {
    const idx = normalized.indexOf(candidate);
    if (idx !== -1) return idx;
  }
  return -1;
}

function rowsFromCSV(buffer) {
  const text = buffer.toString('utf-8');
  const records = parse(text, { skip_empty_lines: true });
  return records;
}

function rowsFromXLSX(buffer) {
  const workbook = XLSX.read(buffer, { type: 'buffer' });
  const sheet = workbook.Sheets[workbook.SheetNames[0]];
  return XLSX.utils.sheet_to_json(sheet, { header: 1, raw: false });
}

function parseAmount(value) {
  if (!value) return 0;
  const cleaned = String(value).replace(/[^0-9.\-]/g, '');
  const n = parseFloat(cleaned);
  return isNaN(n) ? 0 : n;
}

function parseDate(value) {
  if (!value) return null;
  const monthDate = String(value).trim().match(/^([A-Za-z]{3,9})\s+(\d{1,2}),?\s+(\d{4})$/);
  if (monthDate) {
    const months = [
      'jan', 'feb', 'mar', 'apr', 'may', 'jun',
      'jul', 'aug', 'sep', 'oct', 'nov', 'dec'
    ];
    const month = months.indexOf(monthDate[1].slice(0, 3).toLowerCase());
    if (month !== -1) {
      return new Date(Date.UTC(Number(monthDate[3]), month, Number(monthDate[2])));
    }
  }
  const d = new Date(value);
  if (!isNaN(d.getTime())) return d;
  // Try DD/MM/YYYY common in Cambodian bank exports
  const parts = String(value).split(/[\/\-]/);
  if (parts.length === 3) {
    const [a, b, c] = parts;
    const alt = new Date(`${c}-${b}-${a}`);
    if (!isNaN(alt.getTime())) return alt;
  }
  return null;
}

function parseStatement(buffer, originalName) {
  const isExcel = /\.xlsx?$/i.test(originalName || '');
  const rows = isExcel ? rowsFromXLSX(buffer) : rowsFromCSV(buffer);
  if (!rows.length) return [];

  // Some bank exports put blank/padded rows before the actual column headers.
  // Find the first row that looks like a complete transaction header.
  let headerRow = -1;
  let columns;
  for (let i = 0; i < Math.min(rows.length, 25); i++) {
    const headers = rows[i];
    const candidate = {
      dateCol: findColumn(headers, HEADER_MAP.date),
      descCol: findColumn(headers, HEADER_MAP.description),
      debitCol: findColumn(headers, HEADER_MAP.debit),
      creditCol: findColumn(headers, HEADER_MAP.credit),
      amountCol: findColumn(headers, HEADER_MAP.amount)
    };
    if (
      candidate.dateCol !== -1 &&
      candidate.descCol !== -1 &&
      (candidate.amountCol !== -1 || candidate.debitCol !== -1 || candidate.creditCol !== -1)
    ) {
      headerRow = i;
      columns = candidate;
      break;
    }
  }

  if (headerRow === -1) {
    throw new Error(
      'Could not find transaction columns in this file. Expected date, description, and amount/debit/credit columns.'
    );
  }

  const { dateCol, descCol, debitCol, creditCol, amountCol } = columns;
  const results = [];
  for (let i = headerRow + 1; i < rows.length; i++) {
    const row = rows[i];
    if (!row || row.every((c) => !c && c !== 0)) continue;

    const date = parseDate(row[dateCol]);
    const description = String(row[descCol] || '').trim();
    if (!date || !description) continue;

    let amount;
    if (amountCol !== -1) {
      amount = parseAmount(row[amountCol]);
    } else {
      const debit = parseAmount(row[debitCol]);
      const credit = parseAmount(row[creditCol]);
      amount = credit - debit;
    }
    if (amount === 0) continue;

    const importHash = crypto
      .createHash('sha1')
      .update(`${date.toISOString()}|${description}|${amount}`)
      .digest('hex');

    results.push({
      date,
      description,
      amount,
      type: amount >= 0 ? 'income' : 'expense',
      source: 'import',
      importHash
    });
  }

  return results;
}

module.exports = { parseStatement };
