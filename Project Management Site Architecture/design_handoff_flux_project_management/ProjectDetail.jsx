function ProjectDetailView({ projectId, projects, milestones, tasks, onOpenTask, onEditProject, onNewMilestone, onEditMilestone, onNewTask }) {
  const { Card, Avatar, Icon, Button } = window.OrigoDesignSystem_f98fc7;
  const project = projectById(projects, projectId);
  if (!project) return null;
  const { done, total } = subtaskCounts(tasksForProject(tasks, projectId));
  return (
    <div style={{display:"flex",flexDirection:"column",gap:24,padding:24,maxWidth:960,margin:"0 auto"}}>
      <div style={{display:"flex",flexDirection:"column",gap:12}}>
        <div style={{display:"flex",alignItems:"center",gap:10}}>
          <h1 style={{fontFamily:"var(--font-display)",fontSize:28,fontWeight:600,margin:0}}>{project.name}</h1>
          <button onClick={onEditProject} aria-label="Edit project" style={{all:"unset",cursor:"pointer",color:"var(--text-faint)",display:"flex"}}><Icon name="pencil" size={16}/></button>
        </div>
        <p style={{fontSize:15,color:"var(--text-muted)",margin:0}}>{project.description}</p>
        <div style={{display:"flex",alignItems:"center",gap:16}}>
          <div style={{display:"flex",gap:6}}>{project.members.map(m=><Avatar key={m} name={m} size={26}/>)}</div>
          <div style={{width:220}}><ProgressBar done={done} total={total}/></div>
        </div>
      </div>
      <div style={{display:"flex",flexDirection:"column",gap:16}}>
        <div style={{display:"flex",alignItems:"center",justifyContent:"space-between"}}>
          <h2 style={{fontFamily:"var(--font-display)",fontSize:16,fontWeight:600,margin:0,color:"var(--text-muted)"}}>Milestones</h2>
          <Button variant="secondary" size="sm" onClick={onNewMilestone}><Icon name="plus" size={14}/>New milestone</Button>
        </div>
        {milestonesForProject(milestones, projectId).map(m=>{
          const items = tasksForMilestone(tasks, m.id);
          const counts = subtaskCounts(items);
          return (
            <Card key={m.id} style={{padding:0,overflow:"hidden"}}>
              <div style={{display:"flex",alignItems:"center",justifyContent:"space-between",padding:"14px 16px",borderBottom:"1px solid var(--border)",gap:16}}>
                <div style={{display:"flex",alignItems:"center",gap:10}}>
                  <Icon name="flag" size={16} color="var(--text-faint)"/>
                  <span style={{fontSize:15,fontWeight:600}}>{m.name}</span>
                  <button onClick={()=>onEditMilestone(m)} aria-label="Edit milestone" style={{all:"unset",cursor:"pointer",color:"var(--text-faint)",display:"flex"}}><Icon name="pencil" size={14}/></button>
                </div>
                <div style={{display:"flex",alignItems:"center",gap:16}}>
                  <span style={{fontFamily:"var(--font-mono)",fontSize:13,color:"var(--text-muted)"}}>Due {m.due ?? "—"}</span>
                  <div style={{width:120}}><ProgressBar done={counts.done} total={counts.total} height={5}/></div>
                </div>
              </div>
              {items.map((t,i)=>{
                const p = taskProgress(t);
                return (
                  <div key={t.id} onClick={()=>onOpenTask(t.id)} style={{display:"flex",alignItems:"center",justifyContent:"space-between",padding:"10px 16px",cursor:"pointer",borderBottom:"1px solid var(--border)"}}>
                    <span style={{fontSize:14}}>{t.title}</span>
                    <div style={{display:"flex",alignItems:"center",gap:14}}>
                      <span style={{display:"inline-flex",width:"fit-content",borderRadius:999,padding:"2px 8px",fontSize:12,fontWeight:500,textTransform:"capitalize",color:PRIORITY_TONE[t.priority].color,background:PRIORITY_TONE[t.priority].bg}}>{t.priority}</span>
                      <span style={{fontFamily:"var(--font-mono)",fontSize:12,color:"var(--text-faint)"}}>{p.done}/{p.total}</span>
                      <div style={{display:"flex",gap:4}}>{t.assignees.map(a=><Avatar key={a} name={a} size={18}/>)}</div>
                    </div>
                  </div>
                );
              })}
              <button onClick={()=>onNewTask(m.id)} style={{all:"unset",display:"flex",alignItems:"center",gap:8,padding:"10px 16px",cursor:"pointer",color:"var(--text-faint)",fontSize:13}}><Icon name="plus" size={14}/>Add task</button>
            </Card>
          );
        })}
      </div>
    </div>
  );
}
