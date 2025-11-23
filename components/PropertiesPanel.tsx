import React from 'react';
import { DiagramElement, ToolType, LineType, LineStyle } from '../types';
import { ArrowRight, Activity, CornerDownRight, Minus, MoreHorizontal, X } from 'lucide-react';

interface PropertiesPanelProps {
  element: DiagramElement | null;
  updateElement: (updates: Partial<DiagramElement>, saveHistory?: boolean) => void;
  deleteElement: () => void;
  onHistorySave: () => void;
}

export const PropertiesPanel: React.FC<PropertiesPanelProps> = ({ element, updateElement, deleteElement, onHistorySave }) => {
  
  // Helper to update with history trigger
  const handleChange = (updates: Partial<DiagramElement>) => {
    updateElement(updates, true);
  };

  // If no element is selected, do not render anything (remove empty state)
  if (!element) {
    return null;
  }

  return (
    <div className="w-72 bg-white border-r border-gray-200 p-5 flex flex-col gap-6 shadow-sm h-full overflow-y-auto z-10">
      <div className="flex justify-between items-center">
        <h3 className="font-semibold text-gray-800">Properties</h3>
        <button onClick={deleteElement} className="text-red-500 hover:text-red-600 text-sm font-medium bg-red-50 px-2 py-1 rounded">
          Delete
        </button>
      </div>

      <div className="space-y-4">
        {/* Text Content */}
        <div className="flex flex-col gap-1">
          <label className="text-xs font-medium text-gray-500">Label / Text</label>
          <textarea
            value={element.text || ''}
            onFocus={() => onHistorySave()} 
            onChange={(e) => updateElement({ text: e.target.value }, false)} 
            onBlur={() => onHistorySave()}
            className="border rounded-md p-2 text-sm focus:ring-2 focus:ring-blue-500 outline-none resize-y min-h-[60px]"
            placeholder="Enter text..."
          />
        </div>

        {/* Line Specific Properties */}
        {element.type === ToolType.ARROW && (
          <>
            <div className="border-t border-gray-100 pt-4 flex flex-col gap-3">
              <label className="text-xs font-bold text-gray-700">Connection Style</label>
              
              {/* Line Type */}
              <div className="flex gap-1 bg-gray-100 p-1 rounded-md">
                <button
                  title="Straight"
                  onClick={() => handleChange({ lineType: LineType.STRAIGHT })}
                  className={`flex-1 p-1.5 flex justify-center rounded ${element.lineType === LineType.STRAIGHT ? 'bg-white shadow-sm text-blue-600' : 'text-gray-500 hover:bg-gray-200'}`}
                >
                  <Minus size={16} className="rotate-[-45deg]" />
                </button>
                <button
                  title="Curved"
                  onClick={() => handleChange({ lineType: LineType.CURVE })}
                  className={`flex-1 p-1.5 flex justify-center rounded ${element.lineType === LineType.CURVE ? 'bg-white shadow-sm text-blue-600' : 'text-gray-500 hover:bg-gray-200'}`}
                >
                  <Activity size={16} />
                </button>
                <button
                  title="Step"
                  onClick={() => handleChange({ lineType: LineType.STEP })}
                  className={`flex-1 p-1.5 flex justify-center rounded ${element.lineType === LineType.STEP ? 'bg-white shadow-sm text-blue-600' : 'text-gray-500 hover:bg-gray-200'}`}
                >
                  <CornerDownRight size={16} />
                </button>
              </div>

              {/* Line Style (Solid/Dashed) */}
              <div className="flex gap-2">
                <button
                  onClick={() => handleChange({ lineStyle: LineStyle.SOLID })}
                  className={`flex-1 px-2 py-1 text-xs border rounded ${element.lineStyle === LineStyle.SOLID ? 'bg-blue-50 border-blue-200 text-blue-700' : 'border-gray-200 text-gray-600'}`}
                >
                  Solid
                </button>
                <button
                  onClick={() => handleChange({ lineStyle: LineStyle.DASHED })}
                  className={`flex-1 px-2 py-1 text-xs border rounded ${element.lineStyle === LineStyle.DASHED ? 'bg-blue-50 border-blue-200 text-blue-700' : 'border-gray-200 text-gray-600'}`}
                >
                  Dashed
                </button>
              </div>

               {/* Markers */}
               <div className="flex justify-between items-center">
                  <label className="text-xs text-gray-500">Arrowheads</label>
                  <div className="flex gap-2">
                    <button 
                      onClick={() => handleChange({ markerStart: !element.markerStart })}
                      className={`px-2 py-1 text-xs border rounded ${element.markerStart ? 'bg-blue-100 border-blue-300' : 'bg-gray-50'}`}
                    >
                      Start
                    </button>
                     <button 
                      onClick={() => handleChange({ markerEnd: !element.markerEnd })}
                      className={`px-2 py-1 text-xs border rounded ${element.markerEnd ? 'bg-blue-100 border-blue-300' : 'bg-gray-50'}`}
                    >
                      End
                    </button>
                  </div>
               </div>
            </div>
          </>
        )}

        <div className="border-t border-gray-100 pt-4"></div>

        {/* Colors */}
        <div className="flex gap-4">
          <div className="flex flex-col gap-1 flex-1">
            <label className="text-xs font-medium text-gray-500">Fill</label>
            <div className="flex items-center border rounded-md p-1">
                <input
                type="color"
                value={element.fillColor}
                onFocus={() => onHistorySave()}
                onChange={(e) => updateElement({ fillColor: e.target.value }, false)}
                className="w-8 h-8 cursor-pointer border-none bg-transparent"
                />
                <span className="text-xs ml-2 text-gray-600 uppercase">{element.fillColor}</span>
            </div>
          </div>
          <div className="flex flex-col gap-1 flex-1">
            <label className="text-xs font-medium text-gray-500">Stroke</label>
             <div className="flex items-center border rounded-md p-1">
                <input
                type="color"
                value={element.strokeColor}
                onFocus={() => onHistorySave()}
                onChange={(e) => updateElement({ strokeColor: e.target.value }, false)}
                className="w-8 h-8 cursor-pointer border-none bg-transparent"
                />
                 <span className="text-xs ml-2 text-gray-600 uppercase">{element.strokeColor}</span>
            </div>
          </div>
        </div>

        {/* Stroke Width */}
        <div className="flex flex-col gap-1">
           <label className="text-xs font-medium text-gray-500">Stroke Width: {element.strokeWidth}px</label>
           <input
             type="range"
             min="1"
             max="10"
             value={element.strokeWidth}
             onMouseDown={() => onHistorySave()} 
             onChange={(e) => updateElement({ strokeWidth: parseInt(e.target.value) }, false)}
             className="w-full h-2 bg-gray-200 rounded-lg appearance-none cursor-pointer"
           />
        </div>

        {/* Font Size */}
        {(element.type !== ToolType.ARROW) && (
            <div className="flex flex-col gap-1">
            <label className="text-xs font-medium text-gray-500">Font Size: {element.fontSize}px</label>
            <input
                type="range"
                min="8"
                max="72"
                value={element.fontSize || 14}
                onMouseDown={() => onHistorySave()} 
                onChange={(e) => updateElement({ fontSize: parseInt(e.target.value) }, false)}
                className="w-full h-2 bg-gray-200 rounded-lg appearance-none cursor-pointer"
            />
            </div>
        )}

        {/* Dimensions */}
        {(element.type === ToolType.RECTANGLE || element.type === ToolType.CIRCLE) && (
             <div className="grid grid-cols-2 gap-4">
                <div>
                    <label className="text-xs font-medium text-gray-500">Width</label>
                    <input
                        type="number"
                        value={Math.round(element.width || 0)}
                        onFocus={() => onHistorySave()}
                        onChange={(e) => updateElement({ width: parseInt(e.target.value) }, false)}
                        className="w-full border rounded p-1 text-sm"
                    />
                </div>
                 <div>
                    <label className="text-xs font-medium text-gray-500">Height</label>
                    <input
                        type="number"
                        value={Math.round(element.height || 0)}
                        onFocus={() => onHistorySave()}
                        onChange={(e) => updateElement({ height: parseInt(e.target.value) }, false)}
                        className="w-full border rounded p-1 text-sm"
                    />
                </div>
             </div>
        )}
      </div>
    </div>
  );
};