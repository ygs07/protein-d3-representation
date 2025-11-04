<script setup>
import { ref, watch, onMounted, onBeforeUnmount } from 'vue'

// Props: width/height and an array of points [{ x, y, r, fill }]
const props = defineProps({
  width: { type: Number, default: 400 },
  height: { type: Number, default: 300 },
  points: { type: Array, default: () => [] },
  padding: { type: Number, default: 16 },
  background: { type: String, default: '#ffffff' },
  border: { type: String, default: '#e5e7eb' }
})

const svgRef = ref(null)
let resizeObserver

const draw = () => {
  const svg = svgRef.value
  if (!svg) return

  // Clear existing content
  while (svg.firstChild) svg.removeChild(svg.firstChild)

  // Background
  const bg = document.createElementNS('http://www.w3.org/2000/svg', 'rect')
  bg.setAttribute('x', '0')
  bg.setAttribute('y', '0')
  bg.setAttribute('width', String(props.width))
  bg.setAttribute('height', String(props.height))
  bg.setAttribute('fill', props.background)
  bg.setAttribute('stroke', props.border)
  svg.appendChild(bg)

  // Plot points as circles
  props.points.forEach((p) => {
    const c = document.createElementNS('http://www.w3.org/2000/svg', 'circle')
    const x = Math.max(props.padding, Math.min((p.x ?? 0), props.width - props.padding))
    const y = Math.max(props.padding, Math.min((p.y ?? 0), props.height - props.padding))
    const r = Math.max(1, p.r ?? 4)
    c.setAttribute('cx', String(x))
    c.setAttribute('cy', String(y))
    c.setAttribute('r', String(r))
    c.setAttribute('fill', p.fill || '#3b82f6')
    c.setAttribute('fill-opacity', p.opacity != null ? String(p.opacity) : '0.8')
    svg.appendChild(c)
  })
}

watch(() => [props.width, props.height, props.points], draw, { deep: true })

onMounted(() => {
  draw()
  // Redraw on container resize (helps when used in flex/grid)
  if (window && 'ResizeObserver' in window) {
    resizeObserver = new ResizeObserver(() => draw())
    if (svgRef.value?.parentElement) resizeObserver.observe(svgRef.value.parentElement)
  }
})

onBeforeUnmount(() => {
  if (resizeObserver && svgRef.value?.parentElement) {
    resizeObserver.unobserve(svgRef.value.parentElement)
    resizeObserver = undefined
  }
})
</script>

<template>
  <div class="graph-wrap" role="img" aria-label="Graph visualization">
    <svg
      ref="svgRef"
      :width="width"
      :height="height"
      xmlns="http://www.w3.org/2000/svg"
      shape-rendering="geometricPrecision"
    />
  </div>
</template>

<style scoped>
.graph-wrap {
  display: inline-block;
  line-height: 0; /* remove whitespace around inline-block SVG */
  border-radius: 8px;
  overflow: hidden;
  box-shadow: 0 1px 2px rgba(0,0,0,0.06), 0 1px 3px rgba(0,0,0,0.1);
}
</style>
