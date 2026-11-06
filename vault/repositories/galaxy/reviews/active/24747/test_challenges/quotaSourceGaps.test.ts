// Prototype for #24747; copy to client/src/components/Masthead/ to run. Split into the sibling test files when adopted.
import { getFakeHistorySummary, getFakeQuotaUsageData, getFakeRegisteredUser } from "@tests/test-data";
import { getLocalVue, withPlugins } from "@tests/vitest/helpers";
import { setupMockConfig } from "@tests/vitest/mockConfig";
import { advanceTooltipHoverDelay } from "@tests/vitest/tooltipTestUtils";
import { type DOMWrapper, mount, shallowMount, type VueWrapper } from "@vue/test-utils";
import flushPromises from "flush-promises";
import { createPinia, setActivePinia } from "pinia";
import { afterEach, describe, expect, it, vi } from "vitest";

import type { AnonymousUser } from "@/api";
import { useServerMock } from "@/api/client/__mocks__";
import { toQuotaUsage, type UserQuotaUsageData } from "@/components/User/DiskUsage/Quota/model/QuotaUsage";
import { vGTooltip } from "@/directives/vGTooltip";
import { useQuotaUsageStore } from "@/stores/quotaUsageStore";
import { useUserStore } from "@/stores/userStore";
import { DEFAULT_TOOLTIP_HOVER_DELAY_MS } from "@/utils/tooltipTiming";

import FilterMenuDropdown from "@/components/Common/FilterMenuDropdown.vue";
import HistoryMessages from "@/components/History/CurrentHistory/HistoryMessages.vue";
import QuotaUsageSummary from "@/components/User/DiskUsage/Quota/QuotaUsageSummary.vue";

import QuotaMeter from "./QuotaMeter.vue";

vi.mock("@/api/schema");

const baseLocalVue = getLocalVue();
const localVue = { ...baseLocalVue, directives: { ...baseLocalVue.directives, "g-tooltip": vGTooltip } };
const { server, http } = useServerMock();

const USER = getFakeRegisteredUser({ total_disk_usage: 1048576, quota_bytes: 104857600, quota_percent: 1 });
const STORAGES = [
    {
        object_store_id: "scratch",
        name: "Scratch Storage",
        quota: { source: "scratch", enabled: true },
        private: false,
        badges: [],
    },
];
const SCRATCH_USAGE = { quota_source_label: "scratch", quota_bytes: 1000, total_disk_usage: 1 };

const SELECTORS = {
    hint: "[data-description='other storage over quota']",
    row: "[data-description='quota source usage']",
    name: "[data-description='quota source name']",
    overQuota: "[data-description='quota source over quota']",
    link: "[data-description='storage dashboard link']",
};

const mounted: VueWrapper[] = [];

afterEach(() => {
    mounted.splice(0).forEach((wrapper) => wrapper.unmount());
});

async function hover(element: VueWrapper | DOMWrapper<Element>) {
    vi.useFakeTimers();
    try {
        await element.trigger("mouseenter");
        await advanceTooltipHoverDelay(DEFAULT_TOOLTIP_HOVER_DELAY_MS);
    } finally {
        vi.useRealTimers();
    }
    await flushPromises();
}

function useStorageApi(usages: UserQuotaUsageData[]) {
    server.use(
        http.get("/api/users/{user_id}/usage", ({ response }) => response(200).json(usages)),
        http.get("/api/object_stores", ({ response }) => response(200).json(STORAGES)),
    );
}

async function mountMeter(config: object, user: unknown, usages: UserQuotaUsageData[]) {
    useStorageApi(usages);
    setupMockConfig(config);
    const pinia = createPinia();
    setActivePinia(pinia);
    useUserStore().currentUser = user as never;
    const wrapper = mount(QuotaMeter as object, { global: withPlugins(localVue, pinia), attachTo: document.body });
    mounted.push(wrapper);
    if (usages.length) {
        await useQuotaUsageStore().loadQuotaUsages();
    }
    await flushPromises();
    return wrapper;
}

function tooltipText() {
    return document.body.querySelector(".g-tooltip-d")?.textContent ?? null;
}

describe("popover gate", () => {
    const TWO_SOURCES = [getFakeQuotaUsageData(null, 1), getFakeQuotaUsageData("scratch", 1)];

    it("keeps the tooltip and lists nothing with quotas off, even when opened", async () => {
        const wrapper = await mountMeter({ enable_quotas: false }, USER, TWO_SOURCES);
        await hover(wrapper.find(SELECTORS.link));
        await hover(wrapper);

        expect(document.body.querySelector(SELECTORS.row)).toBeNull();
        expect(tooltipText()).toBe("Storage and Usage Details");
    });

    it("keeps the tooltip for a registered user with only the default source", async () => {
        const wrapper = await mountMeter({ enable_quotas: true, quota_source_labels: [] }, USER, [
            getFakeQuotaUsageData(null, 1),
        ]);
        await hover(wrapper);

        expect(tooltipText()).toBe("Storage and Usage Details");
    });

    it("keeps the login tooltip for an anonymous user on a server without other sources", async () => {
        const user: AnonymousUser = {
            isAnonymous: true,
            total_disk_usage: 2048,
            nice_total_disk_usage: "2 KB",
            quota_percent: 40,
        };
        const wrapper = await mountMeter({ enable_quotas: true, quota_source_labels: [] }, user, []);
        await hover(wrapper);

        expect(tooltipText()).toBe("Login to Access Storage Details");
    });
});

