const NAV_LINKS = [
  { label: "Projects", key: "projects", icon: "folder" },
  { label: "Tasks", key: "tasks", icon: "list" },
  { label: "Timeline", key: "timeline", icon: "route" },
  { label: "Backlog", key: "backlog", icon: "inbox" },
];

function Toolbar({ view, setView, projects, activeProjectId, setActiveProjectId, goToProject, mode, onToggleMode, onNewProject, onNewTask }) {
  const { Icon, Avatar, Button } = window.OrigoDesignSystem_f98fc7;
  const [menuOpen, setMenuOpen] = React.useState(false);
  const [switcherOpen, setSwitcherOpen] = React.useState(false);
  const activeProject = projectById(projects, activeProjectId);
  return (
    <div style={{position:"fixed",insetInline:0,top:20,zIndex:40,display:"flex",justifyContent:"center"}}>
      <div style={{position:"relative"}}>
        <nav style={{display:"flex",alignItems:"center",gap:10,whiteSpace:"nowrap",borderRadius:44,border:"1px solid var(--border)",background:"var(--surface)",padding:"12px 16px",boxShadow:"var(--shadow-md)"}}>
          <div onClick={()=>setView("projects")} style={{display:"flex",alignItems:"center",gap:4,cursor:"pointer"}}>
            <img src="assets/flux-logo.svg" style={{width:26,height:18}} alt=""/>
            <span style={{fontFamily:"var(--font-display)",fontSize:22,fontWeight:700,letterSpacing:"-0.02em",color:"var(--text)"}}>flux</span>
          </div>
          <div style={{height:32,width:1,background:"var(--border)"}}/>
          <div style={{position:"relative"}}>
            <button onClick={()=>setSwitcherOpen(v=>!v)} style={{all:"unset",display:"flex",alignItems:"center",gap:8,borderRadius:24,padding:"10px 14px",fontSize:16,fontWeight:600,color:"var(--text)",cursor:"pointer"}}>
              {activeProject?.name ?? "Select project"} <Icon name="chevron-down" size={16} color="var(--text-faint)"/>
            </button>
            {switcherOpen && (
              <div style={{position:"absolute",left:0,top:"100%",marginTop:8,display:"flex",flexDirection:"column",gap:2,minWidth:200,borderRadius:16,border:"1px solid var(--border)",background:"var(--surface)",padding:8,boxShadow:"var(--shadow-md)"}}>
                {projects.map(p=>(
                  <button key={p.id} onClick={()=>{setActiveProjectId(p.id);goToProject(p.id);setSwitcherOpen(false);}} style={{all:"unset",borderRadius:10,padding:"10px 12px",fontSize:14,cursor:"pointer",color:"var(--text)",background: p.id===activeProjectId?"var(--surface-2)":"transparent"}}>{p.name}</button>
                ))}
              </div>
            )}
          </div>
          {NAV_LINKS.map(item=>(
            <button key={item.key} onClick={()=>setView(item.key)} style={{all:"unset",borderRadius:24,padding:"10px 16px",fontSize:16,fontWeight:500,cursor:"pointer",
              background: view===item.key ? "var(--surface-2)" : "transparent", color: view===item.key ? "var(--text)" : "var(--text-muted)"}}>
              {item.label}
            </button>
          ))}
          <div style={{height:32,width:1,background:"var(--border)"}}/>
          <button onClick={()=>setMenuOpen(v=>!v)} style={{all:"unset",display:"flex",height:40,width:40,alignItems:"center",justifyContent:"center",borderRadius:999,cursor:"pointer",background: menuOpen ? "var(--surface-2)" : "transparent"}}>
            <Icon name="ellipsis" size={18} color="var(--text-muted)"/>
          </button>
        </nav>
        {menuOpen && (
          <div style={{position:"absolute",right:0,top:"100%",marginTop:8,display:"flex",flexDirection:"column",gap:2,minWidth:200,borderRadius:16,border:"1px solid var(--border)",background:"var(--surface)",padding:8,boxShadow:"var(--shadow-md)"}}>
            <button onClick={()=>{setMenuOpen(false);onNewProject();}} style={{all:"unset",display:"flex",alignItems:"center",gap:10,borderRadius:10,padding:"10px 12px",fontSize:14,cursor:"pointer",color:"var(--text)"}}><Icon name="folder-plus" size={16} color="var(--text-muted)"/>New project</button>
            <button onClick={()=>{setMenuOpen(false);onNewTask();}} style={{all:"unset",display:"flex",alignItems:"center",gap:10,borderRadius:10,padding:"10px 12px",fontSize:14,cursor:"pointer",color:"var(--text)"}}><Icon name="plus" size={16} color="var(--text-muted)"/>New task</button>
            <div style={{height:1,background:"var(--border)",margin:"4px 0"}}/>
            <button style={{all:"unset",display:"flex",alignItems:"center",gap:10,borderRadius:10,padding:"10px 12px",fontSize:14,cursor:"pointer",color:"var(--text)"}}><Icon name="bell" size={16} color="var(--text-muted)"/>Notifications</button>
            <button onClick={onToggleMode} style={{all:"unset",display:"flex",alignItems:"center",gap:10,borderRadius:10,padding:"10px 12px",fontSize:14,cursor:"pointer",color:"var(--text)"}}><Icon name={mode==="dark"?"sun":"moon"} size={16} color="var(--text-muted)"/>{mode==="dark"?"Light mode":"Dark mode"}</button>
            <div style={{display:"flex",alignItems:"center",gap:10,padding:"10px 12px"}}><Avatar name="Frida Merell" size={24}/><span style={{fontSize:14,color:"var(--text-muted)"}}>Frida Merell</span></div>
          </div>
        )}
      </div>
    </div>
  );
}
