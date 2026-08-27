/* The single place an AI model id is allowed to appear in this repository.

   House rule: never hardcode a model string in a script or a route. When a
   vendor retires a model, exactly one file changes and every stage of the
   checking pipeline moves together.

   The two checking stages deliberately use DIFFERENT VENDORS. Two Anthropic
   passes would share training data and therefore share errors: a fact that
   Claude is confidently wrong about would sail through both. Different vendor,
   different blind spots -- that is the whole reason stage 3 exists. Do not
   "simplify" this by pointing both stages at the same provider. */

export const MODELS = {
  /* Stage 2 -- independent check. */
  anthropic: {
    /* Todd's call: try the cheaper model first and only reach for Opus if
       the results are not good enough. Flip this one line to
       'claude-opus-5' (and the prices to 5 / 25) to go back.

       Note this id is shared by BOTH the fact checker and the screener
       test -- that is the point of keeping model ids in one file, but it
       does mean changing it here changes what verifies the corpus too. */
    id: 'claude-sonnet-4-6',
    vendor: 'anthropic',
    endpoint: 'https://api.anthropic.com/v1/messages',
    keyEnv: 'ANTHROPIC_API_KEY',
    apiVersion: '2023-06-01',
    /* USD per million tokens. Rough, for the cost estimate printed at the end
       of a run only -- never billed against. Update when vendor prices move. */
    usdPerMillionInput: 3,
    usdPerMillionOutput: 15,
  },

  /* Stage 3 -- final check, second vendor. */
  openai: {
    id: 'gpt-4o-mini',
    vendor: 'openai',
    endpoint: 'https://api.openai.com/v1/chat/completions',
    keyEnv: 'OPENAI_API_KEY',
    usdPerMillionInput: 0.15,
    usdPerMillionOutput: 0.6,
  },
};

/** Rough USD cost of a run. Estimate only -- see the note above. */
export function estimateCostUsd(model, inputTokens, outputTokens) {
  return (
    (inputTokens / 1e6) * model.usdPerMillionInput +
    (outputTokens / 1e6) * model.usdPerMillionOutput
  );
}
