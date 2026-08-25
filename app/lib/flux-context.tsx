"use client";

import { createContext, useContext } from "react";
import type { FluxMilestone, FluxProject, FluxTask, FluxUpdate, FluxUser } from "@/app/lib/dal";

const FluxProjectsContext = createContext<FluxProject[]>([]);

export function FluxProjectsProvider({
  projects,
  children,
}: {
  projects: FluxProject[];
  children: React.ReactNode;
}) {
  return (
    <FluxProjectsContext.Provider value={projects}>{children}</FluxProjectsContext.Provider>
  );
}

export function useFluxProjects() {
  return useContext(FluxProjectsContext);
}

const FluxTasksContext = createContext<FluxTask[]>([]);

export function FluxTasksProvider({
  tasks,
  children,
}: {
  tasks: FluxTask[];
  children: React.ReactNode;
}) {
  return <FluxTasksContext.Provider value={tasks}>{children}</FluxTasksContext.Provider>;
}

export function useFluxTasks() {
  return useContext(FluxTasksContext);
}

const FluxMilestonesContext = createContext<FluxMilestone[]>([]);

export function FluxMilestonesProvider({
  milestones,
  children,
}: {
  milestones: FluxMilestone[];
  children: React.ReactNode;
}) {
  return (
    <FluxMilestonesContext.Provider value={milestones}>{children}</FluxMilestonesContext.Provider>
  );
}

export function useFluxMilestones() {
  return useContext(FluxMilestonesContext);
}

const FluxUpdatesContext = createContext<FluxUpdate[]>([]);

export function FluxUpdatesProvider({
  updates,
  children,
}: {
  updates: FluxUpdate[];
  children: React.ReactNode;
}) {
  return <FluxUpdatesContext.Provider value={updates}>{children}</FluxUpdatesContext.Provider>;
}

export function useFluxUpdates() {
  return useContext(FluxUpdatesContext);
}

const FluxUsersContext = createContext<Map<number, FluxUser>>(new Map());

export function FluxUsersProvider({
  users,
  children,
}: {
  users: FluxUser[];
  children: React.ReactNode;
}) {
  const usersById = new Map(users.map((user) => [user.id, user]));
  return <FluxUsersContext.Provider value={usersById}>{children}</FluxUsersContext.Provider>;
}

export function useFluxUsers() {
  return useContext(FluxUsersContext);
}

export function fluxUserName(user: FluxUser | undefined, id: number) {
  if (!user) return `Member #${id}`;
  const fullName = [user.first_name, user.last_name].filter(Boolean).join(" ");
  return fullName || user.username;
}
