<script setup>
import { ref, watch, onMounted, onBeforeUnmount, computed } from "vue";
import * as d3 from "d3";

// Define component props
const props = defineProps({
  width: { type: Number, default: 800 },
  height: { type: Number, default: 600 },
  edgeData: { type: Array, default: () => [] },
  nodeData: { type: Array, default: () => [] },
  distanceThreshold: { type: Number, default: 8 },
  background: { type: String, default: "#ffffff" },
  showMetadataPanel: { type: Boolean, default: true },
  nodeSize: { type: Number, default: 5 },
  linkOpacity: { type: Number, default: 0.3 },
});

// Emits for external event handling
const emit = defineEmits([
  "node-click",
  "node-hover",
  "node-select",
  "node-deselect",
]);

// Refs
const svgRef = ref(null);
const selectedNode = ref(null);
const hoveredNode = ref(null);
let simulation = null;
let resizeObserver = null;

// Computed
const colorScale = computed(() => {
  if (!props.nodeData || props.nodeData.length === 0) {
    return d3
      .scaleOrdinal()
      .domain([0, 1, 2])
      .range(["#ef4444", "#3b82f6", "#6b7280"]);
  }

  const scores = props.nodeData
    .map((d) => d.CombinedScore)
    .filter((score) => score != null);
  if (scores.length === 0) {
    return d3
      .scaleOrdinal()
      .domain([0, 1, 2])
      .range(["#ef4444", "#3b82f6", "#6b7280"]);
  }

  const minScore = Math.min(...scores);
  const maxScore = Math.max(...scores);

  return d3.scaleSequential(d3.interpolateRdBu).domain([maxScore, minScore]);
});

const currentNode = computed(() => selectedNode.value || hoveredNode.value);

// Methods
const processNetworkData = () => {
  if (!props.edgeData || props.edgeData.length === 0) {
    return { nodes: [], links: [] };
  }

  const residueSet = new Set();
  const edgeList = [];

  props.edgeData.forEach((edge) => {
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

  const nodes = Array.from(residueSet).map((resId) => {
    const nodeProps =
      props.nodeData?.find((node) => node.Residue == resId) || {};
    return {
      id: resId,
      group: assignGroup(resId, residueSet.size),
      CombinedScore: nodeProps.CombinedScore,
      Degree: nodeProps.Degree,
      Strength: nodeProps.Strength,
      Betweenness: nodeProps.Betweenness,
      pLDDT: nodeProps.pLDDT,
      Resname: nodeProps.Resname,
      Clustering: nodeProps.Clustering,
      Eigenvector: nodeProps.Eigenvector,
      HarmonicCloseness: nodeProps.HarmonicCloseness,
      KCore: nodeProps.KCore,
      Participation: nodeProps.Participation,
      WithinModuleZ: nodeProps.WithinModuleZ,
      Community: nodeProps.Community,
      ...nodeProps,
    };
  });

  return { nodes, links: edgeList };
};

const assignGroup = (resId, totalResidues) => {
  const groupSize = totalResidues / 3;
  if (resId < groupSize) return 0;
  if (resId < groupSize * 2) return 1;
  return 2;
};

const draw = () => {
  const svg = d3.select(svgRef.value);
  if (!svg.node()) return;

  svg.selectAll("*").remove();

  const { nodes, links } = processNetworkData();
  const nodeData = nodes.map((d) => ({ ...d }));
  const linkData = links.map((d) => ({ ...d }));

  // Create simulation
  simulation = d3
    .forceSimulation(nodeData)
    .force(
      "link",
      d3
        .forceLink(linkData)
        .id((d) => d.id)
        .distance((d) => Math.max(20, Math.min(60, d.distance * 3)))
    )
    .force("charge", d3.forceManyBody().strength(-50))
    .force("center", d3.forceCenter(props.width / 2, props.height / 2))
    .force("collision", d3.forceCollide().radius(8));

  // Create links
  const link = svg
    .append("g")
    .attr("class", "links")
    .selectAll("line")
    .data(linkData)
    .join("line")
    .attr("stroke", "#999")
    .attr("stroke-opacity", props.linkOpacity)
    .attr("stroke-width", 1);

  // Create nodes
  const node = svg
    .append("g")
    .attr("class", "nodes")
    .selectAll("circle")
    .data(nodeData)
    .join("circle")
    .attr("r", (d) => {
      const baseSize = props.nodeSize;
      return d.Degree ? baseSize + d.Degree / 20 : baseSize;
    })
    .attr("fill", (d) => {
      return d.CombinedScore != null
        ? colorScale.value(d.CombinedScore)
        : colorScale.value(d.group || 0);
    })
    .attr("stroke", "#fff")
    .attr("stroke-width", 1.5)
    .call(drag(simulation));

  // Tooltips
  node.append("title").text((d) => {
    let tooltip = `Residue ${d.id}`;
    if (d.Resname) tooltip += ` (${d.Resname})`;
    if (d.CombinedScore) tooltip += `\nScore: ${d.CombinedScore.toFixed(2)}`;
    if (d.Degree) tooltip += `\nDegree: ${d.Degree}`;
    return tooltip;
  });

  // Interactions
  node
    .on("mouseenter", function (event, d) {
      hoveredNode.value = d;
      emit("node-hover", d);

      d3.select(this)
        .transition()
        .duration(200)
        .attr("r", +d3.select(this).attr("r") * 1.5)
        .attr("stroke-width", 3);

      link.attr("stroke-opacity", (l) =>
        l.source.id === d.id || l.target.id === d.id ? 0.8 : 0.1
      );
    })
    .on("mouseleave", function (event, d) {
      if (hoveredNode.value?.id === d.id) {
        hoveredNode.value = null;
      }

      d3.select(this)
        .transition()
        .duration(200)
        .attr("r", +d3.select(this).attr("r") / 1.5)
        .attr("stroke-width", 1.5);

      link.attr("stroke-opacity", props.linkOpacity);
    })
    .on("click", function (event, d) {
      event.stopPropagation();
      const wasSelected = selectedNode.value?.id === d.id;
      selectedNode.value = wasSelected ? null : d;

      if (wasSelected) {
        emit("node-deselect", d);
      } else {
        emit("node-click", d);
        emit("node-select", d);
      }
    });

  // Background click to deselect
  svg.on("click", (event) => {
    if (event.target === svg.node()) {
      if (selectedNode.value) {
        emit("node-deselect", selectedNode.value);
      }
      selectedNode.value = null;
    }
  });

  // Animation tick
  simulation.on("tick", () => {
    link
      .attr("x1", (d) => d.source.x)
      .attr("y1", (d) => d.source.y)
      .attr("x2", (d) => d.target.x)
      .attr("y2", (d) => d.target.y);

    node.attr("cx", (d) => d.x).attr("cy", (d) => d.y);
  });
};

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

// Watchers
watch(
  () => [
    props.width,
    props.height,
    props.edgeData,
    props.nodeData,
    props.distanceThreshold,
  ],
  () => {
    if (simulation) simulation.stop();
    draw();
  },
  { deep: true }
);

// Lifecycle
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
  }
});
</script>

