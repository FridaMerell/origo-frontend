function ProgressBar({ done, total, height = 6 }) {
  const pct = total ? Math.round((done / total) * 100) : 0;
  return (
    <div style={{display:"flex",flexDirection:"column",gap:4}}>
      <div style={{height,borderRadius:999,background:"var(--surface-2)",overflow:"hidden"}}>
        <div style={{height:"100%",width:`${pct}%`,background:"var(--accent)",borderRadius:999,transition:"width var(--duration-normal) var(--ease-standard)"}}/>
      </div>
      <span style={{fontFamily:"var(--font-mono)",fontSize:12,color:"var(--text-muted)"}}>{done}/{total} subtasks</span>
    </div>
  );
}

function TaskPanel({ task, projects, milestones, setTasks, onClose, onEdit }) {
  const { Icon, Avatar } = window.OrigoDesignSystem_f98fc7;
  const [entered, setEntered] = React.useState(false);
  const [newSubtask, setNewSubtask] = React.useState("");
  React.useEffect(() => { const id = requestAnimationFrame(() => setEntered(true)); return () => cancelAnimationFrame(id); }, [task?.id]);
  if (!task) return null;
  const { done, total } = taskProgress(task);
  function toggleSubtask(subId) {
    setTasks(prev => prev.map(t => t.id !== task.id ? t : { ...t, subtasks: t.subtasks.map(s => s.id === subId ? { ...s, done: !s.done } : s) }));
  }
  function addSubtask() {
    const title = newSubtask.trim();
    if (!title) return;
    setTasks(prev => prev.map(t => t.id !== task.id ? t : { ...t, subtasks: [...t.subtasks, { id: nextId(t.subtasks), title, done: false }] }));
    setNewSubtask("");
  }
  return (
    <div style={{position:"fixed",inset:0,zIndex:50,display:"flex",background:"rgba(0,0,0,0.6)",transitionProperty:"opacity",transitionDuration:"var(--duration-normal)",transitionTimingFunction:"var(--ease-standard)",opacity:entered?1:0}} onClick={onClose}>
      <div role="dialog" aria-modal="true" style={{display:"flex",height:"100%",width:"100%",maxWidth:400,flexDirection:"column",background:"var(--surface)",boxShadow:"var(--shadow-lg)",marginLeft:"auto",
        transitionProperty:"transform",transitionDuration:"var(--duration-normal)",transitionTimingFunction:"var(--ease-standard)",transform:entered?"translateX(0)":"translateX(100%)"}} onClick={e=>e.stopPropagation()}>
        <div style={{display:"flex",alignItems:"flex-start",justifyContent:"space-between",gap:12,borderBottom:"1px solid var(--border)",padding:16}}>
          <h2 style={{margin:0,fontFamily:"var(--font-display)",fontSize:18,fontWeight:600,color:"var(--text)"}}>{task.title}</h2>
          <div style={{display:"flex",alignItems:"center",gap:12,flexShrink:0}}>
            <button onClick={onEdit} aria-label="Edit task" style={{all:"unset",cursor:"pointer",color:"var(--text-faint)",display:"flex"}}><Icon name="pencil" size={16}/></button>
            <button onClick={onClose} aria-label="Close" style={{all:"unset",cursor:"pointer",color:"var(--text-muted)",display:"flex"}}><Icon name="x" size={16}/></button>
          </div>
        </div>
        <div style={{flex:1,overflowY:"auto",padding:16,display:"flex",flexDirection:"column",gap:20}}>
          <div style={{display:"flex",flexDirection:"column",gap:6,fontSize:13,color:"var(--text-muted)"}}>
            <span>{projectName(projects, task.project)}{task.milestone ? ` · ${milestoneName(milestones, task.milestone)}` : ""}</span>
          </div>
          <div style={{display:"flex",gap:16,flexWrap:"wrap"}}>
            <div style={{display:"flex",flexDirection:"column",gap:4}}>
              <span style={{fontSize:11,fontWeight:600,textTransform:"uppercase",letterSpacing:"0.04em",color:"var(--text-faint)"}}>Priority</span>
              <span style={{display:"inline-flex",width:"fit-content",borderRadius:999,padding:"2px 10px",fontSize:12,fontWeight:500,textTransform:"capitalize",color:PRIORITY_TONE[task.priority].color,background:PRIORITY_TONE[task.priority].bg}}>{task.priority}</span>
            </div>
            <div style={{display:"flex",flexDirection:"column",gap:4}}>
              <span style={{fontSize:11,fontWeight:600,textTransform:"uppercase",letterSpacing:"0.04em",color:"var(--text-faint)"}}>Due</span>
              <span style={{fontFamily:"var(--font-mono)",fontSize:13,color:"var(--text)"}}>{task.due ?? "—"}</span>
            </div>
            <div style={{display:"flex",flexDirection:"column",gap:4}}>
              <span style={{fontSize:11,fontWeight:600,textTransform:"uppercase",letterSpacing:"0.04em",color:"var(--text-faint)"}}>Assignees</span>
              <div style={{display:"flex",gap:4}}>{task.assignees.map(a=><Avatar key={a} name={a} size={22}/>)}</div>
            </div>
          </div>
          <div style={{display:"flex",flexDirection:"column",gap:10}}>
            <span style={{fontSize:11,fontWeight:600,textTransform:"uppercase",letterSpacing:"0.04em",color:"var(--text-faint)"}}>Subtasks</span>
            <ProgressBar done={done} total={total}/>
            <div style={{display:"flex",flexDirection:"column",gap:2}}>
              {task.subtasks.map(s=>(
                <label key={s.id} style={{display:"flex",alignItems:"center",gap:10,padding:"8px 4px",cursor:"pointer",borderRadius:"var(--radius)"}}>
                  <span onClick={()=>toggleSubtask(s.id)} style={{display:"flex",alignItems:"center",justifyContent:"center",width:18,height:18,borderRadius:5,flexShrink:0,
                    border: s.done ? "none" : "1px solid var(--border)", background: s.done ? "var(--accent)" : "transparent"}}>
                    {s.done && <Icon name="check" size={12} color="var(--accent-contrast)"/>}
                  </span>
                  <span onClick={()=>toggleSubtask(s.id)} style={{fontSize:14,color: s.done ? "var(--text-muted)" : "var(--text)", textDecoration: s.done ? "line-through" : "none"}}>{s.title}</span>
                </label>
              ))}
            </div>
            <div style={{display:"flex",gap:8}}>
              <input value={newSubtask} onChange={e=>setNewSubtask(e.target.value)} onKeyDown={e=>e.key==="Enter" && addSubtask()} placeholder="Add subtask"
                style={{flex:1,font:"inherit",fontSize:14,padding:"8px 10px",borderRadius:"var(--radius)",border:"1px solid var(--border)",background:"var(--bg)",color:"var(--text)"}}/>
              <button onClick={addSubtask} aria-label="Add subtask" style={{all:"unset",display:"flex",alignItems:"center",justifyContent:"center",width:36,borderRadius:"var(--radius)",background:"var(--surface-2)",cursor:"pointer",color:"var(--text)"}}><Icon name="plus" size={16}/></button>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
