import * as svc from '../services/provisionalService.mjs';

export async function list(req, res, next) { try { const rows = await svc.listProvisionals(req.query || {}); res.json({ items: rows }); } catch (e) { next(e); } }
export async function getById(req, res, next) { try { const row = await svc.getProvisional(req.params.id); if (!row) return res.status(404).json({ error: 'Not found' }); res.json(row); } catch (e) { next(e); } }
export async function create(req, res, next) { try { const row = await svc.createProvisional(req.body || {}); res.status(201).json(row); } catch (e) { next(e); } }
export async function update(req, res, next) { try { const row = await svc.updateProvisional(req.params.id, req.body || {}); if (!row) return res.status(404).json({ error: 'Not found' }); res.json(row); } catch (e) { next(e); } }

export default { list, getById, create, update };
