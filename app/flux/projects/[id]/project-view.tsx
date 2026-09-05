"use client"

import { useState } from "react"
import { useParams } from "next/navigation"
import { Avatar } from "@/app/components/ui/Avatar"
import { Card } from "@/app/components/ui/Card"
import { Gallery } from "@/app/components/ui/Gallery"

import { ProgressBar } from "@/app/components/ui/ProgressBar"
import { AddMilestoneButton } from "@/app/flux/projects/add-milestone-button"
import { AddMilestoneTaskButton } from "@/app/flux/projects/add-milestone-task-button"
import { EditMilestoneButton } from "@/app/flux/projects/edit-milestone-button"
import { DeleteMilestoneButton } from "@/app/flux/projects/delete-milestone-button"
import { EditProjectButton } from "@/app/flux/projects/edit-project-button"
import { DeleteTaskButton } from "@/app/flux/tasks/delete-task-button"
import { TaskCompletionButton } from "@/app/flux/tasks/task-completion-button"
import { TaskStatusBadge } from "@/app/flux/tasks/task-status-badge"
import { UpdatesFeed } from "@/app/flux/updates/updates-feed"
import { DocumentsSection } from "@/app/flux/documents/documents-section"
import { Markdown } from "@/app/flux/documents/markdown"
import {
	useFluxDocuments,
	useFluxMilestones,
	useFluxProjects,
	useFluxTasks,
	useFluxUpdates,
	useFluxUsers,
	fluxUserName,
} from "@/app/flux/_state/flux-context"
import { progressOf } from "@/app/lib/flux-progress"
import { formatDate } from "@/app/lib/formatters"
import { TaskDueDate } from "@/app/flux/tasks/task-due-date"
import { isTaskOverdue, OVERDUE_ROW_TONE } from "@/app/lib/flux-task-dates"
import { sortFluxTasks } from "@/app/flux/_state/flux-task-sort"
import { useTaskPanel } from "@/app/lib/task-panel-context"
import {
	FLUX_PRIORITY_BADGE_TONE,
	FLUX_PRIORITY_LABEL,
} from "@/app/flux/flux-priority"
import type { FluxTask, FluxUser } from "@/app/lib/dal"
import { ChevronDown, ChevronRight, Flag, MessageSquare } from "lucide-react"

function MilestoneDescription({ text }: { text: string }) {
	const [open, setOpen] = useState(false)
	return (
		<div className='border-b border-border'>
			<button
				type='button'
				onClick={() => setOpen(value => !value)}
				aria-expanded={open}
				className='flex w-full items-center gap-1 px-5 py-2 font-mono text-xs text-text-faint hover:text-text'>
				{open ? (
					<>
						<ChevronDown size='14' />
						Dölj beskrivning
					</>
				) : (
					<>
						<ChevronRight size='14' />
						Visa beskrivning
					</>
				)}
			</button>
			{open && (
				<div className='px-5 pb-4'>
					<Markdown content={text} />
				</div>
			)}
		</div>
	)
}

