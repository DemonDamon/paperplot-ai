import { GoogleGenAI, Type } from "@google/genai";
import { DiagramElement, ToolType, LineType, LineStyle } from "../types";

// Helper to create a unique ID
const generateId = () => `el_${Math.random().toString(36).substr(2, 9)}`;

// Layout constants
const COL_WIDTH = 280;
const ROW_HEIGHT = 160; 
const START_X = 60;
const START_Y = 60;

const COLORS = {
  input: { fill: "#eff6ff", stroke: "#3b82f6" }, // Blueish
  process: { fill: "#fdf2f8", stroke: "#db2777" }, // Pinkish
  output: { fill: "#f0fdf4", stroke: "#16a34a" }, // Greenish
  database: { fill: "#fffbeb", stroke: "#d97706" }, // Yellow/Orange
  default: { fill: "#ffffff", stroke: "#475569" }  // Slate
};

export const generateDiagramFromPrompt = async (prompt: string, imageBase64?: string | null): Promise<DiagramElement[]> => {
  const apiKey = process.env.API_KEY;
  if (!apiKey) {
    throw new Error("API Key not found");
  }

  const ai = new GoogleGenAI({ apiKey });
  
  const parts: any[] = [];
  
  if (imageBase64) {
    // Extract base64 data and mime type
    // format: data:image/png;base64,....
    const match = imageBase64.match(/^data:(.*?);base64,(.*)$/);
    if (match) {
        parts.push({
            inlineData: {
                mimeType: match[1],
                data: match[2]
            }
        });
    }
  }

  parts.push({
      text: `Create a detailed scientific diagram structure for: "${prompt}". 
      If an image is provided, analyze the image to understand the structure, connections, and node types, and recreate it as closely as possible using the available shapes.
      
      Remember: Break down lists into individual nodes. Use specific Lucide icon names for each node.`
  });

  const response = await ai.models.generateContent({
    model: "gemini-2.5-flash",
    contents: { parts },
    config: {
      responseMimeType: "application/json",
      responseSchema: {
        type: Type.OBJECT,
        properties: {
          nodes: {
            type: Type.ARRAY,
            items: {
              type: Type.OBJECT,
              properties: {
                id: { type: Type.STRING },
                label: { type: Type.STRING },
                icon: { type: Type.STRING, description: "Lucide icon name e.g. file-text, brain, server" },
                category: { type: Type.STRING, enum: ["input", "process", "output", "database", "default"] },
                row: { type: Type.INTEGER },
                col: { type: Type.INTEGER }
              },
              required: ["id", "label", "row", "col", "category", "icon"]
            }
          },
          edges: {
            type: Type.ARRAY,
            items: {
              type: Type.OBJECT,
              properties: {
                from: { type: Type.STRING },
                to: { type: Type.STRING },
                label: { type: Type.STRING }
              },
              required: ["from", "to"]
            }
          }
        }
      }
    }
  });

  const rawData = JSON.parse(response.text || "{}");
  const nodes = rawData.nodes || [];
  const edges = rawData.edges || [];

  const finalElements: DiagramElement[] = [];
  const nodeMap = new Map<string, DiagramElement>();

  // 1. Convert Nodes to DiagramElements
  nodes.forEach((node: any) => {
    const colorSet = COLORS[node.category as keyof typeof COLORS] || COLORS.default;
    
    const x = START_X + (node.col * COL_WIDTH) + (Math.random() * 10); 
    const y = START_Y + (node.row * ROW_HEIGHT) + (Math.random() * 10);

    const el: DiagramElement = {
      id: node.id || generateId(),
      type: ToolType.RECTANGLE,
      x: x,
      y: y,
      width: 200, 
      height: 100, 
      text: node.label,
      icon: node.icon,
      strokeColor: colorSet.stroke,
      fillColor: colorSet.fill,
      strokeWidth: 2,
      fontSize: 14
    };
    
    finalElements.push(el);
    nodeMap.set(node.id, el);
  });

  // 2. Convert Edges
  edges.forEach((edge: any) => {
    const fromNode = nodeMap.get(edge.from);
    const toNode = nodeMap.get(edge.to);

    if (fromNode && toNode) {
      const el: DiagramElement = {
        id: generateId(),
        type: ToolType.ARROW,
        x: fromNode.x, // Fallback, actual calc is in Canvas
        y: fromNode.y,
        endX: toNode.x,
        endY: toNode.y,
        fromId: fromNode.id,
        toId: toNode.id,
        strokeColor: "#94a3b8",
        fillColor: "transparent",
        strokeWidth: 2,
        text: edge.label || "",
        lineType: LineType.CURVE, // Changed to CURVE for better default aesthetics
        lineStyle: LineStyle.SOLID,
        markerEnd: true
      };
      finalElements.push(el);
    }
  });

  return finalElements;
};