<template>
  <div class="protein-network-container">
    <div class="protein-network-graph">
      <svg
        ref="svgRef"
        :width="width"
        :height="height"
        :style="{ background }"
        xmlns="http://www.w3.org/2000/svg"
      />
    </div>

    <div
      v-if="showMetadataPanel && currentNode"
      class="protein-network-metadata"
    >
      <div class="metadata-header">
        <h3>Residue {{ currentNode.id }}</h3>
        <button
          class="metadata-close"
          @click="
            selectedNode = null;
            hoveredNode = null;
          "
        >
          ×
        </button>
      </div>

      <div class="metadata-content">
        <div class="metadata-section">
          <h4>Basic Information</h4>
          <div class="metadata-grid">
            <div class="metadata-item">
              <label>Residue Name:</label>
              <span>{{ currentNode.Resname || "N/A" }}</span>
            </div>
            <div class="metadata-item">
              <label>Combined Score:</label>
              <span
                :class="{
                  'score-high': currentNode.CombinedScore > 8,
                  'score-medium':
                    currentNode.CombinedScore > 5 &&
                    currentNode.CombinedScore <= 8,
                  'score-low': currentNode.CombinedScore <= 5,
                }"
              >
                {{ currentNode.CombinedScore?.toFixed(3) || "N/A" }}
              </span>
            </div>
            <div class="metadata-item">
              <label>pLDDT:</label>
              <span
                :class="{
                  'score-high': currentNode.pLDDT > 90,
                  'score-medium':
                    currentNode.pLDDT > 70 && currentNode.pLDDT <= 90,
                  'score-low': currentNode.pLDDT <= 70,
                }"
              >
                {{ currentNode.pLDDT?.toFixed(1) || "N/A" }}
              </span>
            </div>
          </div>
        </div>

        <div class="metadata-section">
          <h4>Network Properties</h4>
          <div class="metadata-grid">
            <div class="metadata-item">
              <label>Degree:</label>
              <span>{{ currentNode.Degree || "N/A" }}</span>
            </div>
            <div class="metadata-item">
              <label>Strength:</label>
              <span>{{ currentNode.Strength?.toFixed(3) || "N/A" }}</span>
            </div>
            <div class="metadata-item">
              <label>Betweenness:</label>
              <span>{{ currentNode.Betweenness?.toFixed(4) || "N/A" }}</span>
            </div>
            <div class="metadata-item">
              <label>Clustering:</label>
              <span>{{ currentNode.Clustering?.toFixed(3) || "N/A" }}</span>
            </div>
          </div>
        </div>

        <div class="metadata-section">
          <h4>Community & Structure</h4>
          <div class="metadata-grid">
            <div class="metadata-item">
              <label>K-Core:</label>
              <span>{{ currentNode.KCore || "N/A" }}</span>
            </div>
            <div class="metadata-item">
              <label>Participation:</label>
              <span>{{ currentNode.Participation?.toFixed(3) || "N/A" }}</span>
            </div>
            <div class="metadata-item">
              <label>Within Module Z:</label>
              <span>{{ currentNode.WithinModuleZ?.toFixed(3) || "N/A" }}</span>
            </div>
            <div class="metadata-item">
              <label>Community:</label>
              <span>{{ currentNode.Community || "N/A" }}</span>
            </div>
          </div>
        </div>
      </div>
    </div>
  </div>
