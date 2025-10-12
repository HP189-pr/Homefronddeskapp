import React, { useState } from 'react';
import PropTypes from 'prop-types';
import axios from 'axios';
import { saveAs } from 'file-saver';

/**
 * ExcelUploadPreview
 * - Select a table/model (Sequelize model name, e.g., 'Verification')
 * - Pick an Excel file
 * - Preview maps columns and shows first rows
 * - Confirm uploads to DB and returns a log file link
 */
export default function ExcelUploadPreview({ defaultTable = 'Verification' }) {
  const [table, setTable] = useState(defaultTable);
  const [file, setFile] = useState(null);
  const [preview, setPreview] = useState(null);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState('');
  const [result, setResult] = useState(null);

  const onSelectFile = (e) => {
    setFile(e.target.files?.[0] || null);
    setPreview(null);
    setResult(null);
    setError('');
  };

  const doPreview = async () => {
    if (!file) return;
    setBusy(true);
    setError('');
    setResult(null);
    try {
      const fd = new FormData();
      fd.append('file', file);
      fd.append('table', table);
      const res = await axios.post('/api/misc/upload-excel/preview', fd, {
        headers: { 'Content-Type': 'multipart/form-data' },
      });
      setPreview(res.data);
    } catch (e) {
      setError(e?.response?.data?.error || e.message || 'Preview failed');
    } finally {
      setBusy(false);
    }
  };

  const doConfirm = async () => {
    if (!preview?.tempFileId) return;
    setBusy(true);
    setError('');
    try {
      const res = await axios.post('/api/misc/upload-excel/confirm', {
        tempFileId: preview.tempFileId,
        table: preview.table,
      });
      setResult(res.data);
    } catch (e) {
      setError(e?.response?.data?.error || e.message || 'Import failed');
    } finally {
      setBusy(false);
    }
  };

  const downloadLog = async () => {
    if (!result?.logUrl) return;
    try {
      const res = await axios.get(result.logUrl, { responseType: 'blob' });
      const contentType =
        res.headers['content-type'] ||
        'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet';
      const blob = new Blob([res.data], { type: contentType });
      saveAs(blob, 'import-log.xlsx');
    } catch (e) {
      setError('Failed to download log');
    }
  };

  const generateSamplePdf = async () => {
    setBusy(true);
    setError('');
    try {
      const payload = {
        widthMm: 210,
        heightMm: 297,
        inline: true,
        filename: 'sample.pdf',
        elements: [
          {
            type: 'text',
            xMm: 20,
            yMm: 20,
            text: 'Hello PDF at 20mm,20mm',
            fontSize: 12,
          },
          {
            type: 'text',
            xMm: 20,
            yMm: 30,
            text: 'Exactly positioned for pre-printed stationary',
            fontSize: 10,
          },
        ],
      };
      const res = await axios.post('/api/misc/export/pdf', payload, {
        responseType: 'blob',
        headers: { 'Content-Type': 'application/json' },
      });
      const blob = new Blob([res.data], { type: 'application/pdf' });
      const url = URL.createObjectURL(blob);
      window.open(url, '_blank');
      setTimeout(() => URL.revokeObjectURL(url), 10000);
    } catch (e) {
      setError('PDF generation failed');
    } finally {
      setBusy(false);
    }
  };

  return (
    <div className="p-4 space-y-3">
      <h2 className="text-lg font-semibold">Excel Upload with Preview</h2>
      <div className="flex gap-3 items-center">
        <label className="text-sm">Table/Model</label>
        <input
          type="text"
          value={table}
          onChange={(e) => setTable(e.target.value)}
          className="border rounded px-2 py-1"
          placeholder="Sequelize model, e.g., Verification"
        />
        <input type="file" accept=".xlsx,.xls" onChange={onSelectFile} />
        <button
          disabled={!file || busy}
          onClick={doPreview}
          className="bg-blue-600 text-white rounded px-3 py-1 disabled:opacity-50"
        >
          {busy ? 'Please wait…' : 'Preview'}
        </button>
      </div>

      {error && <div className="text-red-600 text-sm">{error}</div>}

      {preview && (
        <div className="border rounded p-3">
          <div className="text-sm">
            Rows: {preview.totalRows}, Missing columns:{' '}
            {preview.missingColumns?.join(', ') || 'none'}, Extras:{' '}
            {preview.extraColumns?.join(', ') || 'none'}
          </div>
          <div className="overflow-auto">
            <table className="min-w-full text-sm border mt-2">
              <thead>
                <tr>
                  {preview.mappedColumns?.map((h) => (
                    <th
                      key={h}
                      className="border px-2 py-1 text-left bg-gray-50"
                    >
                      {h}
                    </th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {preview.previewRows?.map((row, idx) => (
                  <tr key={idx}>
                    {preview.mappedColumns?.map((h) => (
                      <td key={h} className="border px-2 py-1">
                        {String(row[h] ?? '')}
                      </td>
                    ))}
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
          <div className="mt-3 flex gap-2">
            <button
              onClick={doConfirm}
              disabled={busy}
              className="bg-green-600 text-white rounded px-3 py-1 disabled:opacity-50"
            >
              Confirm Upload
            </button>
          </div>
        </div>
      )}

      {result && (
        <div className="border rounded p-3 space-y-2">
          <div className="text-sm">
            Inserted: {result.inserted}, Failed: {result.failed}, Total:{' '}
            {result.total}
          </div>
          <div className="flex gap-2">
            <button
              onClick={downloadLog}
              className="bg-indigo-600 text-white rounded px-3 py-1"
            >
              Download Log
            </button>
          </div>
        </div>
      )}

      <div className="pt-4">
        <h3 className="font-medium">PDF: exact positioning demo</h3>
        <button
          onClick={generateSamplePdf}
          className="mt-2 bg-gray-800 text-white rounded px-3 py-1"
        >
          Open sample PDF
        </button>
      </div>
    </div>
  );
}

ExcelUploadPreview.propTypes = {
  defaultTable: PropTypes.string,
};
