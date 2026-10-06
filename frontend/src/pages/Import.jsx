import { useState, useRef } from 'react';
import { api } from '../api';

export default function Import() {
  const [status, setStatus] = useState(null);
  const [busy, setBusy] = useState(false);
  const inputRef = useRef();

  const handleFile = async (file) => {
    if (!file) return;
    setBusy(true);
    setStatus(null);
    try {
      const result = await api.importStatement(file);
      setStatus({
        type: 'success',
        message: `Imported ${result.imported} new transactions (${result.skippedDuplicates} duplicates skipped, ${result.totalRowsFound} rows read).`
      });
    } catch (err) {
      setStatus({ type: 'error', message: err.message });
    } finally {
      setBusy(false);
      if (inputRef.current) inputRef.current.value = '';
    }
  };

  return (
    <>
      <h1 className="page-title">Import statement</h1>
      <p className="page-subtitle">
        ABA Bank doesn't offer a personal transaction feed API, so the closest thing to
        automatic syncing is exporting your statement from the ABA Mobile app or online
        banking (CSV or Excel) and importing it here. Re-uploading an overlapping statement
        is safe — duplicate rows are skipped automatically.
      </p>

      <div
        className="dropzone"
        onDragOver={(e) => e.preventDefault()}
        onDrop={(e) => {
          e.preventDefault();
          handleFile(e.dataTransfer.files[0]);
        }}
      >
        <p>Drag a CSV or XLSX statement export here, or</p>
        <input
          ref={inputRef}
          type="file"
          accept=".csv,.xlsx,.xls"
          onChange={(e) => handleFile(e.target.files[0])}
          disabled={busy}
        />
      </div>

      {busy && <div className="status-msg">Importing…</div>}
      {status && <div className={`status-msg ${status.type}`}>{status.message}</div>}

      <div className="section-label">How to export from ABA</div>
      <div style={{ color: 'var(--ink-soft)', fontSize: 14 }}>
        In the ABA Mobile app: Account → Statement → choose a date range → Export. On ABA
        Internet Banking, statements can be downloaded as Excel from the Accounts page. Column
        names vary between exports; this importer looks for common headers like "Date",
        "Description", "Debit"/"Credit" or a single "Amount" column.
      </div>
    </>
  );
}
