import React, { createContext, useContext, useState, useEffect, useRef } from "react";

export type LayoutSaveState = "saved" | "saving" | "unsaved";

export interface LayoutSaveContextType {
    autoSaveEnabled: boolean;
    setAutoSaveEnabled: (val: boolean) => void;
    saveState: LayoutSaveState;
    lastSaved: Date | null;
    currentLayoutName: string;
    cloudSyncEnabled: boolean;
    setCloudSyncEnabled: (val: boolean) => void;
    markUnsaved: () => void;
    saveLayout: () => void;
    saveAsNewLayout: (name: string) => void;
    renameLayout: (name: string) => void;
    duplicateLayout: () => void;
    deleteLayout: () => void;
    restoreVersion: (versionId: string) => void;
    switchLayout: (name: string) => void;
    layouts: string[]; // List of available layout names
}

const LayoutSaveContext = createContext<LayoutSaveContextType | undefined>(undefined);

export const useLayoutSave = () => {
    const context = useContext(LayoutSaveContext);
    if (!context) {
        throw new Error("useLayoutSave must be used within a LayoutSaveProvider");
    }
    return context;
};

export const LayoutSaveProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
    const [autoSaveEnabled, setAutoSaveEnabled] = useState(true);
    const [cloudSyncEnabled, setCloudSyncEnabled] = useState(false);
    const [saveState, setSaveState] = useState<LayoutSaveState>("saved");
    const [lastSaved, setLastSaved] = useState<Date | null>(new Date());
    const [currentLayoutName, setCurrentLayoutName] = useState("Unnamed Layout");
    const [layouts, setLayouts] = useState<string[]>(["Unnamed Layout"]);
    
    const saveTimerRef = useRef<NodeJS.Timeout | null>(null);

    // Initialize from local storage
    useEffect(() => {
        try {
            const savedLayoutsStr = localStorage.getItem("workspace_layouts");
            if (savedLayoutsStr) {
                const parsedLayouts = JSON.parse(savedLayoutsStr);
                if (Array.isArray(parsedLayouts) && parsedLayouts.length > 0) {
                    setLayouts(parsedLayouts);
                }
            }
            const currentNameStr = localStorage.getItem("current_layout_name");
            if (currentNameStr) {
                setCurrentLayoutName(currentNameStr);
            } else {
                localStorage.setItem("current_layout_name", currentLayoutName);
            }
        } catch (e) {}
    }, []);

    // Warn on beforeunload if unsaved
    useEffect(() => {
        const handleBeforeUnload = (e: BeforeUnloadEvent) => {
            if (saveState === "unsaved") {
                const message = "You have unsaved changes. Are you sure you want to leave?";
                e.preventDefault();
                e.returnValue = message;
                return message;
            }
        };

        window.addEventListener("beforeunload", handleBeforeUnload);
        return () => window.removeEventListener("beforeunload", handleBeforeUnload);
    }, [saveState]);

    // Load correct timestamp on layout change
    useEffect(() => {
        try {
            const stampsStr = localStorage.getItem("workspace_timestamps");
            if (stampsStr) {
                const stamps = JSON.parse(stampsStr);
                if (stamps[currentLayoutName]) {
                    setLastSaved(new Date(stamps[currentLayoutName]));
                } else {
                    setLastSaved(null);
                }
            }
        } catch(e) {}
    }, [currentLayoutName]);

    const performSave = () => {
        setSaveState("saving");
        
        // Broadcast custom save event so subcomponents can dump their states
        window.dispatchEvent(new CustomEvent('app-request-save', { detail: { layoutName: currentLayoutName } }));
        
        // Simulate network/disk delay
        setTimeout(() => {
            // Save layouts metadata first
            try {
                localStorage.setItem("workspace_layouts", JSON.stringify(layouts));
                localStorage.setItem("current_layout_name", currentLayoutName);
                
                const stampsStr = localStorage.getItem("workspace_timestamps") || "{}";
                const stamps = JSON.parse(stampsStr);
                stamps[currentLayoutName] = new Date().toISOString();
                localStorage.setItem("workspace_timestamps", JSON.stringify(stamps));
                
                setSaveState("saved");
                setLastSaved(new Date());
            } catch (e: any) {
                console.error("[SaveSystem] Save Failed. Storage unavailable or full:", e);
                setSaveState("unsaved");
                alert("Save Failed: Browser storage is either full or unavailable.\n\n" + e.message);
            }
        }, 300);
    };

    const markUnsaved = () => {
        if (saveState === "unsaved") return;
        setSaveState("unsaved");
        
        if (autoSaveEnabled) {
            if (saveTimerRef.current) {
                clearTimeout(saveTimerRef.current);
            }
            saveTimerRef.current = setTimeout(() => {
                performSave();
            }, 1000); // Debounce auto-save by 1s
        }
    };

    const saveLayout = () => {
        if (saveTimerRef.current) clearTimeout(saveTimerRef.current);
        performSave();
    };

    const saveAsNewLayout = (name: string) => {
        if (!layouts.includes(name)) {
            const newLayouts = [...layouts, name];
            setLayouts(newLayouts);
        }
        setCurrentLayoutName(name);
        markUnsaved(); // Trigger a save internally
        saveLayout();
    };

    const renameLayout = (newName: string) => {
        const newLayouts = layouts.map(l => l === currentLayoutName ? newName : l);
        setLayouts(newLayouts);
        setCurrentLayoutName(newName);
        markUnsaved();
        saveLayout();
    };

    const switchLayout = (name: string) => {
        if (saveState === "unsaved") {
            saveLayout();
        }
        setCurrentLayoutName(name);
        try {
            localStorage.setItem("current_layout_name", name);
        } catch(e) {}
    };

    const duplicateLayout = () => {
        const copyName = `${currentLayoutName} (Copy)`;
        saveAsNewLayout(copyName);
    };

    const deleteLayout = () => {
        const newLayouts = layouts.filter(l => l !== currentLayoutName);
        if (newLayouts.length === 0) {
            newLayouts.push("Unnamed Layout");
            setLayouts(newLayouts);
            setCurrentLayoutName("Unnamed Layout");
        } else {
            setLayouts(newLayouts);
            setCurrentLayoutName(newLayouts[0]);
        }
        markUnsaved();
        saveLayout();
    };

    const restoreVersion = (versionId: string) => {
        // Mock restore functionality
        setSaveState("saving");
        setTimeout(() => {
            setSaveState("saved");
            markUnsaved();
        }, 600);
    };

    return (
        <LayoutSaveContext.Provider value={{
            autoSaveEnabled,
            setAutoSaveEnabled,
            saveState,
            lastSaved,
            currentLayoutName,
            cloudSyncEnabled,
            setCloudSyncEnabled,
            markUnsaved,
            saveLayout,
            saveAsNewLayout,
            renameLayout,
            duplicateLayout,
            deleteLayout,
            restoreVersion,
            switchLayout,
            layouts
        }}>
            {children}
        </LayoutSaveContext.Provider>
    );
};
