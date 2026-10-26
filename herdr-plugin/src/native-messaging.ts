// Chrome native messaging frames: a 4-byte little-endian length, then UTF-8 JSON.

export function encodeFrame(message: unknown): Buffer {
	const body = Buffer.from(JSON.stringify(message), "utf8");
	const header = Buffer.alloc(4);
	header.writeUInt32LE(body.length, 0);
	return Buffer.concat([header, body]);
}

/** Whole messages at the front of `buffer`, plus the unread rest. */
export function decodeFrames(buffer: Buffer): { messages: unknown[]; rest: Buffer } {
	const messages: unknown[] = [];
	let offset = 0;
	while (buffer.length - offset >= 4) {
		const length = buffer.readUInt32LE(offset);
		if (buffer.length - offset - 4 < length) break;
		messages.push(JSON.parse(buffer.subarray(offset + 4, offset + 4 + length).toString("utf8")));
		offset += 4 + length;
	}
	return { messages, rest: buffer.subarray(offset) };
}
