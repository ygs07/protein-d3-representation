<script setup>
import { ref, watch, onMounted, onBeforeUnmount, computed } from "vue";
import * as d3 from "d3";

const props = defineProps({
  width: { type: Number, default: 600 },
  height: { type: Number, default: 600 },
  edgeData: { type: Array, default: () => [] },
  nodeData: { type: Array, default: () => [] },
  distanceThreshold: { type: Number, default: 8 }, // Max distance for links (in Angstroms)
  background: { type: String, default: "#ffffff" },
});

const svgRef = ref(null);
const selectedNode = ref(null);
const hoveredNode = ref(null);
let simulation;
let resizeObserver;

// TODO add events emitter

// Compute color scale based on CombinedScore range
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
  const minScore = Math.min(...scores);
  const maxScore = Math.max(...scores);

  return d3.scaleSequential(d3.interpolateRdBu).domain([maxScore, minScore]); // Reverse so red = high, blue = low
});

// Current node for metadata display
const currentNode = computed(() => selectedNode.value || hoveredNode.value);

const processNetworkData = () => {
  // If no edge data, generate sample
  if (!props.edgeData || props.edgeData.length === 0) {
    return generateSampleData();
  }

  // Extract unique residues from edge data
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

  // Create nodes by combining edge data with node properties
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
      // Add any other properties you want from the node data
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

const generateSampleData = () => {
  const sampleNodes = [];
  const sampleLinks = [];
  const numNodes = 150;
  const numClusters = 3;

  for (let i = 0; i < numNodes; i++) {
    sampleNodes.push({
      id: i,
      group: Math.floor(Math.random() * numClusters),
      CombinedScore: Math.random() * 8 + 2, // Random score between 2-10
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

  const { nodes, links } = processNetworkData();

  const nodeData = nodes.map((d) => ({ ...d }));
  const linkData = links.map((d) => ({ ...d }));

  // Create force simulation
  simulation = d3
    .forceSimulation(nodeData)
    .force(
      "link",
      d3
        .forceLink(linkData)
        .id((d) => d.id)
        .distance((d) => Math.max(20, Math.min(60, d.distance * 3))) // Scale distance for visualization
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

  // Create node elements
  const node = svg
    .append("g")
    .attr("class", "nodes")
    .selectAll("circle")
    .data(nodeData)
    .join("circle")
    .attr("r", (d) => {
      const baseSize = 5;
      if (d.Degree) {
        return baseSize + d.Degree / 20;
      }
      return baseSize + Math.random() * 2;
    })
    .attr("fill", (d) => {
      if (d.CombinedScore != null) {
        return colorScale.value(d.CombinedScore);
      }
      return colorScale.value(d.group || 0);
    })
    .attr("stroke", "#fff")
    .attr("stroke-width", 1.5)
    .call(drag(simulation));

  node.append("title").text((d) => {
    let tooltip = `Residue ${d.id}`;
    if (d.Resname) tooltip += ` (${d.Resname})`;
    if (d.CombinedScore) tooltip += `\nScore: ${d.CombinedScore.toFixed(2)}`;
    if (d.Degree) tooltip += `\nDegree: ${d.Degree}`;
    if (d.pLDDT) tooltip += `\npLDDT: ${d.pLDDT}`;
    return tooltip;
  });

  // Add hover effects
  node
    .on("mouseenter", function (event, d) {
      hoveredNode.value = d;

      d3.select(this)
        .transition()
        .duration(200)
        .attr("r", function () {
          return +d3.select(this).attr("r") * 1.5;
        })
        .attr("stroke-width", 3);

      // Highlight connected links
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
        .attr("r", function () {
          return +d3.select(this).attr("r") / 1.5;
        })
        .attr("stroke-width", 1.5);

      // Reset link opacity
      link.attr("stroke-opacity", 0.3);
    })
    .on("click", function (event, d) {
      event.stopPropagation();
      selectedNode.value = selectedNode.value?.id === d.id ? null : d;
    });

  // Click on background to deselect
  svg.on("click", (event) => {
    if (event.target === svg.node()) {
      selectedNode.value = null;
    }
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
  <div class="network-container">
    <div
      class="graph-wrap"
      role="img"
      aria-label="Protein residue network visualization"
    >
      <svg
        ref="svgRef"
        :width="width"
        :height="height"
        :style="{ background }"
        xmlns="http://www.w3.org/2000/svg"
      />
    </div>

    <!-- Metadata Panel -->
    <div v-if="currentNode" class="metadata-panel">
      <div class="panel-header">
        <h3>Residue {{ currentNode.id }}</h3>
        <button
          class="close-btn"
          @click="
            selectedNode = null;
            hoveredNode = null;
          "
        >
          ×
        </button>
      </div>

      <div class="panel-content">
        <!-- Basic Info -->
        <div class="info-section">
          <h4>Basic Information</h4>
          <div class="info-grid">
            <div class="info-item">
              <label>Residue Name:</label>
              <span>{{ currentNode.Resname || "N/A" }}</span>
            </div>
            <div class="info-item">
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
            <div class="info-item">
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

        <!-- Network Properties -->
        <div class="info-section">
          <h4>Network Properties</h4>
          <div class="info-grid">
            <div class="info-item">
              <label>Degree:</label>
              <span>{{ currentNode.Degree || "N/A" }}</span>
            </div>
            <div class="info-item">
              <label>Strength:</label>
              <span>{{ currentNode.Strength?.toFixed(3) || "N/A" }}</span>
            </div>
            <div class="info-item">
              <label>Betweenness:</label>
              <span>{{ currentNode.Betweenness?.toFixed(4) || "N/A" }}</span>
            </div>
            <div class="info-item">
              <label>Clustering:</label>
              <span>{{ currentNode.Clustering?.toFixed(3) || "N/A" }}</span>
            </div>
            <div class="info-item">
              <label>Eigenvector:</label>
              <span>{{ currentNode.Eigenvector?.toFixed(4) || "N/A" }}</span>
            </div>
            <div class="info-item">
              <label>Harmonic Closeness:</label>
              <span>{{
                currentNode.HarmonicCloseness?.toFixed(3) || "N/A"
              }}</span>
            </div>
          </div>
        </div>

        <!-- Community & Structure -->
        <div class="info-section">
          <h4>Community & Structure</h4>
          <div class="info-grid">
            <div class="info-item">
              <label>K-Core:</label>
              <span>{{ currentNode.KCore || "N/A" }}</span>
            </div>
            <div class="info-item">
              <label>Participation:</label>
              <span>{{ currentNode.Participation?.toFixed(3) || "N/A" }}</span>
            </div>
            <div class="info-item">
              <label>Within Module Z:</label>
              <span>{{ currentNode.WithinModuleZ?.toFixed(3) || "N/A" }}</span>
            </div>
            <div class="info-item">
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
.network-container {
  position: relative;
  display: inline-block;
}

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

/* Metadata Panel */
.metadata-panel {
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

.panel-header {
  display: flex;
  justify-content: space-between;
  align-items: center;
  padding: 16px;
  border-bottom: 1px solid #e5e7eb;
  background: #f8fafc;
}

.panel-header h3 {
  margin: 0;
  font-size: 1.1rem;
  color: #1f2937;
}

.close-btn {
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

.close-btn:hover {
  color: #374151;
}

.panel-content {
  padding: 16px;
}

.info-section {
  margin-bottom: 20px;
}

.info-section:last-child {
  margin-bottom: 0;
}

.info-section h4 {
  margin: 0 0 12px 0;
  font-size: 0.9rem;
  color: #374151;
  font-weight: 600;
  border-bottom: 1px solid #f3f4f6;
  padding-bottom: 6px;
}

.info-grid {
  display: flex;
  flex-direction: column;
  gap: 8px;
}

.info-item {
  display: flex;
  justify-content: space-between;
  align-items: center;
  padding: 4px 0;
}

.info-item label {
  font-size: 0.8rem;
  color: #6b7280;
  font-weight: 500;
}

.info-item span {
  font-size: 0.8rem;
  font-weight: 600;
  color: #1f2937;
}

/* Score coloring */
.score-high {
  color: #dc2626 !important; /* red */
}

.score-medium {
  color: #ea580c !important; /* orange */
}

.score-low {
  color: #2563eb !important; /* blue */
}

/* Scrollbar styling */
.metadata-panel::-webkit-scrollbar {
  width: 6px;
}

.metadata-panel::-webkit-scrollbar-track {
  background: #f1f5f9;
  border-radius: 3px;
}

.metadata-panel::-webkit-scrollbar-thumb {
  background: #cbd5e1;
  border-radius: 3px;
}

.metadata-panel::-webkit-scrollbar-thumb:hover {
  background: #94a3b8;
}
</style>