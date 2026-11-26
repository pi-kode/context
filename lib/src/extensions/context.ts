import type { ExtensionAPI } from '@earendil-works/pi-coding-agent';
import { readFileSync } from 'node:fs';
import { resolve } from 'node:path';
import { fileURLToPath } from 'node:url';
import { Memory } from './memory.ts';

const PERMISSION_SECTION =
  'Tools are executed in a user-selected permission mode. When you attempt to call a tool that is not automatically allowed by the user\'s permission mode or permission settings, the user will be prompted so that they can approve or deny the execution. If the user denies a tool you call, do not re-attempt the exact same tool call. Instead, think about why the user has denied the tool call and adjust your approach.';

export function registerContext(pi: ExtensionAPI, memory = new Memory()): Memory {
  const behavior = readFileSync(new URL('../../resources/system.md', import.meta.url), 'utf8');

  pi.on('session_start', async (_e, ctx) => {
    await memory.load(ctx.cwd);
  });
  pi.on('session_tree', async (_e, ctx) => {
    await memory.load(ctx.cwd);
  });
  pi.on('session_compact', async (_e, ctx) => {
    await memory.load(ctx.cwd);
  });

  pi.on('resources_discover', () => ({
    skillPaths: [fileURLToPath(new URL('../../resources/skills', import.meta.url))],
    promptPaths: [fileURLToPath(new URL('../../resources/prompts', import.meta.url))],
  }));

  pi.on('before_agent_start', (event, ctx) => {
    const o = event.systemPromptOptions;
    const tools = pi.getAllTools().filter(t => pi.getActiveTools().includes(t.name));
    const context = o.contextFiles
      .map(f => `<project_instructions path=${JSON.stringify(f.path)}>\n${f.content}\n</project_instructions>`)
      .join('\n\n');
    const extraMemory = memory.format(
      memory.sources.filter(s => !s.scope && !o.contextFiles.some(f => f.path === s.path)),
    );
    const skills = o.skills.map(s => `- ${s.name}: ${s.description} (read ${s.filePath} when applicable)`).join('\n');
    return {
      systemPrompt: [
        behavior,
        PERMISSION_SECTION,
        `Runtime: pi. Model: ${ctx.model?.provider ?? 'unknown'}/${ctx.model?.id ?? 'unknown'}. Working directory: ${ctx.cwd}.`,
        `Available tools (use their exact names and registered schemas):\n${tools.map(t => `- ${t.name}: ${t.description}`).join('\n')}`,
        context,
        extraMemory,
        skills ? `Available skills:\n${skills}` : '',
        o.appendSystemPrompt,
        ...Object.entries(o.sections).map(([name, text]) => `<${name}>\n${text}\n</${name}>`),
        ...o.promptGuidelines,
        ...Object.values(o.toolGuidelines).flat(),
      ]
        .filter(Boolean)
        .join('\n\n'),
    };
  });

  pi.on('tool_result', async (e, ctx) => {
    if (!['read', 'Read'].includes(e.toolName)) return;
    const path = (e.input as any).path ?? (e.input as any).file_path;
    if (typeof path !== 'string') return;
    const added = await memory.descendant(resolve(ctx.cwd, path));
    if (added.length) {
      return { content: [...e.content, { type: 'text' as const, text: memory.format(added) }] };
    }
  });

  pi.registerCommand('pk-memory', {
    description: 'Show loaded PIKODE.md, .pi/rules, CLAUDE.md, and .claude/rules memory instructions',
    handler: async () => {
      pi.sendMessage({
        customType: 'code-compat',
        content: memory.format() || 'No memory instructions loaded.',
        display: true,
      });
    },
  });

  pi.registerCommand('pk-prompt', {
    description: 'Inspect the replacement prompt and active tools',
    handler: async (_args, ctx) => {
      pi.sendMessage({
        customType: 'code-compat',
        content: ctx.getSystemPrompt(),
        display: true,
      });
    },
  });

  return memory;
}
