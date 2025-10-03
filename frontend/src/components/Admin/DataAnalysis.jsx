import React, { useMemo, useState } from 'react';
import axios from 'axios';
import { saveAs } from 'file-saver';

export default function DataAnalysis() {
  const [normalized, setNormalized] = useState(true);
  const [dryRun, setDryRun] = useState(true);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState('');
  const [result, setResult] = useState(null); // { duplicates, groups, details }
  const [pruneResult, setPruneResult] = useState(null); // { ok, groups, toDelete, deleted, kept, logUrl }
  const [triplePruneResult, setTriplePruneResult] = useState(null); // result for triple prune
  // Enrollment analysis state
  const [enrDupResult, setEnrDupResult] = useState(null);
  const [enrMismatchResult, setEnrMismatchResult] = useState(null);

  const authHeaders = useMemo(() => {
    const token = localStorage.getItem('token');
    const h = {};
    if (token) h['Authorization'] = `Bearer ${token}`;
    return h;
  }, []);

  const runCheck = async () => {
    setBusy(true); setError(''); setResult(null);
    try {
      const res = await axios.get(`/api/misc/degree/duplicates/enrollment?normalized=${normalized ? 'true' : 'false'}&format=json`, {
        headers: authHeaders,
      });
      setResult(res.data || null);
    } catch (e) {
      setError(e?.response?.data?.error || e.message || 'Failed to run duplicate check');
    } finally { setBusy(false); }
  };

  const downloadExcel = async () => {
    try {
      const res = await axios.get(`/api/misc/degree/duplicates/enrollment?normalized=${normalized ? 'true' : 'false'}&format=xlsx`, {
        responseType: 'blob',
        headers: authHeaders,
      });
      const type = res.headers['content-type'] || 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet';
      saveAs(new Blob([res.data], { type }), `Degree-duplicate-enrollment${normalized ? '-normalized' : ''}.xlsx`);
    } catch (e) {
      setError(e?.response?.data?.error || e.message || 'Failed to download report');
    }
  };

  const pruneDuplicates = async () => {
    setBusy(true); setError(''); setPruneResult(null);
    try {
      const res = await axios.post(`/api/misc/degree/duplicates/enrollment/prune?normalized=${normalized ? 'true' : 'false'}&dryRun=${dryRun ? 'true' : 'false'}&keepOne=true`, {}, {
        headers: { ...authHeaders },
      });
      setPruneResult(res.data || null);
    } catch (e) {
      setError(e?.response?.data?.error || e.message || 'Failed to prune duplicates');
    } finally { setBusy(false); }
  };

  const pruneTripleDuplicates = async () => {
    setBusy(true); setError(''); setTriplePruneResult(null);
    try {
      const res = await axios.post(`/api/misc/degree/duplicates/triple/prune?normalized=${normalized ? 'true' : 'false'}&dryRun=${dryRun ? 'true' : 'false'}&keepOne=true`, {}, {
        headers: { ...authHeaders },
      });
      setTriplePruneResult(res.data || null);
    } catch (e) {
      setError(e?.response?.data?.error || e.message || 'Failed to prune exact duplicates');
    } finally { setBusy(false); }
  };

  // Enrollment: duplicates
  const runEnrollmentDupCheck = async () => {
    setBusy(true); setError(''); setEnrDupResult(null);
    try {
      const res = await axios.get(`/api/misc/enrollment/duplicates?normalized=${normalized ? 'true' : 'false'}&format=json`, { headers: authHeaders });
      setEnrDupResult(res.data || null);
    } catch (e) {
      setError(e?.response?.data?.error || e.message || 'Failed to run enrollment duplicate check');
    } finally { setBusy(false); }
  };
  const downloadEnrollmentDup = async () => {
    try {
      const res = await axios.get(`/api/misc/enrollment/duplicates?normalized=${normalized ? 'true' : 'false'}&format=xlsx`, { responseType: 'blob', headers: authHeaders });
      const type = res.headers['content-type'] || 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet';
      saveAs(new Blob([res.data], { type }), `Enrollment-duplicate${normalized ? '-normalized' : ''}.xlsx`);
    } catch (e) { setError(e?.response?.data?.error || e.message || 'Failed to download enrollment duplicates'); }
  };

  // Enrollment: mismatches
  const runEnrollmentMismatch = async () => {
    setBusy(true); setError(''); setEnrMismatchResult(null);
    try {
      const res = await axios.get(`/api/misc/enrollment/mismatch?format=json`, { headers: authHeaders });
      setEnrMismatchResult(res.data || null);
    } catch (e) { setError(e?.response?.data?.error || e.message || 'Failed to run enrollment mismatch'); }
    finally { setBusy(false); }
  };
  const downloadEnrollmentMismatch = async () => {
    try {
      const res = await axios.get(`/api/misc/enrollment/mismatch?format=xlsx`, { responseType: 'blob', headers: authHeaders });
      const type = res.headers['content-type'] || 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet';
      saveAs(new Blob([res.data], { type }), `Enrollment-mismatch.xlsx`);
    } catch (e) { setError(e?.response?.data?.error || e.message || 'Failed to download enrollment mismatch'); }
  };

  return (
    <div className="p-4 space-y-4">
      <h2 className="text-lg font-semibold">Data Analysis</h2>
      <div className="flex items-center gap-3">
        <label className="flex items-center gap-2 text-sm">
          <input type="checkbox" checked={normalized} onChange={(e) => setNormalized(e.target.checked)} />
          Compare enrollment_no ignoring case and spaces
        </label>
        <label className="flex items-center gap-2 text-sm">
          <input type="checkbox" checked={dryRun} onChange={(e) => setDryRun(e.target.checked)} />
          Dry run (don’t delete)
        </label>
        <button onClick={runCheck} disabled={busy} className="bg-blue-600 text-white rounded px-3 py-1 disabled:opacity-50">
          {busy ? 'Checking…' : 'Check Degree Duplicates'}
        </button>
        <button onClick={downloadExcel} className="bg-gray-800 text-white rounded px-3 py-1">Download Excel</button>
  <button onClick={pruneDuplicates} disabled={busy} className="bg-red-600 text-white rounded px-3 py-1 disabled:opacity-50">{busy ? 'Processing…' : 'Prune Duplicates (Enroll only)'} </button>
  <button onClick={pruneTripleDuplicates} disabled={busy} className="bg-red-700 text-white rounded px-3 py-1 disabled:opacity-50">{busy ? 'Processing…' : 'Prune Duplicates (Name+Enroll+Convo)'} </button>
      </div>

      {error && <div className="text-red-600 text-sm">{error}</div>}

      {result && (
        <div className="border rounded p-3 space-y-2">
          <div className="text-sm">Duplicate keys: <b>{result.duplicates || 0}</b> {result.normalized ? '(normalized)' : ''}</div>
          <div className="max-h-64 overflow-auto border rounded">
            <table className="min-w-full text-xs">
              <thead className="bg-gray-50">
                <tr>
                  <th className="px-2 py-1 text-left">dup_key</th>
                  <th className="px-2 py-1 text-left">count</th>
                </tr>
              </thead>
              <tbody>
                {(result.groups || []).map((g, i) => (
                  <tr key={i} className="border-t">
                    <td className="px-2 py-1">{String(g.dup_key)}</td>
                    <td className="px-2 py-1">{Number(g.cnt)}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>

          {!!(result.details && result.details.length) && (
            <div>
              <div className="font-medium text-sm mb-1">Details</div>
              <div className="max-h-80 overflow-auto border rounded">
                <table className="min-w-full text-xs">
                  <thead className="bg-gray-50">
                    <tr>
                      <th className="px-2 py-1 text-left">dup_key</th>
                      <th className="px-2 py-1 text-left">id</th>
                      <th className="px-2 py-1 text-left">enrollment_no</th>
                      <th className="px-2 py-1 text-left">convocation_no</th>
                      <th className="px-2 py-1 text-left">dg_sr_no</th>
                      <th className="px-2 py-1 text-left">student_name_dg</th>
                      <th className="px-2 py-1 text-left">createdat</th>
                      <th className="px-2 py-1 text-left">updatedat</th>
                    </tr>
                  </thead>
                  <tbody>
                    {result.details.map((d, i) => {
                      const dupKey = normalized ? (d.enrollment_no || '').toString().trim().toLowerCase().replace(/\s+/g, '') : (d.enrollment_no || '').toString();
                      return (
                        <tr key={i} className="border-t">
                          <td className="px-2 py-1">{dupKey}</td>
                          <td className="px-2 py-1">{d.id}</td>
                          <td className="px-2 py-1">{d.enrollment_no || ''}</td>
                          <td className="px-2 py-1">{d.convocation_no || ''}</td>
                          <td className="px-2 py-1">{d.dg_sr_no || ''}</td>
                          <td className="px-2 py-1">{d.student_name_dg || ''}</td>
                          <td className="px-2 py-1">{d.createdat || ''}</td>
                          <td className="px-2 py-1">{d.updatedat || ''}</td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              </div>
            </div>
          )}
        </div>
      )}

      {pruneResult && (
        <div className="border rounded p-3 space-y-2">
          <div className="text-sm font-medium">Prune Summary</div>
          <div className="text-sm">Normalized: {pruneResult.normalized ? 'Yes' : 'No'} | Dry Run: {pruneResult.dryRun ? 'Yes' : 'No'}</div>
          <div className="text-sm">Duplicate groups: {pruneResult.groups}</div>
          <div className="text-sm">Rows to delete: {pruneResult.toDelete} | Deleted: {pruneResult.deleted} | Kept: {pruneResult.kept}</div>
          {pruneResult.logUrl && (
            <div>
              <a href={pruneResult.logUrl} target="_blank" rel="noreferrer" className="text-blue-700 underline text-sm">Download prune log</a>
            </div>
          )}
        </div>
      )}

      {triplePruneResult && (
        <div className="border rounded p-3 space-y-2">
          <div className="text-sm font-medium">Prune Summary (Name+Enrollment+Convocation)</div>
          <div className="text-sm">Normalized: {triplePruneResult.normalized ? 'Yes' : 'No'} | Dry Run: {triplePruneResult.dryRun ? 'Yes' : 'No'}</div>
          <div className="text-sm">Duplicate groups: {triplePruneResult.groups}</div>
          <div className="text-sm">Rows to delete: {triplePruneResult.toDelete} | Deleted: {triplePruneResult.deleted} | Kept: {triplePruneResult.kept}</div>
          {triplePruneResult.logUrl && (
            <div>
              <a href={triplePruneResult.logUrl} target="_blank" rel="noreferrer" className="text-blue-700 underline text-sm">Download prune log</a>
            </div>
          )}
        </div>
      )}

      {/* Enrollment Duplicates */}
      <div className="border rounded p-3 space-y-2">
        <div className="flex items-center gap-2">
          <div className="font-semibold text-sm">Enrollment Duplicates</div>
          <button onClick={runEnrollmentDupCheck} disabled={busy} className="bg-blue-600 text-white rounded px-2 py-0.5 text-xs disabled:opacity-50">{busy ? 'Checking…' : 'Check'}</button>
          <button onClick={downloadEnrollmentDup} className="bg-gray-800 text-white rounded px-2 py-0.5 text-xs">Download Excel</button>
        </div>
        {enrDupResult && (
          <div className="space-y-2">
            <div className="text-sm">Duplicate keys: <b>{enrDupResult.duplicates || 0}</b> {enrDupResult.normalized ? '(normalized)' : ''}</div>
            <div className="max-h-64 overflow-auto border rounded">
              <table className="min-w-full text-xs">
                <thead className="bg-gray-50"><tr><th className="px-2 py-1 text-left">dup_key</th><th className="px-2 py-1 text-left">count</th></tr></thead>
                <tbody>
                  {(enrDupResult.groups || []).map((g, i) => (
                    <tr key={i} className="border-t"><td className="px-2 py-1">{String(g.dup_key)}</td><td className="px-2 py-1">{Number(g.cnt)}</td></tr>
                  ))}
                </tbody>
              </table>
            </div>
            {!!(enrDupResult.details && enrDupResult.details.length) && (
              <div className="max-h-80 overflow-auto border rounded">
                <table className="min-w-full text-xs">
                  <thead className="bg-gray-50">
                    <tr>
                      <th className="px-2 py-1 text-left">dup_key</th>
                      <th className="px-2 py-1 text-left">id</th>
                      <th className="px-2 py-1 text-left">enrollment_no</th>
                      <th className="px-2 py-1 text-left">student_name</th>
                      <th className="px-2 py-1 text-left">institute_id</th>
                      <th className="px-2 py-1 text-left">maincourse_id</th>
                      <th className="px-2 py-1 text-left">subcourse_id</th>
                      <th className="px-2 py-1 text-left">batch</th>
                      <th className="px-2 py-1 text-left">createdat</th>
                      <th className="px-2 py-1 text-left">updatedat</th>
                    </tr>
                  </thead>
                  <tbody>
                    {enrDupResult.details.map((d, i) => {
                      const dupKey = normalized ? (d.enrollment_no || '').toString().trim().toLowerCase().replace(/\s+/g, '') : (d.enrollment_no || '').toString();
                      return (
                        <tr key={i} className="border-t">
                          <td className="px-2 py-1">{dupKey}</td>
                          <td className="px-2 py-1">{d.id}</td>
                          <td className="px-2 py-1">{d.enrollment_no || ''}</td>
                          <td className="px-2 py-1">{d.student_name || ''}</td>
                          <td className="px-2 py-1">{d.institute_id || ''}</td>
                          <td className="px-2 py-1">{d.maincourse_id || ''}</td>
                          <td className="px-2 py-1">{d.subcourse_id || ''}</td>
                          <td className="px-2 py-1">{d.batch || ''}</td>
                          <td className="px-2 py-1">{d.createdat || ''}</td>
                          <td className="px-2 py-1">{d.updatedat || ''}</td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              </div>
            )}
          </div>
        )}
      </div>

      {/* Enrollment Mismatches */}
      <div className="border rounded p-3 space-y-2">
        <div className="flex items-center gap-2">
          <div className="font-semibold text-sm">Enrollment Mismatch (Institute/Main/Sub)</div>
          <button onClick={runEnrollmentMismatch} disabled={busy} className="bg-blue-600 text-white rounded px-2 py-0.5 text-xs disabled:opacity-50">{busy ? 'Checking…' : 'Check'}</button>
          <button onClick={downloadEnrollmentMismatch} className="bg-gray-800 text-white rounded px-2 py-0.5 text-xs">Download Excel</button>
        </div>
        {enrMismatchResult && (
          <div className="max-h-96 overflow-auto border rounded">
            <table className="min-w-full text-xs">
              <thead className="bg-gray-50">
                <tr>
                  <th className="px-2 py-1 text-left">id</th>
                  <th className="px-2 py-1 text-left">enrollment_no</th>
                  <th className="px-2 py-1 text-left">student_name</th>
                  <th className="px-2 py-1 text-left">institute_id</th>
                  <th className="px-2 py-1 text-left">maincourse_id</th>
                  <th className="px-2 py-1 text-left">subcourse_id</th>
                  <th className="px-2 py-1 text-left">issues</th>
                  <th className="px-2 py-1 text-left">batch</th>
                  <th className="px-2 py-1 text-left">createdat</th>
                  <th className="px-2 py-1 text-left">updatedat</th>
                </tr>
              </thead>
              <tbody>
                {(enrMismatchResult.details || []).map((d, i) => (
                  <tr key={i} className="border-t">
                    <td className="px-2 py-1">{d.id}</td>
                    <td className="px-2 py-1">{d.enrollment_no || ''}</td>
                    <td className="px-2 py-1">{d.student_name || ''}</td>
                    <td className="px-2 py-1">{d.institute_id || ''}</td>
                    <td className="px-2 py-1">{d.maincourse_id || ''}</td>
                    <td className="px-2 py-1">{d.subcourse_id || ''}</td>
                    <td className="px-2 py-1">{d.issues || ''}</td>
                    <td className="px-2 py-1">{d.batch || ''}</td>
                    <td className="px-2 py-1">{d.createdat || ''}</td>
                    <td className="px-2 py-1">{d.updatedat || ''}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </div>
  );
}
