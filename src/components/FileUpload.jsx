import React, { useCallback, useState, useRef } from 'react';
import Papa from 'papaparse';
import * as XLSX from 'xlsx';
import { Upload, FileType, CheckCircle, AlertCircle, Link, FileSpreadsheet, Loader2 } from 'lucide-react';
import { Card, CardContent, Button, Input, Label } from './ui-base';
import { cn } from '../lib/utils';

export function FileUpload({ onDataLoaded, onSuccess, onFileName }) {
    const [activeTab, setActiveTab] = useState('file'); // 'file' or 'link'
    const [isDragging, setIsDragging] = useState(false);
    const [isProcessing, setIsProcessing] = useState(false);
    const [error, setError] = useState(null);
    const [success, setSuccess] = useState(null);
    const [gsLink, setGsLink] = useState('');
    const fileInputRef = useRef(null);

    const handleDrag = useCallback((e) => {
        e.preventDefault();
        e.stopPropagation();
        if (e.type === 'dragenter' || e.type === 'dragover') {
            setIsDragging(true);
        } else if (e.type === 'dragleave') {
            setIsDragging(false);
        }
    }, []);

    const processData = (data, name) => {
        if (data.length === 0) {
            setError("No data found in the source.");
            return;
        }
        onDataLoaded(data);
        if (onFileName) onFileName(name);
        setSuccess(`Loaded ${data.length} rows from ${name}`);
        if (onSuccess) onSuccess(`Successfully loaded ${data.length} contacts.`);
    };

    const parseFile = async (file) => {
        setError(null);
        setSuccess(null);
        setIsProcessing(true);

        const name = file.name;
        const ext = name.split('.').pop().toLowerCase();

        try {
            if (ext === 'csv' || ext === 'tsv' || ext === 'txt') {
                Papa.parse(file, {
                    header: true,
                    skipEmptyLines: true,
                    delimiter: ext === 'tsv' ? "\t" : "",
                    complete: (results) => {
                        setIsProcessing(false);
                        if (results.errors.length > 0) {
                            setError(`Error parsing file: ${results.errors[0].message}`);
                        } else {
                            processData(results.data, name);
                        }
                    },
                    error: (err) => {
                        setIsProcessing(false);
                        setError(`Failed to read file: ${err.message}`);
                    }
                });
            } else if (['xlsx', 'xls', 'ods'].includes(ext)) {
                const reader = new FileReader();
                reader.onload = (e) => {
                    try {
                        const data = new Uint8Array(e.target.result);
                        const workbook = XLSX.read(data, { type: 'array' });
                        const firstSheetName = workbook.SheetNames[0];
                        const worksheet = workbook.Sheets[firstSheetName];
                        const jsonData = XLSX.utils.sheet_to_json(worksheet);
                        setIsProcessing(false);
                        processData(jsonData, name);
                    } catch (err) {
                        setIsProcessing(false);
                        setError("Failed to parse Excel file.");
                    }
                };
                reader.readAsArrayBuffer(file);
            } else {
                setIsProcessing(false);
                setError("Unsupported file format. Use .csv, .xlsx, or .tsv");
            }
        } catch (err) {
            setIsProcessing(false);
            setError("An unexpected error occurred.");
        }
    };

    const importGoogleSheet = async () => {
        if (!gsLink.includes('docs.google.com/spreadsheets')) {
            setError("Please enter a valid Google Sheets link.");
            return;
        }

        setError(null);
        setIsProcessing(true);

        try {
            // Extract the spreadsheet ID
            const matches = gsLink.match(/\/d\/(.+?)\//);
            if (!matches) throw new Error("Invalid Google Sheets URL format.");

            const sheetId = matches[1];
            // Fetch as CSV export (works for public sheets)
            const exportUrl = `https://docs.google.com/spreadsheets/d/${sheetId}/export?format=csv`;

            const response = await fetch(exportUrl);
            if (!response.ok) throw new Error("Spreadsheet not found or not public. Ensure 'Anyone with the link' can view.");

            const csvText = await response.text();
            Papa.parse(csvText, {
                header: true,
                skipEmptyLines: true,
                complete: (results) => {
                    setIsProcessing(false);
                    processData(results.data, "Google Sheet");
                }
            });
        } catch (err) {
            setIsProcessing(false);
            setError(err.message || "Failed to fetch Google Sheet. Make sure it is public.");
        }
    };

    const handleDrop = useCallback((e) => {
        e.preventDefault();
        e.stopPropagation();
        setIsDragging(false);
        if (e.dataTransfer.files && e.dataTransfer.files[0]) {
            parseFile(e.dataTransfer.files[0]);
        }
    }, []);

    const handleChange = (e) => {
        if (e.target.files && e.target.files[0]) {
            parseFile(e.target.files[0]);
        }
    };

    return (
        <Card className="w-full border-slate-200 shadow-sm overflow-hidden">
            <div className="flex border-b border-slate-100 bg-slate-50/50">
                <button
                    onClick={() => setActiveTab('file')}
                    className={cn(
                        "flex-1 py-3 text-[10px] font-bold uppercase tracking-widest transition-all border-b-2",
                        activeTab === 'file' ? "border-blue-600 text-blue-600 bg-white" : "border-transparent text-slate-400"
                    )}
                >
                    <div className="flex items-center justify-center gap-2">
                        <Upload className="w-3.5 h-3.5" /> Device File
                    </div>
                </button>
                <button
                    onClick={() => setActiveTab('link')}
                    className={cn(
                        "flex-1 py-3 text-[10px] font-bold uppercase tracking-widest transition-all border-b-2",
                        activeTab === 'link' ? "border-blue-600 text-blue-600 bg-white" : "border-transparent text-slate-400"
                    )}
                >
                    <div className="flex items-center justify-center gap-2">
                        <Link className="w-3.5 h-3.5" /> Google Sheets
                    </div>
                </button>
            </div>

            <CardContent className="p-6">
                {activeTab === 'file' ? (
                    <div
                        className={cn(
                            "relative flex flex-col items-center justify-center w-full min-h-[180px] rounded-2xl border-2 border-dashed transition-all duration-300",
                            isDragging ? "border-blue-500 bg-blue-50/50 scale-[0.99]" : "border-slate-200 hover:border-blue-400 hover:bg-slate-50/50",
                            error ? "border-red-200 bg-red-50/30" : "",
                            success ? "border-green-200 bg-green-50/30" : ""
                        )}
                        onDragEnter={handleDrag}
                        onDragLeave={handleDrag}
                        onDragOver={handleDrag}
                        onDrop={handleDrop}
                        onClick={() => fileInputRef.current?.click()}
                    >
                        <input
                            ref={fileInputRef}
                            type="file"
                            className="hidden"
                            accept=".csv, .xlsx, .xls, .tsv, .txt, .ods"
                            onChange={handleChange}
                        />

                        <div className="flex flex-col items-center space-y-3 text-center p-4">
                            {isProcessing ? (
                                <Loader2 className="w-10 h-10 text-blue-500 animate-spin" />
                            ) : success ? (
                                <CheckCircle className="w-10 h-10 text-green-500" />
                            ) : error ? (
                                <AlertCircle className="w-10 h-10 text-red-500" />
                            ) : (
                                <div className="bg-blue-50 p-3 rounded-2xl">
                                    <FileSpreadsheet className="w-8 h-8 text-blue-600" />
                                </div>
                            )}

                            <div className="space-y-1">
                                <p className="text-sm font-bold text-slate-900">
                                    {isProcessing ? "Processing..." : success ? success : error ? error : "Tap to browse files"}
                                </p>
                                <p className="text-xs text-slate-500 max-w-[200px]">
                                    Supports CSV, Excel (XLSX), and TSV formats
                                </p>
                            </div>

                            {!success && !isProcessing && (
                                <Button size="sm" className="mt-2 bg-blue-600 hover:bg-blue-700 text-white rounded-full px-6 text-[11px] font-bold shadow-md shadow-blue-100 h-9">
                                    Choose File
                                </Button>
                            )}
                        </div>
                    </div>
                ) : (
                    <div className="space-y-4 py-2">
                        <div className="space-y-2">
                            <Label className="text-[10px] font-bold uppercase tracking-widest text-slate-500">Google Sheet URL</Label>
                            <Input
                                placeholder="https://docs.google.com/spreadsheets/d/..."
                                value={gsLink}
                                onChange={(e) => setGsLink(e.target.value)}
                                className="h-12 rounded-xl bg-slate-50/50 border-slate-200 focus:ring-blue-500/20"
                            />
                            <p className="text-[10px] text-slate-400 italic">
                                Note: Sheet must be shared as "Anyone with the link can view"
                            </p>
                        </div>
                        <Button
                            className="w-full h-12 bg-blue-600 hover:bg-blue-700 text-white font-bold rounded-xl shadow-lg shadow-blue-100 flex gap-2"
                            onClick={importGoogleSheet}
                            disabled={isProcessing || !gsLink}
                        >
                            {isProcessing ? <Loader2 className="w-4 h-4 animate-spin" /> : <Link className="w-4 h-4" />}
                            Import from Google Sheets
                        </Button>
                        {error && <p className="text-xs text-red-500 text-center font-medium bg-red-50 p-2 rounded-lg border border-red-100">{error}</p>}
                    </div>
                )}

                {success && !isProcessing && (
                    <div className="mt-4 flex items-center justify-between p-3 bg-blue-50/50 text-blue-700 rounded-xl text-xs border border-blue-100/50">
                        <div className="flex items-center gap-2">
                            <FileType className="w-4 h-4" />
                            <span className="font-bold">Contacts loaded successfully</span>
                        </div>
                        <button
                            onClick={() => { setSuccess(null); setError(null); onDataLoaded([]); }}
                            className="text-blue-800 font-bold hover:underline"
                        >
                            Clear
                        </button>
                    </div>
                )}
            </CardContent>
        </Card>
    );
}
