// src/components/pages/Enrollments.jsx
import React, { useEffect, useMemo, useState } from "react";
import { useAuth } from "../../hooks/useAuth";
import {
  Button,
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  TextField,
  IconButton,
  MenuItem,
  Typography,
  CircularProgress,
  Checkbox,
  ListItemText,
  Paper,
} from "@mui/material";
import { DataGrid } from "@mui/x-data-grid";
import AddIcon from "@mui/icons-material/Add";
import EditIcon from "@mui/icons-material/Edit";
import DeleteIcon from "@mui/icons-material/Delete";
import SearchIcon from "@mui/icons-material/Search";

/**
 * Minimal API helper — replace with your src/api.js or apollo client if needed
 */
const api = async (path, opts = {}) => {
  const token = localStorage.getItem("token");
  const headers = { "Content-Type": "application/json", ...(opts.headers || {}) };
  if (token) headers.Authorization = `Bearer ${token}`;
  const res = await fetch(path, { ...opts, headers });
  if (!res.ok) {
    const txt = await res.text().catch(() => "");
    let body = {};
    try { body = JSON.parse(txt || "{}"); } catch (e) { body = { message: txt }; }
    const err = new Error(body.message || res.statusText || "Request failed");
    err.status = res.status;
    err.body = body;
    throw err;
  }
  const ct = res.headers.get("content-type") || "";
  return ct.includes("application/json") ? res.json() : res.text();
};

/**
 * Basic permission check. Adjust to your user shape.
 * Accepts user.usertype === 'admin', user.roles includes 'admin' OR user.permissions contains the permission.
 */
const hasPermission = (user, permission) => {
  if (!user) return false;
  if (user.usertype === "admin") return true;
  if (Array.isArray(user.roles) && user.roles.includes("admin")) return true;
  if (Array.isArray(user.permissions) && user.permissions.includes(permission)) return true;
  return false;
};

