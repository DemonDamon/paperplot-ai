import React, { useRef, useState, useEffect } from 'react';
import { DiagramElement, ToolType, Point, LineType, LineStyle } from '../types';
import * as Icons from 'lucide-react';
import { ZoomIn, ZoomOut, Maximize } from 'lucide-react';

// --- Helper: Icon Renderer ---
const IconRenderer = ({ name, color, size }: { name?: string, color: string, size: number }) => {
  if (!name) return null;
  const camelName = name.replace(/-([a-z])/g, (g) => g[1].toUpperCase());
  const pascalName = camelName.charAt(0).toUpperCase() + camelName.slice(1);
  // @ts-ignore
  const IconComponent = Icons[pascalName] || Icons[camelName] || Icons['Box'];
  return <IconComponent color={color} size={size} />;
};

// --- Helper: Smart Path Generation ---
// Defines ports on a node: Top, Right, Bottom, Left
type PortDir = 'up' | 'down' | 'left' | 'right';
interface Port { x: number; y: number; dir: PortDir }

const getPorts = (el: DiagramElement): Port[] => {
  const x = el.x;
  const y = el.y;
  const w = el.width || 0;
  const h = el.height || 0;
  return [
    { x: x + w / 2, y: y, dir: 'up' },          // Top
    { x: x + w, y: y + h / 2, dir: 'right' },   // Right
    { x: x + w / 2, y: y + h, dir: 'down' },    // Bottom
    { x: x, y: y + h / 2, dir: 'left' }         // Left
  ];
};

const getSmartPath = (
  from: DiagramElement, 
  to: DiagramElement, 
  lineType: LineType
): string => {
  const fromPorts = getPorts(from);
  const toPorts = getPorts(to);

  // Find the pair of ports with minimum distance
  let minDist = Infinity;
  let start: Port = fromPorts[2]; // default bottom
  let end: Port = toPorts[0];     // default top

  for (const fp of fromPorts) {
    for (const tp of toPorts) {
      const dist = Math.sqrt(Math.pow(fp.x - tp.x, 2) + Math.pow(fp.y - tp.y, 2));
      if (dist < minDist) {
        minDist = dist;
        start = fp;
        end = tp;
      }
    }
  }

  if (lineType === LineType.STRAIGHT) {
    return `M ${start.x} ${start.y} L ${end.x} ${end.y}`;
  }

  if (lineType === LineType.STEP) {
    const midX = (start.x + end.x) / 2;
    return `M ${start.x} ${start.y} L ${midX} ${start.y} L ${midX} ${end.y} L ${end.x} ${end.y}`;
  }

  // CURVE (Bezier)
  // Calculate control points based on direction
  const dist = Math.sqrt(Math.pow(start.x - end.x, 2) + Math.pow(start.y - end.y, 2));
  const controlDist = Math.min(dist * 0.5, 150); // Cap curvature

  const getControlPoint = (p: Port, dist: number) => {
    switch (p.dir) {
      case 'up': return { x: p.x, y: p.y - dist };
      case 'down': return { x: p.x, y: p.y + dist };
      case 'left': return { x: p.x - dist, y: p.y };
      case 'right': return { x: p.x + dist, y: p.y };
    }
  };

  const cp1 = getControlPoint(start, controlDist);
  const cp2 = getControlPoint(end, controlDist);

  return `M ${start.x} ${start.y} C ${cp1.x} ${cp1.y}, ${cp2.x} ${cp2.y}, ${end.x} ${end.y}`;
};


interface CanvasProps {
  elements: DiagramElement[];
  setElements: React.Dispatch<React.SetStateAction<DiagramElement[]>>;
  selectedTool: ToolType;
  setSelectedTool: (t: ToolType) => void;
  selectedElementId: string | null;
  setSelectedElementId: (id: string | null) => void;
  onHistorySave: () => void;
}

