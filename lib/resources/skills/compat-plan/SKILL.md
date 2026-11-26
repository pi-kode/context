---
name: compat-plan
description: Plan a substantial coding change when the user requests a plan or the implementation spans several dependent steps.
---
Inspect the relevant code and project instructions. Identify the intended behavior, affected files, verification steps, and unresolved decisions.

If EnterPlanMode and ExitPlanMode are available, enter planning, write the designated plan artifact, and request approval through ExitPlanMode. A rejected or cancelled plan does not authorize implementation. If these tools are absent, present the plan in conversation and follow the user's instructions about execution.

Finish when the user can review a concrete sequence with observable completion criteria. Do not claim an enforced read-only mode when the runtime does not provide it.
