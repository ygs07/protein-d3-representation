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
import residue_data from "../data/residue_data.json";

// Transform the protein_data to match the expected edge format
const edgeData = protein_data.map((edge) => ({
  res1: edge.res1,
  res2: edge.res2,
  distance: edge.distance,
}));

// Transform the residue_data to match the expected node format
const nodeData = residue_data.map((node) => ({
  Residue: node.Residue,
  CombinedScore: node.CombinedScore,
  Degree: node.Degree,
  Strength: node.Strength,
  Betweenness: node.Betweenness,
  pLDDT: node.pLDDT,
  Resname: node.Resname,
  // Include any other properties you want to use
  ...node,
}));
</script>

<template>
  <div style="display: flex; flex-direction: column; gap: 24px; padding: 20px">
    <div>
      <h3>Protein Residue Network (CombinedScore Coloring)</h3>
      <NetworkGraph
        :width="800"
        :height="600"
        :edge-data="edgeData"
        :node-data="nodeData"
        :distance-threshold="8"
        background="#ffffff"
      />
    </div>
  </div>
</template>

<style>
body {
  margin: 0;
  padding: 0;
  font-family: -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif;
  background: #f1f5f9;
}

h3 {
  margin: 0 0 12px 0;
  color: #1e293b;
  font-weight: 600;
}
</style>