---
name: compat-verify
description: Verify a completed code change before reporting success, including bug fixes and refactors.
---
Find the repository's documented check commands. Select the checks relevant to the changed behavior and run them using an available execution tool. Inspect failures and correct regressions caused by the change. Avoid overwriting unrelated user work.

Inspect the final changes for accidental edits. Report the observed checks and any checks that could not run. Completion requires evidence for each claim of success; a proposed command is not a completed check.
