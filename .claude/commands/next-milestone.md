---
description: Run the current milestone through plan → critique → implement → test → commit, stopping after commit or on retry-cap exhaustion.
---

Read the following files to understand current context:
- `docs/status.md` for current operational status
- `docs/execution-plan.md` for the full milestone plan
- `docs/prd.md` for specific feature requirements
- `docs/todos.md` for current todo list (if it exists)
- `.milestone-state.json` for phase tracking (if it exists)

## State Management

If `.milestone-state.json` does not exist, create it:
```json
{
  "milestone": 0,
  "phase": "plan",
  "attempts": 0,
  "notes": ""
}
```

`milestone` is the zero-based index into the milestone list in `docs/execution-plan.md`.
`phase` is one of: `"plan"`, `"critique"`, `"implement"`, `"test"`, `"commit"`.
`attempts` tracks critique and test retry counts to prevent infinite loops.
`notes` holds context to carry between phases (e.g., what failed in tests).

## Execution Loop

On invocation:
1. Load `.milestone-state.json` (or create it as described above).
2. If `phase == "done"`, report "All milestones complete." and exit.
3. Otherwise, execute the current phase per the Phase Execution rules below.
4. After the phase finishes, persist `.milestone-state.json` and check the stop conditions:
   - **Stop** if the phase just executed was `commit` — the milestone is now committed, and state has already been advanced to the next milestone's `plan` phase (or to `done`). Do not begin planning the next milestone in this invocation.
   - **Stop and surface to the user** if a retry cap was exhausted this phase (see updated critique/test rules below). Do not advance the phase.
   - Otherwise loop back to step 3 with the new `phase`.
5. End the invocation with a one- or two-sentence summary of what was completed and where state landed.

## Phase Execution

Based on the current `phase` in `.milestone-state.json`, execute the matching phase below. The Execution Loop above governs whether to continue to the next phase after each one finishes.

### Phase: `plan`

1. Identify the current milestone from `docs/execution-plan.md` using the `milestone` index.
2. Cross-reference requirements in `docs/prd.md` for that milestone's features.
3. Break the milestone into concrete, actionable todos. Each todo must have:
   - A clear one-line description of what to do
   - A completion condition (how to know it's done)
   - File paths likely to be touched
4. Write the todos to `docs/todos.md`, replacing any previous content. Format:
   ```markdown
   # Milestone: [milestone name]

   ## Todos
   - [ ] **Todo title** — Description. _Done when: [condition]._ Files: `path/to/file`
   ```
5. Update `docs/status.md` with current milestone and phase.
6. Set phase to `"critique"`, reset `attempts` to `0`. Write `.milestone-state.json`.

### Phase: `critique`

1. Re-read `docs/todos.md`, `docs/prd.md`, and the current milestone in `docs/execution-plan.md`.
2. Evaluate the plan against these criteria:
   - Does every todo have a verifiable completion condition?
   - Are dependencies between todos ordered correctly?
   - Are error handling and edge cases accounted for?
   - Are there missing todos implied by the PRD but not listed?
   - Is the scope right — nothing too vague, nothing gold-plated?
3. If changes are needed and `attempts` < 3: revise `docs/todos.md`, increment `attempts`, keep phase as `"critique"`, write `.milestone-state.json`, and let the Execution Loop run critique again.
4. If satisfied: set phase to `"implement"`, reset `attempts` to `0`, write `.milestone-state.json`, and let the Execution Loop continue.
5. If `attempts` >= 3 and still not satisfied: write `.milestone-state.json` with the unresolved concerns recorded in `notes` (phase stays `"critique"`), surface those concerns to the user, and **halt the loop**. Do not advance to `implement`.

### Phase: `implement`

Iterate over `docs/todos.md` from top to bottom within this phase: pick the first unchecked todo, implement it, mark it `[x]`, persist `.milestone-state.json`, and continue with the next unchecked todo. Persisting state per todo preserves crash recovery — if the run is interrupted mid-milestone, the next invocation resumes at the next unchecked todo.

For each todo:
1. Read `docs/todos.md`. Find the first todo not marked `[x]`.
2. Implement that single todo. Follow the PRD requirements and any notes in the state file.
3. Mark the todo `[x]` in `docs/todos.md`.
4. Update `docs/status.md` with progress.
5. Write `.milestone-state.json` (phase stays `"implement"` while todos remain).
6. Loop within the implement phase to the next unchecked todo.

When all todos are `[x]`: set phase to `"test"`, reset `attempts` to `0`, write `.milestone-state.json`, and let the Execution Loop continue.

### Phase: `test`

1. Run the project's test suite. Use the appropriate test command for the project (look for `package.json` scripts, `Makefile`, `pytest.ini`, etc.).
2. If tests pass: set phase to `"commit"`.
3. If tests fail and `attempts` < 5:
   - Record what failed in `notes`.
   - Fix the failing code.
   - Increment `attempts`, keep phase as `"test"`.
4. If tests fail and `attempts` >= 5:
   - Record the persistent failures in `notes` and `docs/status.md`.
   - Write `.milestone-state.json` with `phase` still `"test"`.
   - Surface the failing output to the user and **halt the loop**. Do NOT advance to `commit`.
5. Write `.milestone-state.json`.

### Phase: `commit`

1. Stage all changes: `git add -A`.
2. Commit with message: `milestone(<milestone-name>): complete milestone <index + 1> — <short summary>`.
   - If there are unresolved test failures noted in `notes`, append to commit message: `[with unresolved test failures — see docs/status.md]`.
3. Mark the milestone as complete in `docs/execution-plan.md` (e.g., change `- [ ]` to `- [x]`).
4. Update `docs/status.md` to reflect completion.
5. Check if there are remaining milestones:
   - If yes: increment `milestone`, set phase to `"plan"`, reset `attempts` and `notes`. Write `.milestone-state.json`.
   - If no: write `"phase": "done"` to `.milestone-state.json`. Update `docs/status.md` to reflect all milestones complete. Report "All milestones complete."
6. This is the terminal phase for this invocation. Do NOT loop back into the next milestone's `plan` phase — exit the Execution Loop after writing state and reporting the commit.

## Rules

- Run continuously through phases until the current milestone is committed, then stop. Do not advance into the next milestone's plan phase in the same invocation.
- Always write `.milestone-state.json` between phases so an interrupted run can resume cleanly.
- Always update `docs/status.md` with meaningful progress notes.
- If `phase` is `"done"`, report that all milestones are complete and take no action.
- Never skip the critique phase.
- Never leave `docs/todos.md` in a partial/corrupt state.
- On retry-cap exhaustion in `critique` or `test`, halt the loop and surface the issue to the user rather than falling through to the next phase.