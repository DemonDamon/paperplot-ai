/**
 * Layout Service - 使用 ELK.js 实现专业的图布局算法
 * 
 * ELK (Eclipse Layout Kernel) 提供了多种布局算法，特别适合：
 * - 分层图（流程图、架构图）
 * - 正交边路由（避免边穿过节点）
 */

import ELK, { ElkNode } from 'elkjs/lib/elk.bundled.js';
import { DiagramElement, ToolType, LineType, LineStyle } from '../types';

// 颜色配置类型
export type ColorConfig = Record<string, { fill: string; stroke: string }>;

// 布局常量
const NODE_WIDTH = 200;
const NODE_HEIGHT = 100;
const GAP_X = 100;  // 水平间距（增大）
const GAP_Y = 80;   // 垂直间距（增大）
const PADDING = 80; // 画布边距

// 边与节点的间距配置（关键！防止连线贴边）
const EDGE_NODE_SPACING = 40;      // 边与节点的最小间距
const EDGE_EDGE_SPACING = 20;      // 边与边之间的间距

// ELK 实例（单例）
const elk = new ELK();

/**
 * 检测图的主要流向（自上而下 or 从左到右）
 */
function detectLayoutDirection(nodes: any[], edges: any[]): 'DOWN' | 'RIGHT' {
  if (nodes.length < 2) return 'DOWN';
  
  // 分析边的方向趋势
  let verticalEdges = 0;
  let horizontalEdges = 0;
  
  const nodeMap = new Map(nodes.map(n => [n.id, n]));
  
  edges.forEach((edge: any) => {
    const from = nodeMap.get(edge.from);
    const to = nodeMap.get(edge.to);
    if (from && to) {
      const rowDiff = Math.abs((to.row || 0) - (from.row || 0));
      const colDiff = Math.abs((to.col || 0) - (from.col || 0));
      if (rowDiff > colDiff) {
        verticalEdges++;
      } else {
        horizontalEdges++;
      }
    }
  });
  
  // 如果水平边明显更多，使用从左到右布局
  return horizontalEdges > verticalEdges * 1.5 ? 'RIGHT' : 'DOWN';
}

/**
 * 将原始 AI 响应数据转换为 ELK 图格式并执行布局
 * 
 * @param nodes - AI 返回的节点数组 (包含 id, label, row, col, category, icon, groupId)
 * @param edges - AI 返回的边数组 (包含 from, to, label)
 * @returns 布局后的 DiagramElement 数组
 */
