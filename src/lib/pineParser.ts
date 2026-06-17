export interface PineDiagnostic {
    line: number;
    column: number;
    msg: string;
}

export interface PineCompilationResult {
    success: boolean;
    diagnostics: PineDiagnostic[];
    studies: string[];
}

export const compilePineScript = (script: string): PineCompilationResult => {
    const diagnostics: PineDiagnostic[] = [];
    const studies: string[] = [];
    
    const lines = script.split('\n');
    let hasVersion = false;
    let hasDeclaration = false;
    
    lines.forEach((line, index) => {
        const text = line.trim();
        if (text.startsWith('//@version=')) {
            hasVersion = true;
            const version = parseInt(text.replace('//@version=', ''));
            if (isNaN(version) || version < 1 || version > 6) {
                diagnostics.push({ line: index + 1, column: 1, msg: `Unsupported Pine script version: ${version}. Supported versions: 1-6.` });
            }
        }
        
        if (text.startsWith('indicator(') || text.startsWith('strategy(') || text.startsWith('study(')) {
            hasDeclaration = true;
            if (!text.endsWith(')') && !text.includes(')')) {
                diagnostics.push({ line: index + 1, column: text.length, msg: `Syntax Error: Missing closing parenthesis ')'.` });
            }
        }
        
        // Find missing parentheses
        const openParens = (text.match(/\(/g) || []).length;
        const closeParens = (text.match(/\)/g) || []).length;
        if (openParens !== closeParens) {
            diagnostics.push({ line: index + 1, column: 1, msg: `Syntax Error: Unbalanced parentheses.` });
        }
        
        // Naively check for common invalid variable or invalid assignment
        if (text.includes('=') && !text.includes('==') && !text.includes('=>') && !text.startsWith('//')) {
            const parts = text.split('=');
            if (parts[0].trim() === '') {
                diagnostics.push({ line: index + 1, column: 1, msg: `Syntax Error: Invalid assignment.` });
            }
        }
        
        // Strip comments for study detection
        const cleanLine = text.replace(/\/\/.*|\/\*[\s\S]*?\*\//g, '').toLowerCase();
        
        // VERY strict matching to prevent unrelated indicators.
        // We only map if a standard function is used as the PRIMARY output (like plot(ta.sma)) 
        // to avoid loading them by accident on complex custom scripts.
        if (cleanLine.includes("plot(ta.sma") || cleanLine.includes("plot(sma")) studies.push("MASimple@tv-basicstudies");
        if (cleanLine.includes("plot(ta.ema") || cleanLine.includes("plot(ema")) studies.push("MAExp@tv-basicstudies");
        if (cleanLine.includes("plot(ta.macd") || cleanLine.includes("plot(macd")) studies.push("MACD@tv-basicstudies");
        if (cleanLine.includes("plot(ta.rsi") || cleanLine.includes("plot(rsi")) studies.push("RSI@tv-basicstudies");
        if (cleanLine.includes("ta.bb(") || cleanLine.includes("ta.bollinger")) studies.push("BB@tv-basicstudies");
        if (cleanLine.includes("plot(ta.stoch") || cleanLine.includes("plot(stoch")) studies.push("StochasticRSI@tv-basicstudies");
        if (cleanLine.includes("ta.vwap")) studies.push("VWAP@tv-basicstudies");
        if (cleanLine.includes("plot(ta.atr") || cleanLine.includes("plot(atr")) studies.push("ATR@tv-basicstudies");
        if (cleanLine.includes("plot(ta.cci") || cleanLine.includes("plot(cci")) studies.push("CCI@tv-basicstudies");
    });
    
    if (!hasVersion) {
        diagnostics.push({ line: 1, column: 1, msg: `Compilation Error: Missing //@version directive.` });
    }
    if (!hasDeclaration) {
        diagnostics.push({ line: 1, column: 1, msg: `Compilation Error: Script must contain a study(), indicator() or strategy() declaration.` });
    }
    
    return {
        success: diagnostics.length === 0,
        diagnostics,
        studies: [...new Set(studies)]
    };
};

export const parsePineScriptToStudies = (script: string): string[] => {
    // Legacy fallback (now utilizing the strict compiler)
    const res = compilePineScript(script);
    return res.studies;
};
