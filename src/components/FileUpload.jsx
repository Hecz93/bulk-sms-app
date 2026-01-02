import React, { useCallback, useState } from 'react';
import Papa from 'papaparse';
import { Upload, FileType, CheckCircle, AlertCircle } from 'lucide-react';
import { Card, CardContent } from './ui-base';
import { cn } from '../lib/utils';

export function FileUpload({ onDataLoaded, onSuccess }) {
    const [isDragging, setIsDragging] = useState(false);
    const [error, setError] = useState(null);
    const [success, setSuccess] = useState(null);

    const handleDrag = useCallback((e) => {
        e.preventDefault();
        e.stopPropagation();
        if (e.type === 'dragenter' || e.type === 'dragover') {
            setIsDragging(true);
        } else if (e.type === 'dragleave') {
            setIsDragging(false);
        }
    }, []);

    const parseFile = (file) => {
        setError(null);
        setSuccess(null);

        if (file.type !== 'text/csv' && !file.name.endsWith('.csv')) {
            setError("Please upload a CSV file.");
            return;
        }

        Papa.parse(file, {
            header: true,
            skipEmptyLines: true,
            complete: (results) => {
                if (results.errors.length > 0) {
                    setError(`Error parsing CSV: ${results.errors[0].message}`);
                } else if (results.data.length === 0) {
                    setError("CSV file is empty.");
                } else {
                    const filteredData = results.data; // Assuming filteredData is meant to be results.data if no specific filtering logic is provided
                    if (filteredData.length > 0) {
                        onDataLoaded(filteredData);
                        if (onSuccess) onSuccess(`Successfully loaded ${filteredData.length} contacts`);
                    } else {
                        setSuccess(`Successfully loaded ${results.data.length} contacts.`);
                        onDataLoaded(results.data);
                    }
                }
            },
            error: (err) => {
                setError(`Failed to read file: ${err.message}`);
            }
        });
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
        e.preventDefault();
        if (e.target.files && e.target.files[0]) {
            parseFile(e.target.files[0]);
        }
    };

    return (
        <Card className="w-full">
            <CardContent className="p-6">
                <div
                    className={cn(
                        "relative flex flex-col items-center justify-center w-full h-48 rounded-lg border-2 border-dashed transition-all duration-200 ease-in-out cursor-pointer",
                        isDragging ? "border-blue-500 bg-blue-50" : "border-slate-300 hover:border-blue-400 hover:bg-slate-50",
                        error ? "border-red-300 bg-red-50" : "",
                        success ? "border-green-300 bg-green-50" : ""
                    )}
                    onDragEnter={handleDrag}
                    onDragLeave={handleDrag}
                    onDragOver={handleDrag}
                    onDrop={handleDrop}
                >
                    <input
                        type="file"
                        className="absolute inset-0 w-full h-full opacity-0 cursor-pointer"
                        accept=".csv"
                        onChange={handleChange}
                    />

                    <div className="flex flex-col items-center space-y-3 text-center pointer-events-none">
                        {success ? (
                            <CheckCircle className="w-10 h-10 text-green-500" />
                        ) : error ? (
                            <AlertCircle className="w-10 h-10 text-red-500" />
                        ) : (
                            <Upload className="w-10 h-10 text-slate-400" />
                        )}

                        <div className="space-y-1">
                            <p className="text-sm font-medium text-slate-900">
                                {success ? success : error ? error : "Drop CSV file here or click to browse"}
                            </p>
                            {!success && !error && (
                                <p className="text-xs text-slate-500">
                                    Supports .csv files with headers (Name, Phone, etc.)
                                </p>
                            )}
                        </div>
                    </div>
                </div>
                {success && (
                    <div className="mt-4 flex items-center justify-between p-3 bg-green-50 text-green-700 rounded-md text-sm border border-green-100">
                        <div className="flex items-center gap-2">
                            <FileType className="w-4 h-4" />
                            <span>Data loaded successfully</span>
                        </div>
                        <button
                            onClick={() => { setSuccess(null); setError(null); }}
                            className="text-green-800 font-medium hover:underline"
                        >
                            Clear
                        </button>
                    </div>
                )}
            </CardContent>
        </Card>
    );
}
