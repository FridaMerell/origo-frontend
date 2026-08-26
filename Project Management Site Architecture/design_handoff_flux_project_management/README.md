# Handoff: Flux Project Management (Projects, Milestones, Tasks, Subtasks)

## Overview
A clickable prototype of "Flux" (one of two themed products in the Origo design system) — a project management tool with projects, milestones, tasks, and subtasks. Covers browsing projects/tasks/backlog/timeline, a project detail page with milestone grouping and progress, a task detail panel with a subtask checklist, and create/edit flows for projects, milestones, and tasks.

## About the Design Files
The files in this bundle are **design references built in HTML/React (in-browser Babel, no build step)** — they show intended layout, behavior, and visual style, not production code to copy directly. Recreate these designs in the target codebase's existing environment (React, Vue, native, etc.) using its established component library and patterns. If no frontend environment exists yet, React is a reasonable default given these prototypes are already structured as React components.

## Fidelity
**High-fidelity.** Colors, type, spacing, and component styling come from the bound "Origo" design system's Flux theme (real CSS custom properties, not placeholders). Recreate pixel-perfectly using the target codebase's design system/component library — if the codebase already has its own component library, reimplement equivalent components there rather than porting these directly.

## Data model
- **Project**: `{ id, name, description, members: string[] }`
- **Milestone**: `{ id, project (FK), name, due: date|null }` — a milestone belongs to exactly one project; a task belongs to exactly one milestone (optional — a task can have no milestone).
- **Task**: `{ id, title, project (FK), milestone (FK, nullable), priority: "high"|"medium"|"low", due: date|null, assignees: string[], subtasks: Subtask[] }`
- **Subtask**: `{ id, title, done: boolean }`

Progress everywhere is computed as `completed subtasks / total subtasks`, rolled up across a task, a milestone (all its tasks), or a whole project (all its tasks).

## Screens / Views

All views share a fixed floating pill toolbar (top-center) and render inside a max-width 960px centered column with 24px page padding.

### 1. Toolbar (persistent, all views)
- Fixed to `top: 20px`, horizontally centered, `z-index: 40`.
- Pill shape: `border-radius: 44px`, `border: 1px solid var(--border)`, `background: var(--surface)`, padding `12px 16px`, `box-shadow: var(--shadow-md)`.
- Left: Flux logo mark (26×18px) + wordmark "flux" (`var(--font-display)`, 22px, weight 700, letter-spacing -0.02em). Clicking navigates to Projects view.
- Vertical divider (1px, `var(--border)`).
- Project switcher: button showing active project name + chevron-down icon; click opens a dropdown listing all projects, click one to switch active project and navigate to its detail page.
- Nav links (pill buttons, 16px, weight 500): Projects, Tasks, Timeline, Backlog. Active link gets `background: var(--surface-2)`, `color: var(--text)`; inactive is `var(--text-muted)` on transparent.
- Vertical divider, then an ellipsis (⋯) icon button (40×40px circle) opening a dropdown menu: "New project", "New task", divider, "Notifications" (non-functional placeholder), light/dark mode toggle, current-user row (avatar + name).

### 2. Projects view
- H1 "Projects" + "New project" secondary button (top right).
- Responsive grid, `repeat(auto-fit, minmax(240px,1fr))`, gap 16px, of project cards.
- Each card (clickable → project detail): project name (16px/600), description (13px muted), task count (mono, faint), a progress bar (aggregate subtask completion across the project), and a row of member avatars (24px).

### 3. Project detail view
- Header: project name (28px display font) with a pencil "edit" icon button beside it → opens Edit Project form. Description below (15px muted). Member avatars (26px) + a 220px-wide aggregate progress bar.
- "Milestones" section header (16px, muted) + "New milestone" secondary button.
- Each milestone renders as a card:
  - Header row: flag icon, milestone name (15px/600), pencil edit-icon button → Edit Milestone form; right side shows due date (mono) and a 120px progress bar scoped to that milestone's tasks.
  - Task rows below (one per task in the milestone): title, priority badge, subtask count (mono, faint), assignee avatars (18px). Row is clickable → opens Task Panel.
  - Footer row: "+ Add task" ghost button, pre-fills the New Task form with this project + milestone.

### 4. Tasks view
- H1 "Tasks" + "New task" secondary button.
- A card containing a 6-column grid table: Task / Project / Priority / Subtasks / Due / Assignees. Header row uses 11px uppercase muted labels. Each data row is clickable → Task Panel.
- Priority badge: pill, `border-radius: 999px`, padding `2px 8px`, 12px/500, capitalized; colored via `PRIORITY_TONE` map (high = danger, medium = warning, low = muted/surface-2).

### 5. Backlog view
- H1 "Backlog". Three columns (High / Medium / Low priority), each a vertical stack of task cards filtered by priority, showing count in the column header. Each card: title, project name + assignee avatars row, subtask count. Clickable → Task Panel.

### 6. Timeline view
- H1 "Timeline". One card per project, header = project name; below it, that project's tasks sorted by due date ascending (nulls last), each row showing title, assignee avatars, and due date (or "no due date"). Clickable → Task Panel. Empty state: "No tasks".

### 7. Task Panel (right-side slide-over, all views)
- Fixed overlay, `rgba(0,0,0,0.6)` backdrop, panel max-width 400px, slides in from the right (`translateX`), `background: var(--surface)`, `box-shadow: var(--shadow-lg)`.
- Header: task title (18px display/600), pencil edit-icon button → Edit Task form, close (×) icon button.
- Body: breadcrumb line "Project · Milestone" (13px muted). Then a flex-wrapped row of three labeled fields (Priority badge, Due date, Assignee avatars). Then a Subtasks section: progress bar, checklist (each row: custom checkbox — 18×18px rounded square, filled `var(--accent)` with a check icon when done, `line-through` + muted text on the label when done, both checkbox and label toggle on click), and an "Add subtask" text input + plus-icon button (Enter key or button click appends a new subtask).

