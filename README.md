# 🧬 Vue Protein Network Visualizer

A **Vue 3 component** for building **interactive protein residue network visualizations** powered by **D3.js**.  
This library helps you render and explore protein residue interaction networks through a responsive, dynamic, and customizable visualization.

---

## ✨ Features

- ⚡ Built with **Vue 3 (Composition API)** and **D3.js**
- 🔍 Interactive graph with zoom, drag, and hover tooltips
- 🎨 Customizable layout, colors, and node sizes
- 🧩 Lightweight and easy to integrate into any Vue app
- 🧠 Perfect for bioinformatics and scientific visualization projects

---

## 📦 Installation

Install via npm:

```bash
npm install vue-protein-network-visualizer
```

---

## 🚀 Quick Start

Here’s how to use the component inside your Vue 3 project:

```vue
<script setup>
import { ref, onMounted } from "vue";
import ProteinNetwork from "vue-protein-network-visualizer";

const nodes = ref([]);
const edges = ref([]);
const loading = ref(true);

async function loadData() {
  const [n, e] = await Promise.all([
    fetch("/data/nodes.json").then((r) => r.json()),
    fetch("/data/edges.json").then((r) => r.json()),
  ]);
  nodes.value = n;
  edges.value = e;
  loading.value = false;
}

onMounted(loadData);
</script>

<template>
  <div class="p-4">
    <ProteinNetwork v-if="!loading" :nodes="nodes" :edges="edges" />
    <p v-else>Loading data...</p>
  </div>
</template>
```

---

## ⚙️ Props

| Prop          | Type     | Required | Default                             | Description                                         |
| ------------- | -------- | -------- | ----------------------------------- | --------------------------------------------------- |
| `nodes`       | `Array`  | ✅ Yes   | `[]`                                | Array of node objects (protein residues).           |
| `edges`       | `Array`  | ✅ Yes   | `[]`                                | Array of edge objects defining residue connections. |
| `width`       | `Number` | ❌ No    | `600`                               | Width of the SVG canvas.                            |
| `height`      | `Number` | ❌ No    | `600`                               | Height of the SVG canvas.                           |
| `colorScheme` | `Array`  | ❌ No    | `['#1f77b4', '#ff7f0e', '#2ca02c']` | Custom color palette for nodes or edges.            |
| `charge`      | `Number` | ❌ No    | `-300`                              | Force charge between nodes (controls spacing).      |

---

## 🧠 Data Format

### Example `nodes.json`

```json
[
  { "id": 1, "name": "ALA", "group": "hydrophobic" },
  { "id": 2, "name": "GLY", "group": "polar" },
  { "id": 3, "name": "SER", "group": "polar" }
]
```

### Example `edges.json`

```json
[
  { "source": 1, "target": 2 },
  { "source": 2, "target": 3 }
]
```

---

## 🧪 Live Demo / Example App

You can explore and interact with a live example here:  
👉 **[View Sample App ](https://vue-3-protein-visualizer-sample.netlify.app/)**

This sample app demonstrates:

- How to load JSON data dynamically
- Customize visual parameters
- Interact with the network (zoom, drag, and highlight)

---

## 🧰 Development Setup

If you want to work on the library locally or modify it:

```bash
# Clone the repository
git clone https://github.com/yusufshehu/protein-d3-representation.git

# Navigate into the package directory
cd vue-protein-network-visualizer

# Install dependencies
npm install

# Build the library
npm run build
```

To test the component locally with a sample app:

```bash
# In the library directory
npm run build

# In your sample Vue app directory
npm install ../vue-protein-network-visualizer
npm run dev
```

---

## 📦 Publishing to npm

When ready to publish your library publicly:

1. Make sure you’re logged in to npm:

   ```bash
   npm login
   ```

2. Update your version in `package.json`:

   ```bash
   npm version patch
   ```

3. Publish:
   ```bash
   npm publish --access public
   ```

---

## 📄 License

**MIT License** © 2025 [Yusuf Shehu](https://github.com/yusufshehu)

You are free to use, modify, and distribute this project as long as proper attribution is given.

---

## 💡 Built With

- [Vue 3](https://vuejs.org/)
- [D3.js](https://d3js.org/)
- [Vite](https://vite.dev/)
- [vite-plugin-dts](https://github.com/qmhc/vite-plugin-dts)

---

## 👨🏽‍💻 Author

**Yusuf Shehu**  
Full-Stack Developer • Vue.js | Laravel | D3.js

🌐 [GitHub](https://github.com/yusufshehu)  
💼 [LinkedIn](https://linkedin.com/in/yusufshehu)  
🐦 [Portfolio](https://yusufshehu.com)

---

> _“Bridging science and software — one protein at a time.”_
