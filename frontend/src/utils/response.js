export function normalizeApiList(data) {
  if (!data) return [];
  if (Array.isArray(data)) return data;
  if (Array.isArray(data.results)) return data.results;
  if (Array.isArray(data.items)) return data.items;
  if (Array.isArray(data.rows)) return data.rows;
  if (Array.isArray(data.objects)) return data.objects;
  if (Array.isArray(data.data)) return data.data;
  return [];
}

export default {
  normalizeApiList,
};
