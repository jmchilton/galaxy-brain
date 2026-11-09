// The findings panel's requests and reply, free of Node so the Herdr app's record tab can share them.
import type { FindingsChange } from "../../review-factory/src/landing";
import type { CaptureResult } from "./review-types";

export type { FindingsChange, FindingsPanel } from "../../review-factory/src/landing";

export type FindingsEdit = { ref: string; round: number } & FindingsChange;

/** `review-factory check`'s output; started, then collected once it's done. */
export type FindingsCheck = CaptureResult;
