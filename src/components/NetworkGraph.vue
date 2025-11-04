<script setup>
import { ref, watch, onMounted, onBeforeUnmount, computed } from "vue";
import * as d3 from "d3";

const props = defineProps({
  width: { type: Number, default: 600 },
  height: { type: Number, default: 600 },
  jsonData: { type: Array, default: () => [] }, // Array of {res1, res2, distance}
  distanceThreshold: { type: Number, default: 8 }, // Max distance for links (in Angstroms)
  background: { type: String, default: "#ffffff" },
});

const svgRef = ref(null);
let simulation;
let resizeObserver;

const processJsonData = (data) => {
  if (!data || data.length === 0) {
    return generateSampleData();
  }

  // Extract unique residues (nodes)
  const residueSet = new Set();
  const edgeList = [];

  data.forEach((edge) => {
    if (edge.distance <= props.distanceThreshold) {
      residueSet.add(edge.res1);
      residueSet.add(edge.res2);
      edgeList.push({
        source: edge.res1,
        target: edge.res2,
        distance: edge.distance,
      });
    }
  });

  // Create nodes from unique residues
  const nodes = Array.from(residueSet).map((res) => ({
    id: res,
    group: assignGroup(res, residueSet.size),
  }));

  return { nodes, links: edgeList };
};

const assignGroup = (resId, totalResidues) => {
  const groupSize = totalResidues / 3;
  if (resId < groupSize) return 0;
  if (resId < groupSize * 2) return 1;
  return 2;
};

const generateSampleData = () => {
  const sampleNodes = [];
  const sampleLinks = [];
  const numNodes = 150;
  const numClusters = 3;

  for (let i = 0; i < numNodes; i++) {
    sampleNodes.push({
      id: i,
      group: Math.floor(Math.random() * numClusters),
    });
  }

  for (let i = 0; i < numNodes; i++) {
    const numLinks = Math.floor(Math.random() * 5) + 2;
    for (let j = 0; j < numLinks; j++) {
      const target = Math.floor(Math.random() * numNodes);
      if (target !== i) {
        sampleLinks.push({ source: i, target });
      }
    }
  }

  return { nodes: sampleNodes, links: sampleLinks };
};

const draw = () => {
  const svg = d3.select(svgRef.value);
  if (!svg.node()) return;

  // Clear existing content
  svg.selectAll("*").remove();

  const { nodes, links } = processJsonData(props.jsonData);

  const nodeData = nodes.map((d) => ({ ...d }));
  const linkData = links.map((d) => ({ ...d }));

  const colorScale = d3
    .scaleOrdinal()
    .domain([0, 1, 2])
    .range(["#ef4444", "#3b82f6", "#6b7280"]); // red, blue, gray

  // Create force simulation
  simulation = d3
    .forceSimulation(nodeData)
    .force(
      "link",
      d3
        .forceLink(linkData)
        .id((d) => d.id)
        .distance(30)
    )
    .force("charge", d3.forceManyBody().strength(-50))
    .force("center", d3.forceCenter(props.width / 2, props.height / 2))
    .force("collision", d3.forceCollide().radius(8));

  // Create link elements
  const link = svg
    .append("g")
    .attr("class", "links")
    .selectAll("line")
    .data(linkData)
    .join("line")
    .attr("stroke", "#999")
    .attr("stroke-opacity", 0.3)
    .attr("stroke-width", 1);

  const node = svg
    .append("g")
    .attr("class", "nodes")
    .selectAll("circle")
    .data(nodeData)
    .join("circle")
    .attr("r", (d) => {
      const baseSize = 5;
      return baseSize + Math.random() * 2;
    })
    .attr("fill", (d) => colorScale(d.group || 0))
    .attr("stroke", "#fff")
    .attr("stroke-width", 1.5)
    .call(drag(simulation));

  // Add tooltips showing residue ID
  node.append("title").text((d) => `Residue ${d.id}`);

  // Add hover effects
  node
    .on("mouseenter", function () {
      d3.select(this)
        .transition()
        .duration(200)
        .attr("r", function () {
          return +d3.select(this).attr("r") * 1.5;
        });
    })
    .on("mouseleave", function () {
      d3.select(this)
        .transition()
        .duration(200)
        .attr("r", function () {
          return +d3.select(this).attr("r") / 1.5;
        });
    });

  // Update positions on each tick
  simulation.on("tick", () => {
    link
      .attr("x1", (d) => d.source.x)
      .attr("y1", (d) => d.source.y)
      .attr("x2", (d) => d.target.x)
      .attr("y2", (d) => d.target.y);

    node.attr("cx", (d) => d.x).attr("cy", (d) => d.y);
  });
};

// Drag behavior
const drag = (simulation) => {
  function dragstarted(event) {
    if (!event.active) simulation.alphaTarget(0.3).restart();
    event.subject.fx = event.subject.x;
    event.subject.fy = event.subject.y;
  }

  function dragged(event) {
    event.subject.fx = event.x;
    event.subject.fy = event.y;
  }

  function dragended(event) {
    if (!event.active) simulation.alphaTarget(0);
    event.subject.fx = null;
    event.subject.fy = null;
  }

  return d3
    .drag()
    .on("start", dragstarted)
    .on("drag", dragged)
    .on("end", dragended);
};

watch(
  () => [props.width, props.height, props.jsonData, props.distanceThreshold],
  () => {
    if (simulation) simulation.stop();
    draw();
  },
  { deep: true }
);

onMounted(() => {
  draw();

  if (window && "ResizeObserver" in window) {
    resizeObserver = new ResizeObserver(() => {
      if (simulation) simulation.stop();
      draw();
    });
    if (svgRef.value?.parentElement) {
      resizeObserver.observe(svgRef.value.parentElement);
    }
  }
});

onBeforeUnmount(() => {
  if (simulation) simulation.stop();
  if (resizeObserver && svgRef.value?.parentElement) {
    resizeObserver.unobserve(svgRef.value.parentElement);
    resizeObserver = undefined;
  }
});
</script>

<template>
  <div class="graph-wrap" role="img" aria-label="Network graph visualization">
    <svg
      ref="svgRef"
      :width="width"
      :height="height"
      :style="{ background }"
      xmlns="http://www.w3.org/2000/svg"
    />
  </div>
</template>

<style scoped>
.graph-wrap {
  display: inline-block;
  line-height: 0;
  border-radius: 8px;
  overflow: hidden;
  box-shadow: 0 1px 2px rgba(0, 0, 0, 0.06), 0 1px 3px rgba(0, 0, 0, 0.1);
}

.graph-wrap svg {
  display: block;
}
</style>