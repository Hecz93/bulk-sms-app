import React from 'react';
import { Card, CardContent, CardHeader, CardTitle } from './ui-base';
import { Activity } from 'lucide-react'; // Placeholder icon
import { cn } from '../lib/utils';

// Simple Progress Bar Component
function ProgressBar({ value, max, className }) {
    const percentage = Math.min(100, Math.max(0, (value / max) * 100)) || 0;
    return (
        <div className={cn("h-4 w-full bg-slate-100 rounded-full overflow-hidden", className)}>
            <div
                className="h-full bg-blue-600 transition-all duration-300 ease-out"
                style={{ width: `${percentage}%` }}
            />
        </div>
    );
}

export function SendingProgress({ total, sent, failed, isSending, logs = [] }) {
    return (
        <Card className="h-full">
            <CardHeader className="pb-2">
                <CardTitle className="text-lg flex justify-between items-center">
                    <span>Sending Progress</span>
                    <span className={cn(
                        "text-xs px-2 py-1 rounded-full uppercase tracking-wider font-bold",
                        isSending ? "bg-amber-100 text-amber-700 animate-pulse" : "bg-slate-100 text-slate-500"
                    )}>
                        {isSending ? "In Progress" : "Idle"}
                    </span>
                </CardTitle>
            </CardHeader>
            <CardContent className="space-y-6">
                <div className="space-y-2">
                    <div className="flex justify-between text-sm font-medium text-slate-700">
                        <span>Progress</span>
                        <span>{sent + failed} / {total}</span>
                    </div>
                    <ProgressBar value={sent + failed} max={total} />
                    <div className="flex gap-4 text-xs text-slate-500 pt-1">
                        <span className="flex items-center gap-1">
                            <div className="w-2 h-2 rounded-full bg-green-500" />
                            {sent} Sent
                        </span>
                        <span className="flex items-center gap-1">
                            <div className="w-2 h-2 rounded-full bg-red-500" />
                            {failed} Failed
                        </span>
                    </div>
                </div>

                <div className="border rounded-md bg-slate-50 h-[300px] overflow-y-auto p-4 font-mono text-xs space-y-1">
                    {logs.length === 0 && (
                        <div className="text-slate-400 text-center mt-10">Waiting to start...</div>
                    )}
                    {logs.map((log, i) => (
                        <div key={i} className={cn(
                            "py-1 border-b border-slate-100 last:border-0",
                            log.type === 'error' ? "text-red-600" : "text-slate-600"
                        )}>
                            <span className="opacity-50 mr-2">[{log.time}]</span>
                            <span>{log.message}</span>
                        </div>
                    ))}
                </div>
            </CardContent>
        </Card>
    );
}
