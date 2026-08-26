function ProjectsView({ projects, tasks, onOpenProject, onNewProject }) {
  const { Card, Avatar, Button, Icon } = window.OrigoDesignSystem_f98fc7;
  return (
    <div style={{display:"flex",flexDirection:"column",gap:16,padding:24,maxWidth:960,margin:"0 auto"}}>
      <div style={{display:"flex",alignItems:"center",justifyContent:"space-between"}}>
        <h1 style={{fontFamily:"var(--font-display)",fontSize:24,fontWeight:600,margin:0}}>Projects</h1>
        <Button variant="secondary" onClick={onNewProject}><Icon name="plus" size={16}/>New project</Button>
      </div>
      <div style={{display:"grid",gridTemplateColumns:"repeat(auto-fit,minmax(240px,1fr))",gap:16}}>
        {projects.map(p=>{
          const { done, total } = subtaskCounts(tasksForProject(tasks, p.id));
          return (
            <Card key={p.id} onClick={()=>onOpenProject(p.id)} style={{display:"flex",flexDirection:"column",gap:10,cursor:"pointer"}}>
              <span style={{fontSize:16,fontWeight:600}}>{p.name}</span>
              <p style={{fontSize:13,color:"var(--text-muted)",margin:0}}>{p.description}</p>
              <span style={{fontFamily:"var(--font-mono)",fontSize:13,color:"var(--text-faint)"}}>{tasksForProject(tasks, p.id).length} tasks</span>
              <ProgressBar done={done} total={total}/>
              <div style={{display:"flex",gap:6}}>{p.members.map(m=><Avatar key={m} name={m} size={24}/>)}</div>
            </Card>
          );
        })}
      </div>
    </div>
  );
}

function TasksView({ projects, tasks, onOpenTask, onNewTask }) {
  const { Card, Avatar, Button, Icon } = window.OrigoDesignSystem_f98fc7;
  return (
    <div style={{display:"flex",flexDirection:"column",gap:16,padding:24,maxWidth:960,margin:"0 auto"}}>
      <div style={{display:"flex",alignItems:"center",justifyContent:"space-between"}}>
        <h1 style={{fontFamily:"var(--font-display)",fontSize:24,fontWeight:600,margin:0}}>Tasks</h1>
        <Button variant="secondary" onClick={onNewTask}><Icon name="plus" size={16}/>New task</Button>
      </div>
      <Card style={{padding:0,overflow:"hidden"}}>
        <div style={{display:"grid",gridTemplateColumns:"1fr 160px 100px 90px 120px 140px",borderBottom:"1px solid var(--border)",padding:"10px 16px",fontSize:11,fontWeight:600,textTransform:"uppercase",letterSpacing:"0.04em",color:"var(--text-faint)"}}>
          <span>Task</span><span>Project</span><span>Priority</span><span>Subtasks</span><span>Due</span><span>Assignees</span>
        </div>
        {tasks.map((t,i)=>{
          const { done, total } = taskProgress(t);
          return (
            <div key={t.id} onClick={()=>onOpenTask(t.id)} style={{display:"grid",gridTemplateColumns:"1fr 160px 100px 90px 120px 140px",alignItems:"center",padding:"12px 16px",cursor:"pointer",borderBottom: i<tasks.length-1?"1px solid var(--border)":"none"}}>
              <span style={{fontSize:14}}>{t.title}</span>
              <span style={{fontSize:14,color:"var(--text-muted)"}}>{projectName(projects, t.project)}</span>
              <span style={{display:"inline-flex",width:"fit-content",borderRadius:999,padding:"2px 8px",fontSize:12,fontWeight:500,textTransform:"capitalize",color:PRIORITY_TONE[t.priority].color,background:PRIORITY_TONE[t.priority].bg}}>{t.priority}</span>
              <span style={{fontFamily:"var(--font-mono)",fontSize:13,color:"var(--text-muted)"}}>{done}/{total}</span>
              <span style={{fontFamily:"var(--font-mono)",fontSize:13,color:"var(--text-muted)"}}>{t.due ?? "—"}</span>
              <span style={{display:"flex",gap:4}}>{t.assignees.map(a=><Avatar key={a} name={a} size={20}/>)}</span>
            </div>
          );
        })}
      </Card>
    </div>
  );
}

