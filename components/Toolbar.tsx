import React from 'react';
import { ToolType } from '../types';
import { MousePointer2, Square, Circle, Type, MoveRight } from 'lucide-react';

interface ToolbarProps {
  selectedTool: ToolType;
  setSelectedTool: (t: ToolType) => void;
}

export const Toolbar: React.FC<ToolbarProps> = ({ selectedTool, setSelectedTool }) => {
  const tools = [
    { type: ToolType.SELECT, icon: <MousePointer2 size={20} />, label: "Select" },
    { type: ToolType.RECTANGLE, icon: <Square size={20} />, label: "Rectangle" },
    { type: ToolType.CIRCLE, icon: <Circle size={20} />, label: "Circle" },
    { type: ToolType.ARROW, icon: <MoveRight size={20} />, label: "Arrow" },
    { type: ToolType.TEXT, icon: <Type size={20} />, label: "Text" },
  ];

  return (
    <div className="w-16 bg-white border-r border-gray-200 flex flex-col items-center py-4 gap-4 shadow-sm z-10">
      {tools.map((tool) => (
        <button
          key={tool.type}
          onClick={() => setSelectedTool(tool.type)}
          className={`p-3 rounded-lg transition-all duration-200 group relative ${
            selectedTool === tool.type
              ? 'bg-blue-100 text-blue-600'
              : 'text-gray-500 hover:bg-gray-100'
          }`}
        >
          {tool.icon}
          <span className="absolute left-14 bg-gray-800 text-white text-xs px-2 py-1 rounded opacity-0 group-hover:opacity-100 transition-opacity whitespace-nowrap pointer-events-none z-50">
            {tool.label}
          </span>
        </button>
      ))}
    </div>
  );
};
