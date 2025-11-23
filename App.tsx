import React, { useState, useEffect, useCallback } from 'react';
import { Toolbar } from './components/Toolbar';
import { PropertiesPanel } from './components/PropertiesPanel';
import { Canvas } from './components/Canvas';
import { GeminiInput } from './components/GeminiInput';
import { DiagramElement, ToolType } from './types';
import { FileImage, Trash2, CheckCircle2, AlertCircle, RotateCcw, RotateCw } from 'lucide-react';

const STORAGE_KEY = 'paperplot-elements-v1';

const App: React.FC = () => {
  const [elements, setElements] = useState<DiagramElement[]>([]);
  const [selectedTool, setSelectedTool] = useState<ToolType>(ToolType.SELECT);
  const [selectedElementId, setSelectedElementId] = useState<string | null>(null);
  const [isLoaded, setIsLoaded] = useState(false);
  const [confirmClear, setConfirmClear] = useState(false);
  const [saveStatus, setSaveStatus] = useState<'saved' | 'saving'>('saved');

  // History Stacks
  const [past, setPast] = useState<DiagramElement[][]>([]);
  const [future, setFuture] = useState<DiagramElement[][]>([]);

  // Load from local storage on mount
  useEffect(() => {
    const saved = localStorage.getItem(STORAGE_KEY);
    if (saved) {
      try {
        setElements(JSON.parse(saved));
      } catch (e) {
        console.error("Failed to parse saved diagram", e);
      }
    }
    setIsLoaded(true);
  }, []);

  // Save to local storage whenever elements change
  useEffect(() => {
    if (isLoaded) {
      setSaveStatus('saving');
      const timer = setTimeout(() => {
        localStorage.setItem(STORAGE_KEY, JSON.stringify(elements));
        setSaveStatus('saved');
      }, 500); // Debounce save slightly
      return () => clearTimeout(timer);
    }
  }, [elements, isLoaded]);

  // --- History Logic ---

  const saveToHistory = useCallback(() => {
    setPast(prev => [...prev, elements]);
    setFuture([]);
  }, [elements]);

  const handleUndo = useCallback(() => {
    if (past.length === 0) return;
    const previous = past[past.length - 1];
    const newPast = past.slice(0, -1);
    
    setFuture(prev => [elements, ...prev]);
    setElements(previous);
    setPast(newPast);
  }, [elements, past]);

  const handleRedo = useCallback(() => {
    if (future.length === 0) return;
    const next = future[0];
    const newFuture = future.slice(1);

    setPast(prev => [...prev, elements]);
    setElements(next);
    setFuture(newFuture);
  }, [elements, future]);

  // Keyboard Shortcuts
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if ((e.metaKey || e.ctrlKey) && e.key === 'z') {
        e.preventDefault();
        if (e.shiftKey) {
          handleRedo();
        } else {
          handleUndo();
        }
      }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [handleUndo, handleRedo]);


  const updateSelectedElement = (updates: Partial<DiagramElement>, saveHistory: boolean = true) => {
    if (!selectedElementId) return;
    
    if (saveHistory) {
      saveToHistory();
    }

    setElements(prev => prev.map(el =>
      el.id === selectedElementId ? { ...el, ...updates } : el
    ));
  };

  const deleteSelectedElement = () => {
    if (!selectedElementId) return;
    saveToHistory();
    setElements(prev => prev.filter(el => el.id !== selectedElementId));
    setSelectedElementId(null);
  };

  const handleClearCanvas = () => {
    if (confirmClear) {
      saveToHistory();
      setElements([]);
      setSelectedElementId(null);
      localStorage.removeItem(STORAGE_KEY);
      setConfirmClear(false);
    } else {
      setConfirmClear(true);
      setTimeout(() => setConfirmClear(false), 3000);
    }
  };

  const handleExportSVG = () => {
    // Select the specific canvas SVG by ID
    const svgEl = document.getElementById('paperplot-canvas');
    
    if (!svgEl) {
      alert('Could not find canvas to export.');
      return;
    }
    
    // 1. Clone the node so we can modify it for export
    const clone = svgEl.cloneNode(true) as SVGSVGElement;
    
    // 2. Calculate Bounding Box of the content to ensure everything is visible in the export
    // We get the <g> inside the real SVG to access getBBox()
    const contentGroup = svgEl.querySelector('g');
    let viewBoxStr = "0 0 800 600"; // Default fallback
    
    if (contentGroup) {
        try {
            // getBBox gives the bounding box of the elements in local coords (untransformed)
            const bbox = contentGroup.getBBox();
            if (bbox.width > 0 && bbox.height > 0) {
                const padding = 50;
                viewBoxStr = `${bbox.x - padding} ${bbox.y - padding} ${bbox.width + padding * 2} ${bbox.height + padding * 2}`;
                clone.setAttribute('width', `${bbox.width + padding * 2}`);
                clone.setAttribute('height', `${bbox.height + padding * 2}`);
            }
        } catch (e) {
            console.warn("Could not calculate BBox", e);
        }
    }

    // 3. Apply attributes to the clone
    clone.setAttribute('viewBox', viewBoxStr);
    clone.style.backgroundColor = '#ffffff'; // Ensure white background
    clone.removeAttribute('class'); // Remove tailwind classes that might rely on viewport

    // 4. Remove the pan/zoom transform from the content group in the clone
    // because the viewBox now handles the positioning
    const cloneContentGroup = clone.querySelector('g');
    if (cloneContentGroup) {
        cloneContentGroup.setAttribute('transform', '');
    }

    // 5. Serialize and Download
    const svgData = new XMLSerializer().serializeToString(clone);
    const blob = new Blob([svgData], { type: 'image/svg+xml;charset=utf-8' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.download = `paperplot_${Date.now()}.svg`;
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  return (
    <div className="flex flex-col h-screen w-screen bg-white text-gray-900">
      {/* Header */}
      <header className="h-14 border-b border-gray-200 flex items-center justify-between px-6 bg-white z-30 shadow-sm">
        <div className="flex items-center gap-4">
          <div className="flex items-center gap-2">
            <div className="w-8 h-8 bg-blue-600 rounded-lg flex items-center justify-center text-white font-bold shadow-blue-200 shadow-lg">
              P
            </div>
            <h1 className="font-bold text-xl text-gray-800 tracking-tight">PaperPlot <span className="text-blue-600 font-normal">AI</span></h1>
          </div>
          
          <div className="h-6 w-px bg-gray-200 mx-2"></div>

          {/* History Controls */}
          <div className="flex items-center gap-1">
            <button 
              onClick={handleUndo} 
              disabled={past.length === 0}
              className="p-2 text-gray-600 hover:bg-gray-100 rounded-md disabled:opacity-30 disabled:hover:bg-transparent transition-colors"
              title="Undo (Ctrl+Z)"
            >
              <RotateCcw size={18} />
            </button>
            <button 
              onClick={handleRedo} 
              disabled={future.length === 0}
              className="p-2 text-gray-600 hover:bg-gray-100 rounded-md disabled:opacity-30 disabled:hover:bg-transparent transition-colors"
              title="Redo (Ctrl+Shift+Z)"
            >
              <RotateCw size={18} />
            </button>
          </div>

          {/* Autosave Indicator */}
          <div className="ml-4 flex items-center gap-1.5 px-3 py-1 bg-gray-50 rounded-full border border-gray-100">
            {saveStatus === 'saved' ? (
              <>
                <CheckCircle2 size={12} className="text-green-500" />
                <span className="text-xs text-gray-400 font-medium">Autosaved</span>
              </>
            ) : (
              <>
                <div className="w-3 h-3 rounded-full border-2 border-blue-500 border-t-transparent animate-spin"></div>
                <span className="text-xs text-blue-500 font-medium">Saving...</span>
              </>
            )}
          </div>
        </div>

        <div className="flex items-center gap-3">
          <button
            onClick={handleClearCanvas}
            className={`flex items-center gap-2 px-4 py-2 text-sm font-medium rounded-md transition-all duration-200 ${
              confirmClear 
                ? 'bg-red-600 text-white hover:bg-red-700 shadow-red-200 shadow-md animate-pulse' 
                : 'text-red-600 hover:bg-red-50'
            }`}
            title={confirmClear ? "Click again to confirm" : "Clear Canvas"}
          >
            {confirmClear ? <AlertCircle size={16} /> : <Trash2 size={16} />}
            {confirmClear ? "Confirm Clear?" : "Clear"}
          </button>
          
          <div className="h-6 w-px bg-gray-200"></div>
          
          <button
            onClick={handleExportSVG}
            className="flex items-center gap-2 px-4 py-2 text-sm font-medium text-gray-700 bg-gray-100 hover:bg-gray-200 rounded-md transition-colors"
          >
            <FileImage size={16} />
            Export SVG
          </button>
        </div>
      </header>

      {/* Main Content */}
      <div className="flex flex-1 overflow-hidden relative">
        {/* Left: Toolbar */}
        <Toolbar selectedTool={selectedTool} setSelectedTool={setSelectedTool} />

        {/* Left: Properties Panel (Only visible if element is selected) */}
        <PropertiesPanel
          element={elements.find(el => el.id === selectedElementId) || null}
          updateElement={updateSelectedElement}
          deleteElement={deleteSelectedElement}
          onHistorySave={saveToHistory}
        />

        {/* Center: Canvas */}
        <Canvas
          elements={elements}
          setElements={setElements}
          selectedTool={selectedTool}
          setSelectedTool={setSelectedTool}
          selectedElementId={selectedElementId}
          setSelectedElementId={setSelectedElementId}
          onHistorySave={saveToHistory}
        />

        {/* Right: Gemini AI Input (Always visible) */}
        <GeminiInput 
          onElementsGenerated={(newElements) => {
            saveToHistory(); 
            setElements(prev => [...prev, ...newElements]);
          }} 
        />
      </div>
    </div>
  );
};

export default App;