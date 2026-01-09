import React, { useEffect, useRef, useState } from 'react';

interface InfographicRendererProps {
  dsl: string;
  width?: number | string;
  height?: number | string;
  editable?: boolean;
}

export const InfographicRenderer: React.FC<InfographicRendererProps> = ({
  dsl,
  width = '100%',
  height = '100%',
  editable = false,
}) => {
  const containerRef = useRef<HTMLDivElement>(null);
  const infographicRef = useRef<any>(null);
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);
  const [mounted, setMounted] = useState(false);

  const numericWidth = typeof width === 'number' ? width : 800;
  const numericHeight = typeof height === 'number' ? height : 600;

  // 第一个 effect：标记组件已挂载
  useEffect(() => {
    setMounted(true);
    return () => setMounted(false);
  }, []);

  // 第二个 effect：当组件挂载且有 dsl 时，加载并渲染
  useEffect(() => {
    if (!mounted || !dsl || !dsl.trim()) {
      setLoading(false);
      return;
    }

    // 等待 DOM 完全准备好 - 使用 requestAnimationFrame 确保在下一帧渲染
    let rafId: number;
    const timer = setTimeout(() => {
      rafId = requestAnimationFrame(() => {
        loadAndRender();
      });
    }, 100); // 给容器足够的初始化时间

    return () => {
      clearTimeout(timer);
      if (rafId) {
        cancelAnimationFrame(rafId);
      }
      if (infographicRef.current) {
        try {
          infographicRef.current.destroy();
        } catch (e) {
          // ignore
        }
        infographicRef.current = null;
      }
    };
  }, [mounted, dsl]);

  const loadAndRender = async () => {
    setLoading(true);
    setError(null);
    
    // 销毁旧实例
    if (infographicRef.current) {
      try {
        infographicRef.current.destroy();
      } catch (e) {
        // ignore
      }
      infographicRef.current = null;
    }

    // 检查容器
    if (!containerRef.current) {
      console.error('[InfographicRenderer] Container not ready');
      setError('Container not ready. Please try again.');
      setLoading(false);
      return;
    }

    try {
      console.log('[InfographicRenderer] Loading @antv/infographic...');
      
      // 动态导入 @antv/infographic
      const module = await import('@antv/infographic');
      const { Infographic } = module;
      
      console.log('[InfographicRenderer] Module loaded, creating instance...');
      
      if (!containerRef.current) {
        setError('Container was unmounted');
        setLoading(false);
        return;
      }
      
      // 清空容器
      containerRef.current.innerHTML = '';
      
      infographicRef.current = new Infographic({
        container: containerRef.current,
        width: numericWidth,
        height: numericHeight,
        editable,
      });
      
      console.log('[InfographicRenderer] Rendering DSL:');
      console.log(dsl);
      
      // 验证 DSL 格式
      const trimmedDsl = dsl.trim();
      let dslToRender = trimmedDsl;
      
      if (!trimmedDsl.startsWith('infographic ')) {
        // 检查是否是 mermaid 格式（常见错误）
        if (trimmedDsl.includes('graph ') || trimmedDsl.includes('flowchart ') || trimmedDsl.includes('```mermaid')) {
          throw new Error('Invalid DSL: AI returned mermaid format instead of infographic DSL. Please try a simpler prompt.');
        }
        throw new Error('Invalid DSL: Must start with "infographic <template-name>". Got: ' + trimmedDsl.substring(0, 100));
      }
      
      try {
        console.log('[InfographicRenderer] Rendering DSL:', dslToRender.substring(0, 200) + '...');
        infographicRef.current.render(dslToRender);
      } catch (firstRenderError) {
        console.warn('[InfographicRenderer] First render failed, trying fallback template:', firstRenderError);
        
        // 智能降级：根据原模板类型选择合适的通用模板
        // 如果是横向/对比类模板，降级到横向列表
        let fallbackTemplate = 'infographic list-column-simple-vertical-arrow';
        if (dslToRender.includes('compare-') || dslToRender.includes('row') || dslToRender.includes('horizontal')) {
          fallbackTemplate = 'infographic list-row-simple-horizontal-arrow';
        }
        
        const fallbackDsl = dslToRender.replace(/^infographic\s+\S+/m, fallbackTemplate);
        console.log('[InfographicRenderer] Retrying with fallback DSL:', fallbackTemplate);
        infographicRef.current.render(fallbackDsl);
      }
      
      // 检查是否有内容被渲染
      setTimeout(() => {
        const children = containerRef.current?.children.length || 0;
        const hasCanvas = containerRef.current?.querySelector('canvas');
        const hasSvg = containerRef.current?.querySelector('svg');
        console.log('[InfographicRenderer] Render complete, children:', children, 'hasCanvas:', !!hasCanvas, 'hasSvg:', !!hasSvg);
        
        if (children === 0 && !hasCanvas && !hasSvg) {
          console.warn('[InfographicRenderer] Warning: No content rendered. DSL content:');
          console.warn(dsl);
          
          // 如果还是空的，最后尝试一次强制降级
          if (!dslToRender.includes('list-column-simple-vertical-arrow')) {
             console.log('[InfographicRenderer] Content empty, forcing fallback template...');
             
             // 智能降级（同上）
             let fallbackTemplate = 'infographic list-column-simple-vertical-arrow';
             if (dslToRender.includes('compare-') || dslToRender.includes('row') || dslToRender.includes('horizontal')) {
               fallbackTemplate = 'infographic list-row-simple-horizontal-arrow';
             }
             
             const fallbackDsl = dslToRender.replace(/^infographic\s+\S+/m, fallbackTemplate);
             try {
               infographicRef.current.render(fallbackDsl);
               // 再次检查
               setTimeout(() => {
                 const children2 = containerRef.current?.children.length || 0;
                 if (children2 === 0 && !containerRef.current?.querySelector('canvas') && !containerRef.current?.querySelector('svg')) {
                    setError(`Render failed. DSL template may be invalid. Check console for DSL content.`);
                 }
               }, 200);
             } catch (e) {
               setError(`Render failed. DSL may be invalid. Check console for DSL content.`);
             }
          } else {
             setError(`Render failed. DSL may be invalid. Check console for DSL content.`);
          }
        }
      }, 800);
      setLoading(false);
    } catch (err) {
      console.error('[InfographicRenderer] Error:', err);
      const errorMsg = err instanceof Error ? err.message : String(err);
      
      // 检测是否是 CSP 错误
      if (errorMsg.includes('eval') || errorMsg.includes('CSP') || errorMsg.includes('Content Security Policy') || errorMsg.includes('EvalError')) {
        setError('CSP Error: The infographic library requires unsafe-eval which is blocked by browser security policy. Please disable "Use Infographic Engine" option.');
      } else {
        setError(`Rendering Error: ${errorMsg}`);
      }
      setLoading(false);
    }
  };

  // 错误状态
  if (error) {
    return (
      <div 
        style={{ 
          width: numericWidth, 
          height: numericHeight, 
          overflow: 'auto',
          background: '#fef2f2',
          border: '1px solid #fecaca',
          borderRadius: '8px',
          padding: '16px',
          fontFamily: 'system-ui, sans-serif',
          fontSize: '13px',
          color: '#dc2626',
          boxSizing: 'border-box'
        }}
      >
        <div style={{ fontWeight: 'bold', marginBottom: '12px' }}>⚠️ {error}</div>
        <div style={{ color: '#6b7280', marginTop: '12px' }}>
          <div style={{ fontWeight: 'bold', marginBottom: '4px' }}>DSL Content:</div>
          <pre style={{ 
            whiteSpace: 'pre-wrap', 
            wordBreak: 'break-word',
            background: '#fff',
            padding: '8px',
            borderRadius: '4px',
            border: '1px solid #e5e7eb',
            fontSize: '11px',
            maxHeight: '200px',
            overflow: 'auto'
          }}>{dsl}</pre>
        </div>
      </div>
    );
  }

  // 始终渲染容器 div，但在 loading 时显示覆盖层
  return (
    <div style={{ position: 'relative', width: numericWidth, height: numericHeight }}>
      <div 
        ref={containerRef} 
        style={{ 
          width: numericWidth, 
          height: numericHeight, 
          overflow: 'hidden',
          background: '#fff',
          position: 'absolute',
          top: 0,
          left: 0
        }} 
      />
      {loading && (
        <div 
          style={{ 
            position: 'absolute',
            top: 0,
            left: 0,
            width: '100%',
            height: '100%',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            background: '#f9fafb',
            border: '1px dashed #d1d5db',
            borderRadius: '8px',
            color: '#6b7280',
            fontSize: '14px'
          }}
        >
          Loading infographic...
        </div>
      )}
    </div>
  );
};
