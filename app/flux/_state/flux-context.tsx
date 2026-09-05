"use client";

import { createContext, useCallback, useContext, useMemo, useState } from "react";
import { FLUX_PROJECT_COOKIE } from "@/app/lib/config";
import type { FluxDocument, FluxMilestone, FluxProject, FluxTask, FluxTaskStatus, FluxUpdate, FluxUser } from "@/app/lib/dal";
import { formatUserName } from "@/app/lib/user-context";

type FluxDataContextValue = {
  projects: FluxProject[];
  selectedProject: FluxProject | null;
  selectProject: (id: string) => void;
  setTaskStatus: (id: number, status: FluxTaskStatus) => void;
  addTask: (task: FluxTask) => void;
  replaceTask: (task: FluxTask) => void;
  removeTask: (id: number) => void;
  tasks: FluxTask[];
  milestones: FluxMilestone[];
  addMilestone: (milestone: FluxMilestone) => void;
  replaceMilestone: (milestone: FluxMilestone) => void;
  removeMilestone: (id: number) => void;
  updates: FluxUpdate[];
  documents: FluxDocument[];
  usersById: Map<number, FluxUser>;
};

const FluxDataContext = createContext<FluxDataContextValue>({
  projects: [],
  selectedProject: null,
  selectProject: () => {},
  setTaskStatus: () => {},
  addTask: () => {},
  replaceTask: () => {},
  removeTask: () => {},
  tasks: [],
  milestones: [],
  addMilestone: () => {},
  replaceMilestone: () => {},
  removeMilestone: () => {},
  updates: [],
  documents: [],
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
  children,
}: {
  projects: FluxProject[];
  selectedProject: FluxProject | null;
  tasks: FluxTask[];
  milestones: FluxMilestone[];
  updates: FluxUpdate[];
  documents: FluxDocument[];
  users: FluxUser[];
  children: React.ReactNode;
}) {
  const [currentTasks, setCurrentTasks] = useState(tasks);
  const [currentMilestones, setCurrentMilestones] = useState(milestones);
  const usersById = useMemo(() => new Map(users.map((user) => [user.id, user])), [users]);

  const selectProject = useCallback((id: string) => {
    document.cookie = `${FLUX_PROJECT_COOKIE}=${id}; path=/; max-age=31536000`;
    window.location.reload();
  }, []);

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

  const replaceMilestone = useCallback((milestone: FluxMilestone) => {
    setCurrentMilestones((current) => current.map((item) => item.id === milestone.id ? milestone : item));
  }, []);

  const removeMilestone = useCallback((id: number) => {
    setCurrentMilestones((current) => current.filter((milestone) => milestone.id !== id));
  }, []);

  const value = useMemo(
    () => ({ projects, selectedProject, selectProject, setTaskStatus, addTask, replaceTask, removeTask, tasks: currentTasks, milestones: currentMilestones, addMilestone, replaceMilestone, removeMilestone, updates, documents, usersById }),
    [projects, selectedProject, selectProject, setTaskStatus, addTask, replaceTask, removeTask, currentTasks, currentMilestones, addMilestone, replaceMilestone, removeMilestone, updates, documents, usersById],
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

export function useFluxTaskActions() {
  const { addTask, replaceTask, removeTask } = useContext(FluxDataContext);
  return { addTask, replaceTask, removeTask };
}

export function useFluxMilestones() {
  return useContext(FluxDataContext).milestones;
}

export function useFluxMilestoneActions() {
  const { addMilestone, replaceMilestone, removeMilestone } = useContext(FluxDataContext);
  return { addMilestone, replaceMilestone, removeMilestone };
}

export function useFluxUpdates() {
  return useContext(FluxDataContext).updates;
}

export function useFluxDocuments() {
  return useContext(FluxDataContext).documents;
}

export function useFluxUsers() {
  return useContext(FluxDataContext).usersById;
}

export function fluxUserName(user: FluxUser | undefined, id: number) {
  if (!user) return `Member #${id}`;
  return formatUserName(user);
}
