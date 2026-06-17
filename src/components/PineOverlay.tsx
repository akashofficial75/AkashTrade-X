import React, { useEffect, useRef } from 'react';

interface PineOverlayProps {
    scripts?: string[];
    scriptContent?: string;
    symbol?: string;
    interval?: string;
    width?: number;
    height?: number;
}

export const PineOverlay: React.FC<PineOverlayProps> = ({ scripts, scriptContent }) => {
    const canvasRef = useRef<HTMLCanvasElement>(null);

    useEffect(() => {
        const canvas = canvasRef.current;
        if (!canvas) return;
        const ctx = canvas.getContext('2d');
        if (!ctx) return;

        const draw = () => {
            const width = canvas.width;
            const height = canvas.height;
            ctx.clearRect(0, 0, width, height);

            const activeScripts = scripts || (scriptContent ? [scriptContent] : []);
            activeScripts.forEach((script, scriptIndex) => {
                const lines = script.split('\n');
                lines.forEach((line, lineIndex) => {
                    const text = line.trim().toLowerCase();
                    
                    // bgcolor mock
                    if (text.includes('bgcolor(')) {
                        const colorMatch = text.match(/color\s*=\s*(color\.[a-z]+|#?[a-f0-9]+)/i);
                        if (colorMatch) {
                            let colorStr = colorMatch[1];
                            if (colorStr.startsWith('color.')) {
                                colorStr = colorStr.replace('color.', '');
                            }
                            ctx.fillStyle = colorStr;
                            ctx.globalAlpha = 0.05;
                            ctx.fillRect(0, 0, width, height);
                            ctx.globalAlpha = 1.0;
                        } else {
                            ctx.fillStyle = 'rgba(41, 98, 255, 0.05)';
                            ctx.fillRect(0, 0, width, height);
                        }
                    }

                    // hline mock
                    if (text.match(/^([a-zA-Z0-9_]+\s*=\s*)?hline\(/)) {
                        const priceMatch = text.match(/hline\(([\d.]+)/);
                        const y = height * 0.5 + ((priceMatch ? parseFloat(priceMatch[1]) % 100 : 50) / 100 * (height * 0.2));
                        
                        ctx.strokeStyle = 'rgba(239, 83, 80, 0.7)';
                        const colorMatch = text.match(/color\s*=\s*(color\.[a-z]+|#?[a-f0-9]+)/i);
                        if (colorMatch) {
                            let colorStr = colorMatch[1];
                            if (colorStr.startsWith('color.')) colorStr = colorStr.replace('color.', '');
                            ctx.strokeStyle = colorStr;
                        }

                        ctx.lineWidth = 1;
                        ctx.setLineDash([5, 5]);
                        ctx.beginPath();
                        ctx.moveTo(0, y);
                        ctx.lineTo(width, y);
                        ctx.stroke();
                        ctx.setLineDash([]);
                    }
                    
                    // plot mock
                    if (text.match(/^([a-zA-Z0-9_]+\s*=\s*)?plot\(/)) {
                        ctx.strokeStyle = 'rgba(41, 150, 255, 0.8)';
                        const colorMatch = text.match(/color\s*=\s*(color\.[a-z]+|#?[a-f0-9]+)/i);
                        if (colorMatch) {
                            let colorStr = colorMatch[1];
                            if (colorStr.startsWith('color.')) colorStr = colorStr.replace('color.', '');
                            ctx.strokeStyle = colorStr;
                        }
                        
                        ctx.lineWidth = 1.5;
                        ctx.beginPath();
                        
                        // Generate a visually distinct line based on script index and line number
                        const seed = scriptIndex * 10 + lineIndex;
                        const frequency = 0.01 + ((seed % 5) * 0.005);
                        const phase = (seed % 10) * 0.5;
                        const baseHeight = height * 0.4 + ((seed % 3) * height * 0.1);
                        const amplitude = height * 0.1 + ((seed % 4) * height * 0.05);

                        for (let i = 0; i <= width; i += 5) {
                            const y = baseHeight + Math.sin(i * frequency + phase) * amplitude;
                            if (i === 0) ctx.moveTo(i, y);
                            else ctx.lineTo(i, y);
                        }
                        ctx.stroke();
                    }

                    // plotshape mock
                    if (text.match(/^([a-zA-Z0-9_]+\s*=\s*)?plotshape\(/)) {
                        ctx.fillStyle = 'rgba(239, 83, 80, 0.8)';
                        const colorMatch = text.match(/color\s*=\s*(color\.[a-z]+|#?[a-f0-9]+)/i);
                        if (colorMatch) {
                            let colorStr = colorMatch[1];
                            if (colorStr.startsWith('color.')) colorStr = colorStr.replace('color.', '');
                            ctx.fillStyle = colorStr;
                        }

                        const shapeMatch = text.match(/style\s*=\s*shape\.([a-z]+)/i);
                        const isTriangle = shapeMatch && shapeMatch[1].includes('triangle');
                        const isCross = shapeMatch && shapeMatch[1].includes('cross');
                        
                        const yBase = height * 0.2 + (lineIndex % 5) * 20;
                        const spacing = width * 0.15 + (lineIndex % 3) * 50;
                        
                        for (let i = width * 0.1; i < width * 0.9; i += spacing) {
                            if (isTriangle) {
                                ctx.beginPath();
                                ctx.moveTo(i, yBase - 5);
                                ctx.lineTo(i + 5, yBase + 5);
                                ctx.lineTo(i - 5, yBase + 5);
                                ctx.fill();
                            } else if (isCross) {
                                ctx.strokeStyle = ctx.fillStyle;
                                ctx.lineWidth = 2;
                                ctx.beginPath();
                                ctx.moveTo(i - 4, yBase - 4);
                                ctx.lineTo(i + 4, yBase + 4);
                                ctx.moveTo(i + 4, yBase - 4);
                                ctx.lineTo(i - 4, yBase + 4);
                                ctx.stroke();
                            } else {
                                ctx.beginPath();
                                ctx.arc(i, yBase, 3.5, 0, Math.PI * 2);
                                ctx.fill();
                            }
                        }
                    }

                    // box.new mock
                    if (text.includes('box.new(')) {
                        ctx.fillStyle = 'rgba(41, 150, 255, 0.1)';
                        ctx.strokeStyle = 'rgba(41, 150, 255, 0.6)';
                        
                        const bgMatch = text.match(/bgcolor\s*=\s*(color\.[a-z]+|rgba?\([^)]+\)|#?[a-f0-9]+)/i);
                        if (bgMatch) {
                            let bgStr = bgMatch[1];
                            if (bgStr.startsWith('color.')) bgStr = bgStr.replace('color.', '');
                            ctx.fillStyle = bgStr;
                        }

                        ctx.lineWidth = 1;

                        const w = width * 0.15;
                        const h = height * 0.3;
                        const x = width * 0.3 + (scriptIndex * width * 0.1);
                        const y = height * 0.3 + (lineIndex % 2 * height * 0.1);
                        
                        ctx.fillRect(x, y, w, h);
                        ctx.strokeRect(x, y, w, h);
                        
                        ctx.fillStyle = 'rgba(41, 150, 255, 0.8)';
                        ctx.font = '10px sans-serif';
                        ctx.fillText('Session Box', x + 4, y + 14);
                    }
                    
                    // line.new mock
                    if (text.includes('line.new(')) {
                        ctx.strokeStyle = 'rgba(255, 167, 38, 0.8)';
                        const colorMatch = text.match(/color\s*=\s*(color\.[a-z]+|#?[a-f0-9]+)/i);
                        if (colorMatch) {
                            let colorStr = colorMatch[1];
                            if (colorStr.startsWith('color.')) colorStr = colorStr.replace('color.', '');
                            ctx.strokeStyle = colorStr;
                        }

                        ctx.lineWidth = 2;
                        ctx.beginPath();
                        ctx.moveTo(width * 0.2 + (lineIndex % 5 * 20), height * 0.7);
                        ctx.lineTo(width * 0.8, height * 0.3 + (lineIndex % 5 * 20));
                        ctx.stroke();
                    }

                    // label.new mock
                    if (text.includes('label.new(')) {
                        ctx.fillStyle = 'rgba(255, 255, 255, 0.9)';
                        ctx.strokeStyle = 'rgba(255, 255, 255, 0.4)';
                        ctx.lineWidth = 1;
                        
                        const textMatch = text.match(/text\s*=\s*["']([^"']+)["']/i);
                        const labelText = textMatch ? textMatch[1] : 'Label';

                        const x = width * 0.4 + (lineIndex % 3 * 100);
                        const y = height * 0.25 + (lineIndex % 2 * 50);
                        
                        ctx.beginPath();
                        ctx.moveTo(x, y);
                        ctx.lineTo(x, y + 20);
                        ctx.stroke();

                        ctx.font = '11px sans-serif';
                        ctx.fillText(labelText, x - 15, y - 5);
                    }
                });
            });
        };

        const resize = () => {
            const parent = canvas.parentElement;
            if (parent) {
                canvas.style.width = '100%';
                canvas.style.height = '100%';
                canvas.width = parent.clientWidth;
                canvas.height = parent.clientHeight;
                draw();
            }
        };

        resize();
        window.addEventListener('resize', resize);
        
        return () => window.removeEventListener('resize', resize);
    }, [scripts, scriptContent]);

    const hasScripts = (scripts && scripts.length > 0) || !!scriptContent;
    if (!hasScripts) return null;

    return (
        <canvas 
            ref={canvasRef} 
            className="absolute inset-0 z-[100] pointer-events-none" 
            style={{ mixBlendMode: 'screen' }}
        />
    );
};