export async function layoutWithELK(
  nodes: any[],
  edges: any[],
  colors: Record<string, { fill: string; stroke: string }>
): Promise<DiagramElement[]> {
  if (nodes.length === 0) {
    return [];
  }

  // 检测布局方向
  const direction = detectLayoutDirection(nodes, edges);
  console.log('[LayoutService] Detected layout direction:', direction);

  // 构建 ELK 图结构
  const elkGraph: ElkNode = {
    id: 'root',
    layoutOptions: {
      'elk.algorithm': 'layered',
      'elk.direction': direction,
      // 节点间距
      'elk.spacing.nodeNode': String(GAP_X),
      'elk.layered.spacing.nodeNodeBetweenLayers': String(GAP_Y + NODE_HEIGHT / 2),
      // 边与节点间距（关键！防止连线贴边）
      'elk.spacing.edgeNode': String(EDGE_NODE_SPACING),
      'elk.layered.spacing.edgeNodeBetweenLayers': String(EDGE_NODE_SPACING),
      // 边与边间距
      'elk.spacing.edgeEdge': String(EDGE_EDGE_SPACING),
      'elk.layered.spacing.edgeEdgeBetweenLayers': String(EDGE_EDGE_SPACING),
      // 布局策略
      'elk.layered.nodePlacement.strategy': 'NETWORK_SIMPLEX',
      'elk.layered.crossingMinimization.strategy': 'LAYER_SWEEP',
      'elk.edgeRouting': 'ORTHOGONAL',
      'elk.layered.considerModelOrder.strategy': 'NODES_AND_EDGES',
      // 内边距
      'elk.padding': `[top=${PADDING}, left=${PADDING}, bottom=${PADDING}, right=${PADDING}]`,
    },
    children: nodes.map((node: any) => ({
      id: node.id,
      width: NODE_WIDTH,
      height: NODE_HEIGHT,
      // 保存原始数据用于后续转换
      labels: [{ text: node.label }],
    })),
    edges: edges.map((edge: any, index: number) => ({
      id: `edge_${index}`,
      sources: [edge.from],
      targets: [edge.to],
      labels: edge.label ? [{ text: edge.label }] : [],
    })),
  };

  try {
    // 执行 ELK 布局
    const layoutedGraph = await elk.layout(elkGraph);
    console.log('[LayoutService] ELK layout completed');

    // 转换为 DiagramElement
    const finalElements: DiagramElement[] = [];
    const nodeMap = new Map<string, DiagramElement>();

    // 创建节点元素
    layoutedGraph.children?.forEach((elkNode) => {
      const originalNode = nodes.find((n: any) => n.id === elkNode.id);
      if (!originalNode) return;

      const colorSet = colors[originalNode.category as string] || colors.default;

      const el: DiagramElement = {
        id: originalNode.id,
        type: ToolType.RECTANGLE,
        x: elkNode.x || 0,
        y: elkNode.y || 0,
        width: NODE_WIDTH,
        height: NODE_HEIGHT,
        text: originalNode.label,
        icon: originalNode.icon,
        strokeColor: colorSet.stroke,
        fillColor: colorSet.fill,
        strokeWidth: 2,
        fontSize: 14,
        groupId: originalNode.groupId,
      };

      finalElements.push(el);
      nodeMap.set(originalNode.id, el);
    });

    // 创建边元素
    edges.forEach((edge: any) => {
      const fromNode = nodeMap.get(edge.from);
      const toNode = nodeMap.get(edge.to);

      if (fromNode && toNode) {
        const el: DiagramElement = {
          id: `el_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`,
          type: ToolType.ARROW,
          x: fromNode.x,
          y: fromNode.y,
          endX: toNode.x,
          endY: toNode.y,
          fromId: fromNode.id,
          toId: toNode.id,
          strokeColor: '#94a3b8',
          fillColor: 'transparent',
          strokeWidth: 2,
          text: edge.label || '',
          lineType: LineType.STEP,
          lineStyle: LineStyle.SOLID,
          markerEnd: true,
        };
        finalElements.push(el);
      }
    });

    return finalElements;
  } catch (error) {
    console.error('[LayoutService] ELK layout failed:', error);
    throw error;
  }
}

/**
 * 对现有 DiagramElement 数组执行自动布局（一键美化）
 * 
 * @param elements - 当前画布上的所有元素
 * @returns 布局优化后的元素数组
 */
