import React, { useState, useEffect, useRef } from 'react';
import { Save, Plus, FileCode, Play, Trash2, Copy, X, Maximize2, Minimize2, Maximize, Minus, AlertTriangle, AlertCircle, CheckCircle2 } from 'lucide-react';
import Editor from '@monaco-editor/react';
import { compilePineScript, PineDiagnostic } from '../lib/pineParser';
import { useLayoutSave } from '../contexts/LayoutSaveContext';

interface PineScript {
    id: string;
    name: string;
    content: string;
    updatedAt: number;
}

interface ConsoleMessage {
    type: 'info' | 'error' | 'success' | 'warning';
    msg: string;
    line?: number;
}

const DEFAULT_SCRIPT = `//@version=5
indicator("My Custom Indicator", overlay=true)

// [Pine Script Compatibility Layer]
// This engine simulates TV studies by mapping your script
// to matching built-in indicators. Try ta.sma, ta.ema, ta.macd!

length = input.int(20, minval=1)
src = input(close, title="Source")

// Calculate Simple Moving Average
plot(ta.sma(src, length), color=color.blue, title="SMA")
`;

export const PineEditor = ({ 
    onClose, 
    onApply,
    mode = 'normal',
    onToggleMaximize,
    onToggleFullscreen,
    onToggleMinimize
}: { 
    onClose: () => void;
    onApply: (script: string) => void;
    mode?: 'normal' | 'maximized' | 'fullscreen';
    onToggleMaximize?: () => void;
    onToggleFullscreen?: () => void;
    onToggleMinimize?: () => void;
}) => {
    const [scripts, setScripts] = useState<PineScript[]>([]);
    const [activeId, setActiveId] = useState<string | null>(null);
    const [content, setContent] = useState(DEFAULT_SCRIPT);
    const [consoleMsgs, setConsoleMsgs] = useState<ConsoleMessage[]>([{ type: 'info', msg: 'Pine Script V5/V6 Engine Ready.' }]);
    const [showConsole, setShowConsole] = useState(true);
    const editorRef = useRef<any>(null);
    const monacoRef = useRef<any>(null);
    const { markUnsaved, currentLayoutName } = useLayoutSave();

    useEffect(() => {
        const saved = localStorage.getItem(`pine_scripts_${currentLayoutName}`);
        let initialScripts: PineScript[] = [];
        
        if (saved) {
            try {
                const parsed = JSON.parse(saved);
                if (Array.isArray(parsed) && parsed.length > 0) {
                    initialScripts = parsed;
                }
            } catch (e) {}
        }
        
        if (initialScripts.length === 0) {
            initialScripts = [
                {
                    id: 'default-script',
                    name: 'My Custom Indicator',
                    content: DEFAULT_SCRIPT,
                    updatedAt: Date.now()
                }
            ];
        }
        
        setScripts(initialScripts);
        if (initialScripts.length > 0) {
            setActiveId(initialScripts[0].id);
            setContent(initialScripts[0].content);
        }
    }, [currentLayoutName]);

    // Handle explicit save request
    useEffect(() => {
        const handleSave = (e: Event) => {
            const customEvent = e as CustomEvent<{ layoutName: string }>;
            const name = customEvent.detail.layoutName;
            localStorage.setItem(`pine_scripts_${name}`, JSON.stringify(scripts));
        };
        window.addEventListener('app-request-save', handleSave);
        return () => window.removeEventListener('app-request-save', handleSave);
    }, [scripts]);

    const saveScripts = (newScripts: PineScript[]) => {
        setScripts(newScripts);
        markUnsaved();
    };

    const handleSave = () => {
        if (!activeId) {
            const newScript = {
                id: Date.now().toString(),
                name: "Untitled Script",
                content,
                updatedAt: Date.now()
            };
            saveScripts([...scripts, newScript]);
            setActiveId(newScript.id);
        } else {
            saveScripts(scripts.map(s => s.id === activeId ? { ...s, content, updatedAt: Date.now() } : s));
        }
    };

    const handleNew = () => {
        const newScript = {
            id: Date.now().toString(),
            name: `Script ${scripts.length + 1}`,
            content: DEFAULT_SCRIPT,
            updatedAt: Date.now()
        };
        saveScripts([...scripts, newScript]);
        setActiveId(newScript.id);
        setContent(newScript.content);
    };

    const handleDuplicate = (id: string) => {
        const script = scripts.find(s => s.id === id);
        if (!script) return;
        const newScript = {
            ...script,
            id: Date.now().toString(),
            name: `${script.name} Copy`,
            updatedAt: Date.now()
        };
        saveScripts([...scripts, newScript]);
    };

    const handleRunCompilation = () => {
        handleSave();
        setShowConsole(true);
        const result = compilePineScript(content);
        
        const newMsgs: ConsoleMessage[] = [];
        const markers: any[] = [];
        
        if (result.diagnostics.length > 0) {
            result.diagnostics.forEach(diag => {
                newMsgs.push({ type: 'error', msg: diag.msg, line: diag.line });
                markers.push({
                    startLineNumber: diag.line,
                    startColumn: diag.column,
                    endLineNumber: diag.line,
                    endColumn: 100, // naive end column
                    message: diag.msg,
                    severity: monacoRef.current?.MarkerSeverity.Error || 8
                });
            });
        }
        
        if (monacoRef.current && editorRef.current) {
            monacoRef.current.editor.setModelMarkers(editorRef.current.getModel(), 'pine', markers);
        }

        if (result.success) {
            newMsgs.push({ type: 'success', msg: 'Compilation successful. Abstract Syntax Tree generated.' });
            
            if (result.studies.length === 0) {
                 newMsgs.push({ type: 'success', msg: 'No built-in TV studies matched. Initializing custom PineOverlay Rendering Engine.' });
                 newMsgs.push({ type: 'info', msg: 'Overlay layer active. Processing box.new, line.new, and custom shapes.' });
            } else {
                 newMsgs.push({ type: 'success', msg: 'Initializing custom PineOverlay Rendering Engine.' });
                 newMsgs.push({ type: 'info', msg: `Applied ${result.studies.length} built-in indicator(s) to widget, plus PineOverlay custom shapes.` });
            }
            
            onApply(content);
        } else {
            newMsgs.push({ type: 'error', msg: 'Compilation failed. Please fix errors.' });
        }
        
        setConsoleMsgs(newMsgs);
    };

    const handleDelete = (id: string) => {
        const curr = scripts.filter(s => s.id !== id);
        saveScripts(curr);
        if (activeId === id) {
            if (curr.length > 0) {
                setActiveId(curr[0].id);
                setContent(curr[0].content);
            } else {
                setActiveId(null);
                setContent(DEFAULT_SCRIPT);
            }
        }
    };

    // Before mounting Monaco, we can customize a theme to match TradingView dark
    const handleEditorWillMount = (monaco: any) => {
        monaco.editor.defineTheme('pineDark', {
            base: 'vs-dark',
            inherit: true,
            rules: [
                { token: 'comment', foreground: '5c6370', fontStyle: 'italic' },
                { token: 'keyword', foreground: 'c678dd' },
                { token: 'string', foreground: '98c379' },
                { token: 'number', foreground: 'd19a66' },
                { token: 'type', foreground: 'e5c07b' },
                { token: 'function', foreground: '61afef' }
            ],
            colors: {
                'editor.background': '#0b0e14',
                'editor.foreground': '#d1d4dc',
                'editor.lineHighlightBackground': '#1e222d',
                'editorLineNumber.foreground': '#4f5366',
                'editorIndentGuide.background': '#1e222d',
                'editorSuggestWidget.background': '#131722',
                'editorSuggestWidget.border': '#2a2e39',
            }
        });
        
        monaco.languages.register({ id: 'pine' });
        monaco.languages.setMonarchTokensProvider('pine', {
            keywords: [
                'indicator', 'strategy', 'plot', 'input', 'ta.sma', 'ta.ema', 'ta.macd',
                'input.int', 'input.float', 'color', 'close', 'open', 'high', 'low'
            ],
            tokenizer: {
                root: [
                    [/@[a-zA-Z_]\w*/, 'keyword'],
                    [/[a-zA-Z_]\w*/, { cases: { '@keywords': 'keyword', '@default': 'identifier' } }],
                    [/\d+/, 'number'],
                    [/"[^"]*"/, 'string'],
                    [/\/\/.*$/, 'comment'],
                ]
            }
        });
    };

    const handleEditorDidMount = (editor: any, monaco: any) => {
        editorRef.current = editor;
        monacoRef.current = monaco;
    };

    return (
        <div className="flex h-full w-full bg-[#131722] border-t border-[#2a2e39] font-mono text-sm relative z-50">
            {/* Sidebar - My Scripts */}
            <div className="w-64 border-r border-[#2a2e39] flex flex-col bg-[#1e222d] shrink-0">
                <div className="p-3 border-b border-[#2a2e39] flex items-center justify-between shrink-0">
                    <span className="font-bold text-gray-300 font-sans text-xs uppercase tracking-wider">My Scripts</span>
                    <button onClick={handleNew} className="p-1 hover:bg-[#363a45] rounded text-gray-400 hover:text-white transition-colors" title="New Script">
                        <Plus size={14} />
                    </button>
                </div>
                <div className="flex-1 overflow-y-auto">
                    {scripts.length === 0 && (
                        <div className="p-4 text-xs text-gray-500 font-sans text-center">No saved scripts</div>
                    )}
                    {scripts.map(s => (
                        <div 
                            key={s.id} 
                            className={`group flex items-center justify-between p-3 cursor-pointer border-l-2 transition-colors ${activeId === s.id ? 'bg-[#2a2e39] border-[#2962ff] text-white' : 'border-transparent text-gray-400 hover:bg-[#2a2e39] hover:text-white'}`}
                            onClick={() => { setActiveId(s.id); setContent(s.content); }}
                        >
                            <div className="flex items-center space-x-2 overflow-hidden">
                                <FileCode size={14} className={`shrink-0 ${activeId === s.id ? 'text-[#2962ff]' : 'text-gray-500'}`} />
                                <span className="truncate text-xs font-sans font-medium">{s.name}</span>
                            </div>
                            <div className="hidden group-hover:flex items-center space-x-1 shrink-0">
                                <button onClick={(e) => { e.stopPropagation(); handleDuplicate(s.id); }} className="p-1 hover:text-[#2962ff]" title="Duplicate">
                                    <Copy size={12} />
                                </button>
                                <button onClick={(e) => { e.stopPropagation(); handleDelete(s.id); }} className="p-1 hover:text-red-500" title="Delete">
                                    <Trash2 size={12} />
                                </button>
                            </div>
                        </div>
                    ))}
                </div>
            </div>

            {/* Main Editor */}
            <div className="flex-1 flex flex-col bg-[#0b0e14] min-w-0 h-full">
                {/* Editor Toolbar */}
                <div className="flex justify-between items-center p-2 bg-[#1e222d] border-b border-[#2a2e39] shrink-0">
                    <div className="flex items-center space-x-2">
                        {activeId ? (
                            <input 
                                type="text"
                                value={scripts.find(s => s.id === activeId)?.name || "Untitled Script"}
                                onChange={(e) => {
                                    saveScripts(scripts.map(s => s.id === activeId ? { ...s, name: e.target.value } : s));
                                }}
                                className="bg-transparent border-none outline-none text-white font-sans text-sm font-semibold w-48 focus:bg-[#2a2e39] px-2 py-1 rounded transition-colors"
                            />
                        ) : (
                            <span className="text-white font-sans text-sm font-semibold px-2">Untitled Script</span>
                        )}
                    </div>
                    <div className="flex items-center space-x-2">
                        <button onClick={handleSave} className="flex items-center space-x-1 px-3 py-1.5 bg-[#2a2e39] hover:bg-[#363a45] text-white text-xs font-sans font-medium rounded transition-colors">
                            <Save size={14} />
                            <span>Save</span>
                        </button>
                        <button onClick={handleRunCompilation} className="flex items-center space-x-1 px-3 py-1.5 bg-[#2962ff] hover:bg-blue-600 text-white text-xs font-sans font-medium rounded transition-colors shadow-lg">
                            <Play size={14} />
                            <span>Add to chart</span>
                        </button>
                        <div className="h-4 w-px bg-[#2a2e39] mx-1"></div>
                        <button onClick={() => setShowConsole(!showConsole)} className={`px-2 py-1.5 text-xs font-sans rounded transition-colors ${showConsole ? 'bg-[#363a45] text-white' : 'text-gray-400 hover:bg-[#2a2e39]'}`}>
                            Console
                        </button>
                        {onToggleMinimize && (
                            <button onClick={onToggleMinimize} className="p-1.5 hover:bg-[#363a45] text-gray-400 hover:text-white rounded transition-colors" title="Minimize">
                                <Minus size={16} />
                            </button>
                        )}
                        {onToggleMaximize && (
                            <button onClick={onToggleMaximize} className="p-1.5 hover:bg-[#363a45] text-gray-400 hover:text-white rounded transition-colors" title={mode === 'maximized' ? "Restore Down" : "Maximize"}>
                                {mode === 'maximized' ? <Minimize2 size={16} /> : <Maximize2 size={16} />}
                            </button>
                        )}
                        {onToggleFullscreen && (
                            <button onClick={onToggleFullscreen} className="p-1.5 hover:bg-[#363a45] text-gray-400 hover:text-white rounded transition-colors" title={mode === 'fullscreen' ? "Exit Fullscreen" : "Fullscreen"}>
                                <Maximize size={16} />
                            </button>
                        )}
                        <button onClick={onClose} className="p-1.5 hover:bg-[#363a45] text-gray-400 hover:text-red-500 rounded transition-colors" title="Close">
                            <X size={16} />
                        </button>
                    </div>
                </div>

                {/* Editor Area with Monaco */}
                <div className="flex-1 relative w-full flex flex-col min-h-0">
                    <div className="flex-1 relative w-full">
                        <Editor
                            height="100%"
                            language="pine"
                            theme="pineDark"
                            value={content}
                            onChange={(val) => setContent(val || '')}
                            beforeMount={handleEditorWillMount}
                            onMount={handleEditorDidMount}
                            options={{
                                minimap: { enabled: false },
                                fontSize: 13,
                                fontFamily: 'JetBrains Mono, monospace',
                                lineHeight: 24,
                                padding: { top: 16 },
                                smoothScrolling: true,
                                cursorBlinking: "smooth",
                                cursorSmoothCaretAnimation: "on",
                                formatOnPaste: true,
                            }}
                        />
                    </div>
                    
                    {/* Console Panel */}
                    {showConsole && (
                        <div className="h-40 bg-[#0b0e14] border-t border-[#2a2e39] shrink-0 flex flex-col">
                            <div className="flex items-center justify-between p-2 pb-1 border-b border-[#2a2e39]">
                                <span className="font-sans text-xs font-semibold text-gray-400">Compilation Log</span>
                                <button onClick={() => setShowConsole(false)} className="text-gray-500 hover:text-white"><X size={14}/></button>
                            </div>
                            <div className="flex-1 overflow-y-auto p-2 font-mono text-xs space-y-1">
                                {consoleMsgs.map((msg, idx) => (
                                    <div key={idx} className={`flex items-start space-x-2 p-1 rounded ${
                                        msg.type === 'error' ? 'bg-red-900/20 text-red-400' :
                                        msg.type === 'success' ? 'bg-green-900/20 text-green-400' :
                                        msg.type === 'warning' ? 'bg-yellow-900/20 text-yellow-400' :
                                        'text-gray-400'
                                    }`}>
                                        <div className="mt-0.5 shrink-0">
                                            {msg.type === 'error' && <AlertCircle size={14}/>}
                                            {msg.type === 'success' && <CheckCircle2 size={14}/>}
                                            {msg.type === 'warning' && <AlertTriangle size={14}/>}
                                            {msg.type === 'info' && <Play size={14}/>}
                                        </div>
                                        <div>
                                            {msg.line && <span className="text-gray-500 mr-2">Line {msg.line}:</span>}
                                            {msg.msg}
                                        </div>
                                    </div>
                                ))}
                            </div>
                        </div>
                    )}
                </div>
            </div>
            <style>{`
                .custom-scrollbar::-webkit-scrollbar { width: 8px; height: 8px; }
                .custom-scrollbar::-webkit-scrollbar-track { background: #131722; }
                .custom-scrollbar::-webkit-scrollbar-thumb { background: #2a2e39; border-radius: 4px; }
                .custom-scrollbar::-webkit-scrollbar-thumb:hover { background: #363a45; }
            `}</style>
        </div>
    );
};
