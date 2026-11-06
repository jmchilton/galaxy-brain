// Reports a view's render failures. Herdr only shows them in a banner, and a full heap or a stopped render may never reach this.

const described = (error: unknown) => (error instanceof Error ? `${error.name}: ${error.message}\n${error.stack ?? ""}`.trim() : String(error));

/** Wraps `view`'s render: reports each new failure, then rethrows it. */
export function reportRenderFailures(view: { prototype: any }, report: (message: string, cx: any) => void): void {
	const render = view.prototype.render;
	const reported = new WeakMap<object, string>();
	view.prototype.render = function (this: object, cx: unknown) {
		try {
			const drawn = render.call(this, cx);
			reported.delete(this);
			return drawn;
		} catch (error) {
			try {
				const message = described(error);
				if (reported.get(this) !== message) {
					reported.set(this, message);
					report(message, cx);
				}
			} catch {
				// The render's own error is the one to surface.
			}
			throw error;
		}
	};
}
