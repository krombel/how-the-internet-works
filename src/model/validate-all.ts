// Dev-time content check (imported dynamically from main.ts behind import.meta.env.DEV, so zod stays out of the build).
import { content } from './registry';
import { loadAllPacks } from './strings';
import { formatProblems, validate } from './validate';

const files = Object.keys(import.meta.glob(['/content/*/*/Layer.svelte', '/content/*/*/Scene.svelte']));

export async function validateAll() {
  const problems = validate({ content, packs: await loadAllPacks(), files });
  if (!problems.length) return;
  const msg = `Content problems (${problems.length}):\n${formatProblems(problems)}`;
  console.error(msg);
  throw new Error(msg);
}
