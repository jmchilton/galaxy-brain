import { existsSync, mkdtempSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { describe, expect, it } from "vitest";
import { detachedRequest, jobFile, runCommand } from "./detached";

describe("detached jobs", () => {
	const fresh = () => join(mkdtempSync(join(tmpdir(), "gb-detached-")), "result.json");

	it("names a job's result file by kind and ref", () => {
		expect(jobFile("check", "galaxy/reviews/24706")).toBe(join(tmpdir(), "gb-check-galaxy__reviews__24706.json"));
	});

	it("runs a command to its end, and gives its exit and output once", async () => {
		const file = fresh();
		const started: string[] = [];
		expect(detachedRequest(file, "start", () => started.push("job"))).toBeNull();
		expect(started).toEqual(["job"]);
		expect(detachedRequest(file, "result", () => undefined)).toBeNull();
		await runCommand(file, [process.execPath, "-e", "console.log('⛔ no'); console.error('stderr too'); process.exit(3)"]);
		expect(detachedRequest(file, "result", () => undefined)).toEqual({ ok: false, message: "⛔ no\nstderr too" });
		expect(existsSync(file)).toBe(false);
	});

	it("stops a command that runs too long", async () => {
		const file = fresh();
		await runCommand(file, [process.execPath, "-e", "setTimeout(() => {}, 10_000)"], 100);
		expect(detachedRequest(file, "result", () => undefined)).toEqual({ ok: false, message: "⛔ stopped after 0.1 s" });
	});

	it("reports a command that can't start", async () => {
		const file = fresh();
		await runCommand(file, ["/no/such/command"]);
		expect(detachedRequest(file, "result", () => undefined)).toMatchObject({ ok: false, message: expect.stringContaining("ENOENT") });
	});
});
