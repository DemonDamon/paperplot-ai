import React, { useState, useEffect, useCallback, useRef } from 'react';
import { X, Copy, Check, RefreshCw, Code2, Eye, EyeOff } from 'lucide-react';

interface DslEditorPanelProps {
  dsl: string;
  onDslChange: (newDsl: string) => void;
  onClose: () => void;
  elementId: string;
}

export const DslEditorPanel: React.FC<DslEditorPanelProps> = ({
  dsl,
  onDslChange,
  onClose,
  elementId
}) => {
  const [localDsl, setLocalDsl] = useState(dsl);
  const [copied, setCopied] = useState(false);
  const [autoSync, setAutoSync] = useState(true);
  const [hasChanges, setHasChanges] = useState(false);
  const textareaRef = useRef<HTMLTextAreaElement>(null);
  const debounceRef = useRef<NodeJS.Timeout | null>(null);

  // Update local DSL when prop changes (external update)
  useEffect(() => {
    setLocalDsl(dsl);
    setHasChanges(false);
  }, [dsl]);

  // Handle DSL change with debounce for auto-sync
  const handleDslChange = useCallback((value: string) => {
    setLocalDsl(value);
    setHasChanges(value !== dsl);

    if (autoSync) {
      // Debounce the sync to avoid too frequent updates
      if (debounceRef.current) {
        clearTimeout(debounceRef.current);
      }
      debounceRef.current = setTimeout(() => {
        onDslChange(value);
        setHasChanges(false);
      }, 500); // 500ms debounce
    }
  }, [dsl, autoSync, onDslChange]);

  // Manual sync
  const handleManualSync = useCallback(() => {
    onDslChange(localDsl);
    setHasChanges(false);
  }, [localDsl, onDslChange]);

  // Copy to clipboard
  const handleCopy = useCallback(async () => {
    try {
      await navigator.clipboard.writeText(localDsl);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    } catch (err) {
      console.error('Failed to copy:', err);
    }
  }, [localDsl]);

  // Reset to original
  const handleReset = useCallback(() => {
    setLocalDsl(dsl);
    setHasChanges(false);
  }, [dsl]);

  // Cleanup debounce on unmount
  useEffect(() => {
    return () => {
      if (debounceRef.current) {
        clearTimeout(debounceRef.current);
      }
    };
  }, []);

  // Handle keyboard shortcuts
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      // Escape to close
      if (e.key === 'Escape') {
        onClose();
      }
      // Ctrl/Cmd + S to save
      if ((e.ctrlKey || e.metaKey) && e.key === 's') {
        e.preventDefault();
        handleManualSync();
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [onClose, handleManualSync]);

  return (
    <div className="fixed right-0 top-0 h-full w-[480px] bg-white shadow-2xl border-l border-gray-200 z-50 flex flex-col">
      {/* Header */}
      <div className="flex items-center justify-between px-4 py-3 border-b border-gray-200 bg-gray-50">
        <div className="flex items-center gap-2">
          <Code2 size={18} className="text-blue-600" />
          <span className="font-semibold text-gray-800">DSL Editor</span>
          {hasChanges && (
            <span className="text-xs bg-yellow-100 text-yellow-700 px-2 py-0.5 rounded-full">
              Unsaved
            </span>
          )}
        </div>
        <button
          onClick={onClose}
          className="p-1.5 hover:bg-gray-200 rounded-lg transition-colors"
          title="Close (Esc)"
        >
          <X size={18} className="text-gray-500" />
        </button>
      </div>

      {/* Toolbar */}
      <div className="flex items-center justify-between px-4 py-2 border-b border-gray-100 bg-white">
        <div className="flex items-center gap-2">
          {/* Auto-sync toggle */}
          <button
            onClick={() => setAutoSync(!autoSync)}
            className={`flex items-center gap-1.5 px-2.5 py-1.5 rounded-lg text-xs font-medium transition-colors ${
              autoSync 
                ? 'bg-green-100 text-green-700 hover:bg-green-200' 
                : 'bg-gray-100 text-gray-600 hover:bg-gray-200'
            }`}
            title={autoSync ? 'Auto-sync enabled' : 'Auto-sync disabled'}
          >
            {autoSync ? <Eye size={14} /> : <EyeOff size={14} />}
            {autoSync ? 'Auto Sync' : 'Manual'}
          </button>

          {/* Manual sync button (only show when auto-sync is off) */}
          {!autoSync && hasChanges && (
            <button
              onClick={handleManualSync}
              className="flex items-center gap-1.5 px-2.5 py-1.5 rounded-lg text-xs font-medium bg-blue-100 text-blue-700 hover:bg-blue-200 transition-colors"
              title="Apply changes (Ctrl+S)"
            >
              <RefreshCw size={14} />
              Apply
            </button>
          )}
        </div>

        <div className="flex items-center gap-1">
          {/* Reset button */}
          <button
            onClick={handleReset}
            disabled={!hasChanges}
            className="p-1.5 hover:bg-gray-100 rounded-lg transition-colors disabled:opacity-40 disabled:cursor-not-allowed"
            title="Reset to original"
          >
            <RefreshCw size={16} className="text-gray-500" />
          </button>

          {/* Copy button */}
          <button
            onClick={handleCopy}
            className="p-1.5 hover:bg-gray-100 rounded-lg transition-colors"
            title="Copy to clipboard"
          >
            {copied ? (
              <Check size={16} className="text-green-600" />
            ) : (
              <Copy size={16} className="text-gray-500" />
            )}
          </button>
        </div>
      </div>

      {/* Editor */}
      <div className="flex-1 overflow-hidden p-4">
        <textarea
          ref={textareaRef}
          value={localDsl}
          onChange={(e) => handleDslChange(e.target.value)}
          className="w-full h-full resize-none font-mono text-sm p-4 border border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent bg-gray-50"
          placeholder="Enter infographic DSL here..."
          spellCheck={false}
          style={{
            lineHeight: '1.6',
            tabSize: 2
          }}
        />
      </div>

      {/* Footer with tips */}
      <div className="px-4 py-3 border-t border-gray-100 bg-gray-50">
        <div className="text-xs text-gray-500 space-y-1">
          <p><kbd className="px-1.5 py-0.5 bg-gray-200 rounded text-gray-700">Ctrl+S</kbd> to apply changes</p>
          <p><kbd className="px-1.5 py-0.5 bg-gray-200 rounded text-gray-700">Esc</kbd> to close editor</p>
          <p className="text-gray-400 mt-2">
            Element ID: <code className="text-gray-500">{elementId}</code>
          </p>
        </div>
      </div>
    </div>
  );
};

export default DslEditorPanel;
