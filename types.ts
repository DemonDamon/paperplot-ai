export enum ToolType {
  SELECT = 'SELECT',
  RECTANGLE = 'RECTANGLE',
  CIRCLE = 'CIRCLE',
  TEXT = 'TEXT',
  ARROW = 'ARROW',
  GROUP = 'GROUP'  // 分组/子图
}

export enum LineType {
  STRAIGHT = 'STRAIGHT',
  CURVE = 'CURVE',
  STEP = 'STEP'
}

export enum LineStyle {
  SOLID = 'SOLID',
  DASHED = 'DASHED',
  DOTTED = 'DOTTED'
}

export interface Point {
  x: number;
  y: number;
}

export interface DiagramElement {
  id: string;
  type: ToolType;
  x: number;
  y: number;
  width?: number; // For rect/circle
  height?: number; // For rect/circle
  
  // Connection Logic
  fromId?: string;
  toId?: string;
  endX?: number; // For arrow fallback
  endY?: number; // For arrow fallback
  
  // Style
  text?: string;
  strokeColor: string;
  fillColor: string;
  strokeWidth: number;
  fontSize?: number;
  icon?: string;
  
  // Line Specifics
  lineType?: LineType;
  lineStyle?: LineStyle;
  markerStart?: boolean;
  markerEnd?: boolean;
  
  // Group/Subgraph
  groupId?: string;  // 所属分组ID
}

export interface DiagramGroup {
  id: string;
  label: string;
  x: number;
  y: number;
  width: number;
  height: number;
  strokeColor?: string;
  fillColor?: string;
  strokeWidth?: number;
  strokeDasharray?: string;  // 虚线样式
}

export interface GenerationResponse {
  elements: {
    type: string;
    label?: string;
    x: number;
    y: number;
    width?: number;
    height?: number;
    targetId?: string; 
  }[];
}