function TaskRow({
	task,
	allTasks,
	users,
	onOpenTask,
}: {
	task: FluxTask
	allTasks: FluxTask[]
	users: Map<number, FluxUser>
	onOpenTask: (id: number) => void
}) {
	const subtasks = sortFluxTasks(allTasks.filter(t => t.parent === task.id))
	const [subtasksOpen, setSubtasksOpen] = useState(false)
	return (
		<>
			<div
				onClick={() => onOpenTask(task.id)}
				className={`flex cursor-pointer items-center justify-between gap-3 border-b border-border px-4 py-2.5 text-sm last:border-b-0 ${isTaskOverdue(task.due_date, task.status) ? OVERDUE_ROW_TONE : "hover:bg-surface-2"}`}>
				<div className='flex min-w-0 items-center gap-2'>
					<TaskCompletionButton id={task.id} status={task.status} />
					<span className='min-w-0 truncate text-text'>{task.title}</span>
				</div>
				<span className='flex shrink-0 items-center gap-3'>
					<TaskStatusBadge status={task.status} />
					<span
						className={`inline-flex items-center rounded-full px-2 py-0.5 text-xs font-medium ${FLUX_PRIORITY_BADGE_TONE[task.priority]}`}>
						{FLUX_PRIORITY_LABEL[task.priority]}
					</span>
					<TaskDueDate dueDate={task.due_date} status={task.status} compact />
					{subtasks.length > 0 && (
						<button
							type='button'
							onClick={event => {
								event.stopPropagation()
								setSubtasksOpen(open => !open)
							}}
							aria-expanded={subtasksOpen}
							className='flex items-center gap-1 rounded px-1.5 py-1 font-mono text-xs text-text-faint hover:bg-surface-2 hover:text-text'>
							{subtasksOpen ? (
								<ChevronDown size={14} />
							) : (
								<ChevronRight size={14} />
							)}
							{subtasks.filter(t => t.status === "done").length}/
							{subtasks.length}
						</button>
					)}
					{task.update_count > 0 && (
						<span className='flex items-center gap-1 font-mono text-xs text-text-faint'>
							<MessageSquare size={12} />
							{task.update_count}
						</span>
					)}
					<span className='flex gap-1'>
						{task.assignees.map(assigneeId => (
							<Avatar
								key={assigneeId}
								name={fluxUserName(users.get(assigneeId), assigneeId)}
								size={18}
							/>
						))}
					</span>
					<DeleteTaskButton id={task.id} />
				</span>
			</div>
			{subtasksOpen && (
				<div className='ml-8 border-l border-border bg-surface-2/40'>
					{subtasks.map(subtask => (
						<TaskRow
							key={subtask.id}
							task={subtask}
							allTasks={allTasks}
							users={users}
							onOpenTask={onOpenTask}
						/>
					))}
				</div>
			)}
		</>
	)
}

