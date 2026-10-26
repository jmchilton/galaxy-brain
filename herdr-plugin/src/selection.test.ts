import { describe, expect, it } from "vitest";
import { pickerEnv } from "./selection";

const context = (fields: object) => JSON.stringify(fields);

describe("pickerEnv", () => {
	it("passes a clicked URL through", () => {
		expect(pickerEnv(context({ clicked_url: "https://github.com/a/b/pull/1" }))).toEqual({ GB_URL: "https://github.com/a/b/pull/1" });
	});

	it("treats a selected GitHub PR or issue URL like a click", () => {
		expect(pickerEnv(context({ selected_text: "  https://github.com/a/b/issues/2\n" }))).toEqual({ GB_URL: "https://github.com/a/b/issues/2" });
	});

	it("turns other selections into a one-line filter query", () => {
		expect(pickerEnv(context({ selected_text: "selenium_upload\n  data_library " }))).toEqual({ GB_QUERY: "selenium_upload data_library" });
	});

	it("caps long selections and ignores empty ones and bad JSON", () => {
		expect(pickerEnv(context({ selected_text: "x".repeat(500) })).GB_QUERY).toHaveLength(200);
		expect(pickerEnv(context({ selected_text: "  \n" }))).toEqual({});
		expect(pickerEnv("not json")).toEqual({});
		expect(pickerEnv(undefined)).toEqual({});
	});
});
