const express = require('express');
const multer = require('multer');
const router = express.Router();
const Transaction = require('../models/Transaction');
const { parseStatement } = require('../utils/parseStatement');

const upload = multer({ storage: multer.memoryStorage(), limits: { fileSize: 10 * 1024 * 1024 } });

// POST /api/import - upload a CSV/XLSX bank statement export
// Skips rows that match a transaction already imported (by importHash),
// so re-uploading an overlapping statement won't create duplicates.
router.post('/', upload.single('file'), async (req, res, next) => {
  try {
    if (!req.file) return res.status(400).json({ error: 'No file uploaded' });

    const parsedRows = parseStatement(req.file.buffer, req.file.originalname);
    if (!parsedRows.length) {
      return res.status(400).json({ error: 'No valid transactions found in this file' });
    }

    const hashes = parsedRows.map((r) => r.importHash);
    const existing = await Transaction.find({ importHash: { $in: hashes } }).select(
      'importHash'
    );
    const existingHashes = new Set(existing.map((t) => t.importHash));

    const newRows = parsedRows.filter((r) => !existingHashes.has(r.importHash));
    const inserted = newRows.length ? await Transaction.insertMany(newRows) : [];

    res.json({
      totalRowsFound: parsedRows.length,
      imported: inserted.length,
      skippedDuplicates: parsedRows.length - inserted.length
    });
  } catch (err) {
    next(err);
  }
});

module.exports = router;
