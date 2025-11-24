import React, { useState, useRef, useEffect } from 'react';
import { Sparkles, Loader2, Image as ImageIcon, X, Upload } from 'lucide-react';
import { generateDiagramFromPrompt } from '../services/aiService';
import { DiagramElement } from '../types';

interface GeminiInputProps {
  onElementsGenerated: (elements: DiagramElement[]) => void;
}

export const GeminiInput: React.FC<GeminiInputProps> = ({ onElementsGenerated }) => {
  const [prompt, setPrompt] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [image, setImage] = useState<string | null>(null); // Base64 string
  const fileInputRef = useRef<HTMLInputElement>(null);

  // Handle Paste for Images on the container
  const handlePaste = (e: React.ClipboardEvent) => {
    const items = e.clipboardData?.items;
    if (!items) return;

    for (const item of items) {
      if (item.type.indexOf('image') !== -1) {
        const blob = item.getAsFile();
        if (blob) {
          const reader = new FileReader();
          reader.onload = (event) => {
            setImage(event.target?.result as string);
          };
          reader.readAsDataURL(blob);
        }
      }
    }
  };

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      const reader = new FileReader();
      reader.onload = (event) => {
        setImage(event.target?.result as string);
      };
      reader.readAsDataURL(file);
    }
  };

  const handleGenerate = async () => {
    if (!prompt.trim()) return;

    setLoading(true);
    setError(null);

    try {
      const newElements = await generateDiagramFromPrompt(prompt, image);
      onElementsGenerated(newElements);
      // Optional: Clear prompt after success
      // setPrompt('');
      // setImage(null);
    } catch (err) {
      console.error('[GeminiInput] 生成失败:', err);
      const errorMessage = err instanceof Error ? err.message : 'Failed to generate diagram';
      setError(errorMessage);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div 
      className="w-80 h-full bg-white border-l border-gray-200 flex flex-col shadow-xl z-20"
      onPaste={handlePaste}
    >
      {/* Header */}
      <div className="p-4 border-b border-gray-100 bg-gray-50">
        <div className="flex items-center gap-2 text-blue-600">
          <Sparkles size={20} />
          <h2 className="font-semibold text-sm uppercase tracking-wider">AI Generator</h2>
        </div>
      </div>

      {/* Content */}
      <div className="flex-1 p-4 overflow-y-auto flex flex-col gap-4">
        
        {/* Prompt Input */}
        <div className="flex flex-col gap-2">
          <label className="text-xs font-medium text-gray-500">PROMPT</label>
          <textarea
            value={prompt}
            onChange={(e) => setPrompt(e.target.value)}
            placeholder="Describe a flow chart, mind map, or system architecture..."
            className="w-full h-32 p-3 text-sm border border-gray-200 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 outline-none resize-none bg-gray-50 focus:bg-white transition-colors"
          />
        </div>

        {/* Image Input */}
        <div className="flex flex-col gap-2">
           <div className="flex justify-between items-center">
             <label className="text-xs font-medium text-gray-500">REFERENCE IMAGE (OPTIONAL)</label>
             {image && (
               <button onClick={() => setImage(null)} className="text-xs text-red-500 hover:text-red-600">Clear</button>
             )}
           </div>
           
           {!image ? (
             <div 
               onClick={() => fileInputRef.current?.click()}
               className="border-2 border-dashed border-gray-200 rounded-lg p-6 flex flex-col items-center justify-center gap-2 cursor-pointer hover:bg-gray-50 transition-colors group"
             >
               <Upload size={24} className="text-gray-300 group-hover:text-blue-400 transition-colors" />
               <span className="text-xs text-gray-400 text-center">Click to upload or paste image</span>
             </div>
           ) : (
             <div className="relative rounded-lg overflow-hidden border border-gray-200 group">
               <img src={image} alt="Reference" className="w-full h-40 object-cover" />
               <div className="absolute inset-0 bg-black/0 group-hover:bg-black/10 transition-colors" />
             </div>
           )}
           <input
             type="file"
             ref={fileInputRef}
             onChange={handleFileChange}
             accept="image/*"
             className="hidden"
           />
        </div>

        {/* Error Message */}
        {error && (
          <div className="p-3 bg-red-50 text-red-600 text-xs rounded-md border border-red-100">
            {error}
          </div>
        )}

        {/* Generate Button */}
        <button
          onClick={handleGenerate}
          disabled={loading || !prompt.trim()}
          className="mt-2 w-full py-3 bg-blue-600 hover:bg-blue-700 disabled:bg-gray-300 disabled:cursor-not-allowed text-white rounded-lg font-medium shadow-md shadow-blue-200 flex items-center justify-center gap-2 transition-all active:scale-95"
        >
          {loading ? (
            <>
              <Loader2 size={18} className="animate-spin" />
              Generating...
            </>
          ) : (
            <>
              <Sparkles size={18} />
              Generate Diagram
            </>
          )}
        </button>

        <div className="mt-4 p-4 bg-blue-50 rounded-lg border border-blue-100">
          <h4 className="text-xs font-bold text-blue-800 mb-1">Tips</h4>
          <ul className="text-xs text-blue-700 list-disc list-inside space-y-1">
             <li>Be specific about connections (e.g., "Server A connects to Database B").</li>
             <li>Mention colors or shapes if you want specific styles.</li>
             <li>Upload a screenshot of a whiteboard to digitize it.</li>
          </ul>
        </div>

      </div>
    </div>
  );
};