# Infographic Template Guide

## Quick Commands (Aliases)

For convenience, the following shortcut commands are supported:

| Command | Template | Use Case |
| :--- | :--- | :--- |
| `/layers` | hierarchy-structure | Layered architecture diagrams |
| `/vs` | compare-binary-horizontal-underline-text-vs | A vs B side-by-side comparison |
| `/swot` | compare-swot | SWOT analysis |
| `/tree` | hierarchy-tree-tech-style-badge-card | Organization/tech tree |
| `/mindmap` | hierarchy-mindmap | Mind map |
| `/snake` | sequence-color-snake-steps-horizontal-icon-line | Long process/timeline |
| `/stairs` | sequence-ascending-stairs-3d-underline-text | Progression/growth path |
| `/mountain` | sequence-mountain-underline-text | Goal achievement |
| `/roadmap` | sequence-roadmap-vertical-simple | Roadmap |
| `/pyramid` | sequence-pyramid-simple | Pyramid hierarchy |
| `/quadrant` | quadrant-quarter-simple-card | Four quadrant analysis |

## Prompt Examples

### 1. Layered Architecture (NEW!)
```
/layers Microservices Architecture:
- Gateway Layer: API Gateway, Load Balancer
- Service Layer: User Service, Order Service, Payment Service
- Data Layer: MySQL, Redis, MongoDB
```

### 2. Side-by-side Comparison
```
/vs React vs Vue:
React: Virtual DOM, High flexibility
Vue: Two-way binding, Easy to learn
```

### 3. SWOT Analysis
```
/swot Tesla Analysis:
Strengths: Brand, Technology
Weaknesses: Production capacity
Opportunities: Policy, Energy storage
Threats: Competition
```

### 4. Tech Tree
```
/tree Deep Learning System:
- Neural Networks
  - CNN
  - RNN
- Generative Models
  - GAN
  - Diffusion
```

### 5. Snake Timeline
```
/snake Product Release Plan:
1. Requirements Analysis (Q1) icon: search
2. Design & Development (Q2) icon: edit
3. Testing & Launch (Q3) icon: rocket
```

### 6. Growth Stairs
```
/stairs Developer Progression: Junior -> Mid-level -> Senior -> Expert
```

## Complete Template List

### 1. Hierarchy (NEW: hierarchy-structure)
- `hierarchy-structure` (🏗️ /layers) - **Layered architecture diagrams**
- `hierarchy-tree-tech-style-badge-card` (🌳 /tree)
- `hierarchy-tree-curved-line-rounded-rect-node` (🌿)
- `hierarchy-mindmap` (🧠 /mindmap)

### 2. Sequence
- `sequence-color-snake-steps-horizontal-icon-line` (🐍 /snake)
- `sequence-ascending-stairs-3d-underline-text` (📊 /stairs)
- `sequence-mountain-underline-text` (🏔️ /mountain)
- `sequence-roadmap-vertical-simple` (🛣️ /roadmap)
- `sequence-pyramid-simple` (⚠️ /pyramid)
- `sequence-cylinders-3d-simple` (🛢️ /cylinders)

### 3. Comparison
- `compare-binary-horizontal-underline-text-vs` (🆚 /vs)
- `compare-swot` (📋 /swot)
- `compare-hierarchy-row-letter-card-compact-card` (↔️ /compare)

### 4. Quadrant
- `quadrant-quarter-simple-card` (💠 /quadrant)

### 5. List
- `list-column-simple-vertical-arrow` (📋 default)
- `list-row-simple-horizontal-arrow` (➡️)
- `list-grid-badge-card` (📦)

## hierarchy-structure DSL Format

The `hierarchy-structure` template is designed for **layered architecture diagrams** where each layer contains multiple components.

### Correct DSL Format:
```
infographic hierarchy-structure
data
  title System Architecture
  desc Description of the architecture
  items
    - label Layer 1 Name
      children
        - label Component A
        - label Component B
    - label Layer 2 Name
      children
        - label Module 1
          children
            - label Sub-component 1
            - label Sub-component 2
        - label Module 2
    - label Layer 3 Name
      children
        - label Service 1
        - label Service 2
```

### Example - Three-tier Architecture:
```
infographic hierarchy-structure
data
  title Microservices Architecture
  desc Three-tier architecture with gateway, services, and data layer
  items
    - label Gateway Layer
      children
        - label API Gateway
        - label Load Balancer
    - label Service Layer
      children
        - label User Service
        - label Order Service
        - label Payment Service
    - label Data Layer
      children
        - label MySQL
        - label Redis
        - label MongoDB
```

## Usage Methods

### Method 1: Command Mode (Recommended)
Use `/command` or `/full-template-name` at the beginning of your prompt.

### Method 2: UI Selector
1. Check "Use Infographic Engine"
2. Select template from the "Template Type" dropdown
3. Enter description content
4. Click "Generate Diagram"

---
*Author: Damon Li*  
*Last Updated: January 9, 2026*
