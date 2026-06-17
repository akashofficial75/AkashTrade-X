import React, { useState, useRef, useEffect } from "react";
import { ChevronDown, Check, Cloud, CheckCircle2, Clock, UploadCloud, FileEdit, Trash2, Copy, AlertCircle, Save } from "lucide-react";
import { useLayoutSave } from "../contexts/LayoutSaveContext";

export const LayoutSaveToolbar = () => {
    const {
        autoSaveEnabled,
        setAutoSaveEnabled,
        cloudSyncEnabled,
        setCloudSyncEnabled,
        saveState,
        lastSaved,
        currentLayoutName,
        layouts,
        markUnsaved,
        saveLayout,
        saveAsNewLayout,
        renameLayout,
        duplicateLayout,
        deleteLayout,
        restoreVersion,
        switchLayout
    } = useLayoutSave();

    const [isOpen, setIsOpen] = useState(false);
    const [isRenaming, setIsRenaming] = useState(false);
    const [renameInput, setRenameInput] = useState("");
    const dropdownRef = useRef<HTMLDivElement>(null);

    useEffect(() => {
        const handleClickOutside = (event: MouseEvent) => {
            if (dropdownRef.current && !dropdownRef.current.contains(event.target as Node)) {
                setIsOpen(false);
                setIsRenaming(false);
            }
        };
        document.addEventListener("mousedown", handleClickOutside);
        return () => document.removeEventListener("mousedown", handleClickOutside);
    }, []);

    const handleRenameSubmit = (e: React.FormEvent) => {
        e.preventDefault();
        if (renameInput.trim()) {
            renameLayout(renameInput.trim());
        }
        setIsRenaming(false);
    };

    const StatusIndicator = () => {
        if (saveState === "saving") {
            return (
                <div className="flex items-center space-x-1 text-gray-400">
                    <Cloud size={14} className="animate-pulse text-blue-500" />
                    <span className="text-xs">Saving...</span>
                </div>
            );
        }
        if (saveState === "unsaved") {
            return (
                <div className="flex items-center space-x-1 text-orange-400 cursor-pointer hover:text-orange-300" onClick={saveLayout}>
                    <AlertCircle size={14} />
                    <span className="text-xs">Unsaved</span>
                </div>
            );
        }
        return (
            <div className="flex items-center space-x-1 text-gray-400">
                <CheckCircle2 size={14} className="text-green-500" />
                <span className="text-xs">{autoSaveEnabled ? 'Auto Saved' : 'Saved'}</span>
            </div>
        );
    };

    return (
        <div className="relative flex items-center h-full border-r border-[#2a2e39] pr-4 mr-2" ref={dropdownRef}>
            
            {/* Status and Name Display */}
            <div className="flex items-center space-x-3 bg-[#1e222d] px-2 py-1 rounded-md border border-[#2a2e39] hover:bg-[#2a2e39] transition-colors cursor-pointer" onClick={() => !isRenaming && setIsOpen(!isOpen)}>
                
                {isRenaming ? (
                    <form onSubmit={handleRenameSubmit} className="flex items-center">
                        <input 
                            autoFocus
                            type="text"
                            value={renameInput}
                            onChange={(e) => setRenameInput(e.target.value)}
                            onBlur={handleRenameSubmit}
                            className="bg-transparent border-none text-white text-sm outline-none w-32"
                            onClick={(e) => e.stopPropagation()}
                        />
                    </form>
                ) : (
                    <span className="text-sm font-semibold truncate max-w-[120px]">{currentLayoutName}</span>
                )}
                
                <StatusIndicator />
                <ChevronDown size={14} className="text-gray-400" />
            </div>

            {/* Manual Save Button - visible if auto-save is off or fast save is needed */}
            {!autoSaveEnabled && saveState === "unsaved" && (
                <button 
                    onClick={saveLayout}
                    className="ml-2 flex items-center justify-center p-1.5 text-blue-400 hover:text-white hover:bg-blue-600 rounded transition-colors"
                    title="Save Layout"
                >
                    <Save size={16} />
                </button>
            )}

            {/* Dropdown Menu */}
            {isOpen && (
                <div className="absolute top-full left-0 mt-2 w-64 bg-[#1e222d] border border-[#2a2e39] rounded-md shadow-xl z-50 py-1 flex flex-col font-sans">
                    
                    <div className="px-4 py-2 border-b border-[#2a2e39] flex justify-between items-center bg-[#131722]">
                        <span className="text-xs text-gray-400">Last saved: {lastSaved ? lastSaved.toLocaleTimeString() : 'Never'}</span>
                    </div>

                    <div className="py-1">
                        <button 
                            className="w-full text-left px-4 py-2 text-sm text-gray-300 hover:bg-[#2a2e39] hover:text-white flex items-center justify-between"
                            onClick={() => {
                                setAutoSaveEnabled(!autoSaveEnabled);
                                setIsOpen(false);
                            }}
                        >
                            <span>Auto Save</span>
                            {autoSaveEnabled ? <Check size={14} className="text-blue-500" /> : null}
                        </button>
                        
                        <button 
                            className="w-full text-left px-4 py-2 text-sm text-gray-300 hover:bg-[#2a2e39] hover:text-white flex items-center justify-between"
                            onClick={() => {
                                setCloudSyncEnabled(!cloudSyncEnabled);
                                setIsOpen(false);
                            }}
                        >
                            <div className="flex items-center space-x-2">
                                <UploadCloud size={14} />
                                <span>Cloud Sync (Mock)</span>
                            </div>
                            {cloudSyncEnabled ? <Check size={14} className="text-blue-500" /> : null}
                        </button>
                    </div>

                    <div className="h-px bg-[#2a2e39] my-1" />

                    <div className="py-1">
                        <button 
                            className="w-full text-left px-4 py-2 text-sm text-gray-300 hover:bg-[#2a2e39] hover:text-white flex items-center space-x-2"
                            onClick={() => { saveLayout(); setIsOpen(false); }}
                        >
                            <Save size={14} />
                            <span>Save layout</span>
                        </button>

                        <button 
                            className="w-full text-left px-4 py-2 text-sm text-gray-300 hover:bg-[#2a2e39] hover:text-white flex items-center space-x-2"
                            onClick={() => { setIsRenaming(true); setRenameInput(currentLayoutName); setIsOpen(false); }}
                        >
                            <FileEdit size={14} />
                            <span>Rename</span>
                        </button>

                        <button 
                            className="w-full text-left px-4 py-2 text-sm text-gray-300 hover:bg-[#2a2e39] hover:text-white flex items-center space-x-2"
                            onClick={() => { duplicateLayout(); setIsOpen(false); }}
                        >
                            <Copy size={14} />
                            <span>Make a copy</span>
                        </button>
                        
                        <button 
                            className="w-full text-left px-4 py-2 text-sm text-gray-300 hover:bg-[#2a2e39] hover:text-white flex items-center space-x-2"
                            onClick={() => { 
                                const newName = prompt("Enter new layout name:", "New Layout"); 
                                if (newName) saveAsNewLayout(newName); 
                                setIsOpen(false); 
                            }}
                        >
                            <span className="ml-[22px]">Save as new layout...</span>
                        </button>
                    </div>

                    <div className="h-px bg-[#2a2e39] my-1" />

                    <div className="py-1">
                        {layouts.map((l, i) => (
                            <button 
                                key={i}
                                className="w-full text-left px-4 py-2 text-sm text-gray-300 hover:bg-[#2a2e39] hover:text-white flex items-center justify-between"
                                onClick={() => { 
                                    switchLayout(l);
                                    setIsOpen(false); 
                                }}
                            >
                                <span className="truncate max-w-[180px]">{l}</span>
                                {l === currentLayoutName && <Check size={14} className="text-blue-500 shrink-0" />}
                            </button>
                        ))}
                    </div>

                    <div className="h-px bg-[#2a2e39] my-1" />

                    <div className="py-1">
                        <button 
                            className="w-full text-left px-4 py-2 text-sm text-red-400 hover:bg-[#2a2e39] hover:text-red-300 flex items-center space-x-2 disabled:opacity-50"
                            onClick={() => { deleteLayout(); setIsOpen(false); }}
                            disabled={layouts.length <= 1}
                        >
                            <Trash2 size={14} />
                            <span>Delete layout</span>
                        </button>
                        <button 
                            className="w-full text-left px-4 py-2 text-sm text-gray-300 hover:bg-[#2a2e39] hover:text-white flex items-center space-x-2"
                            onClick={() => { restoreVersion("mock_version"); setIsOpen(false); }}
                        >
                            <Clock size={14} />
                            <span>Restore previous version</span>
                        </button>
                    </div>

                </div>
            )}
        </div>
    );
};
