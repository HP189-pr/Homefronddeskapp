import React, { useEffect, useRef, useState } from 'react';
import axios from 'axios';
import { saveAs } from 'file-saver';
import { CircularProgress } from '@mui/material';

const SERVICES = [
  { key: 'Enrollment', label: 'Enrollment' },
  { key: 'Degree', label: 'Degree' },
  { key: 'Verification', label: 'Verification' },
  { key: 'ProvisionalRequest', label: 'Provisional' },
  { key: 'MigrationRequest', label: 'Migration' },
];

export default function Upload() {
  const [service, setService] = useState('Enrollment');
  const [sheetName, setSheetName] = useState('Sheet1');
  const [file, setFile] = useState(null);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState('');
  const [preview, setPreview] = useState(null);
  const [result, setResult] = useState(null);
  const [progress, setProgress] = useState(null); // { percent, processed, total, done, error, logUrl }
  const pollTimer = useRef(null);

  const authHeaders = () => {
    const token = localStorage.getItem('token');
    const h = {};
    if (token) h['Authorization'] = `Bearer ${token}`;
    return h;
  };

  const downloadSample = async () => {
    try {
      const res = await axios.get(`/api/misc/sample-excel?table=${encodeURIComponent(service)}&sheet=${encodeURIComponent(sheetName || 'Sheet1')}`,
        { responseType: 'blob', headers: authHeaders() });
      const type = res.headers['content-type'] || 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet';
      saveAs(new Blob([res.data], { type }), `${service}-sample.xlsx`);
    } catch (e) {
      alert('Failed to download sample');
    }
  };

  const onSelect = (e) => {
    setFile(e.target.files?.[0] || null);
    setPreview(null); setResult(null); setError(''); setProgress(null);
  };

  const doPreview = async () => {
    if (!file) return;
    setBusy(true); setError(''); setResult(null);
    try {
      const fd = new FormData();
      fd.append('file', file);
      fd.append('table', service);
      if (sheetName) fd.append('sheetName', sheetName);
      const res = await axios.post('/api/misc/upload-excel/preview', fd, {
        headers: { ...authHeaders(), 'Content-Type': 'multipart/form-data' },
      });
      setPreview(res.data);
      setProgress(null);
    } catch (e) {
  const msg = e?.response?.data?.error || e.message || 'Preview failed';
  const expected = e?.response?.data?.expectedColumns;
  setError(expected ? `${msg}. Expected: ${expected.join(', ')}` : msg);
    } finally { setBusy(false); }
  };

  const doConfirm = async () => {
    if (!preview?.tempFileId) return;
    setBusy(true); setError('');
    setResult(null);
    startPolling(preview.tempFileId);
    try {
      const body = { tempFileId: preview.tempFileId, table: service };
      if (sheetName) body.sheetName = sheetName;
      const res = await axios.post('/api/misc/upload-excel/confirm', body, { headers: { ...authHeaders(), 'Content-Type': 'application/json' } });
      setResult(res.data);
      await fetchProgress(preview.tempFileId, true);
    } catch (e) {
      setError(e?.response?.data?.error || e.message || 'Import failed');
    } finally { setBusy(false); stopPolling(); }
  };

  const downloadLog = async () => {
    const logUrl = result?.logUrl || progress?.logUrl;
    if (!logUrl) return;
    try {
      const res = await axios.get(logUrl, { responseType: 'blob', headers: authHeaders() });
      const type = res.headers['content-type'] || 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet';
      saveAs(new Blob([res.data], { type }), `${service}-import-log.xlsx`);
    } catch (e) { alert('Failed to download log'); }
  };

  const fetchProgress = async (id, finalTick = false) => {
    try {
      const res = await axios.get(`/api/misc/upload-excel/status/${encodeURIComponent(id)}`, { headers: authHeaders() });
      const data = res.data?.found ? res.data : null;
      setProgress(data);
      if (data?.error && !error) setError(data.error);
      if (finalTick) return;
      if (!res.data?.found || res.data?.done) {
        stopPolling();
      }
    } catch (_) {
      // ignore errors during polling
    }
  };

  const startPolling = (id) => {
    stopPolling();
    setProgress({ percent: 0, processed: 0, total: preview?.totalRows || 0, done: false });
    pollTimer.current = setInterval(() => fetchProgress(id), 700);
  };

  const stopPolling = () => {
    if (pollTimer.current) {
      clearInterval(pollTimer.current);
      pollTimer.current = null;
    }
  };

  useEffect(() => () => stopPolling(), []);

  return (
    <div className="p-4 space-y-4">
      <h2 className="text-lg font-semibold">Bulk Upload</h2>
      <div className="flex flex-wrap gap-3 items-end">
        <div>
          <label className="text-sm">Service</label>
          <select value={service} onChange={(e)=> setService(e.target.value)} className="border rounded px-2 py-1 ml-2">
            {SERVICES.map(s => <option key={s.key} value={s.key}>{s.label}</option>)}
          </select>
        </div>
        <div>
          <label className="text-sm">Sheet Name</label>
          <input value={sheetName} onChange={(e)=> setSheetName(e.target.value)} className="border rounded px-2 py-1 ml-2" style={{ width: 160 }} />
        </div>
        <button onClick={downloadSample} className="bg-gray-800 text-white rounded px-3 py-1">Download Sample</button>
      </div>

      <div className="flex items-center gap-3">
        <input type="file" accept=".xlsx" onChange={onSelect} />
        <button disabled={!file || busy} onClick={doPreview} className="bg-blue-600 text-white rounded px-3 py-1 disabled:opacity-50">Preview</button>
        {preview && (
          <button disabled={busy} onClick={doConfirm} className="bg-green-600 text-white rounded px-3 py-1">Final Submit</button>
        )}
        {progress && (
          <div className="flex items-center gap-2">
            <CircularProgress variant="determinate" value={progress.percent || 0} size={24} />
            <span className="text-xs text-gray-700">{progress.percent || 0}%</span>
          </div>
        )}
        {(result?.logUrl || progress?.logUrl) && (
          <button onClick={downloadLog} className="bg-indigo-600 text-white rounded px-3 py-1">Download Log</button>
        )}
      </div>

      {error && <div className="text-red-600 text-sm">{error}</div>}

      {preview && (
        <div className="border rounded p-3">
          <div className="text-sm">Service: <b>{service}</b>, Sheet: <b>{preview.sheetName}</b>, Rows: {preview.totalRows}</div>
          <div className="text-sm">Missing: {preview.missingColumns?.join(', ') || 'none'} | Extra: {preview.extraColumns?.join(', ') || 'none'}</div>
          <div className="overflow-auto mt-2">
            <table className="min-w-full text-sm border">
              <thead>
                <tr>
                  {preview.mappedColumns?.map((h) => (
                    <th key={h} className="border px-2 py-1 text-left bg-gray-50">{h}</th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {preview.previewRows?.map((row, idx) => (
                  <tr key={idx}>
                    {preview.mappedColumns?.map((h) => (
                      <td key={h} className="border px-2 py-1">{String(row[h] ?? '')}</td>
                    ))}
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {result && (
        <div className="border rounded p-3 space-y-2">
          <div className="text-sm">Inserted: {result.inserted}, Failed: {result.failed}, Total: {result.total}</div>
          {typeof result.processedRows === 'number' && (
            <div className="text-xs text-gray-600">Processed rows: {result.processedRows}</div>
          )}
          <div className="text-sm">Sheet Processed: {result.sheetName}</div>
          {typeof result.durationMs === 'number' && (
            <div className="text-xs text-gray-600">Duration: {Math.round(result.durationMs)} ms</div>
          )}
          {!!(result.sampleFailures && result.sampleFailures.length) && (
            <div className="mt-2">
              <div className="font-medium text-sm mb-1">Sample Errors ({result.sampleFailures.length} shown)</div>
              <div className="max-h-40 overflow-auto border rounded">
                <table className="min-w-full text-xs">
                  <thead className="bg-gray-50">
                    <tr>
                      <th className="px-2 py-1 text-left">Row</th>
                      <th className="px-2 py-1 text-left">Reason</th>
                    </tr>
                  </thead>
                  <tbody>
                    {result.sampleFailures.map((f, i) => (
                      <tr key={i} className="border-t">
                        <td className="px-2 py-1">{f.row}</td>
                        <td className="px-2 py-1">{String(f.reason || '')}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          )}
        </div>
      )}
    </div>
  );
}
