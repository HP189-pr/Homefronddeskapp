import * as svc from '../services/courseMasterService.mjs';

export async function listMainBranches(_req, res, next) {
  try { const rows = await svc.listMainBranches(); res.json(rows); } catch (e) { next(e); }
}

export async function createMainBranch(req, res, next) {
  try { const row = await svc.createMainBranch(req.body || {}); res.status(201).json(row); } catch (e) { next(e); }
}

export async function listSubBranches(req, res, next) {
  try { const rows = await svc.listSubBranches(req.query || {}); res.json(rows); } catch (e) { next(e); }
}

export async function createSubBranch(req, res, next) {
  try { const row = await svc.createSubBranch(req.body || {}); res.status(201).json(row); } catch (e) { next(e); }
}

export async function listInstituteCourseOfferings(req, res, next) {
  try { const rows = await svc.listInstituteCourseOfferings(req.query || {}); res.json(rows); } catch (e) { next(e); }
}

export async function createInstituteCourseOffering(req, res, next) {
  try {
    const row = await svc.createInstituteCourseOffering(req.body || {}, req.user?.id || null);
    res.status(201).json(row);
  } catch (e) { next(e); }
}

export default {
  listMainBranches,
  createMainBranch,
  listSubBranches,
  createSubBranch,
  listInstituteCourseOfferings,
  createInstituteCourseOffering,
};