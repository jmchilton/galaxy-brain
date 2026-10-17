import { getLocalVue } from "@tests/vitest/helpers";
import { mount } from "@vue/test-utils";
import axios from "axios";
import flushPromises from "flush-promises";
import { describe, expect, it, vi } from "vitest";

import SharingPage from "@/components/Sharing/SharingPage.vue";
import WorkflowEmbed from "@/components/Sharing/Embeds/WorkflowEmbed.vue";
import PageEmbed from "@/components/Sharing/Embeds/PageEmbed.vue";
import SharingIndicator from "@/components/PageEditor/SharingIndicator.vue";
import DatasetPermissionsForm from "@/components/Dataset/DatasetPermissionsForm.vue";

vi.mock("axios", () => ({ default: { get: vi.fn(), put: vi.fn() } }));
vi.mock("@/app", () => ({ getGalaxyInstance: () => ({ user: { get: () => "reviewer" } }) }));
vi.mock("@/composables/toast", () => ({ useToast: () => ({ success: vi.fn() }) }));

function globalOptions() {
    const local = getLocalVue();
    return { ...local, stubs: { ...local.stubs, UserSharing: true, EditableUrl: true,
        WorkflowPublished: true, PageView: true, ZoomControl: true, FormGeneric: true } };
}

describe("PR 24186 migration interactions", () => {
    it("sends the correct sharing action in both directions and accepts server state", async () => {
        const item = { id: "h1", title: "History", username_and_slug: "u/reviewer/h/h1", importable: false,
            published: false, users_shared_with: [], errors: [], extra: null };
        vi.mocked(axios.get).mockResolvedValue({ data: item });
        vi.mocked(axios.put).mockImplementation(async (url) => {
            const action = String(url).split("/").pop();
            return { data: { ...item, importable: action !== "disable_link_access", published: action === "publish" } };
        });
        const wrapper = mount(SharingPage, { props: { id: "h1", pluralName: "Histories", modelClass: "History" }, global: globalOptions() });
        await flushPromises();
        await wrapper.get(".make-accessible input").setValue(true);
        await flushPromises();
        expect(axios.put).toHaveBeenLastCalledWith("/api/histories/h1/enable_link_access", { user_ids: undefined, share_option: undefined });
        await wrapper.get(".make-publishable input").setValue(true);
        await flushPromises();
        expect(axios.put).toHaveBeenLastCalledWith("/api/histories/h1/publish", expect.any(Object));
        await wrapper.get(".make-publishable input").setValue(false);
        await flushPromises();
        expect(axios.put).toHaveBeenLastCalledWith("/api/histories/h1/unpublish", expect.any(Object));
        await wrapper.get(".make-accessible input").setValue(false);
        await flushPromises();
        expect(axios.put).toHaveBeenLastCalledWith("/api/histories/h1/disable_link_access", expect.any(Object));
        expect(wrapper.find(".make-publishable").exists()).toBe(false);
        expect(wrapper.get<HTMLInputElement>(".make-accessible input").element.checked).toBe(false);
    });

    it("propagates workflow checkbox settings into the generated iframe", async () => {
        const wrapper = mount(WorkflowEmbed, { props: { id: "w1" }, global: globalOptions() });
        const inputs = wrapper.findAll<HTMLInputElement>("input[type=checkbox]");
        for (let i = 0; i < 5; i++) await inputs[i]!.setValue(!inputs[i]!.element.checked);
        const embed = wrapper.get<HTMLInputElement>(".embed-code-input").element.value;
        expect(embed).toContain("heading=true");
        expect(embed).toContain("about=true");
        expect(embed).toContain("buttons=false");
        expect(embed).toContain("minimap=false");
        expect(embed).toContain("zoom_controls=false");
        await inputs[5]!.setValue(false);
        expect(wrapper.get<HTMLInputElement>(".embed-code-input").element.value).not.toContain("style=");
        await inputs[5]!.setValue(true);
        expect(wrapper.get<HTMLInputElement>(".embed-code-input").element.value).toContain("height: 700px");
    });

    it("propagates page title and styling switches into generated iframe and dimensions", async () => {
        const wrapper = mount(PageEmbed, { props: { id: "p1" }, global: globalOptions() });
        const inputs = wrapper.findAll("input[type=checkbox]");
        await inputs[0]!.setValue(false);
        expect(wrapper.get<HTMLInputElement>(".embed-code-input").element.value).toContain("heading=false");
        await inputs[1]!.setValue(false);
        expect(wrapper.find(".dimension-controls").exists()).toBe(false);
        expect(wrapper.get<HTMLInputElement>(".embed-code-input").element.value).not.toContain("width=");
        await inputs[1]!.setValue(true);
        expect(wrapper.find(".dimension-controls").exists()).toBe(true);
        expect(wrapper.get<HTMLInputElement>(".embed-code-input").element.value).toContain('width="800px"');
    });

    it("shows pending object sharing and locks the switch once the parent confirms", async () => {
        const wrapper = mount(SharingIndicator, { props: { accessible: false }, global: globalOptions() });
        expect(wrapper.get("input").attributes("aria-label")).toBe("Make accessible");
        await wrapper.get("input").setValue(true);
        expect(wrapper.emitted("makeAccessible")).toEqual([[]]);
        expect(wrapper.find("input").exists()).toBe(false);
        await wrapper.setProps({ accessible: true });
        expect(wrapper.get<HTMLInputElement>("input").element.checked).toBe(true);
        expect(wrapper.get<HTMLInputElement>("input").element.disabled).toBe(true);
    });

    it("resynchronizes private-dataset switch after a parent update and emits both boolean values", async () => {
        const wrapper = mount(DatasetPermissionsForm, { props: { loading: false, simplePermissions: true,
            title: "Permissions", checked: false, formConfig: {} }, global: globalOptions() });
        await wrapper.get("input").setValue(true);
        expect(wrapper.emitted("change")).toEqual([[true]]);
        await wrapper.setProps({ checked: true });
        await wrapper.get("input").setValue(false);
        expect(wrapper.emitted("change")).toEqual([[true], [false]]);
        await wrapper.setProps({ checked: false });
        await wrapper.setProps({ checked: true });
        expect(wrapper.get<HTMLInputElement>("input").element.checked).toBe(true);
    });
});
