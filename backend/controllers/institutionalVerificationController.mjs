import * as svc from '../services/institutionalVerificationService.mjs';

export async function list(req, res, next) { try { const rows = await svc.listInstitutionals(req.query || {}); res.json({ items: rows }); } catch (e) { next(e); } }
export async function getById(req, res, next) { try { const row = await svc.getInstitutional(req.params.id); if (!row) return res.status(404).json({ error: 'Not found' }); res.json(row); } catch (e) { next(e); } }
export async function create(req, res, next) { try { const row = await svc.createInstitutional(req.body || {}); res.status(201).json(row); } catch (e) { next(e); } }
export async function update(req, res, next) { try { const row = await svc.updateInstitutional(req.params.id, req.body || {}); if (!row) return res.status(404).json({ error: 'Not found' }); res.json(row); } catch (e) { next(e); } }

export default { list, getById, create, update };
