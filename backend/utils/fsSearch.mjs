import fs from 'fs';
import path from 'path';

// Recursively search for a file under baseDir across year-wise subfolders.
// - filename: the target file (e.g., '01-250001.pdf')
// - baseDir: base directory to begin search (e.g., 'D:/temp/Verification')
// - options: { maxDepth: number }
// Returns: first absolute path if found, else null.
export async function findFileRecursive(filename, baseDir, options = {}) {
  const maxDepth = Number.isInteger(options.maxDepth) ? options.maxDepth : 3;
  const visited = new Set();

  async function walk(dir, depth) {
    try {
      const real = await fs.promises.realpath(dir).catch(() => dir);
      if (visited.has(real)) return null;
      visited.add(real);

      const entries = await fs.promises.readdir(dir, { withFileTypes: true });
      for (const ent of entries) {
        const full = path.join(dir, ent.name);
        if (ent.isFile()) {
          if (ent.name.toLowerCase() === filename.toLowerCase()) return full;
        } else if (ent.isDirectory() && depth < maxDepth) {
          const found = await walk(full, depth + 1);
          if (found) return found;
        }
      }
    } catch {
      // ignore errors (permissions, not found, etc.)
    }
    return null;
  }

  return walk(baseDir, 0);
}
