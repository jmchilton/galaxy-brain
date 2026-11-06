import { describe, expect, it } from "vitest";
import { reportRenderFailures } from "./render-log";

/** A view whose next render does what `next` says. */
function view(report: (message: string, cx: unknown) => void) {
	class Fake {
		next: () => unknown = () => "drawn";
		render(_cx: unknown) {
			return this.next();
		}
	}
	reportRenderFailures(Fake, report);
	return new Fake();
}

const thrown = (action: () => unknown): unknown => {
	try {
		action();
	} catch (error) {
		return error;
	}
	throw new Error("did not throw");
};

describe("reportRenderFailures", () => {
	it("leaves a working render alone", () => {
		const reports: string[] = [];
		expect(view((message) => reports.push(message)).render({})).toBe("drawn");
		expect(reports).toEqual([]);
	});

	it("reports with the stack and rethrows the same error, so Herdr still shows its banner", () => {
		const reports: Array<[string, unknown]> = [];
		const fake = view((message, cx) => reports.push([message, cx]));
		const boom = new TypeError("boom");
		boom.stack = "at render (main.js:1)";
		fake.next = () => {
			throw boom;
		};
		const cx = {};
		expect(thrown(() => fake.render(cx))).toBe(boom);
		expect(reports).toEqual([["TypeError: boom\nat render (main.js:1)", cx]]);
	});

	it("reports a thrown null, which is how a full heap shows", () => {
		const reports: string[] = [];
		const fake = view((message) => reports.push(message));
		fake.next = () => {
			throw null;
		};
		expect(thrown(() => fake.render({}))).toBe(null);
		expect(reports).toEqual(["null"]);
	});

	it("reports a repeat only after a render has worked", () => {
		const reports: string[] = [];
		const fake = view((message) => reports.push(message));
		const fail = () => {
			throw "same";
		};
		fake.next = fail;
		thrown(() => fake.render({}));
		thrown(() => fake.render({}));
		expect(reports).toEqual(["same"]);
		fake.next = () => "drawn";
		fake.render({});
		fake.next = fail;
		thrown(() => fake.render({}));
		expect(reports).toEqual(["same", "same"]);
	});

	it("still throws the render's error when reporting fails", () => {
		const fake = view(() => {
			throw new Error("can't report");
		});
		fake.next = () => {
			throw "original";
		};
		expect(thrown(() => fake.render({}))).toBe("original");
	});
});
