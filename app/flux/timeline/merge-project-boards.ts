import type { FluxBoard, FluxProject } from "@/app/lib/dal"

export type MergedTimelineData = {
  selectedProject: FluxProject | null
  milestones: FluxBoard["milestones"]
  tasks: FluxBoard["tasks"]
  updates: FluxBoard["updates"]
  documents: FluxBoard["documents"]
  users: FluxBoard["users"]
}

export function mergeProjectBoards(
  boards: (FluxBoard | null)[],
  selectedId: string | undefined,
): MergedTimelineData {
  const selectedProject =
    boards.find((board) => String(board?.project.id) === selectedId)?.project ?? boards[0]?.project ?? null

  return {
    selectedProject,
    milestones: boards.flatMap((board) => board?.milestones ?? []),
    tasks: boards.flatMap((board) => board?.tasks ?? []),
    updates: boards.flatMap((board) => board?.updates ?? []),
    documents: boards.flatMap((board) => board?.documents ?? []),
    users: Array.from(
      new Map(boards.flatMap((board) => board?.users ?? []).map((user) => [user.id, user])).values(),
    ),
  }
}
