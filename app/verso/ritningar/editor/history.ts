import type { DrawingElement } from "@/app/lib/dal"

export type History = {
  past: DrawingElement[][]
  present: DrawingElement[]
  future: DrawingElement[][]
}

export type HistoryAction =
  /** Replace the elements and record the previous state as an undo step. */
  | { type: "commit"; elements: DrawingElement[] }
  /** Push the current state as an undo step; follow with "replace" for drags. */
  | { type: "checkpoint" }
  /** Replace the elements without recording history (live drag/typing updates). */
  | { type: "replace"; elements: DrawingElement[] }
  | { type: "undo" }
  | { type: "redo" }
  | { type: "reset"; elements: DrawingElement[] }

const MAX_STEPS = 100

export const initialHistory = (elements: DrawingElement[]): History => ({
  past: [],
  present: elements,
  future: [],
})

export function historyReducer(state: History, action: HistoryAction): History {
  switch (action.type) {
    case "commit":
      return {
        past: [...state.past, state.present].slice(-MAX_STEPS),
        present: action.elements,
        future: [],
      }
    case "checkpoint":
      return { past: [...state.past, state.present].slice(-MAX_STEPS), present: state.present, future: [] }
    case "replace":
      return { ...state, present: action.elements }
    case "undo": {
      const previous = state.past.at(-1)
      if (!previous) return state
      return { past: state.past.slice(0, -1), present: previous, future: [state.present, ...state.future] }
    }
    case "redo": {
      const [next, ...rest] = state.future
      if (!next) return state
      return { past: [...state.past, state.present], present: next, future: rest }
    }
    case "reset":
      return initialHistory(action.elements)
  }
}
