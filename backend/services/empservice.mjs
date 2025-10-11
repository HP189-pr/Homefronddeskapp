// backend/services/empService.js
import EmpProfile from '../models/EmpProfile.js';

export async function getAllProfiles(opts = {}) {
  return EmpProfile.findAll(opts);
}

export async function getProfileById(id) {
  return EmpProfile.findByPk(id);
}

export async function getProfileByUserId(userid) {
  return EmpProfile.findOne({ where: { userid } });
}

export async function createProfile(data) {
  return EmpProfile.create(data);
}

export async function updateProfile(id, data) {
  const row = await getProfileById(id);
  if (!row) throw new Error('Not found');
  await row.update(data);
  return row;
}

export async function deleteProfile(id) {
  const row = await getProfileById(id);
  if (!row) throw new Error('Not found');
  await row.destroy();
  return true;
}
