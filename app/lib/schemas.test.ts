import { describe, expect, it } from "vitest"
import {
  bookingFormSchema,
  expenseFormSchema,
  fluxMilestoneFormSchema,
  fluxProjectFormSchema,
  fluxTaskFormSchema,
  fluxUpdateFormSchema,
  loginFormSchema,
  ventureFormSchema,
  ventureTaskFormSchema,
  versoUpdateFormSchema,
} from "./schemas"

describe("ventureFormSchema", () => {
  it("accepts a fully filled-in venture", () => {
    const result = ventureFormSchema.safeParse({
      name: "Rev-C",
      description: "Test",
      priority: 3,
      budget: 1000,
    })
    expect(result.success).toBe(true)
  })

  it("coerces string priority/budget from form inputs", () => {
    const result = ventureFormSchema.safeParse({
      name: "Rev-C",
      description: "Test",
      priority: "3",
      budget: "1000.50",
    })
    expect(result.success).toBe(true)
    if (result.success) {
      expect(result.data.priority).toBe(3)
      expect(result.data.budget).toBe(1000.5)
    }
  })

  it("rejects priority outside 1-5", () => {
    const result = ventureFormSchema.safeParse({
      name: "Rev-C",
      description: "Test",
      priority: 6,
      budget: 100,
    })
    expect(result.success).toBe(false)
  })

  it("rejects a negative budget", () => {
    const result = ventureFormSchema.safeParse({
      name: "Rev-C",
      description: "Test",
      priority: 3,
      budget: -1,
    })
    expect(result.success).toBe(false)
  })

  it("rejects an empty name", () => {
    const result = ventureFormSchema.safeParse({
      name: "",
      description: "Test",
      priority: 3,
      budget: 0,
    })
    expect(result.success).toBe(false)
  })
})

describe("ventureTaskFormSchema", () => {
  it("accepts a valid task", () => {
    const result = ventureTaskFormSchema.safeParse({
      name: "Task",
      description: "Desc",
      completed: false,
    })
    expect(result.success).toBe(true)
  })

  it("rejects a missing completed flag", () => {
    const result = ventureTaskFormSchema.safeParse({
      name: "Task",
      description: "Desc",
    })
    expect(result.success).toBe(false)
  })
})

describe("expenseFormSchema", () => {
  it("accepts a valid expense", () => {
    const result = expenseFormSchema.safeParse({
      description: "Materials",
      amount: "100.50",
      date_incurred: "2026-01-01",
    })
    expect(result.success).toBe(true)
  })

  it("allows description to be omitted", () => {
    const result = expenseFormSchema.safeParse({
      amount: "100",
      date_incurred: "2026-01-01",
    })
    expect(result.success).toBe(true)
  })

  it("rejects a non-numeric amount", () => {
    const result = expenseFormSchema.safeParse({
      description: "Materials",
      amount: "not-a-number",
      date_incurred: "2026-01-01",
    })
    expect(result.success).toBe(false)
  })

  it("rejects a missing date", () => {
    const result = expenseFormSchema.safeParse({
      description: "Materials",
      amount: "100",
      date_incurred: "",
    })
    expect(result.success).toBe(false)
  })
})

describe("versoUpdateFormSchema", () => {
  it("accepts null venture/task (unlinked update)", () => {
    const result = versoUpdateFormSchema.safeParse({
      title: "Title",
      content: "Content",
      venture: null,
      task: null,
    })
    expect(result.success).toBe(true)
  })

  it("accepts a string venture id", () => {
    const result = versoUpdateFormSchema.safeParse({
      title: "Title",
      content: "Content",
      venture: "12",
      task: null,
    })
    expect(result.success).toBe(true)
    if (result.success) expect(result.data.venture).toBe("12")
  })

  it("accepts a numeric venture id and normalizes it to a string", () => {
    const result = versoUpdateFormSchema.safeParse({
      title: "Title",
      content: "Content",
      venture: 12,
      task: null,
    })
    expect(result.success).toBe(true)
    if (result.success) expect(result.data.venture).toBe("12")
  })

  it("accepts a numeric task id and normalizes it to a string", () => {
    const result = versoUpdateFormSchema.safeParse({
      title: "Title",
      content: "Content",
      venture: null,
      task: 7,
    })
    expect(result.success).toBe(true)
    if (result.success) expect(result.data.task).toBe("7")
  })

  it("rejects a missing title", () => {
    const result = versoUpdateFormSchema.safeParse({
      title: "",
      content: "Content",
      venture: null,
      task: null,
    })
    expect(result.success).toBe(false)
  })
})

