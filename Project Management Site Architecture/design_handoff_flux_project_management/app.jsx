function App() {
  const [projects, setProjects] = React.useState(INITIAL_PROJECTS);
  const [milestones, setMilestones] = React.useState(INITIAL_MILESTONES);
  const [tasks, setTasks] = React.useState(INITIAL_TASKS);
  const [view, setView] = React.useState("project-detail");
  const [activeProjectId, setActiveProjectId] = React.useState(1);
  const [openTaskId, setOpenTaskId] = React.useState(null);
  const [formPanel, setFormPanel] = React.useState(null); // { type: 'project'|'milestone'|'task', initial, context }
  const [mode, setMode] = React.useState("light");
  React.useEffect(()=>{ document.body.setAttribute("data-mode", mode); }, [mode]);

  const openProject = (id) => { setActiveProjectId(id); setView("project-detail"); };
  const openTask = (id) => { const t = tasks.find(x=>x.id===id); if (t) setActiveProjectId(t.project); setOpenTaskId(id); };
  const openTaskEntity = tasks.find(t=>t.id===openTaskId) ?? null;

  function saveProject(data) {
    setProjects(prev => formPanel.initial ? prev.map(p=>p.id===formPanel.initial.id?{...p,...data}:p) : [...prev, { id: nextId(prev), ...data }]);
    setFormPanel(null);
  }
  function saveMilestone(data) {
    setMilestones(prev => formPanel.initial ? prev.map(m=>m.id===formPanel.initial.id?{...m,...data}:m) : [...prev, { id: nextId(prev), ...data }]);
    setFormPanel(null);
  }
  function saveTask(data) {
    setTasks(prev => formPanel.initial ? prev.map(t=>t.id===formPanel.initial.id?{...t,...data}:t) : [...prev, { id: nextId(prev), subtasks: [], ...data }]);
    setFormPanel(null);
  }

  return (
    <div style={{minHeight:"100vh",background:"var(--bg)",color:"var(--text)",paddingTop:96,paddingBottom:56}}>
      <Toolbar view={view} setView={setView} projects={projects} activeProjectId={activeProjectId} setActiveProjectId={setActiveProjectId} goToProject={openProject}
        mode={mode} onToggleMode={()=>setMode(m=>m==="dark"?"light":"dark")}
        onNewProject={()=>setFormPanel({ type: "project", initial: null })}
        onNewTask={()=>setFormPanel({ type: "task", initial: null, defaultProjectId: activeProjectId })}/>
      {view === "projects" && <ProjectsView projects={projects} tasks={tasks} onOpenProject={openProject} onNewProject={()=>setFormPanel({ type: "project", initial: null })}/>}
      {view === "project-detail" && <ProjectDetailView projectId={activeProjectId} projects={projects} milestones={milestones} tasks={tasks} onOpenTask={openTask}
        onEditProject={()=>setFormPanel({ type: "project", initial: projectById(projects, activeProjectId) })}
        onNewMilestone={()=>setFormPanel({ type: "milestone", initial: null, context: { projectId: activeProjectId } })}
        onEditMilestone={(m)=>setFormPanel({ type: "milestone", initial: m, context: { projectId: activeProjectId } })}
        onNewTask={(milestoneId)=>setFormPanel({ type: "task", initial: null, defaultProjectId: activeProjectId, defaultMilestoneId: milestoneId })}/>}
      {view === "tasks" && <TasksView projects={projects} tasks={tasks} onOpenTask={openTask} onNewTask={()=>setFormPanel({ type: "task", initial: null, defaultProjectId: activeProjectId })}/>}
      {view === "backlog" && <BacklogView projects={projects} tasks={tasks} onOpenTask={openTask}/>}
      {view === "timeline" && <TimelineView projects={projects} tasks={tasks} onOpenTask={openTask}/>}

      {openTaskEntity && !formPanel && <TaskPanel task={openTaskEntity} projects={projects} milestones={milestones} setTasks={setTasks} onClose={()=>setOpenTaskId(null)}
        onEdit={()=>setFormPanel({ type: "task", initial: openTaskEntity })}/>}

      {formPanel?.type === "project" && <ProjectForm initial={formPanel.initial} onCancel={()=>setFormPanel(null)} onSave={saveProject}/>}
      {formPanel?.type === "milestone" && <MilestoneForm initial={formPanel.initial} projectId={formPanel.context?.projectId ?? formPanel.initial?.project} onCancel={()=>setFormPanel(null)} onSave={saveMilestone}/>}
      {formPanel?.type === "task" && <TaskForm initial={formPanel.initial} projects={projects} milestones={milestones} defaultProjectId={formPanel.defaultProjectId} defaultMilestoneId={formPanel.defaultMilestoneId} onCancel={()=>setFormPanel(null)} onSave={saveTask}/>}
    </div>
  );
}
ReactDOM.createRoot(document.getElementById("root")).render(<App/>);
