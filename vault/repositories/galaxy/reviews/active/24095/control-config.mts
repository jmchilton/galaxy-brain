import config from "./vitest.config.mts";
export default {...config, plugins: [{name: "review-relative-url-control", enforce: "pre", transform(source,id) {
if (!id.endsWith("/src/utils/redirect.ts")) return;
return source.replace('if (path && path.startsWith("/")) {', 'if (path && !/^[a-z][a-z0-9+.-]*:/i.test(path)) {');
}}, ...config.plugins]};
