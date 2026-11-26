import { readdir } from 'node:fs/promises';
import { dirname, join, resolve, matchesGlob } from 'node:path';
import { homedir } from 'node:os';
import { canonical, optionalText, within } from '../runtime/utils.ts';

export interface MemorySource {
  path: string;
  text: string;
  importedBy?: string;
  scope?: string[];
}

export class Memory {
  sources: MemorySource[] = [];
  diagnostics: string[] = [];
  private cwd = '';
  private seen = new Set<string>();

  async load(cwd: string, home = homedir()): Promise<void> {
    this.cwd = await canonical(cwd);
    this.sources = [];
    this.diagnostics = [];
    this.seen.clear();
    await this.add(join(home, '.pi/PIKODE.md'));
    await this.add(join(home, '.claude/CLAUDE.md'));
    const ancestors: string[] = [];
    let dir = this.cwd;
    while (true) {
      ancestors.unshift(dir);
      const parent = dirname(dir);
      if (parent === dir) break;
      dir = parent;
    }
    for (const root of ancestors) {
      for (const file of [
        'PIKODE.md',
        '.pi/PIKODE.md',
        'PIKODE.local.md',
        'CLAUDE.md',
        '.claude/CLAUDE.md',
        'CLAUDE.local.md',
      ]) {
        await this.add(join(root, file));
      }
    }
    await this.rules(join(this.cwd, '.pi/rules'));
    await this.rules(join(this.cwd, '.claude/rules'));
  }

  async descendant(file: string): Promise<MemorySource[]> {
    file = await canonical(file);
    const start = this.sources.length;
    if (!within(this.cwd, file)) return [];
    const dirs: string[] = [];
    let dir = dirname(file);
    while (within(this.cwd, dir) && dir !== this.cwd) {
      dirs.unshift(dir);
      dir = dirname(dir);
    }
    for (const root of dirs) {
      for (const name of ['PIKODE.md', '.pi/PIKODE.md', 'CLAUDE.md', '.claude/CLAUDE.md']) {
        await this.add(join(root, name));
      }
    }
    await this.rules(join(this.cwd, '.pi/rules'), file);
    await this.rules(join(this.cwd, '.claude/rules'), file);
    return this.sources.filter((source, index) =>
      source.scope ? source.scope.some(p => matchesGlob(file.slice(this.cwd.length + 1), p)) : index >= start,
    );
  }

  private async rules(root: string, target?: string): Promise<void> {
    let entries;
    try {
      entries = await readdir(root, { withFileTypes: true });
    } catch (e: any) {
      if (e.code === 'ENOENT') return;
      throw e;
    }
    for (const entry of entries.sort((a, b) => a.name.localeCompare(b.name))) {
      if (entry.isDirectory()) {
        await this.rules(join(root, entry.name), target);
        continue;
      }
      if (!entry.name.endsWith('.md') || entry.isSymbolicLink()) continue;
      const file = join(root, entry.name);
      const text = (await optionalText(file))!;
      if (/^---\r?\n/.test(text)) {
        const normalized = text.replace(/\r\n/g, '\n');
        const match = /^---\npaths:\s*\n((?:\s+-\s+[^\n]+\n)+)---\n/.exec(normalized);
        if (!match) {
          this.diagnostics.push(`Unsupported rule frontmatter: ${file}`);
          continue;
        }
        const patterns = [...match[1].matchAll(/-\s+["']?([^\n"']+)["']?/g)].map(m => m[1].trim());
        if (!target || !patterns.some(p => matchesGlob(target.slice(this.cwd.length + 1), p))) continue;
        const importedStart = this.sources.length;
        await this.add(file, undefined, 0, normalized.slice(match[0].length));
        for (const imported of this.sources.slice(importedStart)) imported.scope = patterns;
        const rulePath = await canonical(file);
        const source = this.sources.find(s => s.path === rulePath);
        if (source) source.scope = patterns;
      } else {
        await this.add(file);
      }
    }
  }

  private async add(file: string, importedBy?: string, depth = 0, override?: string): Promise<void> {
    if (depth > 5) {
      this.diagnostics.push(`Memory import depth exceeded: ${file}`);
      return;
    }
    const path = await canonical(resolve(file));
    if (this.seen.has(path)) return;
    const text = override ?? (await optionalText(path));
    if (text === undefined) return;
    if (Buffer.byteLength(text) > 200_000) {
      this.diagnostics.push(`Memory file exceeds 200 KB: ${path}`);
      return;
    }
    this.seen.add(path);
    this.sources.push({ path, text, importedBy });
    let fence: string | undefined;
    for (const line of text.split('\n')) {
      const mark = /^\s*(`{3,}|~{3,})/.exec(line)?.[1];
      if (mark) {
        if (!fence) fence = mark[0];
        else if (fence === mark[0]) fence = undefined;
        continue;
      }
      if (fence) continue;
      for (const match of line.matchAll(/(?:^|\s)@([^\s`]+)/g)) {
        const target = await canonical(resolve(dirname(path), match[1]));
        if (!within(this.cwd, target)) {
          this.diagnostics.push(`External memory import skipped: ${target}`);
          continue;
        }
        await this.add(target, path, depth + 1);
      }
    }
  }

  format(sources = this.sources.filter(s => !s.scope)): string {
    return sources
      .map(s => `<project-instructions source=${JSON.stringify(s.path)}>\n${s.text}\n</project-instructions>`)
      .join('\n\n');
  }
}
