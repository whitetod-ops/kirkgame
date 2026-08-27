/* Stage 3 of the fact-checking pipeline: the final check (OpenAI).

   Run:  node scripts/check-facts-openai.mjs                 # dry run
         node scripts/check-facts-openai.mjs --limit 10 --apply
         node scripts/check-facts-openai.mjs --apply

   Same job as stage 2, deliberately a different vendor. Two Anthropic passes
   would share training data and therefore share mistakes: a fact Claude is
   confidently wrong about would pass twice and reach a player as true. The
   value of this stage is entirely in its being trained by someone else.

   The check is BLIND, for the same reason it is blind in stage 2: the model is
   sent the claim only -- never the stored value, `context`, `goDeeper`,
   `source` or `approx`. A model shown the expected answer agrees with it, and
   an agreement you bought is not evidence. The prompt is built by
   buildBlindPrompt() in check-facts.mjs so both stages ask the identical
   question; if the questions drifted apart, a disagreement between the stages
   would no longer mean anything.

   The shared runner, prompt builder and comparison logic live in
   scripts/check-facts.mjs. Only the transport below differs.

   Never writes to data/. Never changes a fact's status. Writes one report
   file, review/checks-openai.json. */

import { fileURLToPath } from 'node:url';
import { resolve } from 'node:path';
import { MODELS } from '../lib/aiModels.mjs';
import { runStage, RetryableError } from './check-facts.mjs';

export async function callOpenAI({ system, user, apiKey, model }) {
  const res = await fetch(model.endpoint, {
    method: 'POST',
    headers: {
      'content-type': 'application/json',
      authorization: `Bearer ${apiKey}`,
    },
    body: JSON.stringify({
      model: model.id,
      temperature: 0,
      max_tokens: 400,
      /* Guarantees parseable output; the prompt asks for the same shape. */
      response_format: { type: 'json_object' },
      messages: [
        { role: 'system', content: system },
        { role: 'user', content: user },
      ],
    }),
  }).catch((err) => {
    throw new RetryableError(`network: ${err.message}`);
  });

  if (res.status === 429 || res.status >= 500) {
    throw new RetryableError(`HTTP ${res.status}: ${(await res.text()).slice(0, 200)}`);
  }
  if (!res.ok) {
    throw new Error(`HTTP ${res.status}: ${(await res.text()).slice(0, 300)}`);
  }

  const body = await res.json();
  return {
    text: body.choices?.[0]?.message?.content ?? '',
    usage: {
      input: body.usage?.prompt_tokens ?? 0,
      output: body.usage?.completion_tokens ?? 0,
    },
  };
}

/* Run the stage only when executed directly. Without this guard, merely
   importing this module for callOpenAI would start a paid run. */
if (process.argv[1] && resolve(process.argv[1]) === fileURLToPath(import.meta.url)) {
  await runStage({ stage: 'openai', model: MODELS.openai, callModel: callOpenAI });
}
