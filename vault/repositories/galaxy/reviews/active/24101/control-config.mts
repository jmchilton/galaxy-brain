import config from "./vitest.config.mts";
export default {...config, plugins: [{name: "review-truncation-control", enforce: "pre", transform(source,id) {
if (!id.endsWith("/src/entry/widgets/HistoryGraph.vue")) return;
return source.replace("graphNodes, graphEdges }", "graphNodes, graphEdges, isTruncated }").replace('<template v-else>', '<template v-else><GAlert v-if="isTruncated" show variant="warning">This graph is truncated.</GAlert>');
}}, ...config.plugins]};
