function SidePanel({ title, onClose, children, footer }) {
  const { Icon } = window.OrigoDesignSystem_f98fc7;
  const [entered, setEntered] = React.useState(false);
  React.useEffect(() => { const id = requestAnimationFrame(() => setEntered(true)); return () => cancelAnimationFrame(id); }, []);
  return (
    <div style={{position:"fixed",inset:0,zIndex:50,display:"flex",background:"rgba(0,0,0,0.6)",transitionProperty:"opacity",transitionDuration:"var(--duration-normal)",transitionTimingFunction:"var(--ease-standard)",opacity:entered?1:0}} onClick={onClose}>
      <div role="dialog" aria-modal="true" style={{display:"flex",height:"100%",width:"100%",maxWidth:400,flexDirection:"column",background:"var(--surface)",boxShadow:"var(--shadow-lg)",marginLeft:"auto",
        transitionProperty:"transform",transitionDuration:"var(--duration-normal)",transitionTimingFunction:"var(--ease-standard)",transform:entered?"translateX(0)":"translateX(100%)"}} onClick={e=>e.stopPropagation()}>
        <div style={{display:"flex",alignItems:"flex-start",justifyContent:"space-between",gap:12,borderBottom:"1px solid var(--border)",padding:16}}>
          <h2 style={{margin:0,fontFamily:"var(--font-display)",fontSize:18,fontWeight:600,color:"var(--text)"}}>{title}</h2>
          <button onClick={onClose} aria-label="Close" style={{all:"unset",cursor:"pointer",color:"var(--text-muted)",flexShrink:0}}><Icon name="x" size={16}/></button>
        </div>
        <div style={{flex:1,overflowY:"auto",padding:16,display:"flex",flexDirection:"column",gap:16}}>{children}</div>
        {footer && <div style={{borderTop:"1px solid var(--border)",padding:16,display:"flex",gap:8,justifyContent:"flex-end"}}>{footer}</div>}
      </div>
    </div>
  );
}

function Field({ label, children }) {
  return <label style={{display:"flex",flexDirection:"column",gap:6,fontSize:13}}>
    <span style={{fontWeight:600,color:"var(--text-muted)"}}>{label}</span>
    {children}
  </label>;
}

const inputStyle = { font: "inherit", fontSize: 14, padding: "8px 10px", borderRadius: "var(--radius)", border: "1px solid var(--border)", background: "var(--bg)", color: "var(--text)" };

function TextInput(props) { return <input {...props} style={{...inputStyle, ...props.style}}/>; }
function TextArea(props) { return <textarea {...props} rows={props.rows||3} style={{...inputStyle, resize:"vertical", ...props.style}}/>; }
function SelectInput({ children, ...props }) { return <select {...props} style={{...inputStyle}}>{children}</select>; }

function ProjectForm({ initial, onCancel, onSave }) {
  const { Button } = window.OrigoDesignSystem_f98fc7;
  const [name, setName] = React.useState(initial?.name ?? "");
  const [description, setDescription] = React.useState(initial?.description ?? "");
  const [members, setMembers] = React.useState((initial?.members ?? []).join(", "));
  return (
    <SidePanel title={initial ? "Edit project" : "New project"} onClose={onCancel} footer={<>
      <Button variant="secondary" onClick={onCancel}>Cancel</Button>
      <Button variant="primary" onClick={()=>name.trim() && onSave({ name: name.trim(), description: description.trim(), members: splitNames(members) })}>Save</Button>
    </>}>
      <Field label="Name"><TextInput value={name} onChange={e=>setName(e.target.value)} autoFocus/></Field>
      <Field label="Description"><TextArea value={description} onChange={e=>setDescription(e.target.value)}/></Field>
      <Field label="Members (comma separated)"><TextInput value={members} onChange={e=>setMembers(e.target.value)} placeholder="Frida Merell, Elis Ström"/></Field>
    </SidePanel>
  );
}

function MilestoneForm({ initial, projectId, onCancel, onSave }) {
  const { Button } = window.OrigoDesignSystem_f98fc7;
  const [name, setName] = React.useState(initial?.name ?? "");
  const [due, setDue] = React.useState(initial?.due ?? "");
  return (
    <SidePanel title={initial ? "Edit milestone" : "New milestone"} onClose={onCancel} footer={<>
      <Button variant="secondary" onClick={onCancel}>Cancel</Button>
      <Button variant="primary" onClick={()=>name.trim() && onSave({ name: name.trim(), due: due || null, project: projectId })}>Save</Button>
    </>}>
      <Field label="Name"><TextInput value={name} onChange={e=>setName(e.target.value)} autoFocus/></Field>
      <Field label="Due date"><TextInput type="date" value={due ?? ""} onChange={e=>setDue(e.target.value)}/></Field>
    </SidePanel>
  );
}

function TaskForm({ initial, projects, milestones, defaultProjectId, defaultMilestoneId, onCancel, onSave }) {
  const { Button } = window.OrigoDesignSystem_f98fc7;
  const [title, setTitle] = React.useState(initial?.title ?? "");
  const [projectId, setProjectId] = React.useState(initial?.project ?? defaultProjectId ?? projects[0]?.id);
  const [milestoneId, setMilestoneId] = React.useState(initial?.milestone ?? defaultMilestoneId ?? "");
  const [priority, setPriority] = React.useState(initial?.priority ?? "medium");
  const [due, setDue] = React.useState(initial?.due ?? "");
  const [assignees, setAssignees] = React.useState((initial?.assignees ?? []).join(", "));
  const availableMilestones = milestonesForProject(milestones, Number(projectId));
  React.useEffect(()=>{ if (!availableMilestones.some(m=>m.id===Number(milestoneId))) setMilestoneId(availableMilestones[0]?.id ?? ""); }, [projectId]);
  return (
    <SidePanel title={initial ? "Edit task" : "New task"} onClose={onCancel} footer={<>
      <Button variant="secondary" onClick={onCancel}>Cancel</Button>
      <Button variant="primary" onClick={()=>title.trim() && onSave({ title: title.trim(), project: Number(projectId), milestone: milestoneId ? Number(milestoneId) : null, priority, due: due || null, assignees: splitNames(assignees) })}>Save</Button>
    </>}>
      <Field label="Title"><TextInput value={title} onChange={e=>setTitle(e.target.value)} autoFocus/></Field>
      <Field label="Project"><SelectInput value={projectId} onChange={e=>setProjectId(Number(e.target.value))}>{projects.map(p=><option key={p.id} value={p.id}>{p.name}</option>)}</SelectInput></Field>
      <Field label="Milestone"><SelectInput value={milestoneId} onChange={e=>setMilestoneId(e.target.value)}><option value="">No milestone</option>{availableMilestones.map(m=><option key={m.id} value={m.id}>{m.name}</option>)}</SelectInput></Field>
      <Field label="Priority"><SelectInput value={priority} onChange={e=>setPriority(e.target.value)}><option value="high">High</option><option value="medium">Medium</option><option value="low">Low</option></SelectInput></Field>
      <Field label="Due date"><TextInput type="date" value={due ?? ""} onChange={e=>setDue(e.target.value)}/></Field>
      <Field label="Assignees (comma separated)"><TextInput value={assignees} onChange={e=>setAssignees(e.target.value)} placeholder="Frida Merell"/></Field>
    </SidePanel>
  );
}