</template>

<style scoped>
.protein-network-container {
  position: relative;
  display: inline-block;
}

.protein-network-graph {
  display: inline-block;
  line-height: 0;
  border-radius: 8px;
  overflow: hidden;
  box-shadow: 0 1px 2px rgba(0, 0, 0, 0.06), 0 1px 3px rgba(0, 0, 0, 0.1);
}

.protein-network-graph svg {
  display: block;
}

.protein-network-metadata {
  position: absolute;
  top: 10px;
  right: 10px;
  width: 320px;
  max-height: calc(100% - 20px);
  background: white;
  border-radius: 8px;
  box-shadow: 0 4px 6px rgba(0, 0, 0, 0.1);
  border: 1px solid #e5e7eb;
  overflow-y: auto;
  z-index: 10;
}

.metadata-header {
  display: flex;
  justify-content: space-between;
  align-items: center;
  padding: 16px;
  border-bottom: 1px solid #e5e7eb;
  background: #f8fafc;
}

.metadata-header h3 {
  margin: 0;
  font-size: 1.1rem;
  color: #1f2937;
}

.metadata-close {
  background: none;
  border: none;
  font-size: 1.5rem;
  cursor: pointer;
  color: #6b7280;
  padding: 0;
  width: 24px;
  height: 24px;
  display: flex;
  align-items: center;
  justify-content: center;
}

.metadata-close:hover {
  color: #374151;
}

.metadata-content {
  padding: 16px;
}

.metadata-section {
  margin-bottom: 20px;
}

.metadata-section:last-child {
  margin-bottom: 0;
}

.metadata-section h4 {
  margin: 0 0 12px 0;
  font-size: 0.9rem;
  color: #374151;
  font-weight: 600;
  border-bottom: 1px solid #f3f4f6;
  padding-bottom: 6px;
}

.metadata-grid {
  display: flex;
  flex-direction: column;
  gap: 8px;
}

.metadata-item {
  display: flex;
  justify-content: space-between;
  align-items: center;
  padding: 4px 0;
}

.metadata-item label {
  font-size: 0.8rem;
  color: #6b7280;
  font-weight: 500;
}

.metadata-item span {
  font-size: 0.8rem;
  font-weight: 600;
  color: #1f2937;
}

.score-high {
  color: #dc2626 !important;
}

.score-medium {
  color: #ea580c !important;
}

.score-low {
  color: #2563eb !important;
}

.protein-network-metadata::-webkit-scrollbar {
  width: 6px;
}

.protein-network-metadata::-webkit-scrollbar-track {
  background: #f1f5f9;
  border-radius: 3px;
}

.protein-network-metadata::-webkit-scrollbar-thumb {
  background: #cbd5e1;
  border-radius: 3px;
}

.protein-network-metadata::-webkit-scrollbar-thumb:hover {
  background: #94a3b8;
}
</style>