describe("with the default source row the server always sends", () => {
    it("doesn't warn about other sources when only the default one is over quota", async () => {
        const wrapper = await mountMeter({ enable_quotas: true, quota_source_labels: ["scratch"] }, USER, [
            getFakeQuotaUsageData(null, 1001),
            getFakeQuotaUsageData("scratch", 1),
        ]);

        expect(wrapper.find(SELECTORS.hint).exists()).toBe(false);
    });

    it("doesn't repeat the default quota warning in the history panel", async () => {
        const pinia = createPinia();
        setActivePinia(pinia);
        useQuotaUsageStore().quotaUsages = [getFakeQuotaUsageData(null, 1001)].map(toQuotaUsage);
        const wrapper = shallowMount(HistoryMessages as object, {
            props: {
                history: { ...getFakeHistorySummary(), user_id: USER.id },
                currentUser: { ...USER, quota_percent: 100 },
            },
            global: withPlugins(baseLocalVue, pinia),
        });

        expect(wrapper.find("[data-description='other sources over quota message']").exists()).toBe(false);
    });

    it("shows each row's name, usage and hold message in the popover", async () => {
        const wrapper = await mountMeter({ enable_quotas: true, quota_source_labels: ["scratch"] }, USER, [
            getFakeQuotaUsageData(null, 200),
            { quota_source_label: "scratch", quota_bytes: 1000, total_disk_usage: 1001 },
            { quota_source_label: "free", total_disk_usage: 1024 },
        ]);
        await hover(wrapper.find(SELECTORS.link));

        const rows = Array.from(document.body.querySelectorAll(SELECTORS.row), (row) => ({
            name: row.querySelector(SELECTORS.name)?.textContent,
            text: row.textContent,
            held: row.querySelector(SELECTORS.overQuota)?.textContent?.trim(),
        }));
        expect(rows.map((row) => row.name)).toEqual(["Default storage", "Scratch Storage", "free"]);
        expect(rows.map((row) => row.held)).toEqual([
            undefined,
            "Over quota: jobs writing here are on hold",
            undefined,
        ]);
        expect(rows[1]?.text).toContain("1 KB of 1 KB");
        expect(rows[2]?.text).toContain("(unlimited)");
    });
});

describe("loading the usage per source", () => {
    async function requestsWith(config: object, user: unknown) {
        let requests = 0;
        server.use(
            http.get("/api/configuration", ({ response }) => response(200).json(config as never)),
            http.get("/api/users/{user_id}/usage", ({ response }) => {
                requests++;
                return response(200).json([]);
            }),
        );
        setActivePinia(createPinia());
        const store = useUserStore();
        store.currentUser = user as never;
        store.startWatchingStorageUsage();
        await flushPromises();
        store.$dispose();
        return requests;
    }

    it("skips anonymous users", async () => {
        const user = { isAnonymous: true, total_disk_usage: 0, nice_total_disk_usage: "0", quota_percent: 0 };
        expect(await requestsWith({ enable_quotas: true, quota_source_labels: ["scratch"] }, user)).toBe(0);
    });

    it("skips servers with quotas off", async () => {
        expect(await requestsWith({ enable_quotas: false, quota_source_labels: ["scratch"] }, USER)).toBe(0);
    });
});

describe("names after the storages using the source", () => {
    it("on the Storage Dashboard", async () => {
        useStorageApi([]);
        const pinia = createPinia();
        setActivePinia(pinia);
        const wrapper = mount(QuotaUsageSummary as object, {
            props: { quotaUsages: [toQuotaUsage(SCRATCH_USAGE)] },
            global: withPlugins(baseLocalVue, pinia),
        });
        mounted.push(wrapper);
        await flushPromises();

        expect(wrapper.find(".storage-source-label").text()).toBe("Scratch Storage");
    });

    it("in the history filter's options", async () => {
        useStorageApi([getFakeQuotaUsageData(null, 1), getFakeQuotaUsageData("scratch", 1)]);
        const pinia = createPinia();
        setActivePinia(pinia);
        const wrapper = mount(FilterMenuDropdown as object, {
            props: {
                type: "QuotaSource",
                name: "quota_source",
                identifier: "test",
                filter: { placeholder: "storage source" },
                filters: {},
            },
            global: withPlugins(baseLocalVue, pinia),
        });
        mounted.push(wrapper);
        await flushPromises();

        expect(wrapper.text()).toContain("Scratch Storage");
        expect(wrapper.text()).not.toContain("scratch ");
    });
});
