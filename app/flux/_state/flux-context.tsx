"use client";

import { createContext, useCallback, useContext, useEffect, useMemo, useState } from "react";
import { FLUX_PROJECT_COOKIE } from "@/app/lib/config";
import type { FluxDocument, FluxMilestone, FluxProject, FluxTask, FluxTaskStatus, FluxUpdate, FluxUser } from "@/app/lib/dal";
import { formatUserName } from "@/app/lib/user-context";

type FluxDataContextValue = {
  projects: FluxProject[];
  selectedProject: FluxProject | null;
  selectProject: (id: string) => void;
  setTaskStatus: (id: number, status: FluxTaskStatus) => void;
  tasks: FluxTask[];
  milestones: FluxMilestone[];
  updates: FluxUpdate[];
  documents: FluxDocument[];
  usersById: Map<number, FluxUser>;
};

const FluxDataContext = createContext<FluxDataContextValue>({
  projects: [],
  selectedProject: null,
  selectProject: () => {},
  setTaskStatus: () => {},
  tasks: [],
  milestones: [],
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
  const usersById = useMemo(() => new Map(users.map((user) => [user.id, user])), [users]);

  useEffect(() => {
    setCurrentTasks(tasks);
  }, [tasks]);

  const selectProject = useCallback((id: string) => {
    document.cookie = `${FLUX_PROJECT_COOKIE}=${id}; path=/; max-age=31536000`;
    window.location.reload();
  }, []);

  const setTaskStatus = useCallback((id: number, status: FluxTaskStatus) => {
    setCurrentTasks((current) => current.map((task) => task.id === id ? { ...task, status } : task));
  }, []);

  const value = useMemo(
    () => ({ projects, selectedProject, selectProject, setTaskStatus, tasks: currentTasks, milestones, updates, documents, usersById }),
    [projects, selectedProject, selectProject, setTaskStatus, currentTasks, milestones, updates, documents, usersById],
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

export function useFluxMilestones() {
  return useContext(FluxDataContext).milestones;
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