export default function Enrollments() {
  const { user } = useAuth();
  const [mode, setMode] = useState("single"); // single | advanced
  const [q, setQ] = useState("");
  const [filters, setFilters] = useState({ institute_id: [], maincourse_id: [], subcourse_id: [], batch: "" });

  const [rows, setRows] = useState([]);
  const [loading, setLoading] = useState(false);
  const [count, setCount] = useState(0);

  // masters (you can replace with endpoint paths you already have)
  const [institutes, setInstitutes] = useState([]);
  const [mainCourses, setMainCourses] = useState([]);
  const [subCourses, setSubCourses] = useState([]);

  // Helpers to tolerate different field naming conventions from backend
  const norm = (v) => (v === null || v === undefined ? '' : String(v));
  const getInstKey = (i) => i?.institute_id ?? i?.instituteid ?? i?.id;
  const getInstName = (i) => i?.institute_name ?? i?.institutename ?? i?.name ?? '';
  const getInstCampus = (i) => i?.institute_campus ?? i?.institutecampus ?? i?.campus ?? '';

  const getMainKey = (m) => m?.maincourse_id ?? m?.maincourseid ?? m?.id;
  const getMainCode = (m) => m?.course_code ?? m?.coursecode ?? '';
  const getMainName = (m) => m?.course_name ?? m?.coursename ?? m?.name ?? '';

  const getSubKey = (s) => s?.subcourse_id ?? s?.subcourseid ?? s?.id;
  const getSubName = (s) => s?.subcourse_name ?? s?.subcoursename ?? s?.name ?? '';

  // lookup maps for display
  const instById = useMemo(() => {
    const m = new Map();
    for (const i of (institutes || [])) m.set(norm(getInstKey(i)), i);
    return m;
  }, [institutes]);
  const mainById = useMemo(() => {
    const m = new Map();
    for (const c of (mainCourses || [])) m.set(norm(getMainKey(c)), c);
    return m;
  }, [mainCourses]);
  const subById = useMemo(() => {
    const m = new Map();
    for (const s of (subCourses || [])) m.set(norm(getSubKey(s)), s);
    return m;
  }, [subCourses]);

  // modal state
  const [openForm, setOpenForm] = useState(false);
  const [editingId, setEditingId] = useState(null);
  const [form, setForm] = useState({
    enrollment_no: "", temp_enroll_no: "", student_name: "", institute_id: "", maincourse_id: "", subcourse_id: "", batch: "", admission_date: ""
  });

  // Permission flags
  const canRead = hasPermission(user, "enrollment:read");
  const canCreate = hasPermission(user, "enrollment:create");
  const canUpdate = hasPermission(user, "enrollment:update");
  const canDelete = hasPermission(user, "enrollment:delete");

  useEffect(() => {
    // If user lacks read permission, do not fetch
    if (!canRead) return;
    fetchMasters();
    fetchList();
    // eslint-disable-next-line
  }, [user]);

  const columns = useMemo(() => [
    { field: "enrollment_no", headerName: "Enrollment", width: 150 },
    { field: "student_name", headerName: "Student Name", width: 220 },
    {
      field: "institute_id",
      headerName: "Institute Name",
      width: 200,
      valueGetter: (params) => {
        const row = params?.row || {};
        const i = instById.get(norm(row.institute_id ?? row.instituteid ?? row.institute ?? row.instituteId));
        return i ? `${getInstName(i)}${getInstCampus(i) ? ` (${getInstCampus(i)})` : ""}` : '';
      },
    },
    {
      field: "maincourse_id",
      headerName: "Course",
      width: 160,
      valueGetter: (params) => {
        const row = params?.row || {};
        const m = mainById.get(norm(row.maincourse_id ?? row.maincourseid ?? row.maincourse ?? row.mainCourseId));
        const code = m ? (getMainCode(m) || getMainName(m)) : '';
        return code;
      },
    },
    {
      field: "subcourse_id",
      headerName: "Subcourse",
      width: 180,
      valueGetter: (params) => {
        const row = params?.row || {};
        const s = subById.get(norm(row.subcourse_id ?? row.subcourseid ?? row.subcourse ?? row.subCourseId));
        return s ? (getSubName(s) || '') : '';
      },
    },
    { field: "batch", headerName: "Batch", width: 100 },
    {
      field: "actions", headerName: "Actions", width: 140, sortable: false, renderCell: (params) => (
        <>
          {canUpdate && <IconButton size="small" onClick={() => onEdit(params.row)}><EditIcon fontSize="small" /></IconButton>}
          {canDelete && <IconButton size="small" onClick={() => onDelete(params.row)}><DeleteIcon fontSize="small" /></IconButton>}
        </>
      )
    }
  ], [canUpdate, canDelete, instById, mainById, subById]);

  // fetch list (single or advanced)
  async function fetchList() {
    if (!canRead) return;
    setLoading(true);
    try {
      if (mode === "single" && q) {
        // Unified lookup: search by enrollment_no (exact, case-insensitive) OR student_name (contains, case-insensitive)
        const res = await api(`/api/enrollments?q=${encodeURIComponent(q)}&limit=50`);
        setRows(res?.rows || []);
        setCount(res?.count || (res?.rows ? res.rows.length : 0));
      } else {
        const params = new URLSearchParams();
        if (Array.isArray(filters.institute_id) && filters.institute_id.length)
          params.set("institute_id", filters.institute_id.join(","));
        if (Array.isArray(filters.maincourse_id) && filters.maincourse_id.length)
          params.set("maincourse_id", filters.maincourse_id.join(","));
        if (Array.isArray(filters.subcourse_id) && filters.subcourse_id.length)
          params.set("subcourse_id", filters.subcourse_id.join(","));
        if (filters.batch)
          params.set("batch", String(filters.batch).split(",").map(s=>s.trim()).filter(Boolean).join(","));
        params.set("limit", 200);
        const res = await api(`/api/enrollments?${params.toString()}`);
        setRows(res.rows || []);
        setCount(res.count || (res.rows ? res.rows.length : 0));
      }
    } catch (err) {
      console.error("fetchList error", err);
      alert(err.body?.message || err.message || "Failed to fetch enrollments");
    } finally { setLoading(false); }
  }

  async function fetchMasters() {
    try {
      const [inst, main, sub] = await Promise.all([
        api("/api/institutes").then(r => r.rows || r),
        api("/api/course_main").then(r => r.rows || r),
        api("/api/course_sub").then(r => r.rows || r)
      ]);
      setInstitutes(inst);
      setMainCourses(main);
      setSubCourses(sub);
    } catch (err) {
      console.warn("fetchMasters failed", err);
    }
  }

  function openCreate() {
    setEditingId(null);
    setForm({ enrollment_no: "", temp_enroll_no: "", student_name: "", institute_id: "", maincourse_id: "", subcourse_id: "", batch: "", admission_date: "" });
    setOpenForm(true);
  }

  function onEdit(row) {
    setEditingId(row.id);
    const ad = row.admission_date ? (typeof row.admission_date === "string" ? row.admission_date.split("T")[0] : row.admission_date) : "";
    setForm({ ...row, admission_date: ad });
    setOpenForm(true);
  }

  async function onDelete(row) {
    if (!confirm(`Delete ${row.enrollment_no}?`)) return;
    try {
      await api(`/api/enrollments/${row.id}`, { method: "DELETE" });
      fetchList();
    } catch (err) {
      console.error("delete error", err);
      alert(err.body?.message || err.message || "Delete failed");
    }
  }

  async function onSave() {
    // basic validation
    if (!form.enrollment_no || !form.student_name || !form.institute_id || !form.maincourse_id) {
      return alert("Please fill enrollment_no, student_name, institute and main course.");
    }
    try {
      if (editingId) {
        await api(`/api/enrollments/${editingId}`, { method: "PUT", body: JSON.stringify(form) });
      } else {
        await api(`/api/enrollments`, { method: "POST", body: JSON.stringify(form) });
      }
      setOpenForm(false);
      fetchList();
    } catch (err) {
      console.error("save error", err);
      alert(err.body?.message || err.message || "Save failed");
    }
  }

  // render access denied if no read permission
  if (!canRead) {
    return <div style={{ padding: 20 }}><h2 style={{ color: "crimson" }}>Access Denied — you do not have permission to view enrollments.</h2></div>;
  }

  return (
    <div className="p-4">
      <div className="flex items-center justify-between mb-4">
        <Typography variant="h5">Enrollments</Typography>
        <div className="flex gap-2">
          {canCreate && <Button variant="contained" startIcon={<AddIcon />} onClick={openCreate}>New Enrollment</Button>}
          <Button variant="outlined" startIcon={<SearchIcon />} onClick={fetchList}>Search</Button>
        </div>
      </div>
      <Paper elevation={0} className="p-4 mb-4">
        <div className="flex items-end gap-4 flex-wrap">
          <TextField select size="small" label="Mode" value={mode} onChange={e => setMode(e.target.value)}>
            <MenuItem value="single">Single Lookup</MenuItem>
            <MenuItem value="advanced">Advanced Search</MenuItem>
          </TextField>

          {mode === "single" ? (
            <>
              <TextField
                label="Enrollment No or Name"
                placeholder="Type enrollment number or student name"
                size="small"
                value={q}
                onChange={e => setQ(e.target.value)}
                onKeyDown={(e) => { if (e.key === 'Enter') fetchList(); }}
              />
              <Button variant="contained" onClick={fetchList}>Lookup</Button>
            </>
          ) : (
            <>
              <TextField
                select size="small" label="Institute" value={filters.institute_id}
                SelectProps={{ multiple: true, renderValue: (sel) => sel.length ? sel.map(v => instById.get(v)?.institute_name || v).join(', ') : 'All' }}
                onChange={e => {
                  const val = e.target.value;
                  setFilters(f => ({ ...f, institute_id: Array.isArray(val) ? val : [] }));
                }}
                style={{ minWidth: 260 }}
              >
                {institutes.map(i => (
                  <MenuItem key={i.institute_id} value={i.institute_id}>
                    <Checkbox checked={filters.institute_id.indexOf(i.institute_id) > -1} />
                    <ListItemText primary={`${i.institute_name}${i.institute_campus ? ` (${i.institute_campus})` : ''}`} />
                  </MenuItem>
                ))}
              </TextField>

              <TextField select size="small" label="Main Course" value={filters.maincourse_id}
                SelectProps={{ multiple: true, renderValue: (sel) => sel.length ? sel.map(v => mainById.get(v)?.course_code || mainById.get(v)?.course_name || v).join(', ') : 'All' }}
                onChange={e => {
                  const val = e.target.value;
                  setFilters(f => ({ ...f, maincourse_id: Array.isArray(val) ? val : [] }));
                }}
                style={{ minWidth: 240 }}
              >
                {mainCourses.map(m => (
                  <MenuItem key={m.maincourse_id} value={m.maincourse_id}>
                    <Checkbox checked={filters.maincourse_id.indexOf(m.maincourse_id) > -1} />
                    <ListItemText primary={`${m.course_code || ''} ${m.course_name || ''}`.trim()} />
                  </MenuItem>
                ))}
              </TextField>

              <TextField select size="small" label="Sub Course" value={filters.subcourse_id}
                SelectProps={{ multiple: true, renderValue: (sel) => sel.length ? sel.map(v => subById.get(v)?.subcourse_name || v).join(', ') : 'All' }}
                onChange={e => {
                  const val = e.target.value;
                  setFilters(f => ({ ...f, subcourse_id: Array.isArray(val) ? val : [] }));
                }}
                style={{ minWidth: 240 }}
              >
                {subCourses
                  .filter(s => !(filters.maincourse_id && filters.maincourse_id.length) || filters.maincourse_id.includes(s.maincourse_id))
                  .map(s => (
                    <MenuItem key={s.subcourse_id} value={s.subcourse_id}>
                      <Checkbox checked={filters.subcourse_id.indexOf(s.subcourse_id) > -1} />
                      <ListItemText primary={s.subcourse_name} />
                    </MenuItem>
                ))}
              </TextField>

              <TextField size="small" label="Batch (comma-separated)" placeholder="e.g. 2020,2021" value={filters.batch} onChange={e => setFilters(f => ({ ...f, batch: e.target.value }))} />
            </>
          )}
        </div>
      </Paper>

      <Paper elevation={0} style={{ height: 520 }}>
        <DataGrid
          rows={rows}
          columns={columns}
          loading={loading}
          getRowId={r => r.id}
          pageSizeOptions={[25,50,100]}
        />
      </Paper>

      <Dialog open={openForm} onClose={() => setOpenForm(false)} fullWidth maxWidth="md">
        <DialogTitle>{editingId ? "Edit Enrollment" : "Create Enrollment"}</DialogTitle>
        <DialogContent dividers>
          <div className="grid grid-cols-2 gap-3">
            <TextField label="Enrollment No" value={form.enrollment_no} onChange={e => setForm({ ...form, enrollment_no: e.target.value })} />
            <TextField label="Temp Enroll No" value={form.temp_enroll_no} onChange={e => setForm({ ...form, temp_enroll_no: e.target.value })} />
            <TextField label="Student Name" value={form.student_name} onChange={e => setForm({ ...form, student_name: e.target.value })} />
            <TextField select label="Institute" value={form.institute_id} onChange={e => setForm({ ...form, institute_id: e.target.value })}>
              <MenuItem value="">Select Institute</MenuItem>
              {institutes.map(i => <MenuItem key={i.institute_id} value={i.institute_id}>{i.institute_name} {i.institute_campus ? `(${i.institute_campus})` : ""}</MenuItem>)}
            </TextField>
            <TextField select label="Main Course" value={form.maincourse_id} onChange={e => setForm({ ...form, maincourse_id: e.target.value })}>
              <MenuItem value="">Select Main Course</MenuItem>
              {mainCourses.map(m => <MenuItem key={m.maincourse_id} value={m.maincourse_id}>{m.course_name}</MenuItem>)}
            </TextField>
            <TextField select label="Sub Course" value={form.subcourse_id} onChange={e => setForm({ ...form, subcourse_id: e.target.value })}>
              <MenuItem value="">(none)</MenuItem>
              {subCourses.filter(s => !form.maincourse_id || s.maincourse_id === form.maincourse_id).map(s => <MenuItem key={s.subcourse_id} value={s.subcourse_id}>{s.subcourse_name}</MenuItem>)}
            </TextField>
            <TextField label="Batch" value={form.batch} onChange={e => setForm({ ...form, batch: e.target.value })} />
            <TextField type="date" label="Admission Date" InputLabelProps={{ shrink: true }} value={form.admission_date || ""} onChange={e => setForm({ ...form, admission_date: e.target.value })} />
          </div>
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setOpenForm(false)}>Cancel</Button>
          <Button variant="contained" onClick={onSave} disabled={! (editingId ? canUpdate : canCreate)}>
            Save
          </Button>
        </DialogActions>
      </Dialog>

      {loading && <div className="fixed bottom-4 right-4"><CircularProgress /></div>}
    </div>
  );
}
