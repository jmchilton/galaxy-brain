import { mount } from "@vue/test-utils";
import { createPinia } from "pinia";
import { describe, expect, it, vi } from "vitest";
import { ref } from "vue";
import HistoryGraph from "./HistoryGraph.vue";
vi.mock("@/components/History/Graph/useHistoryGraph", () => ({ useHistoryGraph: () => ({
 loading: ref(false), error: ref(null), focusNodeId: ref(null),
 graphNodes: ref([{id: "tool_request-1"}]), graphEdges: ref([]), isTruncated: ref(true),
 toolExecutionNodes: ref([{id: "tool_request-1"}]),
}) }));
vi.mock("@/composables/config", () => ({useConfig: () => ({config: ref({enable_sse_updates: true})})}));
vi.mock("@/stores/historyStore", () => ({useHistoryStore: () => ({currentHistoryId: ref("a1")})}));
vi.mock("@/components/History/Graph/HistoryGraphCanvas.vue", () => ({default: {template: '<div data-graph="true" />'}}));
vi.mock("@/components/BaseComponents/GAlert.vue", () => ({default: {template: '<div role="alert"><slot /></div>'}}));
describe("widget truncated provenance", () => {
 it("warns when the graph response is capped", () => {
  const wrapper=mount(HistoryGraph, {props: {historyId: "a1"}, global: {plugins: [createPinia()]}});
  expect(wrapper.find('[data-graph="true"]').exists()).toBe(true);
  expect(wrapper.text()).toMatch(/truncat|first .*execution|capped/i);
 });
});