function BacklogView({ projects, tasks, onOpenTask }) {
  const { Card, Avatar } = window.OrigoDesignSystem_f98fc7;
  const cols = [{ label: "High priority", key: "high" }, { label: "Medium priority", key: "medium" }, { label: "Low priority", key: "low" }];
  return (
    <div style={{display:"flex",flexDirection:"column",gap:16,padding:24,maxWidth:960,margin:"0 auto"}}>
      <h1 style={{fontFamily:"var(--font-display)",fontSize:24,fontWeight:600,margin:0}}>Backlog</h1>
      <div style={{display:"flex",gap:16,alignItems:"flex-start"}}>
        {cols.map(c=>{
          const items = tasks.filter(t=>t.priority===c.key);
          return (
            <div key={c.key} style={{flex:1,display:"flex",flexDirection:"column",gap:10}}>
              <div style={{fontSize:11,fontWeight:700,textTransform:"uppercase",letterSpacing:"0.04em",color:"var(--text-muted)"}}>{c.label} · {items.length}</div>
              {items.map(t=>{
                const { done, total } = taskProgress(t);
                return (
                  <Card key={t.id} onClick={()=>onOpenTask(t.id)} style={{display:"flex",flexDirection:"column",gap:8,padding:12,cursor:"pointer"}}>
                    <span style={{fontSize:14}}>{t.title}</span>
                    <div style={{display:"flex",justifyContent:"space-between",alignItems:"center"}}>
                      <span style={{fontSize:12,color:"var(--text-muted)"}}>{projectName(projects, t.project)}</span>
                      <div style={{display:"flex",gap:4}}>{t.assignees.map(a=><Avatar key={a} name={a} size={18}/>)}</div>
                    </div>
                    <span style={{fontFamily:"var(--font-mono)",fontSize:12,color:"var(--text-faint)"}}>{done}/{total} subtasks</span>
                  </Card>
                );
              })}
            </div>
          );
        })}
      </div>
    </div>
  );
}

function TimelineView({ projects, tasks, onOpenTask }) {
  const { Card, Avatar } = window.OrigoDesignSystem_f98fc7;
  return (
    <div style={{display:"flex",flexDirection:"column",gap:16,padding:24,maxWidth:960,margin:"0 auto"}}>
      <h1 style={{fontFamily:"var(--font-display)",fontSize:24,fontWeight:600,margin:0}}>Timeline</h1>
      {projects.map(p=>{
        const items = tasksForProject(tasks, p.id).slice().sort((a,b)=>(a.due??"").localeCompare(b.due??""));
        return (
          <Card key={p.id} style={{padding:0,overflow:"hidden"}}>
            <div style={{padding:"10px 16px",borderBottom:"1px solid var(--border)",fontSize:14,fontWeight:600}}>{p.name}</div>
            {items.length===0 ? <div style={{padding:"12px 16px",fontSize:13,color:"var(--text-muted)"}}>No tasks</div> : items.map((t,i)=>(
              <div key={t.id} onClick={()=>onOpenTask(t.id)} style={{display:"flex",justifyContent:"space-between",alignItems:"center",padding:"10px 16px",cursor:"pointer",borderBottom:i<items.length-1?"1px solid var(--border)":"none"}}>
                <span style={{fontSize:14}}>{t.title}</span>
                <div style={{display:"flex",alignItems:"center",gap:12}}>
                  <div style={{display:"flex",gap:4}}>{t.assignees.map(a=><Avatar key={a} name={a} size={18}/>)}</div>
                  <span style={{fontFamily:"var(--font-mono)",fontSize:12,color:"var(--text-muted)"}}>{t.due ?? "no due date"}</span>
                </div>
              </div>
            ))}
          </Card>
        );
      })}
    </div>
  );
}
