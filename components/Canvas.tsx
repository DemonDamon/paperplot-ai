import React, { useRef, useState, useEffect, useMemo } from 'react';
import { DiagramElement, DiagramGroup, ToolType, Point, LineType, LineStyle } from '../types';
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
  selectedGroupId?: string | null;
  setSelectedGroupId?: (id: string | null) => void;
}

export const Canvas: React.FC<CanvasProps> = ({
  elements,
  setElements,
  selectedTool,
  setSelectedTool,
  selectedElementId,
  setSelectedElementId,
  onHistorySave,
  selectedGroupId,
  setSelectedGroupId
}) => {
  const svgRef = useRef<SVGSVGElement>(null);
  
  // State for interactions
  const [isDrawing, setIsDrawing] = useState(false);
  const [dragStart, setDragStart] = useState<Point | null>(null);
  const [currentElementId, setCurrentElementId] = useState<string | null>(null);
  const [dragOffset, setDragOffset] = useState<Point | null>(null);
  const [hasMoved, setHasMoved] = useState(false);
  
  // Connection point dragging
  const [draggingConnectionPoint, setDraggingConnectionPoint] = useState<'from' | 'to' | null>(null);
  const [tempConnectionPoint, setTempConnectionPoint] = useState<Point | null>(null);
  const [hoveredElementId, setHoveredElementId] = useState<string | null>(null);
  
  // Group dragging
  const [draggingGroup, setDraggingGroup] = useState<string | null>(null);
  const [groupDragOffset, setGroupDragOffset] = useState<Point | null>(null);
  
  // Resize handles
  const [resizingHandle, setResizingHandle] = useState<'nw' | 'ne' | 'sw' | 'se' | null>(null);
  const [resizeStartSize, setResizeStartSize] = useState<{ width: number; height: number; x: number; y: number } | null>(null);
  
  // Creating arrow from connection point
  const [creatingArrowFrom, setCreatingArrowFrom] = useState<{ elementId: string; port: 'top' | 'right' | 'bottom' | 'left'; point: Point } | null>(null);
  const [tempArrowEnd, setTempArrowEnd] = useState<Point | null>(null);
  
  // Viewport State
  const [pan, setPan] = useState<Point>({ x: 0, y: 0 });
  const [scale, setScale] = useState(1);
  const [isPanning, setIsPanning] = useState(false);
  const [lastMousePos, setLastMousePos] = useState<Point | null>(null);
  const [showGrid, setShowGrid] = useState(true);

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

  // Check if point is inside a group
  const findGroupAtPoint = (pos: Point): string | null => {
    for (const group of groups) {
      if (pos.x >= group.x && pos.x <= group.x + group.width &&
          pos.y >= group.y && pos.y <= group.y + group.height) {
        return group.id;
      }
    }
    return null;
  };

  // Check if point is on group border (for selection)
  const findGroupBorderAtPoint = (pos: Point): { id: string; group: DiagramGroup } | null => {
    const borderThreshold = 10; // pixels
    for (const group of groups) {
      const { x, y, width, height } = group;
      // Check if near border (but not inside)
      const nearLeft = Math.abs(pos.x - x) < borderThreshold && pos.y >= y && pos.y <= y + height;
      const nearRight = Math.abs(pos.x - (x + width)) < borderThreshold && pos.y >= y && pos.y <= y + height;
      const nearTop = Math.abs(pos.y - y) < borderThreshold && pos.x >= x && pos.x <= x + width;
      const nearBottom = Math.abs(pos.y - (y + height)) < borderThreshold && pos.x >= x && pos.x <= x + width;
      
      if (nearLeft || nearRight || nearTop || nearBottom) {
        return { id: group.id, group };
      }
    }
    return null;
  };

  const handleBackgroundMouseDown = (e: React.MouseEvent) => {
    const pos = getMousePos(e); 
    const clientPos = { x: e.clientX, y: e.clientY }; 

    // Check if clicking on group border
    if (selectedTool === ToolType.SELECT) {
      const groupBorder = findGroupBorderAtPoint(pos);
      if (groupBorder) {
        e.stopPropagation();
        setSelectedElementId(null);
        if (setSelectedGroupId) {
          setSelectedGroupId(groupBorder.id);
        }
        setDraggingGroup(groupBorder.id);
        setGroupDragOffset({ x: pos.x - groupBorder.group.x, y: pos.y - groupBorder.group.y });
        setIsDrawing(true);
        return;
      }
    }

    // Middle click or Spacebar (handled by caller usually) or just Select tool on bg
    if (selectedTool === ToolType.SELECT || e.button === 1) {
       setSelectedElementId(null);
       if (setSelectedGroupId) {
         setSelectedGroupId(null);
       }
       setIsPanning(true);
       setLastMousePos(clientPos);
    } else {
       onHistorySave();
       setIsDrawing(true);
       setHasMoved(true);
       setDragStart(pos);
       const newId = `el_${Date.now()}`;
       setCurrentElementId(newId);

       // Check if creating element inside a group
       const groupIdAtPoint = findGroupAtPoint(pos);

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
         lineType: LineType.STRAIGHT, // Default to straight for consistency
         lineStyle: LineStyle.SOLID,
         markerEnd: true,
         groupId: groupIdAtPoint || undefined  // Auto-assign to group if created inside
       };

       setElements(prev => [...prev, newElement]);
    }
  };

  // Check if point is near an element (for connection snapping)
  const findNearestElement = (pos: Point, useExactPosition: boolean = false): { id: string; point: Point } | null => {
    let nearest: { id: string; point: Point; dist: number } | null = null;
    const snapDistance = 50;
    const exactSnapDistance = 30; // Increased from 15 to 30 for easier edge detection

    elements.forEach(el => {
      if (el.type === ToolType.ARROW || el.id === selectedElementId) return;
      
      // Check if point is inside element bounds
      const w = el.width || 0;
      const h = el.height || 0;
      const isInside = pos.x >= el.x && pos.x <= el.x + w && pos.y >= el.y && pos.y <= el.y + h;
      
      // For exact positioning, also check if near the element (expanded boundary)
      const margin = 30; // Extra margin around element for detection
      const isNearElement = pos.x >= el.x - margin && pos.x <= el.x + w + margin && 
                           pos.y >= el.y - margin && pos.y <= el.y + h + margin;
      
      if (isInside || isNearElement || !useExactPosition) {
        const ports = getPorts(el);
        ports.forEach(port => {
          const dist = Math.sqrt(Math.pow(pos.x - port.x, 2) + Math.pow(pos.y - port.y, 2));
          const threshold = useExactPosition ? exactSnapDistance : snapDistance;
          if (dist < threshold && (!nearest || dist < nearest.dist)) {
            nearest = { id: el.id, point: port, dist };
          }
        });
        
        // If inside element but not close to any port, use the element itself
        if (isInside && !nearest && useExactPosition) {
          const centerX = el.x + w / 2;
          const centerY = el.y + h / 2;
          const dist = Math.sqrt(Math.pow(pos.x - centerX, 2) + Math.pow(pos.y - centerY, 2));
          if (!nearest || dist < nearest.dist) {
            nearest = { id: el.id, point: { x: centerX, y: centerY }, dist };
          }
        }
      }
    });

    return nearest ? { id: nearest.id, point: nearest.point } : null;
  };

  const handleElementMouseDown = (e: React.MouseEvent, elementId: string) => {
    if (selectedTool !== ToolType.SELECT) return; 

    e.stopPropagation(); 
    
    const pos = getMousePos(e);
    const element = elements.find(el => el.id === elementId);
    
    if (!element) return;

    // Check if clicking on connection point of selected arrow
    if (element.type === ToolType.ARROW && elementId === selectedElementId) {
      const fromNode = element.fromId ? nodeMap.get(element.fromId) : null;
      const toNode = element.toId ? nodeMap.get(element.toId) : null;
      
      // Calculate connection points
      let fromPoint: Point | null = null;
      let toPoint: Point | null = null;
      
      if (fromNode && toNode) {
        const fromPorts = getPorts(fromNode as DiagramElement);
        const toPorts = getPorts(toNode as DiagramElement);
        // Find closest port pair (simplified)
        fromPoint = fromPorts[2]; // bottom
        toPoint = toPorts[0]; // top
      } else {
        fromPoint = { x: element.x, y: element.y };
        toPoint = { x: element.endX || element.x, y: element.endY || element.y };
      }

      // Check if clicking near connection points
      const fromDist = fromPoint ? Math.sqrt(Math.pow(pos.x - fromPoint.x, 2) + Math.pow(pos.y - fromPoint.y, 2)) : Infinity;
      const toDist = toPoint ? Math.sqrt(Math.pow(pos.x - toPoint.x, 2) + Math.pow(pos.y - toPoint.y, 2)) : Infinity;
      const handleRadius = 15;

      if (fromDist < handleRadius) {
        setDraggingConnectionPoint('from');
        setTempConnectionPoint(pos);
        setIsDrawing(true);
        return;
      } else if (toDist < handleRadius) {
        setDraggingConnectionPoint('to');
        setTempConnectionPoint(pos);
        setIsDrawing(true);
        return;
      }
    }
    
    // Check if clicking on resize handle or connection point
    const isElementSelected = elementId === selectedElementId;
    if (isElementSelected && element.type !== ToolType.ARROW && element.type !== ToolType.TEXT) {
      const w = element.width || 0;
      const h = element.height || 0;
      const threshold = 15; // Click detection area
      
      // Calculate corner positions for resize
      const corners = {
        nw: { x: element.x, y: element.y },
        ne: { x: element.x + w, y: element.y },
        sw: { x: element.x, y: element.y + h },
        se: { x: element.x + w, y: element.y + h }
      };
      
      // Check which corner is clicked (resize handles have priority)
      for (const [corner, cornerPos] of Object.entries(corners)) {
        const dist = Math.sqrt(Math.pow(pos.x - cornerPos.x, 2) + Math.pow(pos.y - cornerPos.y, 2));
        if (dist < threshold) {
          e.stopPropagation();
          setResizingHandle(corner as 'nw' | 'ne' | 'sw' | 'se');
          setResizeStartSize({ width: w, height: h, x: element.x, y: element.y });
          setDragStart(pos);
          setIsDrawing(true);
          setHasMoved(false);
          onHistorySave();
          return;
        }
      }
      
      // Check connection points (midpoints of edges)
      const connectionPoints = {
        top: { x: element.x + w / 2, y: element.y },
        right: { x: element.x + w, y: element.y + h / 2 },
        bottom: { x: element.x + w / 2, y: element.y + h },
        left: { x: element.x, y: element.y + h / 2 }
      };
      
      for (const [port, portPos] of Object.entries(connectionPoints)) {
        const dist = Math.sqrt(Math.pow(pos.x - portPos.x, 2) + Math.pow(pos.y - portPos.y, 2));
        if (dist < threshold) {
          e.stopPropagation();
          setCreatingArrowFrom({ 
            elementId: elementId, 
            port: port as 'top' | 'right' | 'bottom' | 'left',
            point: portPos
          });
          setTempArrowEnd(portPos);
          setDragStart(portPos);
          setIsDrawing(true);
          setHasMoved(false);
          onHistorySave();
          return;
        }
      }
    }
    
    // Normal element selection/dragging
    setSelectedElementId(elementId);
    if (setSelectedGroupId) {
      setSelectedGroupId(null); // Clear group selection when selecting element
    }
    setDragStart(pos);
    setDragOffset({ x: pos.x - element.x, y: pos.y - element.y });
    setIsDrawing(true);
    setHasMoved(false);
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

    // Handle creating arrow from connection point
    if (creatingArrowFrom) {
      setTempArrowEnd(pos);
      
      // Check for snapping to nearby elements
      const nearest = findNearestElement(pos);
      setHoveredElementId(nearest?.id || null);
      
      return;
    }

    // Handle connection point dragging
    if (draggingConnectionPoint && selectedElementId) {
      setTempConnectionPoint(pos);
      
      // Check for snapping to nearby elements
      const nearest = findNearestElement(pos);
      setHoveredElementId(nearest?.id || null);
      
      return;
    }

    // Handle resize
    if (resizingHandle && resizeStartSize && selectedElementId) {
      const element = elements.find(el => el.id === selectedElementId);
      if (element && (element.type === ToolType.RECTANGLE || element.type === ToolType.CIRCLE)) {
        const dx = pos.x - dragStart.x;
        const dy = pos.y - dragStart.y;
        
        let newX = resizeStartSize.x;
        let newY = resizeStartSize.y;
        let newWidth = resizeStartSize.width;
        let newHeight = resizeStartSize.height;
        
        switch (resizingHandle) {
          case 'nw': // Top-left
            newX = resizeStartSize.x + dx;
            newY = resizeStartSize.y + dy;
            newWidth = resizeStartSize.width - dx;
            newHeight = resizeStartSize.height - dy;
            break;
          case 'ne': // Top-right
            newY = resizeStartSize.y + dy;
            newWidth = resizeStartSize.width + dx;
            newHeight = resizeStartSize.height - dy;
            break;
          case 'sw': // Bottom-left
            newX = resizeStartSize.x + dx;
            newWidth = resizeStartSize.width - dx;
            newHeight = resizeStartSize.height + dy;
            break;
          case 'se': // Bottom-right
            newWidth = resizeStartSize.width + dx;
            newHeight = resizeStartSize.height + dy;
            break;
        }
        
        // Ensure minimum size
        if (newWidth < 20) {
          if (resizingHandle === 'nw' || resizingHandle === 'sw') {
            newX = resizeStartSize.x + resizeStartSize.width - 20;
          }
          newWidth = 20;
        }
        if (newHeight < 20) {
          if (resizingHandle === 'nw' || resizingHandle === 'ne') {
            newY = resizeStartSize.y + resizeStartSize.height - 20;
          }
          newHeight = 20;
        }
        
        setElements(prev => prev.map(el => 
          el.id === selectedElementId 
            ? { ...el, x: newX, y: newY, width: newWidth, height: newHeight }
            : el
        ));
      }
      return;
    }

    // Handle group dragging
    if (draggingGroup && groupDragOffset) {
      const group = groups.find(g => g.id === draggingGroup);
      if (group) {
        // Save history on first move
        if (!hasMoved) {
          onHistorySave();
          setHasMoved(true);
        }
        
        const dx = pos.x - group.x - groupDragOffset.x;
        const dy = pos.y - group.y - groupDragOffset.y;
        
        // Move all elements in the group
        setElements(prev => prev.map(el => {
          if (el.groupId === draggingGroup && el.type !== ToolType.ARROW) {
            return { ...el, x: el.x + dx, y: el.y + dy };
          }
          return el;
        }));
        
        // Update drag offset for next move
        setGroupDragOffset({ x: pos.x - group.x, y: pos.y - group.y });
      }
      return;
    }

    if (!isDrawing || !dragStart) return;

    if (!hasMoved && (Math.abs(pos.x - dragStart.x) > 2 || Math.abs(pos.y - dragStart.y) > 2)) {
      if (selectedTool === ToolType.SELECT && selectedElementId) {
         onHistorySave();
      }
      setHasMoved(true);
    }

    if (selectedTool === ToolType.SELECT && selectedElementId && !resizingHandle) {
      // Check if dragging element into a group
      const groupIdAtPoint = findGroupAtPoint(pos);
      const currentElement = elements.find(el => el.id === selectedElementId);
      
      setElements(prev => prev.map(el => {
        if (el.id === selectedElementId) {
          const updates: Partial<DiagramElement> = {};
          
          if (el.type === ToolType.ARROW) {
             const dx = pos.x - dragStart.x;
             const dy = pos.y - dragStart.y;
             updates.x = el.x + dx;
             updates.y = el.y + dy;
             updates.endX = (el.endX || 0) + dx;
             updates.endY = (el.endY || 0) + dy;
          } else {
            updates.x = pos.x - (dragOffset?.x || 0);
            updates.y = pos.y - (dragOffset?.y || 0);
            
            // Auto-assign to group if dragged into group area (only for non-arrow elements)
            if (groupIdAtPoint && el.type !== ToolType.ARROW) {
              updates.groupId = groupIdAtPoint;
            } else if (!groupIdAtPoint && currentElement?.groupId) {
              // If dragged out of group, check if still inside
              const stillInGroup = findGroupAtPoint({ 
                x: updates.x! + (el.width || 0) / 2, 
                y: updates.y! + (el.height || 0) / 2 
              });
              if (!stillInGroup) {
                updates.groupId = undefined;
              }
            }
          }
          
          return { ...el, ...updates };
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
    // Handle creating arrow from connection point
    if (creatingArrowFrom && tempArrowEnd) {
      const fromElement = elements.find(el => el.id === creatingArrowFrom.elementId);
      if (fromElement) {
        // Check if user dragged to an element (within bounds or very close to port)
        const nearest = findNearestElement(tempArrowEnd, true);
        
        // Don't connect to the same element
        const toId = nearest && nearest.id !== creatingArrowFrom.elementId ? nearest.id : undefined;
        
        // If connected to an element (toId exists), don't set endX/endY - use smart anchors
        // If not connected, use manual coordinates
        const newArrow: DiagramElement = {
          id: `el_${Date.now()}`,
          type: ToolType.ARROW,
          x: creatingArrowFrom.point.x,
          y: creatingArrowFrom.point.y,
          endX: toId ? undefined : tempArrowEnd.x, // Only set if not connected to element
          endY: toId ? undefined : tempArrowEnd.y, // Only set if not connected to element
          fromId: creatingArrowFrom.elementId,
          toId: toId, // Set toId if dragged to an element
          strokeColor: '#94a3b8',
          fillColor: 'transparent',
          strokeWidth: 2,
          lineType: LineType.STRAIGHT,
          lineStyle: LineStyle.SOLID,
          markerEnd: true
        };
        
        setElements(prev => [...prev, newArrow]);
        setSelectedElementId(newArrow.id);
      }
      
      setCreatingArrowFrom(null);
      setTempArrowEnd(null);
      setHoveredElementId(null);
    }
    
    // Handle connection point drag end
    if (draggingConnectionPoint && selectedElementId && tempConnectionPoint) {
      const arrowElement = elements.find(el => el.id === selectedElementId);
      if (arrowElement && arrowElement.type === ToolType.ARROW) {
        const nearest = findNearestElement(tempConnectionPoint);
        
        if (draggingConnectionPoint === 'from') {
          // First check if dragging to the same element (by checking bounds)
          let isSameElement = false;
          if (arrowElement.fromId) {
            const fromNode = nodeMap.get(arrowElement.fromId) as DiagramElement | undefined;
            if (fromNode) {
              const w = fromNode.width || 0;
              const h = fromNode.height || 0;
              const isInside = tempConnectionPoint!.x >= fromNode.x && 
                               tempConnectionPoint!.x <= fromNode.x + w && 
                               tempConnectionPoint!.y >= fromNode.y && 
                               tempConnectionPoint!.y <= fromNode.y + h;
              isSameElement = isInside;
            }
          }
          
          if (isSameElement && arrowElement.fromId) {
            // Dragging to same element - always use user's actual position
            onHistorySave();
            setElements(prev => prev.map(el => 
              el.id === selectedElementId 
                ? { ...el, fromId: arrowElement.fromId, x: tempConnectionPoint!.x, y: tempConnectionPoint!.y }
                : el
            ));
          } else if (nearest) {
            // Dragging to different element - check which port area user is targeting
            const fromNode = nodeMap.get(nearest.id) as DiagramElement | undefined;
            if (fromNode) {
              const ports = getPorts(fromNode);
              const w = fromNode.width || 0;
              const h = fromNode.height || 0;
              
              // Check which region of the element the user is targeting
              const relX = tempConnectionPoint!.x - fromNode.x;
              const relY = tempConnectionPoint!.y - fromNode.y;
              const portThreshold = 30; // Increased threshold for easier snapping
              
              let targetPort: Point | null = null;
              
              // Check if in top region (top 30% of element)
              if (relY < h * 0.3) {
                targetPort = ports[0]; // Top port
              }
              // Check if in bottom region (bottom 30% of element)
              else if (relY > h * 0.7) {
                targetPort = ports[2]; // Bottom port
              }
              // Check if in left region (left 30% of element)
              else if (relX < w * 0.3) {
                targetPort = ports[3]; // Left port
              }
              // Check if in right region (right 30% of element)
              else if (relX > w * 0.7) {
                targetPort = ports[1]; // Right port
              }
              
              // Also check if very close to any port
              let closestPort: Point | null = null;
              let minDist = Infinity;
              ports.forEach(port => {
                const dist = Math.sqrt(Math.pow(tempConnectionPoint!.x - port.x, 2) + Math.pow(tempConnectionPoint!.y - port.y, 2));
                if (dist < portThreshold && dist < minDist) {
                  minDist = dist;
                  closestPort = port;
                }
              });
              
              // Prefer region-based port, but use closest if very close
              const finalPort = closestPort && minDist < 15 ? closestPort : targetPort;
              
              if (finalPort) {
                // Use smart connection with specific port
                onHistorySave();
                setElements(prev => prev.map(el => 
                  el.id === selectedElementId 
                    ? { ...el, fromId: nearest.id, x: finalPort.x, y: finalPort.y }
                    : el
                ));
              } else {
                // On element but not in port region - use user's position
                onHistorySave();
                setElements(prev => prev.map(el => 
                  el.id === selectedElementId 
                    ? { ...el, fromId: nearest.id, x: tempConnectionPoint!.x, y: tempConnectionPoint!.y }
                    : el
                ));
              }
            } else {
              // Fallback - use smart connection
              onHistorySave();
              setElements(prev => prev.map(el => 
                el.id === selectedElementId 
                  ? { ...el, fromId: nearest.id, x: undefined, y: undefined }
                  : el
              ));
            }
          } else {
            // Use manual coordinates - clear fromId
            onHistorySave();
            setElements(prev => prev.map(el => 
              el.id === selectedElementId 
                ? { ...el, x: tempConnectionPoint!.x, y: tempConnectionPoint!.y, fromId: undefined }
                : el
            ));
          }
        } else {
          // Dragging 'to' connection point
          // First check if dragging to the same element (by checking bounds)
          let isSameElement = false;
          if (arrowElement.toId) {
            const toNode = nodeMap.get(arrowElement.toId) as DiagramElement | undefined;
            if (toNode) {
              const w = toNode.width || 0;
              const h = toNode.height || 0;
              const isInside = tempConnectionPoint!.x >= toNode.x && 
                               tempConnectionPoint!.x <= toNode.x + w && 
                               tempConnectionPoint!.y >= toNode.y && 
                               tempConnectionPoint!.y <= toNode.y + h;
              isSameElement = isInside;
            }
          }
          
          if (isSameElement && arrowElement.toId) {
            // Dragging to same element - always use user's actual position
            onHistorySave();
            setElements(prev => prev.map(el => 
              el.id === selectedElementId 
                ? { ...el, toId: arrowElement.toId, endX: tempConnectionPoint!.x, endY: tempConnectionPoint!.y }
                : el
            ));
          } else if (nearest) {
            // Dragging to different element - check which port area user is targeting
            const toNode = nodeMap.get(nearest.id) as DiagramElement | undefined;
            if (toNode) {
              const ports = getPorts(toNode);
              const w = toNode.width || 0;
              const h = toNode.height || 0;
              
              // Check which region of the element the user is targeting
              const relX = tempConnectionPoint!.x - toNode.x;
              const relY = tempConnectionPoint!.y - toNode.y;
              const portThreshold = 30; // Increased threshold for easier snapping
              
              let targetPort: Point | null = null;
              
              // Check if in top region (top 30% of element)
              if (relY < h * 0.3) {
                targetPort = ports[0]; // Top port
              }
              // Check if in bottom region (bottom 30% of element)
              else if (relY > h * 0.7) {
                targetPort = ports[2]; // Bottom port
              }
              // Check if in left region (left 30% of element)
              else if (relX < w * 0.3) {
                targetPort = ports[3]; // Left port
              }
              // Check if in right region (right 30% of element)
              else if (relX > w * 0.7) {
                targetPort = ports[1]; // Right port
              }
              
              // Also check if very close to any port
              let closestPort: Point | null = null;
              let minDist = Infinity;
              ports.forEach(port => {
                const dist = Math.sqrt(Math.pow(tempConnectionPoint!.x - port.x, 2) + Math.pow(tempConnectionPoint!.y - port.y, 2));
                if (dist < portThreshold && dist < minDist) {
                  minDist = dist;
                  closestPort = port;
                }
              });
              
              // Prefer region-based port, but use closest if very close
              const finalPort = closestPort && minDist < 15 ? closestPort : targetPort;
              
              if (finalPort) {
                // Use smart connection with specific port
                onHistorySave();
                setElements(prev => prev.map(el => 
                  el.id === selectedElementId 
                    ? { ...el, toId: nearest.id, endX: finalPort.x, endY: finalPort.y }
                    : el
                ));
              } else {
                // On element but not in port region - use user's position
                onHistorySave();
                setElements(prev => prev.map(el => 
                  el.id === selectedElementId 
                    ? { ...el, toId: nearest.id, endX: tempConnectionPoint!.x, endY: tempConnectionPoint!.y }
                    : el
                ));
              }
            } else {
              // Fallback - use smart connection
              onHistorySave();
              setElements(prev => prev.map(el => 
                el.id === selectedElementId 
                  ? { ...el, toId: nearest.id, endX: undefined, endY: undefined }
                  : el
              ));
            }
          } else {
            // Use manual coordinates - clear toId
            onHistorySave();
            setElements(prev => prev.map(el => 
              el.id === selectedElementId 
                ? { ...el, endX: tempConnectionPoint!.x, endY: tempConnectionPoint!.y, toId: undefined }
                : el
            ));
          }
        }
      }
      
      setDraggingConnectionPoint(null);
      setTempConnectionPoint(null);
      setHoveredElementId(null);
    }
    
    // Handle resize end
    if (resizingHandle) {
      setResizingHandle(null);
      setResizeStartSize(null);
    }
    
    // Handle group drag end
    if (draggingGroup) {
      setDraggingGroup(null);
      setGroupDragOffset(null);
    }
    
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
  
  // Calculate groups from elements
  const groups = useMemo(() => {
    const groupMap = new Map<string, DiagramGroup>();
    const groupElements = new Map<string, DiagramElement[]>();
    
    // Collect elements by groupId
    elements.forEach(el => {
      if (el.groupId && el.type !== ToolType.ARROW) {
        if (!groupElements.has(el.groupId)) {
          groupElements.set(el.groupId, []);
        }
        groupElements.get(el.groupId)!.push(el);
      }
    });
    
    // Calculate bounding box for each group
    groupElements.forEach((els, groupId) => {
      if (els.length === 0) return;
      
      let minX = Infinity, minY = Infinity, maxX = -Infinity, maxY = -Infinity;
      let groupLabel = '';
      
      els.forEach(el => {
        const x = el.x;
        const y = el.y;
        const w = el.width || 0;
        const h = el.height || 0;
        
        minX = Math.min(minX, x);
        minY = Math.min(minY, y);
        maxX = Math.max(maxX, x + w);
        maxY = Math.max(maxY, y + h);
        
        // Use first element's text as group label if available
        if (!groupLabel && el.text) {
          groupLabel = el.text;
        }
      });
      
      // Add padding
      const padding = 30;
      minX -= padding;
      minY -= padding;
      maxX += padding;
      maxY += padding;
      
      groupMap.set(groupId, {
        id: groupId,
        label: groupLabel || `Group ${groupId.substring(0, 8)}`,
        x: minX,
        y: minY,
        width: maxX - minX,
        height: maxY - minY,
        strokeColor: '#94a3b8',
        fillColor: 'rgba(148, 163, 184, 0.05)',
        strokeWidth: 2,
        strokeDasharray: '8,4'
      });
    });
    
    return Array.from(groupMap.values());
  }, [elements]);
  
  // Sort: Groups first, then arrows last so they draw on top
  const sortedElements = [...elements].sort((a, b) => {
    if (a.type === ToolType.ARROW && b.type !== ToolType.ARROW) return 1;
    if (a.type !== ToolType.ARROW && b.type === ToolType.ARROW) return -1;
    return 0;
  });

  return (
    <div 
      className={`flex-1 h-full bg-gray-50 overflow-hidden relative ${showGrid ? 'bg-grid-pattern' : ''}`}
      style={{ 
        cursor: isPanning ? 'grabbing' : selectedTool === ToolType.SELECT ? 'default' : 'crosshair',
        // Background pattern should move with pan/scale logic if we wanted perfect sync, 
        // but simple pan sync is usually enough for bg.
        backgroundPosition: showGrid ? `${pan.x}px ${pan.y}px` : '0 0',
        backgroundSize: showGrid ? `${20 * scale}px ${20 * scale}px` : 'auto'
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
          {/* Render Groups First */}
          {groups.map(group => {
            const isSelected = selectedGroupId === group.id;
            return (
              <g key={`group-${group.id}`}>
                <rect
                  x={group.x}
                  y={group.y}
                  width={group.width}
                  height={group.height}
                  fill={group.fillColor}
                  stroke={isSelected ? '#2563eb' : group.strokeColor}
                  strokeWidth={isSelected ? group.strokeWidth! + 1 : group.strokeWidth}
                  strokeDasharray={group.strokeDasharray}
                  rx={8}
                  ry={8}
                  style={{ 
                    pointerEvents: selectedTool === ToolType.SELECT ? 'all' : 'none',
                    cursor: selectedTool === ToolType.SELECT ? 'move' : 'default'
                  }}
                  onMouseDown={(e) => {
                    e.stopPropagation();
                    if (selectedTool === ToolType.SELECT && setSelectedGroupId) {
                      setSelectedElementId(null);
                      setSelectedGroupId(group.id);
                      setDraggingGroup(group.id);
                      const pos = getMousePos(e);
                      setGroupDragOffset({ x: pos.x - group.x, y: pos.y - group.y });
                      setIsDrawing(true);
                      onHistorySave(); // Save history when starting to drag group
                    }
                  }}
                />
                <text
                  x={group.x + 12}
                  y={group.y + 20}
                  fontSize="12"
                  fontWeight="600"
                  fill={isSelected ? '#2563eb' : group.strokeColor}
                  style={{ pointerEvents: 'none', userSelect: 'none' }}
                >
                  {group.label}
                </text>
              </g>
            );
          })}
          
          {/* Render temporary arrow being created from connection point */}
          {creatingArrowFrom && tempArrowEnd && (
            <g>
              <path
                d={`M ${creatingArrowFrom.point.x} ${creatingArrowFrom.point.y} L ${tempArrowEnd.x} ${tempArrowEnd.y}`}
                stroke="#10b981"
                strokeWidth="2"
                strokeDasharray="4,4"
                fill="none"
                markerEnd="url(#arrow-end-selected)"
                style={{ pointerEvents: 'none' }}
              />
              {/* Hover indicator for snap target */}
              {hoveredElementId && tempArrowEnd && (() => {
                const nearest = findNearestElement(tempArrowEnd);
                if (nearest && nearest.id === hoveredElementId) {
                  return (
                    <circle
                      cx={nearest.point.x}
                      cy={nearest.point.y}
                      r="10"
                      fill="none"
                      stroke="#10b981"
                      strokeWidth="2"
                      strokeDasharray="4,4"
                      style={{ pointerEvents: 'none' }}
                    />
                  );
                }
                return null;
              })()}
            </g>
          )}

          {/* Render Elements */}
          {sortedElements.map(el => {
            const isSelected = el.id === selectedElementId;

            if (el.type === ToolType.ARROW) {
               let pathData = "";
               let fromPoint: Point = { x: el.x, y: el.y };
               let toPoint: Point = { x: el.endX || el.x, y: el.endY || el.y };

               // Simple logic: Use smart anchors if both fromId and toId exist
               if (el.fromId && el.toId) {
                 const fromNode = nodeMap.get(el.fromId);
                 const toNode = nodeMap.get(el.toId);
                 
                 if (fromNode && toNode) {
                   // Use smart path algorithm
                   pathData = getSmartPath(fromNode as DiagramElement, toNode as DiagramElement, el.lineType || LineType.STRAIGHT);
                   
                   // Calculate the same ports that getSmartPath uses
                   const fromPorts = getPorts(fromNode as DiagramElement);
                   const toPorts = getPorts(toNode as DiagramElement);
                   
                   let minDist = Infinity;
                   let bestFrom = fromPorts[2];
                   let bestTo = toPorts[0];
                   for (const fp of fromPorts) {
                     for (const tp of toPorts) {
                       const dist = Math.sqrt(Math.pow(fp.x - tp.x, 2) + Math.pow(fp.y - tp.y, 2));
                       if (dist < minDist) {
                         minDist = dist;
                         bestFrom = fp;
                         bestTo = tp;
                       }
                     }
                   }
                   
                   fromPoint = bestFrom;
                   toPoint = bestTo;
                 }
               } else if (el.fromId && !el.toId) {
                 // Connected from element but not to element - use smart port on from, manual end
                 const fromNode = nodeMap.get(el.fromId);
                 if (fromNode) {
                   const fromPorts = getPorts(fromNode as DiagramElement);
                   let bestFrom = fromPorts[2];
                   let minDist = Infinity;
                   for (const fp of fromPorts) {
                     const dist = Math.sqrt(Math.pow(fp.x - el.x, 2) + Math.pow(fp.y - el.y, 2));
                     if (dist < minDist) {
                       minDist = dist;
                       bestFrom = fp;
                     }
                   }
                   fromPoint = bestFrom;
                   toPoint = { x: el.endX || el.x, y: el.endY || el.y };
                   
                   // Generate path
                   if (el.lineType === LineType.STRAIGHT) {
                     pathData = `M ${fromPoint.x} ${fromPoint.y} L ${toPoint.x} ${toPoint.y}`;
                   } else if (el.lineType === LineType.STEP) {
                     const midX = (fromPoint.x + toPoint.x) / 2;
                     pathData = `M ${fromPoint.x} ${fromPoint.y} L ${midX} ${fromPoint.y} L ${midX} ${toPoint.y} L ${toPoint.x} ${toPoint.y}`;
                   } else {
                     // CURVE
                     const dist = Math.sqrt(Math.pow(fromPoint.x - toPoint.x, 2) + Math.pow(fromPoint.y - toPoint.y, 2));
                     const controlDist = Math.min(dist * 0.5, 150);
                     const dx = toPoint.x - fromPoint.x;
                     const dy = toPoint.y - fromPoint.y;
                     const angle = Math.atan2(dy, dx);
                     const cp1x = fromPoint.x + Math.cos(angle) * controlDist;
                     const cp1y = fromPoint.y + Math.sin(angle) * controlDist;
                     const cp2x = toPoint.x - Math.cos(angle) * controlDist;
                     const cp2y = toPoint.y - Math.sin(angle) * controlDist;
                     pathData = `M ${fromPoint.x} ${fromPoint.y} C ${cp1x} ${cp1y}, ${cp2x} ${cp2y}, ${toPoint.x} ${toPoint.y}`;
                   }
                 }
               }
               
               // Fallback if not connected or smart path failed (e.g. during manual drawing)
               if (!pathData) {
                   // Manual Arrow drawing fallback - respect lineType
                   const lineType = el.lineType || LineType.STRAIGHT;
                   if (lineType === LineType.STRAIGHT) {
                     pathData = `M ${fromPoint.x} ${fromPoint.y} L ${toPoint.x} ${toPoint.y}`;
                   } else if (lineType === LineType.STEP) {
                     const midX = (fromPoint.x + toPoint.x) / 2;
                     pathData = `M ${fromPoint.x} ${fromPoint.y} L ${midX} ${fromPoint.y} L ${midX} ${toPoint.y} L ${toPoint.x} ${toPoint.y}`;
                   } else {
                     // CURVE
                     const dist = Math.sqrt(Math.pow(fromPoint.x - toPoint.x, 2) + Math.pow(fromPoint.y - toPoint.y, 2));
                     const controlDist = Math.min(dist * 0.5, 150);
                     const dx = toPoint.x - fromPoint.x;
                     const dy = toPoint.y - fromPoint.y;
                     const angle = Math.atan2(dy, dx);
                     const cp1x = fromPoint.x + Math.cos(angle) * controlDist;
                     const cp1y = fromPoint.y + Math.sin(angle) * controlDist;
                     const cp2x = toPoint.x - Math.cos(angle) * controlDist;
                     const cp2y = toPoint.y - Math.sin(angle) * controlDist;
                     pathData = `M ${fromPoint.x} ${fromPoint.y} C ${cp1x} ${cp1y}, ${cp2x} ${cp2y}, ${toPoint.x} ${toPoint.y}`;
                   }
               }

               // Handle dragging connection point - show temporary line (respect lineType)
               const isDraggingConnection = isSelected && draggingConnectionPoint && tempConnectionPoint;
               if (isDraggingConnection) {
                 const lineType = el.lineType || LineType.CURVE;
                 if (draggingConnectionPoint === 'from') {
                   fromPoint = tempConnectionPoint;
                   if (lineType === LineType.STRAIGHT) {
                     pathData = `M ${fromPoint.x} ${fromPoint.y} L ${toPoint.x} ${toPoint.y}`;
                   } else if (lineType === LineType.STEP) {
                     const midX = (fromPoint.x + toPoint.x) / 2;
                     pathData = `M ${fromPoint.x} ${fromPoint.y} L ${midX} ${fromPoint.y} L ${midX} ${toPoint.y} L ${toPoint.x} ${toPoint.y}`;
                   } else {
                     // CURVE
                     const dist = Math.sqrt(Math.pow(fromPoint.x - toPoint.x, 2) + Math.pow(fromPoint.y - toPoint.y, 2));
                     const controlDist = Math.min(dist * 0.5, 150);
                     const dx = toPoint.x - fromPoint.x;
                     const dy = toPoint.y - fromPoint.y;
                     const angle = Math.atan2(dy, dx);
                     const cp1x = fromPoint.x + Math.cos(angle) * controlDist;
                     const cp1y = fromPoint.y + Math.sin(angle) * controlDist;
                     const cp2x = toPoint.x - Math.cos(angle) * controlDist;
                     const cp2y = toPoint.y - Math.sin(angle) * controlDist;
                     pathData = `M ${fromPoint.x} ${fromPoint.y} C ${cp1x} ${cp1y}, ${cp2x} ${cp2y}, ${toPoint.x} ${toPoint.y}`;
                   }
                 } else {
                   toPoint = tempConnectionPoint;
                   if (lineType === LineType.STRAIGHT) {
                     pathData = `M ${fromPoint.x} ${fromPoint.y} L ${toPoint.x} ${toPoint.y}`;
                   } else if (lineType === LineType.STEP) {
                     const midX = (fromPoint.x + toPoint.x) / 2;
                     pathData = `M ${fromPoint.x} ${fromPoint.y} L ${midX} ${fromPoint.y} L ${midX} ${toPoint.y} L ${toPoint.x} ${toPoint.y}`;
                   } else {
                     // CURVE
                     const dist = Math.sqrt(Math.pow(fromPoint.x - toPoint.x, 2) + Math.pow(fromPoint.y - toPoint.y, 2));
                     const controlDist = Math.min(dist * 0.5, 150);
                     const dx = toPoint.x - fromPoint.x;
                     const dy = toPoint.y - fromPoint.y;
                     const angle = Math.atan2(dy, dx);
                     const cp1x = fromPoint.x + Math.cos(angle) * controlDist;
                     const cp1y = fromPoint.y + Math.sin(angle) * controlDist;
                     const cp2x = toPoint.x - Math.cos(angle) * controlDist;
                     const cp2y = toPoint.y - Math.sin(angle) * controlDist;
                     pathData = `M ${fromPoint.x} ${fromPoint.y} C ${cp1x} ${cp1y}, ${cp2x} ${cp2y}, ${toPoint.x} ${toPoint.y}`;
                   }
                 }
               }

               const strokeDash = el.lineStyle === LineStyle.DASHED ? "8,8" : el.lineStyle === LineStyle.DOTTED ? "3,3" : "none";
               const tempStrokeDash = isDraggingConnection ? "4,4" : strokeDash;

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
                      style={{ pointerEvents: draggingConnectionPoint ? 'none' : 'stroke' }}
                    />
                    {/* Actual Line */}
                    <path
                      d={pathData}
                      stroke={isDraggingConnection ? '#10b981' : (isSelected ? '#2563eb' : el.strokeColor)}
                      strokeWidth={isDraggingConnection ? el.strokeWidth + 1 : el.strokeWidth}
                      strokeDasharray={tempStrokeDash}
                      fill="none"
                      markerEnd={el.markerEnd && !isDraggingConnection ? (isSelected ? "url(#arrow-end-selected)" : "url(#arrow-end)") : undefined}
                      markerStart={el.markerStart && !isDraggingConnection ? "url(#arrow-start)" : undefined}
                      style={{ pointerEvents: 'none' }}
                    />
                    
                    {/* Connection Point Handles (only when selected and points are valid) */}
                    {isSelected && !draggingConnectionPoint && fromPoint && toPoint && 
                     !isNaN(fromPoint.x) && !isNaN(fromPoint.y) && !isNaN(toPoint.x) && !isNaN(toPoint.y) && (
                      <>
                        {/* From handle */}
                        <circle
                          cx={fromPoint.x}
                          cy={fromPoint.y}
                          r="8"
                          fill="#2563eb"
                          stroke="white"
                          strokeWidth="2"
                          style={{ cursor: 'grab', pointerEvents: 'all' }}
                          onMouseDown={(e) => {
                            e.stopPropagation();
                            setDraggingConnectionPoint('from');
                            setTempConnectionPoint(fromPoint);
                            setIsDrawing(true);
                          }}
                        />
                        {/* To handle */}
                        <circle
                          cx={toPoint.x}
                          cy={toPoint.y}
                          r="8"
                          fill="#2563eb"
                          stroke="white"
                          strokeWidth="2"
                          style={{ cursor: 'grab', pointerEvents: 'all' }}
                          onMouseDown={(e) => {
                            e.stopPropagation();
                            setDraggingConnectionPoint('to');
                            setTempConnectionPoint(toPoint);
                            setIsDrawing(true);
                          }}
                        />
                      </>
                    )}
                    
                    {/* Hover indicator for snap target */}
                    {draggingConnectionPoint && hoveredElementId && tempConnectionPoint && (() => {
                      const nearest = findNearestElement(tempConnectionPoint);
                      if (nearest && nearest.id === hoveredElementId) {
                        return (
                          <circle
                            cx={nearest.point.x}
                            cy={nearest.point.y}
                            r="10"
                            fill="none"
                            stroke="#10b981"
                            strokeWidth="2"
                            strokeDasharray="4,4"
                            style={{ pointerEvents: 'none' }}
                          />
                        );
                      }
                      return null;
                    })()}
                    
                    {el.text && (
                       // Simplified text placement at 50% of path would be complex for bezier, 
                       // so we approximate center between start/end for now
                       <foreignObject 
                        x={(fromPoint.x + toPoint.x)/2 - 40} 
                        y={(fromPoint.y + toPoint.y)/2 - 15} 
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
                  <>
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
                   {/* Resize Handles */}
                   {(el.type === ToolType.RECTANGLE || el.type === ToolType.CIRCLE) && (
                     <>
                       {/* Top-left */}
                       <circle
                         cx={el.x}
                         cy={el.y}
                         r="6"
                         fill="#3b82f6"
                         stroke="white"
                         strokeWidth="2"
                         style={{ cursor: 'nwse-resize', pointerEvents: 'all' }}
                         onMouseDown={(e) => {
                           e.stopPropagation();
                           setResizingHandle('nw');
                           setResizeStartSize({ width: el.width || 0, height: el.height || 0, x: el.x, y: el.y });
                           const pos = getMousePos(e);
                           setDragStart(pos);
                           setIsDrawing(true);
                           onHistorySave();
                         }}
                       />
                       {/* Top-right */}
                       <circle
                         cx={el.x + (el.width || 0)}
                         cy={el.y}
                         r="6"
                         fill="#3b82f6"
                         stroke="white"
                         strokeWidth="2"
                         style={{ cursor: 'nesw-resize', pointerEvents: 'all' }}
                         onMouseDown={(e) => {
                           e.stopPropagation();
                           setResizingHandle('ne');
                           setResizeStartSize({ width: el.width || 0, height: el.height || 0, x: el.x, y: el.y });
                           const pos = getMousePos(e);
                           setDragStart(pos);
                           setIsDrawing(true);
                           onHistorySave();
                         }}
                       />
                       {/* Bottom-left */}
                       <circle
                         cx={el.x}
                         cy={el.y + (el.height || 0)}
                         r="6"
                         fill="#3b82f6"
                         stroke="white"
                         strokeWidth="2"
                         style={{ cursor: 'nesw-resize', pointerEvents: 'all' }}
                         onMouseDown={(e) => {
                           e.stopPropagation();
                           setResizingHandle('sw');
                           setResizeStartSize({ width: el.width || 0, height: el.height || 0, x: el.x, y: el.y });
                           const pos = getMousePos(e);
                           setDragStart(pos);
                           setIsDrawing(true);
                           onHistorySave();
                         }}
                       />
                       {/* Bottom-right */}
                       <circle
                         cx={el.x + (el.width || 0)}
                         cy={el.y + (el.height || 0)}
                         r="6"
                         fill="#3b82f6"
                         stroke="white"
                         strokeWidth="2"
                         style={{ cursor: 'nwse-resize', pointerEvents: 'all' }}
                         onMouseDown={(e) => {
                           e.stopPropagation();
                           setResizingHandle('se');
                           setResizeStartSize({ width: el.width || 0, height: el.height || 0, x: el.x, y: el.y });
                           const pos = getMousePos(e);
                           setDragStart(pos);
                           setIsDrawing(true);
                           onHistorySave();
                         }}
                       />
                     </>
                   )}
                   
                   {/* Connection Points (midpoints of edges) */}
                   {el.type !== ToolType.ARROW && (
                     <>
                       {/* Top */}
                       <circle
                         cx={el.x + (el.width || 0) / 2}
                         cy={el.y}
                         r="6"
                         fill="#10b981"
                         stroke="white"
                         strokeWidth="2"
                         style={{ cursor: 'crosshair', pointerEvents: 'all' }}
                         onMouseDown={(e) => {
                           e.stopPropagation();
                           const pos = getMousePos(e);
                           setCreatingArrowFrom({ 
                             elementId: el.id, 
                             port: 'top',
                             point: { x: el.x + (el.width || 0) / 2, y: el.y }
                           });
                           setTempArrowEnd({ x: el.x + (el.width || 0) / 2, y: el.y });
                           setDragStart(pos);
                           setIsDrawing(true);
                           onHistorySave();
                         }}
                       />
                       {/* Right */}
                       <circle
                         cx={el.x + (el.width || 0)}
                         cy={el.y + (el.height || 0) / 2}
                         r="6"
                         fill="#10b981"
                         stroke="white"
                         strokeWidth="2"
                         style={{ cursor: 'crosshair', pointerEvents: 'all' }}
                         onMouseDown={(e) => {
                           e.stopPropagation();
                           const pos = getMousePos(e);
                           setCreatingArrowFrom({ 
                             elementId: el.id, 
                             port: 'right',
                             point: { x: el.x + (el.width || 0), y: el.y + (el.height || 0) / 2 }
                           });
                           setTempArrowEnd({ x: el.x + (el.width || 0), y: el.y + (el.height || 0) / 2 });
                           setDragStart(pos);
                           setIsDrawing(true);
                           onHistorySave();
                         }}
                       />
                       {/* Bottom */}
                       <circle
                         cx={el.x + (el.width || 0) / 2}
                         cy={el.y + (el.height || 0)}
                         r="6"
                         fill="#10b981"
                         stroke="white"
                         strokeWidth="2"
                         style={{ cursor: 'crosshair', pointerEvents: 'all' }}
                         onMouseDown={(e) => {
                           e.stopPropagation();
                           const pos = getMousePos(e);
                           setCreatingArrowFrom({ 
                             elementId: el.id, 
                             port: 'bottom',
                             point: { x: el.x + (el.width || 0) / 2, y: el.y + (el.height || 0) }
                           });
                           setTempArrowEnd({ x: el.x + (el.width || 0) / 2, y: el.y + (el.height || 0) });
                           setDragStart(pos);
                           setIsDrawing(true);
                           onHistorySave();
                         }}
                       />
                       {/* Left */}
                       <circle
                         cx={el.x}
                         cy={el.y + (el.height || 0) / 2}
                         r="6"
                         fill="#10b981"
                         stroke="white"
                         strokeWidth="2"
                         style={{ cursor: 'crosshair', pointerEvents: 'all' }}
                         onMouseDown={(e) => {
                           e.stopPropagation();
                           const pos = getMousePos(e);
                           setCreatingArrowFrom({ 
                             elementId: el.id, 
                             port: 'left',
                             point: { x: el.x, y: el.y + (el.height || 0) / 2 }
                           });
                           setTempArrowEnd({ x: el.x, y: el.y + (el.height || 0) / 2 });
                           setDragStart(pos);
                           setIsDrawing(true);
                           onHistorySave();
                         }}
                       />
                     </>
                   )}
                  </>
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
         <div className="w-px bg-gray-200 my-1 mx-1"></div>
         <button 
          onClick={() => setShowGrid(!showGrid)}
          className={`p-2 rounded text-gray-600 transition-colors ${showGrid ? 'bg-blue-50 text-blue-600' : 'hover:bg-gray-100'}`}
          title={showGrid ? "隐藏网格" : "显示网格"}
        >
          <svg width="20" height="20" viewBox="0 0 20 20" fill="none" xmlns="http://www.w3.org/2000/svg">
            <path d="M2 2h4v4H2V2zm6 0h4v4H8V2zm6 0h4v4h-4V2zM2 8h4v4H2V8zm6 0h4v4H8V8zm6 0h4v4h-4V8zM2 14h4v4H2v-4zm6 0h4v4H8v-4zm6 0h4v4h-4v-4z" stroke="currentColor" strokeWidth="1.5" fill="none"/>
          </svg>
        </button>
      </div>
    </div>
  );
};