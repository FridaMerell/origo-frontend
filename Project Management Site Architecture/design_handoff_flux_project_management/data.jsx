const INITIAL_PROJECTS = [
  { id: 1, name: "Fjärrverket", description: "Home energy monitoring dashboard.", members: ["Frida Merell", "Elis Ström"] },
  { id: 2, name: "Fältdata", description: "Bird-survey data pipeline.", members: ["Noa Lindgren"] },
];

const INITIAL_MILESTONES = [
  { id: 1, project: 1, name: "Sensor calibration", due: "2026-09-14" },
  { id: 2, project: 1, name: "Data pipeline v1", due: "2026-10-01" },
  { id: 3, project: 2, name: "Field protocol draft", due: "2026-09-30" },
];

const INITIAL_TASKS = [
  { id: 1, title: "Calibrate IMU on rev-C board", project: 1, milestone: 1, priority: "high", due: "2026-09-14", assignees: ["Frida Merell"],
    subtasks: [{ id: 1, title: "Mount board on test rig", done: true }, { id: 2, title: "Log baseline readings", done: true }, { id: 3, title: "Compare against reference sensor", done: false }] },
  { id: 2, title: "Write ingestion tests", project: 1, milestone: 2, priority: "medium", due: "2026-09-20", assignees: ["Elis Ström"],
    subtasks: [{ id: 1, title: "Unit tests for parser", done: true }, { id: 2, title: "Integration test with mock stream", done: false }] },
  { id: 3, title: "Draft field protocol", project: 2, milestone: 3, priority: "low", due: null, assignees: ["Noa Lindgren"],
    subtasks: [{ id: 1, title: "Outline survey steps", done: false }, { id: 2, title: "Get review from team", done: false }] },
  { id: 4, title: "Set up CI pipeline", project: 1, milestone: 2, priority: "medium", due: "2026-09-25", assignees: ["Frida Merell"],
    subtasks: [{ id: 1, title: "Configure GitHub actions", done: true }] },
  { id: 5, title: "Solder power regulator", project: 1, milestone: 1, priority: "high", due: "2026-09-10", assignees: ["Elis Ström"],
    subtasks: [{ id: 1, title: "Order parts", done: true }, { id: 2, title: "Solder board", done: true }, { id: 3, title: "Bench test", done: true }] },
  { id: 6, title: "Recruit volunteer surveyors", project: 2, milestone: 3, priority: "medium", due: "2026-10-05", assignees: ["Noa Lindgren"],
    subtasks: [{ id: 1, title: "Post listing", done: true }, { id: 2, title: "Screen applicants", done: false }] },
];

const PRIORITY_TONE = { high: { color: "var(--danger)", bg: "var(--danger-wash)" }, medium: { color: "var(--warning)", bg: "var(--warning-wash)" }, low: { color: "var(--text-muted)", bg: "var(--surface-2)" } };

function nextId(list) { return list.reduce((max, x) => Math.max(max, x.id), 0) + 1; }
function projectById(projects, id) { return projects.find(p => p.id === id); }
function projectName(projects, id) { return projectById(projects, id)?.name ?? "—"; }
function milestoneById(milestones, id) { return milestones.find(m => m.id === id); }
function milestoneName(milestones, id) { return milestoneById(milestones, id)?.name ?? "—"; }
function milestonesForProject(milestones, projectId) { return milestones.filter(m => m.project === projectId); }
function tasksForProject(tasks, projectId) { return tasks.filter(t => t.project === projectId); }
function tasksForMilestone(tasks, milestoneId) { return tasks.filter(t => t.milestone === milestoneId); }
function subtaskCounts(taskList) {
  let done = 0, total = 0;
  taskList.forEach(t => { total += t.subtasks.length; done += t.subtasks.filter(s => s.done).length; });
  return { done, total };
}
function taskProgress(task) { return subtaskCounts([task]); }
function splitNames(str) { return str.split(",").map(s => s.trim()).filter(Boolean); }
