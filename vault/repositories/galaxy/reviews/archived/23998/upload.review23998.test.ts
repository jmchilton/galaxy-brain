import { http, HttpResponse } from "msw";
import { beforeEach, describe, expect, it, vi } from "vitest";
import { useServerMock } from "@/api/client/__mocks__";
import { createTusUpload } from "./tusUpload";
import { buildCollectionUploadPayload, createFileUploadItem, createPastedUploadItem, createUrlUploadItem, uploadCollectionDatasets } from "./upload";
vi.mock("./tusUpload", () => ({ createTusUpload: vi.fn(), NamedBlob: class {} }));
vi.mock("@/onload/loadConfig", () => ({ getAppRoot: () => "/" }));
const { server } = useServerMock();
const file = (name: string) => createFileUploadItem(new File([`bytes:${name}`], name), "historyId");
let body: any;
let transfers: Array<{ name: string; signal?: AbortSignal }>;
const flatten = (elements: any[]): any[] => elements.flatMap(e => e.elements ? flatten(e.elements) : [e]);
beforeEach(() => {
    vi.clearAllMocks(); body = undefined; transfers = [];
    vi.mocked(createTusUpload).mockImplementation(async options => {
        const f = options.file as File;
        transfers.push({ name: f.name, signal: options.signal });
        options.onProgress(100);
        return { sessionId: await f.text(), fileName: f.name };
    });
    server.use(http.post("/api/tools/fetch", async ({ request }) => {
        body = await request.json(); return HttpResponse.json({ jobs: [{ id: "job" }] });
    }));
});
function assertNamesAndBytes(names: string[]) {
    const entries = flatten(body.targets[0].elements).filter(e => e.src === "files");
    expect(entries.map(e => e.name)).toEqual(names);
    entries.forEach((e, i) => expect(body[`files_${i}|file_data`].session_id).toBe(`bytes:${e.name}`));
}
describe("independent collection submission checks", () => {
    it("matches three contents, progress and signals without mutating caller arrays", async () => {
        const items = [file("A.txt"), file("B.txt"), file("C.txt")];
        const ids = ["A", "B", "C"];
        const controllers = items.map(() => new AbortController());
        const signals = controllers.map(c => c.signal);
        const progress: Record<string, string> = {};
        await uploadCollectionDatasets(items, { collectionName: "List", collectionType: "list" }, {
            uploadIds: ids, signals, perFileProgress: id => { progress[id] = transfers.at(-1)!.name; },
        });
        assertNamesAndBytes(["C.txt", "B.txt", "A.txt"]);
        expect(progress).toEqual({ A: "A.txt", B: "B.txt", C: "C.txt" });
        expect(transfers.map(t => t.signal)).toEqual([...signals].reverse());
        expect(items.map(i => i.name)).toEqual(["A.txt", "B.txt", "C.txt"]);
        expect(ids).toEqual(["A", "B", "C"]);
        expect(signals).toEqual(controllers.map(c => c.signal));
    });
    it("preserves depth-first paired contents and signal identity", async () => {
        const items = [file("s1_R1.txt"), file("s1_R2.txt"), file("s2_R1.txt"), file("s2_R2.txt")];
        const signals = items.map(() => new AbortController().signal);
        await uploadCollectionDatasets(items, { collectionName: "Pairs", collectionType: "list:paired" }, { signals });
        expect(transfers.map(t => t.name)).toEqual(items.map(i => i.name));
        expect(transfers.map(t => t.signal)).toEqual(signals);
        const entries = flatten(body.targets[0].elements);
        expect(entries.map(e => e.name)).toEqual(["forward", "reverse", "forward", "reverse"]);
        entries.forEach((_, i) => expect(body[`files_${i}|file_data`].session_id).toBe(`bytes:${items[i]!.name}`));
    });
    it("keeps interleaved local, URL and pasted list sources matched", async () => {
        const items = [file("A.txt"), createUrlUploadItem("https://example.com/remote.txt", "historyId", { name: "remote.txt" }), file("B.txt"), createPastedUploadItem("paste:content", "historyId", { name: "pasted.txt" }), file("C.txt")];
        await uploadCollectionDatasets(items, { collectionName: "Mixed", collectionType: "list" });
        const entries = flatten(body.targets[0].elements);
        expect(entries.map(e => e.name)).toEqual(["C.txt", "pasted.txt", "B.txt", "remote.txt", "A.txt"]);
        assertNamesAndBytes(["C.txt", "B.txt", "A.txt"]);
        expect(entries[1].paste_content).toBe("paste:content");
        expect(entries[3].url).toBe("https://example.com/remote.txt");
    });
    it("keeps singleton bytes unchanged", async () => {
        await uploadCollectionDatasets([file("Only.txt")], { collectionName: "Single", collectionType: "list" });
        assertNamesAndBytes(["Only.txt"]);
    });
    it("prunes original A after cancellation before reversal", async () => {
        const controllers = [new AbortController(), new AbortController(), new AbortController()]; controllers[0]!.abort();
        await uploadCollectionDatasets([file("A.txt"), file("B.txt"), file("C.txt")], { collectionName: "List", collectionType: "list" }, { signals: controllers.map(c => c.signal) });
        assertNamesAndBytes(["C.txt", "B.txt"]);
        expect(transfers.map(t => t.name)).toEqual(["C.txt", "B.txt"]);
    });
    it("prunes original A when its TUS upload is cancelled", async () => {
        const controllers = [new AbortController(), new AbortController(), new AbortController()];
        const implementation = vi.mocked(createTusUpload).getMockImplementation()!;
        vi.mocked(createTusUpload).mockImplementation(async options => {
            if ((options.file as File).name === "A.txt") { controllers[0]!.abort(); throw new Error("cancelled"); }
            return implementation(options);
        });
        await uploadCollectionDatasets([file("A.txt"), file("B.txt"), file("C.txt")], { collectionName: "List", collectionType: "list" }, { signals: controllers.map(c => c.signal) });
        assertNamesAndBytes(["C.txt", "B.txt"]);
    });
    it("does not submit an atomically aborted batch", async () => {
        const controller = new AbortController();
        const implementation = vi.mocked(createTusUpload).getMockImplementation()!;
        vi.mocked(createTusUpload).mockImplementation(async options => { const result = await implementation(options); controller.abort(); return result; });
        await uploadCollectionDatasets([file("A.txt"), file("B.txt")], { collectionName: "List", collectionType: "list" }, { signal: controller.signal });
        expect(body).toBeUndefined();
    });
    it("keeps the low-level builder's files and mixed elements in supplied order", () => {
        const result = buildCollectionUploadPayload([file("A.txt"), createUrlUploadItem("https://example.com/remote.txt", "historyId", { name: "remote.txt" }), file("B.txt")], { collectionName: "List", collectionType: "list" });
        expect((result.files as File[]).map(f => f.name)).toEqual(["A.txt", "B.txt"]);
        expect(flatten(result.targets[0]!.elements!).map(e => e.name)).toEqual(["A.txt", "remote.txt", "B.txt"]);
    });
});
