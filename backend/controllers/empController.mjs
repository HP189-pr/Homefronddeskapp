// backend/controllers/empController.js
import * as empService from '../services/empService.js';

export async function listProfiles(req, res) {
  try {
    const user = req.user;
    const isManager = user && (user.is_staff || user.is_superuser || (user.groups||[]).map(g=>g.toLowerCase()).includes('leave_management'));
    const opts = {};
    if (!isManager) opts.where = { userid: user.username };
    const rows = await empService.getAllProfiles(opts);
    return res.json(rows);
  } catch (err) {
    return res.status(500).json({ detail: err.message });
  }
}

export async function getProfile(req, res) {
  try {
    const row = await empService.getProfileById(req.params.id);
    if (!row) return res.status(404).json({ detail: 'Not found' });
    const user = req.user;
    if (!(user.is_staff || user.is_superuser || row.userid === user.username)) return res.status(403).json({ detail: 'Forbidden' });
    return res.json(row);
  } catch (err) {
    return res.status(500).json({ detail: err.message });
  }
}

export async function createProfile(req, res) {
  try {
    const created = await empService.createProfile(req.body);
    return res.status(201).json(created);
  } catch (err) {
    return res.status(400).json({ detail: err.message });
  }
}

export async function updateProfile(req, res) {
  try {
    const row = await empService.getProfileById(req.params.id);
    if (!row) return res.status(404).json({ detail: 'Not found' });
    const user = req.user;
    if (!(user.is_staff || user.is_superuser || row.userid === user.username)) return res.status(403).json({ detail: 'Forbidden' });
    const updated = await empService.updateProfile(req.params.id, req.body);
    return res.json(updated);
  } catch (err) {
    return res.status(400).json({ detail: err.message });
  }
}

export async function deleteProfile(req, res) {
  try {
    const row = await empService.getProfileById(req.params.id);
    if (!row) return res.status(404).json({ detail: 'Not found' });
    const user = req.user;
    if (!(user.is_staff || user.is_superuser)) return res.status(403).json({ detail: 'Forbidden' });
    await empService.deleteProfile(req.params.id);
    return res.status(204).send();
  } catch (err) {
    return res.status(500).json({ detail: err.message });
  }
}