export async function autoLayout(elements: DiagramElement[]): Promise<DiagramElement[]> {
  // 分离节点和边
  const nodes = elements.filter(el => el.type !== ToolType.ARROW && el.type !== ToolType.GROUP);
  const arrows = elements.filter(el => el.type === ToolType.ARROW);
  const groups = elements.filter(el => el.type === ToolType.GROUP);

  if (nodes.length === 0) {
    return elements;
  }

  // 检测布局方向（基于现有边的连接方向）
  let verticalEdges = 0;
  let horizontalEdges = 0;

  arrows.forEach(arrow => {
    const fromNode = nodes.find(n => n.id === arrow.fromId);
    const toNode = nodes.find(n => n.id === arrow.toId);
    if (fromNode && toNode) {
      const dx = Math.abs((toNode.x || 0) - (fromNode.x || 0));
      const dy = Math.abs((toNode.y || 0) - (fromNode.y || 0));
      if (dy > dx) {
        verticalEdges++;
      } else {
        horizontalEdges++;
      }
    }
  });

  const direction = horizontalEdges > verticalEdges * 1.5 ? 'RIGHT' : 'DOWN';
  console.log('[LayoutService] Auto-layout direction:', direction);

  // 构建 ELK 图
  const elkGraph: ElkNode = {
    id: 'root',
    layoutOptions: {
      'elk.algorithm': 'layered',
      'elk.direction': direction,
      // 节点间距
      'elk.spacing.nodeNode': String(GAP_X),
      'elk.layered.spacing.nodeNodeBetweenLayers': String(GAP_Y + NODE_HEIGHT / 2),
      // 边与节点间距（关键！防止连线贴边）
      'elk.spacing.edgeNode': String(EDGE_NODE_SPACING),
      'elk.layered.spacing.edgeNodeBetweenLayers': String(EDGE_NODE_SPACING),
      // 边与边间距
      'elk.spacing.edgeEdge': String(EDGE_EDGE_SPACING),
      'elk.layered.spacing.edgeEdgeBetweenLayers': String(EDGE_EDGE_SPACING),
      // 布局策略
      'elk.layered.nodePlacement.strategy': 'NETWORK_SIMPLEX',
      'elk.layered.crossingMinimization.strategy': 'LAYER_SWEEP',
      'elk.edgeRouting': 'ORTHOGONAL',
      // 内边距
      'elk.padding': `[top=${PADDING}, left=${PADDING}, bottom=${PADDING}, right=${PADDING}]`,
    },
    children: nodes.map(node => ({
      id: node.id,
      width: node.width || NODE_WIDTH,
      height: node.height || NODE_HEIGHT,
    })),
    edges: arrows
      .filter(arrow => arrow.fromId && arrow.toId)
      .map((arrow, index) => ({
        id: `edge_${index}`,
        sources: [arrow.fromId!],
        targets: [arrow.toId!],
      })),
  };

  try {
    const layoutedGraph = await elk.layout(elkGraph);
    console.log('[LayoutService] Auto-layout completed');

    // 创建位置映射
    const positionMap = new Map<string, { x: number; y: number }>();
    layoutedGraph.children?.forEach(elkNode => {
      positionMap.set(elkNode.id, { x: elkNode.x || 0, y: elkNode.y || 0 });
    });

    // 更新元素位置
    const updatedElements = elements.map(el => {
      if (el.type === ToolType.ARROW || el.type === ToolType.GROUP) {
        // 边和分组暂不移动，后面会重新计算
        return el;
      }

      const newPos = positionMap.get(el.id);
      if (newPos) {
        return {
          ...el,
          x: newPos.x,
          y: newPos.y,
        };
      }
      return el;
    });

    // 更新边的位置（清除手动偏移，让系统重新计算最佳路径）
    const finalElements = updatedElements.map(el => {
      if (el.type === ToolType.ARROW) {
        const fromNode = updatedElements.find(n => n.id === el.fromId);
        const toNode = updatedElements.find(n => n.id === el.toId);
        if (fromNode && toNode) {
          return {
            ...el,
            x: fromNode.x,
            y: fromNode.y,
            endX: toNode.x,
            endY: toNode.y,
            offsetX: 0, // 清除手动偏移
            offsetY: 0,
          };
        }
      }
      return el;
    });

    // 重新计算分组边界
    const groupedElements = new Map<string, DiagramElement[]>();
    finalElements.forEach(el => {
      if (el.groupId && el.type !== ToolType.GROUP) {
        if (!groupedElements.has(el.groupId)) {
          groupedElements.set(el.groupId, []);
        }
        groupedElements.get(el.groupId)!.push(el);
      }
    });

    const result = finalElements.map(el => {
      if (el.type === ToolType.GROUP) {
        const children = groupedElements.get(el.id);
        if (children && children.length > 0) {
          let minX = Infinity, minY = Infinity, maxX = -Infinity, maxY = -Infinity;
          children.forEach(child => {
            minX = Math.min(minX, child.x);
            minY = Math.min(minY, child.y);
            maxX = Math.max(maxX, child.x + (child.width || 0));
            maxY = Math.max(maxY, child.y + (child.height || 0));
          });
          const padding = 40;
          return {
            ...el,
            x: minX - padding,
            y: minY - padding,
            width: maxX - minX + padding * 2,
            height: maxY - minY + padding * 2,
          };
        }
      }
      return el;
    });

    return result;
  } catch (error) {
    console.error('[LayoutService] Auto-layout failed:', error);
    // 返回原始元素，不做修改
    return elements;
  }
}

/**
 * 仅优化边的路径（保持节点位置不变）
 */
export function optimizeEdgePaths(elements: DiagramElement[]): DiagramElement[] {
  return elements.map(el => {
    if (el.type === ToolType.ARROW) {
      // 清除手动偏移，让系统重新选择最佳端口
      return {
        ...el,
        offsetX: 0,
        offsetY: 0,
        fromPort: undefined,
        toPort: undefined,
      };
    }
    return el;
  });
}
