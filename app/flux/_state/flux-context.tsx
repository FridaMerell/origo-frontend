"use client";

import { createContext, useCallback, useContext, useMemo, useState } from "react";
import { usePathname, useRouter } from "next/navigation";
import { FLUX_PROJECT_COOKIE } from "@/app/lib/config";
import type { FluxDocument, FluxMilestone, FluxProject, FluxTask, FluxTaskStatus, FluxUpdate, FluxUser } from "@/app/lib/dal";
import { formatUserName } from "@/app/lib/user-context";
import { setSelectedFluxProject } from "./select-project-action";

// Item routes (e.g. /model/api/resources/12/edit) point at rows owned by the
// previous project, so switching falls back to the section overview.
function projectDestination(pathname: string, id: string) {
  if (/^\/projects\/\d+$/.test(pathname)) return `/projects/${id}`;
  const segments = pathname.split("/").filter(Boolean);
  const idIndex = segments.findIndex((segment) => /^\d+$/.test(segment));
  if (idIndex === -1) return pathname;
  const keep = segments[0] === "model" ? Math.min(2, idIndex) : Math.max(1, idIndex - 1);
  return "/" + segments.slice(0, keep).join("/");
}

type FluxDataContextValue = {
  projects: FluxProject[];
  addProject: (project: FluxProject) => void;
  replaceProject: (project: FluxProject) => void;
  removeProject: (id: number) => void;
  selectedProject: FluxProject | null;
  selectProject: (id: string) => Promise<void>;
  setTaskStatus: (id: number, status: FluxTaskStatus) => void;
  addTask: (task: FluxTask) => void;
  replaceTask: (task: FluxTask) => void;
  removeTask: (id: number) => void;
  tasks: FluxTask[];
  milestones: FluxMilestone[];
  addMilestone: (milestone: FluxMilestone) => void;
  replaceMilestones: (milestones: FluxMilestone[]) => void;
  replaceMilestone: (milestone: FluxMilestone) => void;
  removeMilestone: (id: number) => void;
  updates: FluxUpdate[];
  addUpdate: (update: FluxUpdate) => void;
  replaceUpdate: (update: FluxUpdate) => void;
  removeUpdate: (id: number) => void;
  documents: FluxDocument[];
  addDocument: (document: FluxDocument) => void;
  replaceDocument: (document: FluxDocument) => void;
  removeDocument: (id: number) => void;
  usersById: Map<number, FluxUser>;
};

const FluxDataContext = createContext<FluxDataContextValue>({
  projects: [],
  addProject: () => {}, replaceProject: () => {}, removeProject: () => {},
  selectedProject: null,
  selectProject: async () => {},
  setTaskStatus: () => {},
  addTask: () => {},
  replaceTask: () => {},
  removeTask: () => {},
  tasks: [],
  milestones: [],
  addMilestone: () => {},
  replaceMilestones: () => {},
  replaceMilestone: () => {},
  removeMilestone: () => {},
  updates: [],
  addUpdate: () => {}, replaceUpdate: () => {}, removeUpdate: () => {},
  documents: [],
  addDocument: () => {}, replaceDocument: () => {}, removeDocument: () => {},
  usersById: new Map(),
});

