import React from 'react';
import { Card, CardHeader, CardTitle, CardContent, Label } from './ui-base';
import { Plus } from 'lucide-react';

export function MessageEditor({ template, setTemplate, columns = [] }) {
    const insertVariable = (variable) => {
        // Basic insertion at cursor or end
        // For simplicity in this iteration, appending to end. 
        // A more complex implementation would use refs to track cursor position.
        setTemplate(prev => prev + ` {{${variable.trim()}}}`);
    };

    const segmentCount = Math.ceil(template.length / 160) || 1;
    const charCount = template.length;

    return (
        <Card className="h-full flex flex-col">
            <CardHeader className="pb-4">
                <CardTitle className="text-lg flex items-center gap-2">
                    Message Composer
                </CardTitle>
            </CardHeader>
            <CardContent className="flex-1 flex flex-col gap-4">
                <div className="flex-1">
                    <Label htmlFor="message">Message Template</Label>
                    <textarea
                        id="message"
                        className="mt-2 w-full h-[60%] min-h-[150px] p-4 rounded-md border border-slate-200 focus:outline-none focus:ring-2 focus:ring-blue-500 resize-none font-mono text-sm leading-relaxed"
                        placeholder="Hello {{Name}}, here is your specialized offer..."
                        value={template}
                        onChange={(e) => setTemplate(e.target.value)}
                    />
                    <div className="flex justify-between text-xs text-slate-500 mt-2">
                        <span>{charCount} characters</span>
                        <span>{segmentCount} SMS segment(s) used</span>
                    </div>
                </div>

                <div>
                    <Label className="mb-2 block text-xs uppercase tracking-wider text-slate-500">Insert Variable</Label>
                    <div className="flex flex-wrap gap-2">
                        {columns.length > 0 ? (
                            columns.map((col) => (
                                <button
                                    key={col}
                                    onClick={() => insertVariable(col)}
                                    className="inline-flex items-center gap-1.5 px-3 py-1.5 bg-slate-100 hover:bg-slate-200 text-slate-700 text-xs font-medium rounded-full transition-colors border border-slate-200"
                                >
                                    <Plus className="w-3 h-3" />
                                    {col}
                                </button>
                            ))
                        ) : (
                            <span className="text-xs text-slate-400 italic">Upload a CSV to see available variables</span>
                        )}
                    </div>
                </div>
            </CardContent>
        </Card>
    );
}
