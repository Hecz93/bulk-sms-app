import React, { useState, useEffect } from 'react';
import { Card, CardHeader, CardTitle, CardContent, Label, Button } from './ui-base';
import { Plus, Wand2, Eye, AlertTriangle } from 'lucide-react';

export function MessageEditor({ template, setTemplate, columns = [], previewRow = {} }) {
    const [activeTab, setActiveTab] = useState('edit'); // 'edit' or 'preview'

    // Helper to insert text at cursor position
    const insertText = (text) => {
        const textarea = document.getElementById('message-input');
        if (!textarea) {
            setTemplate(prev => prev + text);
            return;
        }

        const start = textarea.selectionStart;
        const end = textarea.selectionEnd;
        const current = textarea.value;

        const newValue = current.substring(0, start) + text + current.substring(end);
        setTemplate(newValue);

        // Re-focus logic would go here ideally
    };

    const insertSpintax = () => {
        insertText("{Hello|Hi|Hey}");
    };

    // Live Preview Logic
    const [preview, setPreview] = useState("");

    useEffect(() => {
        if (!template) {
            setPreview("");
            return;
        }

        let msg = template;

        // 1. Spintax Preview (Just pick first option for visuals)
        msg = msg.replace(/\{([^{}]+?\|[^{}]+?)\}/g, (match, content) => {
            return content.split('|')[0];
        });

        // 2. Variable Preview
        if (previewRow && Object.keys(previewRow).length > 0) {
            for (const [key, value] of Object.entries(previewRow)) {
                const regex = new RegExp(`{{${key}}}`, 'gi');
                msg = msg.replace(regex, value || `[${key}]`);
            }
        } else {
            // If no data, just leave variables or highlight them
        }

        setPreview(msg);

    }, [template, previewRow]);

    const segmentCount = Math.ceil(template.length / 160) || 1;
    const charCount = template.length;

    return (
        <Card className="h-full flex flex-col border-slate-200 shadow-sm bg-white">
            <CardHeader className="pb-3 border-b border-slate-100 bg-slate-50/50">
                <div className="flex items-center justify-between">
                    <CardTitle className="text-base font-semibold flex items-center gap-2 text-slate-800">
                        <Wand2 className="w-4 h-4 text-purple-600" /> Message Composer
                    </CardTitle>
                    <div className="flex gap-2">
                        <span className="text-xs font-mono bg-slate-100 text-slate-500 px-2 py-1 rounded">
                            {charCount} chars / {segmentCount} SMS
                        </span>
                    </div>
                </div>
            </CardHeader>

            {/* Mobile Tab Toggle */}
            <div className="lg:hidden flex border-b border-slate-100 bg-slate-50/30">
                <button
                    onClick={() => setActiveTab('edit')}
                    className={cn(
                        "flex-1 py-3 text-xs font-bold uppercase tracking-widest transition-all border-b-2",
                        activeTab === 'edit' ? "border-blue-600 text-blue-600" : "border-transparent text-slate-400"
                    )}
                >
                    Edit Template
                </button>
                <button
                    onClick={() => setActiveTab('preview')}
                    className={cn(
                        "flex-1 py-3 text-xs font-bold uppercase tracking-widest transition-all border-b-2",
                        activeTab === 'preview' ? "border-blue-600 text-blue-600" : "border-transparent text-slate-400"
                    )}
                >
                    Live Preview
                </button>
            </div>

            <CardContent className="flex-1 flex flex-col lg:flex-row gap-0 p-0">

                {/* Editor Section */}
                <div className={cn(
                    "flex-1 p-4 flex flex-col gap-4 border-b lg:border-b-0 lg:border-r border-slate-100",
                    activeTab !== 'edit' && "hidden lg:flex"
                )}>
                    <div className="flex items-center justify-between">
                        <Label htmlFor="message-input" className="text-xs font-medium uppercase tracking-wider text-slate-500">
                            Template
                        </Label>
                        <button
                            onClick={insertSpintax}
                            className="text-xs flex items-center gap-1 text-purple-600 hover:text-purple-700 font-medium transition-colors"
                            title="Insert random variations to prevent blocking"
                        >
                            <Plus className="w-3 h-3" /> Add Spintax
                        </button>
                    </div>

                    <textarea
                        id="message-input"
                        className="flex-1 min-h-[150px] w-full p-4 rounded-lg border border-slate-200 focus:outline-none focus:ring-2 focus:ring-purple-500/20 focus:border-purple-500 transition-all font-mono text-sm leading-relaxed text-slate-800 resize-none shadow-sm"
                        placeholder="Hi {{Name}}, check out this offer..."
                        value={template}
                        onChange={(e) => setTemplate(e.target.value)}
                    />

                    {/* Variables Toolbar */}
                    <div className="space-y-2">
                        <Label className="text-[10px] font-semibold uppercase tracking-wider text-slate-400">
                            Click to Insert Variable
                        </Label>
                        <div className="flex flex-wrap gap-2 min-h-[30px]">
                            {columns.length > 0 ? (
                                columns.map((col) => (
                                    <button
                                        key={col}
                                        onClick={() => insertText(`{{${col}}}`)}
                                        className="inline-flex items-center gap-1 px-2.5 py-1 bg-blue-50 hover:bg-blue-100 text-blue-700 hover:text-blue-800 border border-blue-200 text-xs font-medium rounded-md transition-all active:scale-95"
                                    >
                                        <Plus className="w-3 h-3" />
                                        {col}
                                    </button>
                                ))
                            ) : (
                                <div className="flex items-center gap-2 text-xs text-amber-600 bg-amber-50 px-3 py-2 rounded-md border border-amber-100 w-full">
                                    <AlertTriangle className="w-4 h-4" />
                                    Upload CSV to see variables
                                </div>
                            )}
                        </div>
                    </div>
                </div>

                {/* Preview Section */}
                <div className={cn(
                    "lg:w-[35%] bg-slate-50/50 p-4 flex flex-col gap-3",
                    activeTab !== 'preview' && "hidden lg:flex"
                )}>
                    <Label className="text-xs font-medium uppercase tracking-wider text-slate-500 flex items-center gap-2">
                        <Eye className="w-3 h-3" /> Live Preview (Row 1)
                    </Label>

                    <div className="flex-1 bg-white border border-slate-200 rounded-2xl p-4 shadow-sm relative overflow-hidden">
                        {/* iPhone Notch Mockup */}
                        <div className="absolute top-0 left-1/2 -translate-x-1/2 w-20 h-4 bg-slate-100 rounded-b-xl"></div>

                        <div className="mt-4 flex flex-col gap-2">
                            <div className="max-w-[85%] self-end bg-blue-500 text-white rounded-2xl rounded-tr-sm px-4 py-2 text-sm leading-relaxed shadow-sm break-words whitespace-pre-wrap">
                                {preview || <span className="opacity-50 italic">Start typing...</span>}
                            </div>
                            <div className="text-[10px] text-slate-400 text-right pr-1">
                                Now
                            </div>
                        </div>
                    </div>

                    <div className="bg-purple-50 border border-purple-100 rounded-md p-3">
                        <h4 className="text-xs font-bold text-purple-800 flex items-center gap-1 mb-1">
                            <Wand2 className="w-3 h-3" /> Anti-Ban Tip
                        </h4>
                        <p className="text-[10px] text-purple-700 leading-tight">
                            Use <strong>Spintax</strong> to vary messages. <br />
                            Example: <code>{'{'}Hi | Hello{'}'}</code> sends "Hi" to half and "Hello" to the rest.
                        </p>
                    </div>
                </div>

            </CardContent>
        </Card>
    );
}
