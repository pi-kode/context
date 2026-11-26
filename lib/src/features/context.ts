import type { ExtensionAPI } from '@earendil-works/pi-coding-agent';
import { Memory } from '../extensions/memory.ts';
import { registerContext } from '../extensions/context.ts';

const CHANNEL = 'pi-ko:context:v1';

export default function (pi: ExtensionAPI): void {
  let existing: Memory | undefined;
  pi.events.emit(CHANNEL, { accept: (value: Memory) => { existing = value; } });
  if (existing) return;

  const memory = registerContext(pi);
  const unsubscribe = pi.events.on(CHANNEL, (request: any) => request.accept(memory));
  pi.on('session_shutdown', e => {
    if (e.reason === 'reload' || e.reason === 'quit') unsubscribe();
  });
}
