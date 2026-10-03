"use strict";
var __defProp = Object.defineProperty;
var __getOwnPropDesc = Object.getOwnPropertyDescriptor;
var __getOwnPropNames = Object.getOwnPropertyNames;
var __hasOwnProp = Object.prototype.hasOwnProperty;
var __export = (target, all) => {
  for (var name in all)
    __defProp(target, name, { get: all[name], enumerable: true });
};
var __copyProps = (to, from, except, desc) => {
  if (from && typeof from === "object" || typeof from === "function") {
    for (let key of __getOwnPropNames(from))
      if (!__hasOwnProp.call(to, key) && key !== except)
        __defProp(to, key, { get: () => from[key], enumerable: !(desc = __getOwnPropDesc(from, key)) || desc.enumerable });
  }
  return to;
};
var __toCommonJS = (mod) => __copyProps(__defProp({}, "__esModule", { value: true }), mod);

// src/main.ts
var main_exports = {};
__export(main_exports, {
  default: () => GalaxyBrainPlugin
});
module.exports = __toCommonJS(main_exports);
var import_obsidian = require("obsidian");
var GalaxyBrainPlugin = class extends import_obsidian.Plugin {
  async onload() {
    this.registerEvent(
      this.app.workspace.on("file-menu", (menu, file) => {
        if (!(file instanceof import_obsidian.TFile)) return;
        menu.addItem(
          (item) => item.setTitle("Copy contents").setIcon("copy").onClick(() => this.copyContents(file))
        );
      })
    );
    this.addCommand({
      id: "copy-contents",
      name: "Copy contents of current file",
      checkCallback: (checking) => {
        const file = this.app.workspace.getActiveFile();
        if (!file) return false;
        if (!checking) void this.copyContents(file);
        return true;
      }
    });
  }
  async copyContents(file) {
    try {
      await navigator.clipboard.writeText(await this.app.vault.read(file));
      new import_obsidian.Notice(`Copied ${file.name}`);
    } catch (error) {
      new import_obsidian.Notice(`Could not copy ${file.name}: ${error}`);
    }
  }
};
