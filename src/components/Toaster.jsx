import React, { useEffect } from 'react';
import { X, CheckCircle, AlertCircle, Info } from 'lucide-react';
import { cn } from '../lib/utils';

export function Toaster({ toasts, removeToast }) {
    if (!toasts || toasts.length === 0) return null;

    return (
        <div className="fixed bottom-4 right-4 z-[100] flex flex-col gap-2 pointer-events-none">
            {toasts.map((toast) => (
                <div
                    key={toast.id}
                    className={cn(
                        "pointer-events-auto flex items-center gap-3 min-w-[300px] max-w-md p-4 rounded-lg shadow-lg border animate-slide-in",
                        toast.type === 'success' && "bg-green-50 border-green-200 text-green-800",
                        toast.type === 'error' && "bg-red-50 border-red-200 text-red-800",
                        toast.type === 'info' && "bg-blue-50 border-blue-200 text-blue-800"
                    )}
                >
                    <div className="flex-shrink-0">
                        {toast.type === 'success' && <CheckCircle className="w-5 h-5" />}
                        {toast.type === 'error' && <AlertCircle className="w-5 h-5" />}
                        {toast.type === 'info' && <Info className="w-5 h-5" />}
                    </div>
                    <div className="flex-1 text-sm font-medium">
                        {toast.message}
                    </div>
                    <button
                        onClick={() => removeToast(toast.id)}
                        className="flex-shrink-0 hover:opacity-70 transition-opacity"
                    >
                        <X className="w-4 h-4" />
                    </button>
                </div>
            ))}
        </div>
    );
}

export function useToasts() {
    const [toasts, setToasts] = React.useState([]);

    const addToast = (message, type = 'info') => {
        const id = Math.random().toString(36).substring(2, 9);
        setToasts((prev) => [...prev, { id, message, type }]);

        // Auto-remove after 5 seconds
        setTimeout(() => {
            setToasts((prev) => prev.filter((t) => t.id !== id));
        }, 5000);
    };

    const removeToast = (id) => {
        setToasts((prev) => prev.filter((t) => t.id !== id));
    };

    return { toasts, addToast, removeToast };
}