export const Canvas: React.FC<CanvasProps> = ({
  elements,
  setElements,
  selectedTool,
  setSelectedTool,
  selectedElementId,
  setSelectedElementId,
  onHistorySave
}) => {
  const svgRef = useRef<SVGSVGElement>(null);
  
  // State for interactions
  const [isDrawing, setIsDrawing] = useState(false);
  const [dragStart, setDragStart] = useState<Point | null>(null);
  const [currentElementId, setCurrentElementId] = useState<string | null>(null);
  const [dragOffset, setDragOffset] = useState<Point | null>(null);
  const [hasMoved, setHasMoved] = useState(false);
  
  // Viewport State
  const [pan, setPan] = useState<Point>({ x: 0, y: 0 });
  const [scale, setScale] = useState(1);
  const [isPanning, setIsPanning] = useState(false);
  const [lastMousePos, setLastMousePos] = useState<Point | null>(null);

  // Helper to get mouse position in SVG coordinates
  const getMousePos = (e: React.MouseEvent): Point => {
    if (!svgRef.current) return { x: 0, y: 0 };
    // We must account for scale and pan manually because we are untransforming the client coordinates
    // relative to the DOM element, not using CTM which might get complex with nested transforms.
    const rect = svgRef.current.getBoundingClientRect();
    return {
      x: (e.clientX - rect.left - pan.x) / scale,
      y: (e.clientY - rect.top - pan.y) / scale,
    };
  };

  // --- Zoom Handlers ---
  const handleWheel = (e: WheelEvent) => {
    // Prevent default browser zoom behavior if ctrl is pressed
    if (e.ctrlKey) {
      e.preventDefault();
      const zoomSensitivity = 0.001;
      const delta = -e.deltaY * zoomSensitivity;
      const newScale = Math.min(Math.max(0.1, scale + delta), 5);
      
      // Zoom towards pointer logic could go here, but center zoom is safer for now
      // Simple zoom
      setScale(newScale);
    } else {
      // Pan
      setPan(prev => ({ x: prev.x - e.deltaX, y: prev.y - e.deltaY }));
    }
  };

  // Add non-passive listener for wheel to prevent default pinch-zoom behavior on trackpads
  useEffect(() => {
    const el = svgRef.current;
    if (el) {
      el.addEventListener('wheel', handleWheel, { passive: false });
      return () => el.removeEventListener('wheel', handleWheel);
    }
  }, [scale, pan]);

  const handleZoomIn = () => setScale(s => Math.min(s * 1.2, 5));
  const handleZoomOut = () => setScale(s => Math.max(s / 1.2, 0.1));
  const handleResetZoom = () => {
    setScale(1);
    setPan({ x: 0, y: 0 });
  };

  const handleBackgroundMouseDown = (e: React.MouseEvent) => {
    const pos = getMousePos(e); 
    const clientPos = { x: e.clientX, y: e.clientY }; 

    // Middle click or Spacebar (handled by caller usually) or just Select tool on bg
    if (selectedTool === ToolType.SELECT || e.button === 1) {
       setSelectedElementId(null);
       setIsPanning(true);
       setLastMousePos(clientPos);
    } else {
       onHistorySave();
       setIsDrawing(true);
       setHasMoved(true);
       setDragStart(pos);
       const newId = `el_${Date.now()}`;
       setCurrentElementId(newId);

       const newElement: DiagramElement = {
         id: newId,
         type: selectedTool,
         x: pos.x,
         y: pos.y,
         width: 0,
         height: 0,
         strokeColor: '#000000',
         fillColor: selectedTool === ToolType.TEXT || selectedTool === ToolType.ARROW ? 'transparent' : '#ffffff',
         strokeWidth: 2,
         text: selectedTool === ToolType.TEXT ? 'Text' : '',
         fontSize: 16,
         endX: pos.x,
         endY: pos.y,
         lineType: LineType.CURVE, // Default to curve for manual drawing too
         lineStyle: LineStyle.SOLID,
         markerEnd: true
       };

       setElements(prev => [...prev, newElement]);
    }
  };

  const handleElementMouseDown = (e: React.MouseEvent, elementId: string) => {
    if (selectedTool !== ToolType.SELECT) return; 

    e.stopPropagation(); 
    
    const pos = getMousePos(e);
    const element = elements.find(el => el.id === elementId);
    
    if (element) {
      setSelectedElementId(elementId);
      setDragStart(pos);
      setDragOffset({ x: pos.x - element.x, y: pos.y - element.y });
      setIsDrawing(true);
      setHasMoved(false);
    }
  };

  const handleMouseMove = (e: React.MouseEvent) => {
    const pos = getMousePos(e);
    const clientPos = { x: e.clientX, y: e.clientY };

    if (isPanning && lastMousePos) {
      const dx = clientPos.x - lastMousePos.x;
      const dy = clientPos.y - lastMousePos.y;
      setPan(prev => ({ x: prev.x + dx, y: prev.y + dy }));
      setLastMousePos(clientPos);
      return;
    }

    if (!isDrawing || !dragStart) return;

    if (!hasMoved && (Math.abs(pos.x - dragStart.x) > 2 || Math.abs(pos.y - dragStart.y) > 2)) {
      if (selectedTool === ToolType.SELECT && selectedElementId) {
         onHistorySave();
      }
      setHasMoved(true);
    }

    if (selectedTool === ToolType.SELECT && selectedElementId) {
      setElements(prev => prev.map(el => {
        if (el.id === selectedElementId) {
          if (el.type === ToolType.ARROW) {
             const dx = pos.x - dragStart.x;
             const dy = pos.y - dragStart.y;
             return { ...el, x: el.x + dx, y: el.y + dy, endX: (el.endX || 0) + dx, endY: (el.endY || 0) + dy };
          }
          return { ...el, x: pos.x - (dragOffset?.x || 0), y: pos.y - (dragOffset?.y || 0) };
        }
        return el;
      }));
      
      if (elements.find(e => e.id === selectedElementId)?.type === ToolType.ARROW) {
        setDragStart(pos);
      }
      return;
    }

    if (currentElementId) {
      setElements(prev => prev.map(el => {
        if (el.id === currentElementId) {
          if (el.type === ToolType.ARROW) {
            return { ...el, endX: pos.x, endY: pos.y };
          }
          const w = pos.x - dragStart.x;
          const h = pos.y - dragStart.y;
          return {
            ...el,
            x: w < 0 ? pos.x : dragStart.x,
            y: h < 0 ? pos.y : dragStart.y,
            width: Math.abs(w),
            height: Math.abs(h)
          };
        }
        return el;
      }));
    }
  };

  const handleMouseUp = () => {
    setIsDrawing(false);
    setIsPanning(false);
    setDragStart(null);
    setLastMousePos(null);
    setCurrentElementId(null);
    setHasMoved(false);
    
    if (selectedTool !== ToolType.SELECT) {
      setSelectedTool(ToolType.SELECT);
      if(currentElementId) setSelectedElementId(currentElementId);
    }
  };

  const nodeMap = new Map(elements.map(el => [el.id, el]));
  
  // Sort: Arrows last so they draw on top
  const sortedElements = [...elements].sort((a, b) => {
    if (a.type === ToolType.ARROW && b.type !== ToolType.ARROW) return 1;
    if (a.type !== ToolType.ARROW && b.type === ToolType.ARROW) return -1;
    return 0;
  });

  return (
    <div 
      className="flex-1 h-full bg-gray-50 overflow-hidden relative bg-grid-pattern"
      style={{ 
        cursor: isPanning ? 'grabbing' : selectedTool === ToolType.SELECT ? 'default' : 'crosshair',
        // Background pattern should move with pan/scale logic if we wanted perfect sync, 
        // but simple pan sync is usually enough for bg.
        backgroundPosition: `${pan.x}px ${pan.y}px`,
        backgroundSize: `${20 * scale}px ${20 * scale}px`
      }}
    >
      <svg
        id="paperplot-canvas"
        ref={svgRef}
        className="w-full h-full block touch-none" // touch-none for better gesture handling
        onMouseDown={handleBackgroundMouseDown}
        onMouseMove={handleMouseMove}
        onMouseUp={handleMouseUp}
        onMouseLeave={handleMouseUp}
      >
        <defs>
          <marker id="arrow-end" markerWidth="10" markerHeight="10" refX="9" refY="3" orient="auto" markerUnits="strokeWidth">
            <path d="M0,0 L0,6 L9,3 z" fill="#94a3b8" />
          </marker>
           <marker id="arrow-start" markerWidth="10" markerHeight="10" refX="0" refY="3" orient="auto" markerUnits="strokeWidth">
            <path d="M9,0 L9,6 L0,3 z" fill="#94a3b8" />
          </marker>
           <marker id="arrow-end-selected" markerWidth="10" markerHeight="10" refX="9" refY="3" orient="auto" markerUnits="strokeWidth">
            <path d="M0,0 L0,6 L9,3 z" fill="#2563eb" />
          </marker>
          <filter id="shadow" x="-20%" y="-20%" width="140%" height="140%">
            <feDropShadow dx="2" dy="2" stdDeviation="3" floodColor="#000000" floodOpacity="0.1"/>
          </filter>
        </defs>

        <g transform={`translate(${pan.x}, ${pan.y}) scale(${scale})`}>
          {sortedElements.map(el => {
            const isSelected = el.id === selectedElementId;

            if (el.type === ToolType.ARROW) {
               let pathData = "";

               // Use Smart Anchors if connected
               if (el.fromId && el.toId) {
                 const fromNode = nodeMap.get(el.fromId);
                 const toNode = nodeMap.get(el.toId);
                 if (fromNode && toNode) {
                   pathData = getSmartPath(fromNode, toNode, el.lineType || LineType.CURVE);
                 }
               }
               
               // Fallback if not connected or smart path failed (e.g. during manual drawing)
               if (!pathData) {
                   // Manual Arrow drawing fallback
                   const x1 = el.x;
                   const y1 = el.y;
                   const x2 = el.endX || x1;
                   const y2 = el.endY || y1;
                   pathData = `M ${x1} ${y1} L ${x2} ${y2}`;
               }

               const strokeDash = el.lineStyle === LineStyle.DASHED ? "8,8" : el.lineStyle === LineStyle.DOTTED ? "3,3" : "none";

               return (
                 <g 
                    key={el.id} 
                    style={{ pointerEvents: 'all', cursor: selectedTool === ToolType.SELECT ? 'pointer' : 'default' }}
                    onMouseDown={(e) => handleElementMouseDown(e, el.id)}
                 >
                    {/* Hit area (invisible wide stroke for easier selection) */}
                    <path 
                      d={pathData} 
                      stroke="transparent" 
                      strokeWidth="20" 
                      fill="none"
                      style={{ pointerEvents: 'stroke' }}
                    />
                    {/* Actual Line */}
                    <path
                      d={pathData}
                      stroke={isSelected ? '#2563eb' : el.strokeColor}
                      strokeWidth={el.strokeWidth}
                      strokeDasharray={strokeDash}
                      fill="none"
                      markerEnd={el.markerEnd ? (isSelected ? "url(#arrow-end-selected)" : "url(#arrow-end)") : undefined}
                      markerStart={el.markerStart ? "url(#arrow-start)" : undefined}
                      style={{ pointerEvents: 'none' }}
                    />
                    {el.text && (
                       // Simplified text placement at 50% of path would be complex for bezier, 
                       // so we approximate center between start/end for now
                       <foreignObject 
                        x={(el.x + (el.endX||el.x))/2 - 40} 
                        y={(el.y + (el.endY||el.y))/2 - 15} 
                        width="80" 
                        height="30"
                        style={{pointerEvents: 'none'}}
                      >
                        <div className="bg-white/90 backdrop-blur-sm px-1 rounded text-xs text-center text-gray-500 border border-gray-200 shadow-sm truncate">
                          {el.text}
                        </div>
                      </foreignObject>
                    )}
                 </g>
               );
            }

            // ... (Render Rect/Circle/Text - unchanged logic primarily) ...
            return (
              <g 
                key={el.id} 
                style={{ pointerEvents: 'all', cursor: selectedTool === ToolType.SELECT ? (isSelected ? 'move' : 'pointer') : 'default' }}
                onMouseDown={(e) => handleElementMouseDown(e, el.id)}
              >
                {el.type === ToolType.RECTANGLE && (
                  <>
                    <rect
                      x={el.x}
                      y={el.y}
                      width={Math.max(10, el.width || 0)}
                      height={Math.max(10, el.height || 0)}
                      rx={8} 
                      ry={8}
                      fill={el.fillColor}
                      stroke={el.strokeColor}
                      strokeWidth={el.strokeWidth}
                      filter="url(#shadow)"
                    />
                    <foreignObject x={el.x} y={el.y} width={el.width} height={el.height} style={{pointerEvents:'none'}}>
                       <div className="w-full h-full flex flex-col items-center justify-center p-2 text-center overflow-hidden">
                          {el.icon && (
                            <div className="mb-2 opacity-80">
                              <IconRenderer name={el.icon} color={el.strokeColor} size={24} />
                            </div>
                          )}
                          <div style={{
                            fontSize: el.fontSize, 
                            color: '#1e293b', 
                            fontWeight: 500, 
                            lineHeight: 1.2,
                            wordBreak: 'break-word'
                          }}>
                             {el.text}
                          </div>
                       </div>
                    </foreignObject>
                  </>
                )}

                {el.type === ToolType.CIRCLE && (
                  <>
                    <ellipse
                      cx={el.x + (el.width || 0) / 2}
                      cy={el.y + (el.height || 0) / 2}
                      rx={(el.width || 0) / 2}
                      ry={(el.height || 0) / 2}
                      fill={el.fillColor}
                      stroke={el.strokeColor}
                      strokeWidth={el.strokeWidth}
                      filter="url(#shadow)"
                    />
                     <foreignObject x={el.x} y={el.y} width={el.width} height={el.height} style={{pointerEvents:'none'}}>
                          <div className="w-full h-full flex flex-col items-center justify-center text-center overflow-hidden p-4">
                             {el.icon && <div className="mb-1"><IconRenderer name={el.icon} color={el.strokeColor} size={20} /></div>}
                             <span style={{fontSize: el.fontSize, fontWeight: 500}}>{el.text}</span>
                          </div>
                      </foreignObject>
                  </>
                )}

                {el.type === ToolType.TEXT && (
                  <foreignObject x={el.x} y={el.y} width={200} height={50} style={{pointerEvents:'none', overflow: 'visible'}}>
                      <div style={{fontSize: el.fontSize, color: el.strokeColor, whiteSpace: 'nowrap'}} className="font-medium">
                          {el.text}
                      </div>
                  </foreignObject>
                )}

                {isSelected && el.type !== ToolType.TEXT && (
                   <rect
                   x={el.x - 4}
                   y={el.y - 4}
                   width={(el.width || 0) + 8}
                   height={(el.height || 0) + 8}
                   fill="none"
                   stroke="#3b82f6"
                   strokeWidth="1.5"
                   strokeDasharray="4"
                   rx={10}
                   style={{pointerEvents: 'none'}}
                 />
                )}
                {isSelected && el.type === ToolType.TEXT && (
                   <rect
                   x={el.x - 4}
                   y={el.y - 4}
                   width={el.text ? el.text.length * (el.fontSize||16) * 0.6 + 8 : 50}
                   height={(el.fontSize||16) + 8}
                   fill="none"
                   stroke="#3b82f6"
                   strokeWidth="1"
                   strokeDasharray="4"
                   style={{pointerEvents: 'none'}}
                 />
                )}
              </g>
            );
          })}
        </g>
      </svg>

      {/* Zoom Controls */}
      <div className="absolute bottom-6 right-6 flex gap-2 bg-white p-1.5 rounded-lg shadow-md border border-gray-200">
        <button 
          onClick={handleZoomOut}
          className="p-2 hover:bg-gray-100 rounded text-gray-600"
          title="Zoom Out"
        >
          <ZoomOut size={20} />
        </button>
        <span className="flex items-center justify-center w-12 text-xs font-medium text-gray-500 select-none">
          {Math.round(scale * 100)}%
        </span>
        <button 
          onClick={handleZoomIn}
          className="p-2 hover:bg-gray-100 rounded text-gray-600"
          title="Zoom In"
        >
          <ZoomIn size={20} />
        </button>
         <div className="w-px bg-gray-200 my-1 mx-1"></div>
         <button 
          onClick={handleResetZoom}
          className="p-2 hover:bg-gray-100 rounded text-gray-600"
          title="Fit to Screen / Reset"
        >
          <Maximize size={20} />
        </button>
      </div>
    </div>
  );
};