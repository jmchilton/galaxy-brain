import { Menu, setIcon } from "obsidian";
import { addDays, isSnoozed, linkLabel, localDay, type Task, type TaskRecord } from "./task-list";

const SNOOZES: Array<[string, number]> = [
	["1 day", 1],
	["3 days", 3],
	["1 week", 7],
	["2 weeks", 14],
];

export interface TaskCardActions {
	/** Profile named on cards whose task sets none. */
	defaultProfile: string;
	/** Hide the task until day (`YYYY-MM-DD`). */
	snooze: (task: Task, index: number, day: string) => void;
	/** Omitted where launching isn't possible (mobile). pending grays the card while the launch runs. */
	launch?: (task: Task, index: number, pending: (on: boolean) => void) => void;
	/** Discuss refining the task with the factory agent; omitted on mobile. */
	refine?: (task: Task) => void;
	remove: (task: Task, index: number) => void;
	/** Link to the task's record; newLeaf on Cmd/Ctrl-click. */
	openRecord: (record: TaskRecord, newLeaf: boolean) => void;
}

function actionButton(el: HTMLElement, icon: string, label: string, cls: string, onclick: (event: MouseEvent) => void) {
	const button = el.createEl("button", { cls: `clickable-icon gb-task-action ${cls}`, attr: { "aria-label": label } });
	setIcon(button, icon);
	button.onclick = onclick;
}

/** Task cards, skipping snoozed tasks: description, action icons, a line of badges and links, then the prompt. index is the task's position in tasks. */
export function renderTaskCards(el: HTMLElement, tasks: Task[], actions: TaskCardActions) {
	const today = localDay();
	const list = el.createDiv({ cls: "gb-tasks" });
	const snoozed = tasks.filter((task) => isSnoozed(task, today)).length;
	if (tasks.length === snoozed) list.createDiv({ cls: "gb-tasks-empty", text: "No tasks." });
	tasks.forEach((task, index) => {
		if (isSnoozed(task, today)) return;
		const human = task.kind === "human";
		const cls = ["gb-task", task.status && `gb-task-${task.status}`, task.priority && `gb-task-${task.priority}`, human && "gb-task-human"];
		const card = list.createDiv({ cls: cls.filter(Boolean).join(" ") });

		const main = card.createDiv({ cls: "gb-task-main" });
		main.createDiv({ cls: "gb-task-title", text: (task.description ?? task.prompt).trim() });
		const buttons = main.createDiv({ cls: "gb-task-actions" });
		if (actions.launch && !human) {
			const launch = actions.launch;
			actionButton(buttons, "rocket", "Launch", "gb-task-launch", () => launch(task, index, (on) => card.toggleClass("gb-task-pending", on)));
		}
		if (actions.refine) {
			const refine = actions.refine;
			actionButton(buttons, "wand-sparkles", "Discuss task refinement", "", () => refine(task));
		}
		actionButton(buttons, "moon", "Snooze", "", (event) => {
			const menu = new Menu();
			for (const [title, days] of SNOOZES) menu.addItem((item) => item.setTitle(title).onClick(() => actions.snooze(task, index, addDays(today, days))));
			menu.showAtMouseEvent(event);
		});
		actionButton(buttons, human ? "check" : "x", human ? "Done" : "Remove", "", () => actions.remove(task, index));

		const meta = card.createDiv({ cls: "gb-task-meta" });
		if (task.priority) meta.createSpan({ cls: "gb-task-priority", text: task.priority });
		if (task.status) meta.createSpan({ cls: "gb-task-status", text: task.status });
		if (human) meta.createSpan({ cls: "gb-task-for", text: "for John" });
		meta.createSpan({ text: task.agentDir });
		if (!human) meta.createSpan({ text: task.profile ?? actions.defaultProfile });
		const { record } = task;
		if (record) {
			const open = meta.createEl("a", { text: `${record.repo}/${record.kind}/${record.name}`, cls: "internal-link", href: "#" });
			open.onclick = (event) => {
				event.preventDefault();
				actions.openRecord(record, event.metaKey || event.ctrlKey);
			};
		}
		if (task.link) meta.createEl("a", { text: linkLabel(task.link), href: task.link, cls: "external-link", attr: { target: "_blank", rel: "noopener" } });

		if (!task.description) return;
		const prompt = card.createDiv({ cls: "gb-task-prompt", text: task.prompt.trim() });
		// A human task's prompt is John's instruction; an agent's stays one line until clicked.
		if (human) return;
		prompt.addClass("gb-task-prompt-folded");
		prompt.onclick = () => {
			if (!activeWindow.getSelection()?.isCollapsed) return;
			prompt.toggleClass("gb-task-prompt-folded", !prompt.hasClass("gb-task-prompt-folded"));
		};
	});
	if (snoozed) list.createDiv({ cls: "gb-tasks-empty", text: `${snoozed} snoozed` });
}
