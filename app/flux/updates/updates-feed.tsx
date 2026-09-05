"use client";

import { useState } from "react";
import { Avatar } from "@/app/components/ui/Avatar";
import { Gallery } from "@/app/components/ui/Gallery";
import { DeleteUpdateButton } from "@/app/flux/updates/delete-update-button";
import { UpdateForm } from "@/app/flux/updates/update-form";
import { useFluxMilestones, useFluxTasks, useFluxUsers, fluxUserName } from "@/app/flux/_state/flux-context";
import { formatDate } from "@/app/lib/formatters";
import type { FluxUpdate } from "@/app/lib/dal";

function UpdateRow({ update, showScope }: { update: FluxUpdate; showScope: boolean }) {
  const users = useFluxUsers();
  const milestones = useFluxMilestones();
  const tasks = useFluxTasks();
  const [editing, setEditing] = useState(false);

  if (editing) {
    return (
      <UpdateForm
        update={update}
        defaultProject={update.project}
        defaultMilestone={update.milestone}
        defaultTask={update.task}
        onDone={() => setEditing(false)}
      />
    );
  }

  const scopeLabel = showScope
    ? update.task != null
      ? tasks.find((t) => t.id === update.task)?.title
      : update.milestone != null
        ? milestones.find((m) => m.id === update.milestone)?.title
        : null
    : null;

  return (
    <div className="group flex items-start gap-3">
      <Avatar
        name={update.author != null ? fluxUserName(users.get(update.author), update.author) : "Systemet"}
        size={28}
      />
      <div className="flex min-w-0 flex-1 flex-col gap-1">
        <p className="whitespace-pre-wrap text-sm text-text">{update.content}</p>
        <Gallery files={update.files} />
        <span className="text-xs text-text-faint">
          {formatDate(update.created_at)}
          {scopeLabel && <> · {update.task != null ? "Uppgift" : "Delmål"}: {scopeLabel}</>}
        </span>
      </div>
      <button
        type="button"
        onClick={() => setEditing(true)}
        className="shrink-0 text-xs text-text-faint opacity-0 hover:text-text group-hover:opacity-100"
      >
        Redigera
      </button>
      <DeleteUpdateButton id={update.id} />
    </div>
  );
}

export function UpdatesFeed({
  updates,
  defaultProject,
  defaultMilestone,
  defaultTask,
  showScope = false,
}: {
  updates: FluxUpdate[];
  defaultProject: number;
  defaultMilestone: number | null;
  defaultTask: number | null;
  showScope?: boolean;
}) {
  const sorted = updates.slice().sort((a, b) => b.created_at.localeCompare(a.created_at));

  return (
    <div className="flex flex-col gap-4 border-t border-border pt-4">
      <span className="text-xs font-semibold uppercase tracking-wide text-text-faint">Uppdateringar</span>

      {sorted.length === 0 ? (
        <p className="text-sm text-text-muted">Inga uppdateringar än.</p>
      ) : (
        <div className="flex flex-col gap-4">
          {sorted.map((update) => (
            <UpdateRow key={update.id} update={update} showScope={showScope} />
          ))}
        </div>
      )}

      <UpdateForm
        defaultProject={defaultProject}
        defaultMilestone={defaultMilestone}
        defaultTask={defaultTask}
      />
    </div>
  );
}
