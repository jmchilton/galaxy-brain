import type { Task, TaskRecord } from "./task-list";

export interface TaskCardActions {
	/** Profile named on cards whose task sets none. */
	defaultProfile: string;
	/** 🚀; omitted where launching isn't possible (mobile). pending grays the card while the launch runs. */
	launch?: (task: Task, index: number, pending: (on: boolean) => void) => void;
	/** 🪄 discuss refining the task with the factory agent; omitted on mobile. */
	refine?: (task: Task) => void;
	/** ✖ */
	remove: (task: Task, index: number) => void;
	/** 📓 link to the task's record; newLeaf on Cmd/Ctrl-click. */
	openRecord: (record: TaskRecord, newLeaf: boolean) => void;
}

/** Task cards: priority and status badges, agent dir and profile, 🚀 / 🪄 / ✖ (✔ for human tasks), description, record and GitHub links, prompt. */
export function renderTaskCards(el: HTMLElement, tasks: Task[], actions: TaskCardActions) {
	const list = el.createDiv({ cls: "gb-tasks" });
	if (tasks.length === 0) list.createDiv({ cls: "gb-tasks-empty", text: "No tasks." });
	tasks.forEach((task, index) => {
		const human = task.kind === "human";
		const cls = ["gb-task", task.status && `gb-task-${task.status}`, task.priority && `gb-task-${task.priority}`, human && "gb-task-human"];
		const card = list.createDiv({ cls: cls.filter(Boolean).join(" ") });
		const head = card.createDiv({ cls: "gb-task-head" });
		if (task.priority) head.createSpan({ cls: "gb-task-priority", text: task.priority });
		if (task.status) head.createSpan({ cls: "gb-task-status", text: task.status });
		head.createSpan({ cls: "gb-task-meta", text: `${task.agentDir} · ${human ? "for John" : (task.profile ?? actions.defaultProfile)}` });
		if (actions.launch && !human) {
			const launch = actions.launch;
			head.createEl("button", { text: "🚀", attr: { "aria-label": "Launch" } }).onclick = () => launch(task, index, (on) => card.toggleClass("gb-task-pending", on));
		}
		if (actions.refine) {
			const refine = actions.refine;
			head.createEl("button", { text: "🪄", attr: { "aria-label": "Discuss task refinement" } }).onclick = () => refine(task);
		}
		const [text, label] = human ? ["✔", "Done"] : ["✖", "Remove"];
		head.createEl("button", { text, attr: { "aria-label": label } }).onclick = () => actions.remove(task, index);
		if (task.description) card.createDiv({ cls: "gb-task-description", text: task.description.trim() });
		const { record } = task;
		if (record) {
			const open = card.createDiv({ cls: "gb-task-link" }).createEl("a", { text: `📓 ${record.repo} ${record.kind} ${record.name}`, cls: "internal-link", href: "#" });
			open.onclick = (event) => {
				event.preventDefault();
				actions.openRecord(record, event.metaKey || event.ctrlKey);
			};
		}
		if (task.link) {
			const text = task.link.replace(/^https?:\/\//, "");
			card.createDiv({ cls: "gb-task-link" }).createEl("a", { text, href: task.link, cls: "external-link", attr: { target: "_blank", rel: "noopener" } });
		}
		card.createDiv({ cls: "gb-task-prompt", text: task.prompt.trim() });
	});
}