export function FluxDataProvider({
  projects,
  selectedProject,
  tasks,
  milestones,
  updates,
  documents,
  users,
  scope = "selected-project",
  children,
}: {
  projects: FluxProject[];
  selectedProject: FluxProject | null;
  tasks: FluxTask[];
  milestones: FluxMilestone[];
  updates: FluxUpdate[];
  documents: FluxDocument[];
  users: FluxUser[];
  scope?: "selected-project" | "all-projects";
  children: React.ReactNode;
}) {
  const pathname = usePathname();
  const router = useRouter();
  const [currentProjects, setCurrentProjects] = useState(projects);
  const [currentProject, setCurrentProject] = useState(selectedProject);
  const [currentTasks, setCurrentTasks] = useState(tasks);
  const [currentMilestones, setCurrentMilestones] = useState(milestones);
  const [currentUpdates, setCurrentUpdates] = useState(updates);
  const [currentDocuments, setCurrentDocuments] = useState(documents);
  const [currentUsers, setCurrentUsers] = useState(users);
  const usersById = useMemo(() => new Map(currentUsers.map((user) => [user.id, user])), [currentUsers]);

  const selectProject = useCallback(async (id: string) => {
    document.cookie = `${FLUX_PROJECT_COOKIE}=${id}; path=/; max-age=31536000; samesite=lax`;
    if (scope === "all-projects") {
      setCurrentProject((current) => currentProjects.find((project) => String(project.id) === id) ?? current);
      return;
    }
    await setSelectedFluxProject(id);
    const destination = projectDestination(pathname, id);
    if (destination === pathname) router.refresh();
    else router.push(destination);
  }, [currentProjects, pathname, router, scope]);

  const setTaskStatus = useCallback((id: number, status: FluxTaskStatus) => {
    setCurrentTasks((current) => current.map((task) => task.id === id ? { ...task, status } : task));
  }, []);

  const addTask = useCallback((task: FluxTask) => {
    setCurrentTasks((current) => [...current, task]);
  }, []);

  const replaceTask = useCallback((task: FluxTask) => {
    setCurrentTasks((current) => current.map((item) => item.id === task.id ? task : item));
  }, []);

  const removeTask = useCallback((id: number) => {
    setCurrentTasks((current) => current.filter((task) => task.id !== id));
  }, []);

  const addMilestone = useCallback((milestone: FluxMilestone) => {
    setCurrentMilestones((current) => [...current, milestone]);
  }, []);

  const replaceMilestones = useCallback((milestones: FluxMilestone[]) => {
    setCurrentMilestones(milestones);
  }, []);

  const replaceMilestone = useCallback((milestone: FluxMilestone) => {
    setCurrentMilestones((current) => current.map((item) => item.id === milestone.id ? milestone : item));
  }, []);

  const removeMilestone = useCallback((id: number) => {
    setCurrentMilestones((current) => current.filter((milestone) => milestone.id !== id));
  }, []);

  const addProject = useCallback((project: FluxProject) => setCurrentProjects((current) => [...current, project]), []);
  const replaceProject = useCallback((project: FluxProject) => {
    setCurrentProjects((current) => current.map((item) => item.id === project.id ? project : item));
    setCurrentProject((current) => current?.id === project.id ? project : current);
  }, []);
  const removeProject = useCallback((id: number) => setCurrentProjects((current) => current.filter((project) => project.id !== id)), []);
  const addUpdate = useCallback((update: FluxUpdate) => setCurrentUpdates((current) => [...current, update]), []);
  const replaceUpdate = useCallback((update: FluxUpdate) => setCurrentUpdates((current) => current.map((item) => item.id === update.id ? update : item)), []);
  const removeUpdate = useCallback((id: number) => setCurrentUpdates((current) => current.filter((update) => update.id !== id)), []);
  const addDocument = useCallback((document: FluxDocument) => setCurrentDocuments((current) => [...current, document]), []);
  const replaceDocument = useCallback((document: FluxDocument) => setCurrentDocuments((current) => current.map((item) => item.id === document.id ? document : item)), []);
  const removeDocument = useCallback((id: number) => setCurrentDocuments((current) => current.filter((document) => document.id !== id)), []);

  const value = useMemo(
    () => ({ projects: currentProjects, addProject, replaceProject, removeProject, selectedProject: currentProject, selectProject, setTaskStatus, addTask, replaceTask, removeTask, tasks: currentTasks, milestones: currentMilestones, addMilestone, replaceMilestones, replaceMilestone, removeMilestone, updates: currentUpdates, addUpdate, replaceUpdate, removeUpdate, documents: currentDocuments, addDocument, replaceDocument, removeDocument, usersById }),
    [currentProjects, addProject, replaceProject, removeProject, currentProject, selectProject, setTaskStatus, addTask, replaceTask, removeTask, currentTasks, currentMilestones, addMilestone, replaceMilestones, replaceMilestone, removeMilestone, currentUpdates, addUpdate, replaceUpdate, removeUpdate, currentDocuments, addDocument, replaceDocument, removeDocument, usersById],
  );

  return (
    <FluxDataContext.Provider value={value}>
      {children}
    </FluxDataContext.Provider>
  );
}

export function useFluxProjects() {
  return useContext(FluxDataContext).projects;
}

export function useSelectedFluxProject() {
  const { selectedProject, selectProject } = useContext(FluxDataContext);
  return { selectedProject, selectProject };
}

export function useFluxTasks() {
  return useContext(FluxDataContext).tasks;
}

export function useFluxTaskStatus() {
  return useContext(FluxDataContext).setTaskStatus;
}

export function useFluxProjectActions() { const { addProject, replaceProject, removeProject } = useContext(FluxDataContext); return { addProject, replaceProject, removeProject }; }

export function useFluxTaskActions() {
  const { addTask, replaceTask, removeTask } = useContext(FluxDataContext);
  return { addTask, replaceTask, removeTask };
}

export function useFluxMilestones() {
  return useContext(FluxDataContext).milestones;
}

export function useFluxMilestoneActions() {
  const { addMilestone, replaceMilestones, replaceMilestone, removeMilestone } = useContext(FluxDataContext);
  return { addMilestone, replaceMilestones, replaceMilestone, removeMilestone };
}

export function useFluxUpdates() {
  return useContext(FluxDataContext).updates;
}

export function useFluxUpdateActions() { const { addUpdate, replaceUpdate, removeUpdate } = useContext(FluxDataContext); return { addUpdate, replaceUpdate, removeUpdate }; }

export function useFluxDocuments() {
  return useContext(FluxDataContext).documents;
}

export function useFluxDocumentActions() { const { addDocument, replaceDocument, removeDocument } = useContext(FluxDataContext); return { addDocument, replaceDocument, removeDocument }; }

export function useFluxUsers() {
  return useContext(FluxDataContext).usersById;
}

export function fluxUserName(user: FluxUser | undefined, id: number) {
  if (!user) return `Member #${id}`;
  return formatUserName(user);
}