### 8. Create / Edit forms (Project, Milestone, Task)
All three share one right-side slide-over panel pattern (same overlay/animation as the Task Panel, but with a footer bar):
- Header: title ("New Project"/"Edit Project", etc.) + close (×).
- Body: stacked labeled fields, 16px gap. Field label: 13px/600 muted, 6px above its control. Inputs: 14px, padding `8px 10px`, `border-radius: var(--radius)`, `border: 1px solid var(--border)`, `background: var(--bg)`.
- Footer: right-aligned "Cancel" (secondary button) + "Save" (primary button).
- **Project form** fields: Name (text), Description (textarea, 3 rows), Members (comma-separated text, split into array on save).
- **Milestone form** fields: Name (text), Due date (date input). Project is fixed from context (not shown as an editable field).
- **Task form** fields: Title (text), Project (select — changing it repopulates the Milestone dropdown), Milestone (select, options scoped to the chosen project, includes "No milestone"), Priority (select: High/Medium/Low), Due date (date input), Assignees (comma-separated text).

## Interactions & Behavior
- All navigation is client-side view-state swapping (no real routing) — `view` state in the root App component: `"projects" | "project-detail" | "tasks" | "backlog" | "timeline"`.
- Opening a task from ANY view sets the active project to that task's project and opens the Task Panel over the current view.
- Opening the edit form for a task/project/milestone closes any currently-open Task Panel (only one slide-over renders at a time in this prototype).
- Subtask checkbox toggle and "add subtask" mutate state immediately (optimistic, no confirmation).
- Saving a create form appends a new record with an auto-incremented id (`max(existing ids) + 1`); saving an edit form patches the matching record by id.
- Dark/light mode toggle sets `data-mode` on `<body>`; theming is entirely CSS-variable driven (see Design Tokens).
- Panel enter animation: opacity fade on the backdrop + `translateX(100%) → translateX(0)` on the panel, using `var(--duration-normal)` / `var(--ease-standard)`.
- **State persistence**: this prototype is in-memory only — refreshing the page resets all data to the seeded defaults. A real implementation needs a backend/DB (or at minimum localStorage) for persistence.
- No delete flows were built (create + edit only, per explicit scope) — decide whether the real product needs delete/archive for projects, milestones, and tasks.

## Design Tokens
Sourced from the Origo design system's Flux theme (`_ds/.../tokens/*.css`, `[data-theme="flux"]` scope). Reference the actual token files for exact hex/px values rather than hardcoding — they are CSS custom properties:
- Colors: `--bg`, `--surface`, `--surface-2`, `--text`, `--text-muted`, `--text-faint`, `--border`, `--accent`, `--accent-contrast`, `--accent-wash`, `--danger` / `--danger-wash`, `--warning` / `--warning-wash`, `--success` / `--success-wash`, `--secondary` / `--secondary-wash`.
- Typography: `--font-display` (Geist, used for headings/wordmark), `--font-body`, `--font-mono` (used for dates, counts).
- Shape/elevation: `--radius` (8px per Flux spec), `--shadow-md`, `--shadow-lg`.
- Motion: `--duration-normal`, `--ease-standard` (Flux-specific easing curve — no scale/bounce transitions, only opacity + translateX per the design system).
- Avatar colors are generated client-side via a fixed 6-color palette hashed from the person's name (see `Avatar.jsx` in the design system) — reimplement the same hashing if avatar color consistency across sessions matters.

## Assets
- `assets/flux-logo.svg` — Flux product wordmark/logo, copied from the Origo design system (`_ds/.../assets/flux-logo.svg`), colored via `currentColor`.
- Icons are Lucide icons loaded by name (`pencil`, `x`, `check`, `plus`, `flag`, `chevron-down`, `ellipsis`, `bell`, `sun`/`moon`, `folder`, `folder-plus`, `list`, `route`, `inbox`) via the design system's `Icon` component (CSS mask against `lucide-static` CDN icons) — swap for the target codebase's own icon system.

## Files
- `Flux.html` — entry point, loads React/ReactDOM/Babel (CDN, dev builds) and the Origo Flux design-system bundle + tokens, then the app scripts below.
- `data.jsx` — seed data (`INITIAL_PROJECTS`, `INITIAL_MILESTONES`, `INITIAL_TASKS`), the priority color map, and all lookup/aggregation helpers (`projectName`, `milestoneName`, `tasksForProject`, `subtaskCounts`, etc.).
- `Toolbar.jsx` — floating nav pill, project switcher, overflow menu.
- `Views.jsx` — `ProjectsView`, `TasksView`, `BacklogView`, `TimelineView`.
- `ProjectDetail.jsx` — `ProjectDetailView` (milestones + their tasks).
- `TaskPanel.jsx` — task detail slide-over + subtask checklist + `ProgressBar` (shared component, also used by other views).
- `FormPanel.jsx` — shared `SidePanel`/`Field`/input primitives + `ProjectForm`, `MilestoneForm`, `TaskForm`.
- `app.jsx` — root `App` component: all state (`projects`, `milestones`, `tasks`, `view`, `activeProjectId`, `openTaskId`, `formPanel`) and the create/edit save handlers.
