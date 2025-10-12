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
  const [previewLimit, setPreviewLimit] = useState(200);
  const [previewOffset, setPreviewOffset] = useState(0);
  const [showPicker, setShowPicker] = useState(false);
  const [selectedColumns, setSelectedColumns] = useState([]);
  const [selectedSheet, setSelectedSheet] = useState('');
  const pollTimer = useRef(null);
  const virtRef = useRef(null);

  const authHeaders = () => {
    const token = localStorage.getItem('token');
    const h = {};
    if (token) h['Authorization'] = `Bearer ${token}`;
    return h;
  };

  const downloadSample = async () => {
    try {
      const res = await axios.get(
        `/api/misc/sample-excel?table=${encodeURIComponent(
          service,
        )}&sheet=${encodeURIComponent(sheetName || 'Sheet1')}`,
        { responseType: 'blob', headers: authHeaders() },
      );
      const type =
        res.headers['content-type'] ||
        'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet';
      saveAs(new Blob([res.data], { type }), `${service}-sample.xlsx`);
    } catch (e) {
      alert('Failed to download sample');
    }
  };

  const onSelect = (e) => {
    setFile(e.target.files?.[0] || null);
    setPreview(null);
    setResult(null);
    setError('');
    setProgress(null);
    setPreviewOffset(0);
  };

  const doPreview = async () => {
    if (!file) return;
    setBusy(true);
    setError('');
    setResult(null);
    try {
      const fd = new FormData();
      fd.append('file', file);
      fd.append('table', service);
      if (sheetName) fd.append('sheetName', sheetName);
      if (previewLimit) fd.append('previewLimit', String(previewLimit));
      if (previewOffset) fd.append('previewOffset', String(previewOffset));
      const res = await axios.post('/api/misc/upload-excel/preview', fd, {
        headers: { ...authHeaders(), 'Content-Type': 'multipart/form-data' },
      });
      setPreview(res.data);
      // initialize picker defaults
      setSelectedSheet(res.data.sheetName || sheetName || 'Sheet1');
      setSelectedColumns(res.data.mappedColumns || []);
      setProgress(null);
    } catch (e) {
      const msg = e?.response?.data?.error || e.message || 'Preview failed';
      const expected = e?.response?.data?.expectedColumns;
      setError(expected ? `${msg}. Expected: ${expected.join(', ')}` : msg);
    } finally {
      setBusy(false);
    }
  };

  const loadMorePreview = async () => {
    if (!file) return;
    const nextOffset = preview?.nextOffset ?? 0;
    if (nextOffset >= (preview?.totalRows ?? 0)) return;
    setPreviewOffset(nextOffset);
    await doPreview();
  };

  const doConfirm = async () => {
    if (!preview?.tempFileId) return;
    setBusy(true);
    setError('');
    setResult(null);
    startPolling(preview.tempFileId);
    try {
      const body = { tempFileId: preview.tempFileId, table: service };
      // Use user-selected sheet if specified
      const effectiveSheet = selectedSheet || sheetName;
      if (effectiveSheet) body.sheetName = effectiveSheet;
      if (selectedColumns && selectedColumns.length)
        body.selectedColumns = selectedColumns;
      const res = await axios.post('/api/misc/upload-excel/confirm', body, {
        headers: { ...authHeaders(), 'Content-Type': 'application/json' },
      });
      setResult(res.data);
      await fetchProgress(preview.tempFileId, true);
    } catch (e) {
      setError(e?.response?.data?.error || e.message || 'Import failed');
    } finally {
      setBusy(false);
      stopPolling();
    }
  };

  const stopUpload = async () => {
    try {
      const id = preview?.tempFileId;
      if (!id) return;
      await axios.post(
        `/api/misc/upload-excel/cancel/${encodeURIComponent(id)}`,
        {},
        { headers: authHeaders() },
      );
      // Immediately fetch progress to update UI with cancelRequested flag
      await fetchProgress(id);
    } catch (_) {
      // ignore
    }
  };

  const downloadLog = async () => {
    const logUrl = result?.logUrl || progress?.logUrl;
    if (!logUrl) return;
    try {
      const res = await axios.get(logUrl, {
        responseType: 'blob',
        headers: authHeaders(),
      });
      const type =
        res.headers['content-type'] ||
        'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet';
      saveAs(new Blob([res.data], { type }), `${service}-import-log.xlsx`);
    } catch (e) {
      alert('Failed to download log');
    }
  };

  const fetchProgress = async (id, finalTick = false) => {
    try {
      const res = await axios.get(
        `/api/misc/upload-excel/status/${encodeURIComponent(id)}`,
        { headers: authHeaders() },
      );
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
    setProgress({
      percent: 0,
      processed: 0,
      total: preview?.totalRows || 0,
      done: false,
    });
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
          <select
            value={service}
            onChange={(e) => setService(e.target.value)}
            className="border rounded px-2 py-1 ml-2"
          >
            {SERVICES.map((s) => (
              <option key={s.key} value={s.key}>
                {s.label}
              </option>
            ))}
          </select>
        </div>
        <div>
          <label className="text-sm">Sheet Name</label>
          <input
            value={sheetName}
            onChange={(e) => setSheetName(e.target.value)}
            className="border rounded px-2 py-1 ml-2"
            style={{ width: 160 }}
          />
        </div>
        <button
          onClick={downloadSample}
          className="bg-gray-800 text-white rounded px-3 py-1"
        >
          Download Sample
        </button>
      </div>

      <div className="flex items-center gap-3">
        <input type="file" accept=".xlsx" onChange={onSelect} />
        <button
          disabled={!file || busy}
          onClick={doPreview}
          className="bg-blue-600 text-white rounded px-3 py-1 disabled:opacity-50"
        >
          Preview
        </button>
        {preview && (
          <button
            disabled={busy}
            onClick={doConfirm}
            className="bg-green-600 text-white rounded px-3 py-1"
          >
            Final Submit
          </button>
        )}
        {progress && (
          <div className="flex items-center gap-2">
            <CircularProgress
              variant="determinate"
              value={progress.percent || 0}
              size={24}
            />
            <span className="text-xs text-gray-700">
              {progress.percent || 0}%
            </span>
            {!progress.done && (
              <button
                onClick={stopUpload}
                className="bg-red-600 text-white rounded px-2 py-0.5 text-xs"
              >
                Stop
              </button>
            )}
            {progress.canceled && (
              <span className="text-xs text-red-700">Canceled</span>
            )}
          </div>
        )}
        {(result?.logUrl || progress?.logUrl) && (
          <button
            onClick={downloadLog}
            className="bg-indigo-600 text-white rounded px-3 py-1"
          >
            Download Log
          </button>
        )}
      </div>

      {error && <div className="text-red-600 text-sm">{error}</div>}

      {preview && (
        <div className="border rounded p-3">
          <div className="text-sm flex flex-wrap gap-3 items-center">
            <span>
              Service: <b>{service}</b>
            </span>
            <span>
              Sheet: <b>{preview.sheetName}</b>
            </span>
            <span>Rows: {preview.totalRows}</span>
            <span>
              Showing: {preview.previewRows?.length || 0} of {preview.totalRows}
            </span>
            {preview.hasMore && (
              <button
                onClick={loadMorePreview}
                className="bg-gray-200 border rounded px-2 py-0.5 text-xs"
              >
                Load next {previewLimit}
              </button>
            )}
            <button
              onClick={() => setShowPicker(true)}
              className="bg-amber-600 text-white rounded px-2 py-0.5 text-xs"
            >
              Select Sheet & Columns
            </button>
          </div>
          <div className="text-sm">
            Missing: {preview.missingColumns?.join(', ') || 'none'} | Extra:{' '}
            {preview.extraColumns?.join(', ') || 'none'}
          </div>
          <div className="mt-3">
            {/* Header grid */}
            <div
              className="bg-gray-50 border rounded-t"
              style={{
                display: 'grid',
                gridTemplateColumns: `repeat(${
                  preview.mappedColumns?.length || 0
                }, minmax(100px, 1fr))`,
              }}
            >
              {preview.mappedColumns?.map((h) => (
                <div
                  key={h}
                  className="border-r last:border-r-0 px-1 py-0.5 font-medium text-xs"
                >
                  {h}
                </div>
              ))}
            </div>
            {/* Virtualized rows */}
            <VirtualizedRows
              ref={virtRef}
              rows={preview.previewRows || []}
              cols={preview.mappedColumns || []}
              height={420}
              rowHeight={28}
            />
          </div>
        </div>
      )}

      {/* Sheet & Column Picker Modal */}
      <PickerModal
        open={showPicker}
        onClose={() => setShowPicker(false)}
        sheetNames={preview?.sheetNames || []}
        currentSheet={selectedSheet || preview?.sheetName || sheetName}
        mappedColumns={preview?.mappedColumns || []}
        selectedColumns={selectedColumns}
        setSelectedColumns={setSelectedColumns}
        onChangeSheet={(sn) => {
          setSelectedSheet(sn);
          setSheetName(sn);
        }}
        onRefetch={async () => {
          // re-run preview for the newly selected sheet
          setPreviewOffset(0);
          await doPreview();
        }}
      />

      {result && (
        <div className="border rounded p-3 space-y-2">
          <div className="text-sm">
            Inserted: {result.inserted}, Failed: {result.failed}, Total:{' '}
            {result.total}
          </div>
          {typeof result.processedRows === 'number' && (
            <div className="text-xs text-gray-600">
              Processed rows: {result.processedRows}
            </div>
          )}
          <div className="text-sm">Sheet Processed: {result.sheetName}</div>
          {typeof result.durationMs === 'number' && (
            <div className="text-xs text-gray-600">
              Duration: {Math.round(result.durationMs)} ms
            </div>
          )}
          {!!(result.sampleFailures && result.sampleFailures.length) && (
            <div className="mt-2">
              <div className="font-medium text-sm mb-1">
                Sample Errors ({result.sampleFailures.length} shown)
              </div>
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

// Modal popup for sheet and column selection
function PickerModal({
  open,
  onClose,
  sheetNames,
  currentSheet,
  mappedColumns,
  selectedColumns,
  setSelectedColumns,
  onChangeSheet,
  onRefetch,
}) {
  if (!open) return null;
  const toggleCol = (c) => {
    if (!selectedColumns) return;
    if (selectedColumns.includes(c))
      setSelectedColumns(selectedColumns.filter((x) => x !== c));
    else setSelectedColumns([...selectedColumns, c]);
  };
  return (
    <div className="fixed inset-0 bg-black/40 flex items-center justify-center z-50">
      <div className="bg-white rounded shadow-lg p-4 w-[640px] max-w-[95vw]">
        <div className="flex items-center justify-between mb-3">
          <div className="font-semibold">Select Sheet & Columns</div>
          <button onClick={onClose} className="text-gray-500">
            ✕
          </button>
        </div>
        <div className="space-y-3">
          <div className="flex items-center gap-2">
            <div className="text-sm">Sheet</div>
            <select
              value={currentSheet}
              onChange={(e) => onChangeSheet(e.target.value)}
              className="border rounded px-2 py-1"
            >
              {(sheetNames || []).map((sn) => (
                <option key={sn} value={sn}>
                  {sn}
                </option>
              ))}
            </select>
            <button
              onClick={onRefetch}
              className="bg-blue-600 text-white rounded px-2 py-1 text-sm"
            >
              Fetch
            </button>
          </div>
          <div>
            <div className="text-sm mb-1">Columns to import/update</div>
            <div className="grid grid-cols-2 gap-1 max-h-56 overflow-auto border rounded p-2">
              {(mappedColumns || []).map((c) => (
                <label key={c} className="text-xs flex items-center gap-2">
                  <input
                    type="checkbox"
                    checked={(selectedColumns || []).includes(c)}
                    onChange={() => toggleCol(c)}
                  />
                  {c}
                </label>
              ))}
            </div>
          </div>
          <div className="text-xs text-gray-600">
            Note: On update, unselected columns will not be touched. On insert,
            unselected fields will be omitted and DB defaults will apply.
            Required columns are still needed for insert.
          </div>
        </div>
        <div className="mt-3 flex justify-end gap-2">
          <button onClick={onClose} className="border rounded px-3 py-1">
            Close
          </button>
        </div>
      </div>
    </div>
  );
}

// Virtualized row renderer for large datasets (no external deps)
const VirtualizedRows = React.forwardRef(function VirtualizedRows(props, ref) {
  const { rows, cols, height = 420, rowHeight = 36 } = props;
  const containerRef = useRef(null);
  React.useImperativeHandle(ref, () => ({ el: containerRef.current }));
  const [scrollTop, setScrollTop] = useState(0);

  const total = rows.length;
  const viewportCount = Math.ceil(height / rowHeight);
  const overscan = 8;
  const startIndex = Math.max(0, Math.floor(scrollTop / rowHeight) - overscan);
  const endIndex = Math.min(total, startIndex + viewportCount + overscan * 2);
  const items = [];
  for (let i = startIndex; i < endIndex; i++)
    items.push({ index: i, data: rows[i] });

  return (
    <div
      ref={containerRef}
      className="border border-t-0 rounded-b relative overflow-auto"
      style={{ height }}
      onScroll={(e) => setScrollTop(e.currentTarget.scrollTop)}
    >
      <div style={{ height: total * rowHeight, position: 'relative' }}>
        {items.map(({ index, data }) => (
          <div
            key={index}
            style={{
              position: 'absolute',
              top: index * rowHeight,
              left: 0,
              right: 0,
              height: rowHeight,
              display: 'grid',
              gridTemplateColumns: `repeat(${cols.length}, minmax(100px, 1fr))`,
            }}
            className="border-b last:border-b-0 text-xs"
          >
            {cols.map((h) => {
              const val = String(data?.[h] ?? '');
              return (
                <div
                  key={h}
                  className="px-1 py-0.5 whitespace-nowrap overflow-hidden text-ellipsis"
                  title={val}
                >
                  {val}
                </div>
              );
            })}
          </div>
        ))}
      </div>
    </div>
  );
});
