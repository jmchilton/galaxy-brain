import { createTestingPinia } from "@pinia/testing";
import { getLocalVue } from "@tests/vitest/helpers";
import { mount } from "@vue/test-utils";
import { describe, expect, it, vi } from "vitest";
import { useAdminExtensionsStore } from "@/stores/adminExtensionsStore";
import AdminPanel from "./AdminPanel.vue";
import CenterFrame from "@/entry/analysis/modules/CenterFrame.vue";
vi.mock("@/composables/config", () => ({useConfig: () => ({config: {value:{}}, isConfigLoaded: {value:true}})}));
vi.mock("@/onload/loadConfig", async (original) => ({...await original(), getAppRoot: () => "/galaxy/"}));
vi.mock("vue-router", async (original) => ({...await original(), useRoute: () => ({path:"/admin"})}));
describe("admin extension root-relative contract", () => {
 it.each([['static/welcome.html','/galaxy/static/welcome.html'],['/static/welcome.html','/galaxy/static/welcome.html'],['https://example.org/monitor','https://example.org/monitor']])('resolves %s for both targets', (url, expected) => {
  const pinia=createTestingPinia({stubActions:true,createSpy:vi.fn});
  const store=useAdminExtensionsStore(pinia);
  store.extensions=[{id:'example',section:'Example',items:[{id:'page',type:'link',title:'Page',url,target:'new_tab'}]}];
  store.loaded=true;
  const panel=mount(AdminPanel,{global:getLocalVue(true),pinia,stubs:{routerLink:true,ActivityPanel:{template:'<div><slot name="header" /><slot /></div>'}}});
  expect.soft(panel.find('a#admin-link-ext-example-page').attributes('href')).toBe(expected);
  const frame=mount(CenterFrame,{global:getLocalVue(true),props:{src:url}});
  expect(frame.find('iframe').attributes('src')).toBe(expected);
 });
});
