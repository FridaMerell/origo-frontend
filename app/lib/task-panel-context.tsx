"use client";

import { createContext, useContext, useState, type ReactNode } from "react";

type TaskPanelContextValue = {
  openTaskId: number | null;
  openTask: (id: number) => void;
  closeTask: () => void;
};

const TaskPanelContext = createContext<TaskPanelContextValue>({
  openTaskId: null,
  openTask: () => {},
  closeTask: () => {},
});

export function TaskPanelProvider({ children }: { children: ReactNode }) {
  const [openTaskId, setOpenTaskId] = useState<number | null>(null);

  return (
    <TaskPanelContext.Provider
      value={{ openTaskId, openTask: setOpenTaskId, closeTask: () => setOpenTaskId(null) }}
    >
      {children}
    </TaskPanelContext.Provider>
  );
}

export function useTaskPanel() {
  return useContext(TaskPanelContext);
}
