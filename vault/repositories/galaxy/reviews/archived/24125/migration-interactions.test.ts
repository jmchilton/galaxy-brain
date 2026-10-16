import { mount } from "@vue/test-utils";
import { describe, expect, it, vi } from "vitest";
import { ref } from "vue";
import SourceOptions from "@/components/Collections/common/CollectionCreatorSourceOptions.vue";
import ConfigureWorkbook from "@/components/Collections/wizard/ConfigureFetchWorkbook.vue";
import DirectoryPicker from "@/components/Libraries/LibraryFolder/TopToolbar/DirectoryDatasetPicker.vue";
import OptionsHeader from "@/components/Panels/Upload/shared/UploadTableOptionsHeader.vue";
vi.mock("@/composables/datatypes", () => ({ useDetailedDatatypes: () => ({ datatypes: ref([]), datatypesLoading: ref(true) }) }));
vi.mock("@/stores/dbKeyStore", () => ({ useDbKeyStore: () => ({ fetchUploadDbKeys: vi.fn(), uploadDbKeys: [] }) }));
describe("PR 24125 migration interactions", () => {
    it("keeps source-option boolean updates and external synchronization", async () => {
        const wrapper = mount(SourceOptions, { props: { value: false, renderExtensionsToggle: true, extensionsToggle: false }, global: { stubs: { HelpText: { template: '<span>Hide original elements</span>' } } } });
        await wrapper.find('input[name="remove-extensions"]').setValue(true);
        expect(wrapper.emitted("remove-extensions-toggle")).toHaveLength(1);
        await wrapper.find('input[name="hide-originals"]').setValue(true);
        expect(wrapper.emitted("input")).toEqual([[true]]);
        await wrapper.setProps({ value: true });
        await wrapper.setProps({ value: false });
        expect((wrapper.find('input[name="hide-originals"]').element as HTMLInputElement).checked).toBe(false);
    });
    it("emits workbook boolean changes in both directions", async () => {
        const wrapper = mount(ConfigureWorkbook, { props: { collectionType: "list", includeCollectionName: true }, global: { stubs: { WhichWorkbookCollectionType: true } } });
        await wrapper.find('input[type="checkbox"]').setValue(false);
        await wrapper.find('input[type="checkbox"]').setValue(true);
        expect(wrapper.emitted("onIncludeCollectionName")).toEqual([[false], [true]]);
    });
    it("emits a single bulk toggle from an indeterminate header", async () => {
        const wrapper = mount(OptionsHeader, { props: { options: [{ key: "spaceToTab", label: "Spaces", title: "Convert spaces", checked: false, indeterminate: true }] } });
        const input = wrapper.find("input");
        expect((input.element as HTMLInputElement).indeterminate).toBe(true);
        await input.setValue(true);
        expect(wrapper.emitted("toggle")).toEqual([["spaceToTab"]]);
        await wrapper.setProps({ options: [{ key: "spaceToTab", label: "Spaces", title: "Convert spaces", checked: true, indeterminate: false }] });
        await input.setValue(false);
        expect(wrapper.emitted("toggle")).toEqual([["spaceToTab"], ["spaceToTab"]]);
    });
    it("carries directory group switch values into the import payload", async () => {
        const wrapper = mount(DirectoryPicker, { props: { folderId: "folder", target: "path" }, global: { stubs: { GModal: { name: "GModal", template: '<div><slot /></div>' }, SingleItemSelector: true, FormDrilldown: true } } });
        const group = wrapper.find('fieldset[aria-label="Import options"]');
        expect(group.findAll('input[role="switch"]')).toHaveLength(5);
        await group.find('input[value="link_files"]').setValue(true);
        await group.find('input[value="space_to_tab"]').setValue(true);
        await group.find('input[value="tags_from_filenames"]').setValue(true);
        await group.find('input[value="space_to_tab"]').setValue(false);
        await wrapper.find("textarea").setValue("/tmp/input.txt");
        wrapper.findComponent({ name: "GModal" }).vm.$emit("ok");
        expect(wrapper.emitted("onSelect")).toEqual([[[{ path: "/tmp/input.txt", source: "admin_path", dbkey: "?", encoded_folder_id: "folder", link_data: true, space_to_tab: false, to_posix_lines: false, tag_using_filenames: true }]]]);
    });
});
