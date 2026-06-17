// @ts-nocheck
import React, { Component, ErrorInfo, ReactNode } from "react";

interface Props {
  children?: ReactNode;
  fallback?: ReactNode;
  key?: string | number;
}

interface State {
  hasError: boolean;
}

export class ErrorBoundary extends React.Component<Props, State> {
  props: Props;
  state: State;

  constructor(props: Props) {
    super(props);
    this.props = props;
    this.state = { hasError: false };
  }

  setState(newState: Partial<State>) {
      this.state = { ...this.state, ...newState };
  }

  public static getDerivedStateFromError(_: Error): State {
    return { hasError: true };
  }

  public componentDidCatch(error: Error, errorInfo: ErrorInfo) {
    console.error("Uncaught error:", error, errorInfo);
  }

  public render() {
    if (this.state.hasError) {
      if (this.props.fallback) {
          return this.props.fallback;
      }
      return (
        <div className="flex w-full h-full items-center justify-center bg-[#131722] text-red-500 p-4 font-mono text-sm border border-red-500/20 rounded">
           <div className="text-center">
             <p className="font-bold mb-2">Chart Error</p>
             <p className="text-xs text-gray-400">The TradingView widget encountered an issue.</p>
             <button 
                className="mt-4 px-3 py-1 bg-[#2a2e39] text-white rounded hover:bg-gray-700"
                onClick={() => this.setState({ hasError: false })}
             >
                Reload
             </button>
           </div>
        </div>
      );
    }

    return this.props.children;
  }
}
