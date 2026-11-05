import { describe, expect, it } from "vitest";
import { mergePrompts, parsePrompts, quickEmoji } from "./prompts";

const MD = `# Suggested

## Polish
\`\`\`
Run ./POLISH_BRANCH.md <branch_name>
\`\`\`

## Good morning
`;

describe("parsePrompts", () => {
	it("makes sections prompts, strips fences, and uses the label for an empty body", () => {
		expect(parsePrompts(MD)).toEqual([
			{ label: "Polish", text: "Run ./POLISH_BRANCH.md <branch_name>" },
			{ label: "Good morning", text: "Good morning" },
		]);
	});

	it("reads bullets when there are no sections", () => {
		expect(parsePrompts("intro\n- Run ./TICK.md\n* Launch a review of 123\n")).toEqual([
			{ label: "Run ./TICK.md", text: "Run ./TICK.md" },
			{ label: "Launch a review of 123", text: "Launch a review of 123" },
		]);
	});

	it("ignores headings inside fences", () => {
		expect(parsePrompts("## Outer\n```\n## not a heading\n```\n")).toEqual([{ label: "Outer", text: "## not a heading" }]);
	});
});

describe("quickEmoji", () => {
	it("takes exactly one leading emoji", () => {
		expect(quickEmoji("🔁 Sync vault")).toBe("🔁");
		expect(quickEmoji("🧑‍💻 Pair")).toBe("🧑‍💻");
		expect(quickEmoji("☀️ Morning")).toBe("☀️");
		expect(quickEmoji("🔁🔁 Twice")).toBeUndefined();
		expect(quickEmoji("Sync 🔁")).toBeUndefined();
		expect(quickEmoji("🔁")).toBeUndefined();
	});
});

describe("mergePrompts", () => {
	it("keeps local prompts first and drops shared ones with the same text", () => {
		const local = parsePrompts("## Tick\nRun ./TICK.md\n");
		const shared = parsePrompts("## Tick\nRun ./TICK.md\n\n## 🔁 Sync vault\nRun ../_shared/VAULT_SYNC.md\n");
		expect(mergePrompts([local, shared])).toEqual([
			{ label: "Tick", text: "Run ./TICK.md" },
			{ label: "🔁 Sync vault", text: "Run ../_shared/VAULT_SYNC.md" },
		]);
	});
});
