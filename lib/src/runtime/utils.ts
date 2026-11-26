import { readFile, realpath } from 'node:fs/promises';
import { dirname, resolve, relative, isAbsolute, sep } from 'node:path';

export function within(root: string, file: string): boolean {
  const rel = relative(root, file);
  return rel === '' || (!isAbsolute(rel) && rel !== '..' && !rel.startsWith(`..${sep}`));
}

export async function canonical(file: string): Promise<string> {
  try {
    return await realpath(file);
  } catch (error: any) {
    if (error.code !== 'ENOENT') throw error;
    const parent = dirname(file);
    if (parent === file) return file;
    return resolve(await canonical(parent), relative(parent, file));
  }
}

export async function optionalText(file: string): Promise<string | undefined> {
  try {
    return await readFile(file, 'utf8');
  } catch (error: any) {
    if (error.code === 'ENOENT') return;
    throw error;
  }
}
