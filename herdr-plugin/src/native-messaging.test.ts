import { describe, expect, it } from "vitest";
import { decodeFrames, encodeFrame } from "./native-messaging";

describe("native messaging frames", () => {
	it("round-trips messages and keeps a partial frame for later", () => {
		const both = Buffer.concat([encodeFrame({ type: "lookup", url: "é" }), encodeFrame([1, 2])]);
		const partial = encodeFrame({ more: true }).subarray(0, 6);
		const { messages, rest } = decodeFrames(Buffer.concat([both, partial]));
		expect(messages).toEqual([{ type: "lookup", url: "é" }, [1, 2]]);
		expect(rest).toEqual(partial);
	});

	it("prefixes the UTF-8 byte length", () => {
		expect(encodeFrame("é").readUInt32LE(0)).toBe(4);
	});
});