describe("bookingFormSchema", () => {
  it("accepts a valid date range", () => {
    const result = bookingFormSchema.safeParse({
      visitor: "Alex",
      start_date: "2026-01-01",
      end_date: "2026-01-05",
    })
    expect(result.success).toBe(true)
  })

  it("accepts a same-day booking", () => {
    const result = bookingFormSchema.safeParse({
      visitor: "Alex",
      start_date: "2026-01-01",
      end_date: "2026-01-01",
    })
    expect(result.success).toBe(true)
  })

  it("rejects an end date before the start date", () => {
    const result = bookingFormSchema.safeParse({
      visitor: "Alex",
      start_date: "2026-01-05",
      end_date: "2026-01-01",
    })
    expect(result.success).toBe(false)
  })
})

describe("loginFormSchema", () => {
  it("rejects an empty username or password", () => {
    expect(loginFormSchema.safeParse({ username: "", password: "x" }).success).toBe(false)
    expect(loginFormSchema.safeParse({ username: "x", password: "" }).success).toBe(false)
  })

  it("accepts filled-in credentials", () => {
    expect(loginFormSchema.safeParse({ username: "a", password: "b" }).success).toBe(true)
  })
})

describe("fluxProjectFormSchema", () => {
  it("coerces member ids from strings (checkbox values)", () => {
    const result = fluxProjectFormSchema.safeParse({
      name: "Project",
      description: "",
      members: ["1", "2"],
    })
    expect(result.success).toBe(true)
    if (result.success) expect(result.data.members).toEqual([1, 2])
  })

  it("rejects a missing name", () => {
    const result = fluxProjectFormSchema.safeParse({
      name: "",
      description: "",
      members: [],
    })
    expect(result.success).toBe(false)
  })
})

describe("fluxMilestoneFormSchema", () => {
  it("normalizes an empty date input to null", () => {
    const result = fluxMilestoneFormSchema.safeParse({
      title: "Milestone",
      description: "",
      status: "not_started",
      target_date: "",
    })
    expect(result.success).toBe(true)
    if (result.success) expect(result.data.target_date).toBeNull()
  })

  it("keeps a real date", () => {
    const result = fluxMilestoneFormSchema.safeParse({
      title: "Milestone",
      description: "",
      status: "not_started",
      target_date: "2026-06-01",
    })
    expect(result.success).toBe(true)
    if (result.success) expect(result.data.target_date).toBe("2026-06-01")
  })

  it("rejects an invalid status", () => {
    const result = fluxMilestoneFormSchema.safeParse({
      title: "Milestone",
      description: "",
      status: "bogus",
      target_date: null,
    })
    expect(result.success).toBe(false)
  })
})

describe("fluxTaskFormSchema", () => {
  const base = {
    title: "Task",
    description: "",
    project: 1,
    priority: "medium" as const,
    status: "not_started" as const,
    due_date: null,
    recurrence: "none" as const,
    recurrence_interval: 1,
    recurrence_end_date: null,
    assignees: [],
  }

  it("normalizes an unselected milestone (empty select value) to null", () => {
    const result = fluxTaskFormSchema.safeParse({ ...base, milestone: "" })
    expect(result.success).toBe(true)
    if (result.success) expect(result.data.milestone).toBeNull()
  })

  it("coerces a selected milestone id from a string", () => {
    const result = fluxTaskFormSchema.safeParse({ ...base, milestone: "4" })
    expect(result.success).toBe(true)
    if (result.success) expect(result.data.milestone).toBe(4)
  })

  it("coerces the project id and assignee ids from strings", () => {
    const result = fluxTaskFormSchema.safeParse({
      ...base,
      project: "1",
      milestone: null,
      assignees: ["2", "3"],
    })
    expect(result.success).toBe(true)
    if (result.success) {
      expect(result.data.project).toBe(1)
      expect(result.data.assignees).toEqual([2, 3])
    }
  })

  it("rejects an invalid priority", () => {
    const result = fluxTaskFormSchema.safeParse({ ...base, milestone: null, priority: "urgent" })
    expect(result.success).toBe(false)
  })

  it("normalizes an empty recurrence end date to null", () => {
    const result = fluxTaskFormSchema.safeParse({
      ...base,
      milestone: null,
      recurrence_end_date: "",
    })
    expect(result.success).toBe(true)
    if (result.success) expect(result.data.recurrence_end_date).toBeNull()
  })
})

describe("fluxUpdateFormSchema", () => {
  it("rejects empty content", () => {
    expect(fluxUpdateFormSchema.safeParse({ content: "" }).success).toBe(false)
  })

  it("accepts non-empty content", () => {
    expect(fluxUpdateFormSchema.safeParse({ content: "Update" }).success).toBe(true)
  })
})