export default function FluxProjectDetailView() {
	const { id } = useParams<{ id: string }>()
	const projects = useFluxProjects()
	const milestones = useFluxMilestones()
	const tasks = useFluxTasks()
	const updates = useFluxUpdates()
	const documents = useFluxDocuments()
	const users = useFluxUsers()
	const { openTask } = useTaskPanel()

	const project = projects.find(p => String(p.id) === id)

	if (!project) {
		return (
			<div className='text-sm text-text-muted'>Projektet hittades inte.</div>
		)
	}

	const projectTasks = tasks.filter(task => task.project === project.id)
	const projectMilestones = milestones.filter(m => m.project === project.id)
	const unassignedTasks = sortFluxTasks(
		projectTasks.filter(
			task => task.milestone === null && task.parent === null,
		),
	)
	const overallProgress = progressOf(projectTasks)

	return (
		<div className='mx-auto flex w-full max-w-6xl flex-col gap-9 pb-12'>
			<section className='border-b border-border pb-7'>
				<div className='flex flex-wrap items-start justify-between gap-4'>
					<div className='min-w-0'>
						<p className='mb-2 text-xs font-semibold uppercase tracking-[0.12em] text-text-faint'>
							Projekt
						</p>
						<div className='flex items-center gap-2'>
							<h1 className='m-0 font-display text-3xl font-semibold tracking-tight text-text'>
								{project.name}
							</h1>
							<EditProjectButton project={project} />
						</div>
						{project.description && (
							<p className='text-[15px] text-text-muted'>
								{project.description}
							</p>
						)}
					</div>
					<span className='rounded-full bg-accent-wash px-3 py-1.5 text-sm font-semibold text-accent'>
						{overallProgress.done} av {overallProgress.total} klara
					</span>
				</div>
				<Gallery files={project.files} />
				<div className='mt-6 flex flex-wrap items-center gap-4'>
					{project.members.length > 0 && (
						<div className='flex gap-1.5'>
							{project.members.map(memberId => (
								<Avatar
									key={memberId}
									name={fluxUserName(users.get(memberId), memberId)}
									size={26}
								/>
							))}
						</div>
					)}
					<div className='min-w-48 flex-1 max-w-md'>
						<span className='mb-2 block text-xs font-medium text-text-muted'>
							Projektstatus
						</span>
						<ProgressBar pct={overallProgress.pct} />
					</div>
				</div>
			</section>

			<div className='flex flex-col gap-5'>
				<div className='flex items-center justify-between'>
					<div>
						<p className='text-xs font-semibold uppercase tracking-[0.12em] text-text-faint'>
							Arbetsplan
						</p>
						<h2 className='mt-1 text-xl font-semibold text-text'>Delmål</h2>
					</div>
					<AddMilestoneButton projectId={project.id} />
				</div>

				{projectMilestones.length === 0 && (
					<p className='text-sm text-text-muted'>Inget delmål skapat.</p>
				)}

				{projectMilestones.map(milestone => {
					const milestoneTasks = tasks.filter(
						task => task.milestone === milestone.id,
					)
					const milestoneParentTasks = sortFluxTasks(
						milestoneTasks.filter(task => task.parent === null),
					)
					const milestoneProgress = progressOf(milestoneTasks)
					return (
						<Card
							key={milestone.id}
							className='flex flex-col !gap-0 overflow-hidden border-l-4 border-l-secondary !p-0'>
							<div className='flex items-center justify-between gap-3 border-b border-border bg-secondary-wash/50 px-5 py-4'>
								<div className='flex min-w-0 items-center gap-2'>
									<Flag size={15} className='shrink-0 text-text-muted' />
									<span className='truncate text-base font-semibold text-text'>
										{milestone.title}
									</span>
									<EditMilestoneButton milestone={milestone} />
									<DeleteMilestoneButton id={milestone.id} />
								</div>
								<div className='flex shrink-0 items-center gap-3'>
									{milestone.update_count > 0 && (
										<span className='flex items-center gap-1 font-mono text-xs text-text-faint'>
											<MessageSquare size={12} />
											{milestone.update_count}
										</span>
									)}
									<span className='font-mono text-xs text-text-faint'>
										{milestone.target_date
											? formatDate(milestone.target_date)
											: "Ingen deadline"}
									</span>
									<ProgressBar
										pct={milestoneProgress.pct}
										width={120}
										className='[&>div]:bg-secondary'
									/>
								</div>
							</div>

							{milestone.description && (
								<MilestoneDescription text={milestone.description} />
							)}

							{milestone.files.length > 0 && (
								<div className='border-b border-border px-4 py-3'>
									<Gallery files={milestone.files} />
								</div>
							)}

							{milestoneParentTasks.length === 0 ? (
								<div className='px-5 py-5 text-sm text-text-muted'>
									Inga uppgifter än.
								</div>
							) : (
								milestoneParentTasks.map(task => (
									<TaskRow
										key={task.id}
										task={task}
										allTasks={tasks}
										users={users}
										onOpenTask={openTask}
									/>
								))
							)}

							<div className='border-t border-border'>
								<AddMilestoneTaskButton
									projectId={project.id}
									milestoneId={milestone.id}
								/>
							</div>
						</Card>
					)
				})}
			</div>

			{unassignedTasks.length > 0 && (
				<div className='flex flex-col gap-3'>
					<h2 className='m-0 text-base font-semibold text-text-muted'>
						Inget delmål
					</h2>
					<Card className='flex flex-col gap-0 p-0'>
						{unassignedTasks.map(task => (
							<TaskRow
								key={task.id}
								task={task}
								allTasks={tasks}
								users={users}
								onOpenTask={openTask}
							/>
						))}
					</Card>
				</div>
			)}

			<DocumentsSection
				projectId={project.id}
				documents={documents.filter(
					document => document.project === project.id,
				)}
				milestones={projectMilestones}
				tasks={projectTasks}
			/>

			<UpdatesFeed
				updates={updates.filter(update => update.project === project.id)}
				defaultProject={project.id}
				defaultMilestone={null}
				defaultTask={null}
				showScope
			/>
		</div>
	)
}
