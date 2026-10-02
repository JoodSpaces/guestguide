# Concierge evals

`voice-scenarios.json` is the regression list for the text and voice concierge: what a guest says, which tools must (or must not) be called, and what the answer must contain.

**Run them** after any change to the ElevenLabs agent prompt, its tools, `lib/voice-*.ts`, or the text concierge prompt. In the ElevenLabs dashboard use the agent's Tests tab (one test per scenario); for the text concierge, send the `say` line to `/api/guest/concierge` with a test stay token.

**Already automated** (`npm test`): `__tests__/emergency-rules.test.ts` (deterministic emergency detection), `__tests__/evals-scenarios.test.ts` (this file stays valid and every tool has a scenario), and the tool/action logic tests (`voice-*.test.ts`).

**Not automated yet:** replaying scenarios against the live agent. That needs the ElevenLabs API key and a judge step.
