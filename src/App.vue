<script setup>
import NetworkGraph from "./components/NetworkGraph.vue";

const demoPoints = [
  { x: 50, y: 40, r: 6, fill: "#ef4444" },
  { x: 120, y: 120, r: 8, fill: "#22c55e" },
  { x: 200, y: 80, r: 5, fill: "#3b82f6" },
  { x: 340, y: 220, r: 10, fill: "#f59e0b" },
];

// Sample nodes - representing people, entities, or data points
const nodes = [
  { id: 0, group: 0 },
  { id: 1, group: 0 },
  { id: 2, group: 0 },
  { id: 3, group: 0 },
  { id: 4, group: 0 },
  { id: 5, group: 1 },
  { id: 6, group: 1 },
  { id: 7, group: 1 },
  { id: 8, group: 1 },
  { id: 9, group: 1 },
  { id: 10, group: 2 },
  { id: 11, group: 2 },
  { id: 12, group: 2 },
  { id: 13, group: 2 },
  { id: 14, group: 2 },
  { id: 15, group: 0 },
  { id: 16, group: 1 },
  { id: 17, group: 2 },
  { id: 18, group: 0 },
  { id: 19, group: 1 },
];

// Sample links - connections between nodes
const links = [
  // Group 0 connections (red cluster)
  { source: 0, target: 1 },
  { source: 0, target: 2 },
  { source: 1, target: 3 },
  { source: 2, target: 3 },
  { source: 3, target: 4 },
  { source: 4, target: 15 },
  { source: 15, target: 18 },
  { source: 0, target: 18 },

  // Group 1 connections (blue cluster)
  { source: 5, target: 6 },
  { source: 6, target: 7 },
  { source: 7, target: 8 },
  { source: 8, target: 9 },
  { source: 5, target: 9 },
  { source: 16, target: 5 },
  { source: 16, target: 19 },
  { source: 9, target: 19 },

  // Group 2 connections (gray cluster)
  { source: 10, target: 11 },
  { source: 11, target: 12 },
  { source: 12, target: 13 },
  { source: 13, target: 14 },
  { source: 10, target: 14 },
  { source: 17, target: 10 },
  { source: 17, target: 14 },

  // Inter-group connections (bridges between clusters)
  { source: 4, target: 5 },
  { source: 9, target: 10 },
  { source: 14, target: 15 },
  { source: 2, target: 7 },
  { source: 8, target: 13 },
];

import protein_data from "../data/protein_data.json";
</script>

<template>
  <NetworkGraph
    :width="600"
    :height="600"
    :nodes="nodes"
    :links="links"
    :json-data="protein_data"
  />

  <div style="margin-top: 24px">
    <!--    <NetworkGraph ref="graph" />-->
    <!--    <Graph :width="420" :height="260" :points="demoPoints" background="#fafafa" />-->
  </div>
</template>


