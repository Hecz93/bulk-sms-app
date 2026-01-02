import React, { useState, useRef, useEffect } from 'react';
import { FileUpload } from './FileUpload';
import { MessageEditor } from './MessageEditor';
import { SendingProgress } from './SendingProgress';
import { Button, Input, Label, Card, CardContent, CardHeader, CardTitle } from './ui-base';
import { getProvider, PROVIDERS } from '../lib/sms-providers';
import { cn } from '../lib/utils';
import { normalizePhoneNumber } from '../lib/phone-utils';
import { Toaster, useToasts } from './Toaster';
import {
    Settings, Send, PlayCircle, StopCircle, RefreshCw, TestTube, Calendar,
    Eye, X, Trash2, CheckCircle2, ChevronRight,
    ArrowDownToLine, Share, Smartphone
} from 'lucide-react';

export function Dashboard() {
    // Data State
    const [csvData, setCsvData] = useState([]);
    const [fileName, setFileName] = useState(() => localStorage.getItem('bulksms_fileName') || "");
    const [template, setTemplate] = useState(() => localStorage.getItem('bulksms_template') || "");
    const [showDataPreview, setShowDataPreview] = useState(false);

    // PWA Install State
    const [deferredPrompt, setDeferredPrompt] = useState(null);
    const [showInstallPrompt, setShowInstallPrompt] = useState(false);
    const [isIPhone, setIsIPhone] = useState(false);

    // Config State
    const [providerType, setProviderType] = useState(() => localStorage.getItem('bulksms_providerType') || PROVIDERS.MOCK);
    const [apiConfig, setApiConfig] = useState(() => {
        const saved = localStorage.getItem('bulksms_apiConfig');
        const defaultConfig = { accountSid: '', authToken: '', fromNumber: '', apiKey: '', deviceId: '' };
        if (saved) {
            try { return JSON.parse(saved); } catch (e) { return defaultConfig; }
        }
        return defaultConfig;
    });

    // Sending State
    const [isSending, setIsSending] = useState(false);
    const [progress, setProgress] = useState({ sent: 0, failed: 0 });
    const [logs, setLogs] = useState([]);

    // Test Message State
    const [testPhoneNumber, setTestPhoneNumber] = useState(() => localStorage.getItem('bulksms_testPhoneNumber') || '');
    const [isSendingTest, setIsSendingTest] = useState(false);

    // Scheduling State
    const [scheduledTime, setScheduledTime] = useState(() => localStorage.getItem('bulksms_scheduledTime') || '');
    const [isWaitingForSchedule, setIsWaitingForSchedule] = useState(false);
    const [countdown, setCountdown] = useState(null);

    // Toast Hook
    const { toasts, addToast, removeToast } = useToasts();

    // Cloud Mode State
    const [sendingMode, setSendingMode] = useState('browser'); // 'browser' or 'cloud'
    const [isInitializingDb, setIsInitializingDb] = useState(false);

    // Mobile Stepped UI State
    const [activeStep, setActiveStep] = useState(1);

    const stopRef = useRef(false);
    const scheduleTimerRef = useRef(null);

    const columns = csvData.length > 0 ? Object.keys(csvData[0]) : [];

    // PWA Install Logic
    useEffect(() => {
        const handler = (e) => {
            e.preventDefault();
            setDeferredPrompt(e);

            // Check if dismissed before
            const dismissed = localStorage.getItem('bulksms_install_dismissed');
            if (!dismissed) {
                setShowInstallPrompt(true);
            }
        };

        window.addEventListener('beforeinstallprompt', handler);

        // Detect iOS (Safari doesn't support beforeinstallprompt)
        const isiOS = /iPad|iPhone|iPod/.test(navigator.userAgent) && !window.MSStream;
        const isStandalone = window.matchMedia('(display-mode: standalone)').matches;

        if (isiOS && !isStandalone) {
            setIsIPhone(true);
            const dismissed = localStorage.getItem('bulksms_install_dismissed');
            if (!dismissed) {
                setShowInstallPrompt(true);
            }
        }

        return () => window.removeEventListener('beforeinstallprompt', handler);
    }, []);

    const handleInstall = async () => {
        if (!deferredPrompt) return;

        deferredPrompt.prompt();
        const { outcome } = await deferredPrompt.userChoice;

        if (outcome === 'accepted') {
            setShowInstallPrompt(false);
        }
        setDeferredPrompt(null);
    };

    const dismissInstall = () => {
        setShowInstallPrompt(false);
        localStorage.setItem('bulksms_install_dismissed', 'true');
    };

    // Save apiConfig to localStorage whenever it changes
    useEffect(() => {
        localStorage.setItem('bulksms_apiConfig', JSON.stringify(apiConfig));
    }, [apiConfig]);

    // Save providerType to localStorage whenever it changes
    useEffect(() => {
        localStorage.setItem('bulksms_providerType', providerType);
    }, [providerType]);

    // Save testPhoneNumber to localStorage whenever it changes
    useEffect(() => {
        localStorage.setItem('bulksms_testPhoneNumber', testPhoneNumber);
    }, [testPhoneNumber]);

    // Save template to localStorage whenever it changes
    useEffect(() => {
        localStorage.setItem('bulksms_template', template);
    }, [template]);

    // Save fileName to localStorage whenever it changes
    useEffect(() => {
        localStorage.setItem('bulksms_fileName', fileName);
    }, [fileName]);

    // Save scheduledTime to localStorage whenever it changes
    useEffect(() => {
        localStorage.setItem('bulksms_scheduledTime', scheduledTime);
    }, [scheduledTime]);

    // Helper to add log
    const addLog = (message, type = 'info') => {
        const time = new Date().toLocaleTimeString();
        setLogs(prev => [{ time, message, type }, ...prev]);
    };

    // Message Interpolation with SPINTAX Support
    const interpolate = (tpl, row) => {
        let msg = tpl;

        // 1. Process Spintax: {Hi|Hello|Hey} -> Random selection
        // Regex looks for braces containing pipe | characters
        // We use a loop to handle nested/multiple spintax blocks
        msg = msg.replace(/\{([^{}]+?\|[^{}]+?)\}/g, (match, content) => {
            const options = content.split('|');
            return options[Math.floor(Math.random() * options.length)];
        });

        // 2. Process Variables: {{Name}} -> Value
        for (const [key, value] of Object.entries(row)) {
            // Regex to replace {{Key}} case-insensitive
            const regex = new RegExp(`{{${key}}}`, 'gi');
            msg = msg.replace(regex, value || '');
        }
        return msg;
    };

    // Main Sending Logic
    const startSending = async () => {
        if (csvData.length === 0) {
            alert("Please upload a CSV file first.");
            return;
        }
        if (!template.trim()) {
            alert("Please enter a message template.");
            return;
        }

        if (csvData.length > 500) {
            const confirm = window.confirm("⚠️ WARNING: sending > 500 messages in one day is risky on personal plans (like Tello/Hello Mobile). You might get banned. Are you sure you want to proceed?");
            if (!confirm) return;
        }

        const provider = getProvider(providerType);
        if (!provider) {
            alert("Selected provider not found.");
            return;
        }

        // Handle Scheduling
        if (scheduledTime) {
            const now = new Date();
            const targetTime = new Date(scheduledTime);

            if (targetTime > now) {
                const diff = targetTime.getTime() - now.getTime();

                // Max 1 week restriction
                const oneWeekMs = 7 * 24 * 60 * 60 * 1000;
                if (diff > oneWeekMs) {
                    alert("You can only schedule up to 1 week in advance.");
                    return;
                }

                setIsWaitingForSchedule(true);
                addLog(`Message sending scheduled for ${targetTime.toLocaleString()}`, 'warning');
                addToast(`Sending scheduled for ${targetTime.toLocaleTimeString()}`, 'info');

                // Countdown logic
                const timer = setInterval(() => {
                    const remaining = targetTime.getTime() - new Date().getTime();
                    if (remaining <= 0) {
                        clearInterval(timer);
                        setCountdown(null);
                        setIsWaitingForSchedule(false);
                        executeSending(provider);
                    } else {
                        const seconds = Math.ceil(remaining / 1000);
                        const mins = Math.floor(seconds / 60);
                        const secs = seconds % 60;
                        setCountdown(`${mins}:${secs < 10 ? '0' : ''}${secs}`);
                    }
                }, 1000);
                scheduleTimerRef.current = timer; // Store timer ID

                // Store timer so we can clear it if stopped
                stopRef.current = false;
                const checkStop = setInterval(() => {
                    if (stopRef.current) {
                        clearInterval(timer);
                        clearInterval(checkStop);
                        setIsWaitingForSchedule(false);
                        setCountdown(null);
                        addLog("Scheduled sending cancelled.", "error");
                        addToast("Scheduling cancelled", "error");
                    }
                }, 500);

                return;
            } else {
                addLog("Scheduled time is in the past. Starting immediately.", 'warning');
            }
        }

        executeSending(provider);
    };

    const executeSending = async (provider) => {
        setIsSending(true);
        stopRef.current = false;
        setProgress({ sent: 0, failed: 0 });
        setLogs([]);
        addLog("Starting bulk SMS campaign...", 'info');
        addToast("Starting campaign...", "info");

        // Iterate!
        // We skip already "processed" items if we want resume support, 
        // but for simplicity we'll just start from index (sent + failed).
        const startIndex = progress.sent + progress.failed;

        for (let i = startIndex; i < csvData.length; i++) {
            if (stopRef.current) {
                addLog("Sending stopped by user.", "warning");
                break;
            }

            const row = csvData[i];
            const message = interpolate(template, row);

            // Try to find a phone column
            const phoneKey = Object.keys(row).find(k => k.toLowerCase().includes('phone') || k.toLowerCase().includes('mobile'));
            const rawPhone = phoneKey ? row[phoneKey] : null;

            if (!rawPhone) {
                addLog(`Row ${i + 1}: No phone number found. Skipping.`, 'error');
                setProgress(prev => ({ ...prev, failed: prev.failed + 1 }));
                continue;
            }

            // Normalize phone number to E.164 format
            const to = normalizePhoneNumber(rawPhone);

            try {
                // Tello Anti-Ban: "Human" Random Delay (45s to 90s)
                // Only skip delay for the very first message
                if (i > startIndex) {
                    const delayMs = Math.floor(Math.random() * (90000 - 45000 + 1) + 45000);
                    addLog(`Waiting ${Math.round(delayMs / 1000)}s to look human...`, 'warning');
                    await new Promise(r => setTimeout(r, delayMs));
                }

                // Double check if user stopped during the long delay
                if (stopRef.current) {
                    addLog("Sending stopped by user.", "warning");
                    break;
                }

                const result = await provider.send(to, message, apiConfig);

                if (result.success) {
                    setProgress(prev => ({ ...prev, sent: prev.sent + 1 }));
                    addLog(`✓ Sent to ${to} (ID: ${result.id})`, 'info');
                } else {
                    setProgress(prev => ({ ...prev, failed: prev.failed + 1 }));
                    addLog(`✗ Failed for ${to}: ${result.error}`, 'error');
                }
            } catch (err) {
                setProgress(prev => ({ ...prev, failed: prev.failed + 1 }));
                addLog(`✗ Error for ${to}: ${err.message}`, 'error');
            }
        }

        setIsSending(false);
        addLog("Batch processing finished.");
        addToast("Campaign finished!", "success");
    };

    const startCloudSending = async () => {
        if (csvData.length === 0 || !template.trim()) {
            alert("Please upload CSV and enter a template.");
            return;
        }

        const confirm = window.confirm("Cloud Mode will send messages in the background even if you close this tab. Continue?");
        if (!confirm) return;

        setIsSending(true);
        addToast("Preparing cloud campaign...", "info");

        try {
            // 1. Prepare all messages
            const messages = csvData.map(row => {
                const phoneKey = Object.keys(row).find(k => k.toLowerCase().includes('phone') || k.toLowerCase().includes('mobile'));
                const rawPhone = phoneKey ? row[phoneKey] : null;
                const to = rawPhone ? normalizePhoneNumber(rawPhone) : null;
                const content = interpolate(template, row);
                return { to, content };
            }).filter(m => m.to);

            // 2. Submit to API
            const response = await fetch('/api/create-campaign', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    name: fileName || `Campaign ${new Date().toLocaleDateString()}`,
                    template,
                    providerType,
                    providerConfig: apiConfig,
                    scheduledAt: scheduledTime || new Date().toISOString(),
                    messages
                })
            });

            const result = await response.json();
            if (response.ok) {
                addToast("Cloud Campaign Launched!", "success");
                addLog(`Cloud campaign started (ID: ${result.campaignId}). You can close your laptop now.`, 'success');
                setIsWaitingForSchedule(true); // Treat as scheduled/active
            } else {
                throw new Error(result.error || "Failed to create cloud campaign");
            }
        } catch (err) {
            alert(`Cloud Error: ${err.message}`);
            addLog(`Error: ${err.message}`, 'error');
        } finally {
            setIsSending(false);
        }
    };

    const initDb = async () => {
        setIsInitializingDb(true);
        try {
            const res = await fetch('/api/init-db');
            const data = await res.json();
            if (res.ok) addToast("Database Ready!", "success");
            else alert(data.error);
        } catch (err) {
            alert(err.message);
        } finally {
            setIsInitializingDb(false);
        }
    };

    const sendTestMessage = async () => {
        if (!testPhoneNumber.trim()) {
            alert("Please enter a test phone number.");
            return;
        }
        if (!template.trim()) {
            alert("Please enter a message template first.");
            return;
        }

        setIsSendingTest(true);

        // Normalize phone number to E.164 format
        const normalizedPhone = normalizePhoneNumber(testPhoneNumber);
        addLog(`Sending test message to ${normalizedPhone}...`, 'info');

        try {
            // Use first row of CSV data, or empty object if no CSV
            const testRow = csvData.length > 0 ? csvData[0] : {};
            const message = interpolate(template, testRow);

            const provider = getProvider(providerType);
            const result = await provider.send(normalizedPhone, message, apiConfig);

            if (result.success) {
                addLog(`✓ Test message sent successfully to ${normalizedPhone} (ID: ${result.id})`, 'info');
                addToast("Test message sent!", "success");
            } else {
                addLog(`✗ Test message failed: ${result.error}`, 'error');
                addToast("Test message failed", "error");
            }
        } catch (err) {
            addLog(`✗ Test message error: ${err.message}`, 'error');
            addToast("Test message error", "error");
        } finally {
            setIsSendingTest(false);
        }
    };

    const stopSending = () => {
        stopRef.current = true;
        if (isWaitingForSchedule && scheduleTimerRef.current) {
            clearInterval(scheduleTimerRef.current);
            scheduleTimerRef.current = null;
            setIsWaitingForSchedule(false);
            setCountdown(null);
            addLog("Scheduled sending cancelled by user.", "warning");
            addToast("Scheduling cancelled", "error");
        }
    };

    return (
        <div className="min-h-screen bg-[#f8fafc] text-slate-900 pb-24 lg:pb-8">
            {/* Header */}
            <header className="bg-white/80 backdrop-blur-md border-b border-slate-200 sticky top-0 z-30 shadow-sm">
                <div className="max-w-7xl mx-auto px-4 h-16 flex items-center justify-between">
                    <div className="flex items-center gap-2">
                        <div className="bg-blue-600 p-1.5 rounded-lg shadow-blue-200 shadow-lg">
                            <Send className="w-5 h-5 text-white" />
                        </div>
                        <h1 className="text-xl font-extrabold tracking-tight text-slate-900">
                            BulkSMS<span className="text-blue-600">Pro</span>
                        </h1>
                    </div>
                    <div className="flex items-center gap-4">
                        <div className="flex items-center gap-2 text-[10px] font-bold uppercase tracking-widest text-slate-500 bg-slate-100 px-3 py-1.5 rounded-full border border-slate-200">
                            <span className={cn(
                                "w-2 h-2 rounded-full shadow-sm",
                                isSending || isWaitingForSchedule ? "bg-green-500 animate-pulse" : "bg-slate-400"
                            )}></span>
                            {isSending ? "Active" : isWaitingForSchedule ? "Queued" : "Standby"}
                        </div>
                    </div>
                </div>

                {/* Mobile Progress Tracker */}
                <div className="lg:hidden px-4 py-3 bg-white border-t border-slate-100 flex justify-between items-center overflow-x-auto no-scrollbar gap-4">
                    {[1, 2, 3, 4, 5].map((step) => (
                        <button
                            key={step}
                            onClick={() => setActiveStep(step)}
                            className={cn(
                                "flex-shrink-0 flex items-center gap-2 transition-all duration-300",
                                activeStep === step ? "opacity-100 scale-100" : "opacity-40 scale-95"
                            )}
                        >
                            <div className={cn(
                                "w-6 h-6 rounded-full flex items-center justify-center text-[10px] font-bold",
                                activeStep === step ? "bg-blue-600 text-white shadow-md shadow-blue-100" : "bg-slate-200 text-slate-600"
                            )}>
                                {step}
                            </div>
                            <span className={cn(
                                "text-[10px] whitespace-nowrap font-bold uppercase tracking-wider",
                                activeStep === step ? "text-blue-600" : "text-slate-500"
                            )}>
                                {step === 1 ? "Data" : step === 2 ? "Write" : step === 3 ? "Test" : step === 4 ? "Config" : "Final"}
                            </span>
                        </button>
                    ))}
                </div>
            </header>

            <main className="max-w-7xl mx-auto px-4 py-6 md:py-8">
                <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 md:gap-8">

                    {/* Left Column (Desktop) / Stepped Flow (Mobile) */}
                    <div className={cn(
                        "lg:col-span-7 space-y-6",
                        activeStep !== 1 && activeStep !== 2 && "hidden lg:block"
                    )}>
                        <section className={cn(activeStep !== 1 && "hidden lg:block")}>
                            <div className="flex items-center justify-between mb-4">
                                <h2 className="text-lg font-bold text-slate-800 flex items-center gap-2">
                                    <span className="w-6 h-6 rounded-md bg-blue-100 text-blue-600 flex items-center justify-center text-xs">1</span>
                                    Import Contacts
                                </h2>
                            </div>
                            <FileUpload
                                onDataLoaded={setCsvData}
                                onSuccess={addToast}
                                onFileName={setFileName}
                                onPreview={() => setShowDataPreview(true)}
                            />
                            {fileName && (
                                <div className="mt-3 space-y-3">
                                    <div className="p-2.5 bg-blue-50/50 rounded-xl border border-blue-100/50 text-[11px] text-slate-500 flex items-center justify-between">
                                        <div className="flex items-center gap-2">
                                            <div className="w-2 h-2 rounded-full bg-blue-500"></div>
                                            <span>File: <span className="font-bold text-slate-700">{fileName}</span> ({csvData.length} contacts)</span>
                                        </div>
                                        <Button variant="ghost" size="sm" className="h-6 px-2 text-[10px]" onClick={() => setCsvData([])}>Change</Button>
                                    </div>

                                    {columns.length > 0 && (
                                        <div className="bg-white border border-slate-200 rounded-xl p-3 shadow-sm">
                                            <p className="text-[10px] font-bold uppercase tracking-widest text-slate-400 mb-2">Personalization Tags Found</p>
                                            <div className="flex flex-wrap gap-1.5">
                                                {columns.map(col => (
                                                    <code key={col} className="px-2 py-0.5 bg-slate-100 text-slate-700 text-[10px] font-bold rounded-md border border-slate-200">
                                                        {`{{${col}}}`}
                                                    </code>
                                                ))}
                                            </div>
                                            <p className="mt-2 text-[9px] text-slate-400 italic">
                                                Copy these tags into your message to automatically insert data from that column.
                                            </p>
                                        </div>
                                    )}
                                </div>
                            )}
                        </section>

                        <section className={cn("min-h-[500px]", activeStep !== 2 && "hidden lg:block")}>
                            <h2 className="text-lg font-bold mb-4 text-slate-800 flex items-center gap-2">
                                <span className="w-6 h-6 rounded-md bg-purple-100 text-purple-600 flex items-center justify-center text-xs">2</span>
                                Compose Message
                            </h2>
                            <MessageEditor
                                template={template}
                                setTemplate={setTemplate}
                                columns={columns.filter(c => c !== "")}
                                previewRow={csvData.length > 0 ? csvData[0] : {}}
                            />
                        </section>
                    </div>

                    {/* Right Column (Desktop) / Stepped Flow (Mobile) */}
                    <div className={cn(
                        "lg:col-span-5 space-y-6",
                        activeStep !== 3 && activeStep !== 4 && activeStep !== 5 && "hidden lg:block"
                    )}>
                        {/* Test Message Section */}
                        <section className={cn(activeStep !== 3 && "hidden lg:block")}>
                            <h2 className="text-lg font-bold mb-4 text-slate-800 flex items-center gap-2">
                                <span className="w-6 h-6 rounded-md bg-amber-100 text-amber-600 flex items-center justify-center text-xs">3</span>
                                Verification
                            </h2>
                            <Card className="border-slate-200 shadow-sm overflow-hidden">
                                <CardHeader className="pb-3 bg-slate-50/50 border-b border-slate-100">
                                    <CardTitle className="text-sm font-bold flex items-center gap-2">
                                        <TestTube className="w-4 h-4 text-amber-500" /> Send Single Test
                                    </CardTitle>
                                </CardHeader>
                                <CardContent className="space-y-4 pt-4">
                                    <div className="space-y-2">
                                        <Label className="text-[10px] font-bold uppercase tracking-wider text-slate-500">Test Recipient</Label>
                                        <Input
                                            type="tel"
                                            placeholder="+1 555-000-0000"
                                            className="h-11 shadow-inner bg-slate-50/50"
                                            value={testPhoneNumber}
                                            onChange={(e) => setTestPhoneNumber(e.target.value)}
                                            disabled={isSendingTest}
                                        />
                                    </div>
                                    <Button
                                        className="w-full h-11 bg-slate-900 text-white font-bold rounded-xl active:scale-95 transition-all shadow-lg shadow-slate-200"
                                        onClick={sendTestMessage}
                                        disabled={isSendingTest || !template.trim()}
                                    >
                                        {isSendingTest ? (
                                            <><RefreshCw className="w-4 h-4 animate-spin" /> Processing...</>
                                        ) : (
                                            <><Send className="w-4 h-4" /> Send Test Message</>
                                        )}
                                    </Button>
                                </CardContent>
                            </Card>
                        </section>

                        <section className={cn(activeStep !== 4 && "hidden lg:block")}>
                            <h2 className="text-lg font-bold mb-4 text-slate-800 flex items-center gap-2">
                                <span className="w-6 h-6 rounded-md bg-slate-200 text-slate-700 flex items-center justify-center text-xs">4</span>
                                Service Config
                            </h2>
                            <Card className="border-slate-200 shadow-sm">
                                <CardHeader className="pb-3 bg-slate-50/50 border-b border-slate-100">
                                    <CardTitle className="text-sm font-bold flex items-center gap-2">
                                        <Settings className="w-4 h-4 text-slate-500" /> Gateway Provider
                                    </CardTitle>
                                </CardHeader>
                                <CardContent className="space-y-4 pt-4">
                                    {/* ... rest of config ... */}
                                    <div className="space-y-2">
                                        <Label>Service Provider</Label>
                                        <select
                                            className="w-full flex h-10 items-center justify-between rounded-md border border-slate-200 bg-white px-3 py-2 text-sm placeholder:text-slate-500 focus:outline-none focus:ring-2 focus:ring-slate-950 focus:ring-offset-2 disabled:cursor-not-allowed disabled:opacity-50"
                                            value={providerType}
                                            onChange={(e) => setProviderType(e.target.value)}
                                        >
                                            <option value={PROVIDERS.MOCK}>Mock (Test Mode - Free)</option>
                                            <option value={PROVIDERS.TWILIO}>Twilio (Cloud API)</option>
                                            <option value={PROVIDERS.TEXTBEE}>TextBee (Android Gateway - FREE)</option>
                                        </select>
                                    </div>

                                    {providerType === PROVIDERS.TEXTBEE && (
                                        <>
                                            <div className="space-y-2">
                                                <Label>TextBee API Key</Label>
                                                <Input
                                                    type="password"
                                                    placeholder="Your API Key from TextBee Dashboard"
                                                    value={apiConfig.apiKey}
                                                    onChange={(e) => setApiConfig({ ...apiConfig, apiKey: e.target.value })}
                                                />
                                            </div>
                                            <div className="space-y-2">
                                                <Label>Device ID</Label>
                                                <Input
                                                    placeholder="e.g. 65a4c..."
                                                    value={apiConfig.deviceId}
                                                    onChange={(e) => setApiConfig({ ...apiConfig, deviceId: e.target.value })}
                                                />
                                                <p className="text-xs text-slate-500">Found in TextBee App "Devices" tab</p>
                                            </div>
                                        </>
                                    )}

                                    {providerType === PROVIDERS.TWILIO && (
                                        <>
                                            <div className="space-y-2">
                                                <Label>Account SID</Label>
                                                <Input
                                                    type="password"
                                                    value={apiConfig.accountSid}
                                                    onChange={(e) => setApiConfig({ ...apiConfig, accountSid: e.target.value })}
                                                />
                                            </div>
                                            <div className="space-y-2">
                                                <Label>Auth Token</Label>
                                                <Input
                                                    type="password"
                                                    value={apiConfig.authToken}
                                                    onChange={(e) => setApiConfig({ ...apiConfig, authToken: e.target.value })}
                                                />
                                            </div>
                                            <div className="space-y-2">
                                                <Label>From Number</Label>
                                                <Input
                                                    placeholder="+1234567890"
                                                    value={apiConfig.fromNumber}
                                                    onChange={(e) => setApiConfig({ ...apiConfig, fromNumber: e.target.value })}
                                                />
                                            </div>
                                        </>
                                    )}
                                </CardContent>
                            </Card>
                        </section>

                        <section>
                            <h2 className="text-lg font-semibold mb-4 text-slate-800">5. Execution</h2>

                            {/* Mode Toggle */}
                            <div className="flex gap-2 mb-4 p-1 bg-slate-100 rounded-lg">
                                <button
                                    className={cn(
                                        "flex-1 py-2 text-sm font-bold rounded-md transition-all",
                                        sendingMode === 'browser' ? "bg-white text-blue-600 shadow-sm" : "text-slate-500 hover:bg-slate-50"
                                    )}
                                    onClick={() => setSendingMode('browser')}
                                >
                                    Browser Mode
                                </button>
                                <button
                                    className={cn(
                                        "flex-1 py-2 text-sm font-bold rounded-md transition-all",
                                        sendingMode === 'cloud' ? "bg-white text-blue-600 shadow-sm" : "text-slate-500 hover:bg-slate-50"
                                    )}
                                    onClick={() => setSendingMode('cloud')}
                                >
                                    Cloud Mode (Background)
                                </button>
                            </div>

                            {sendingMode === 'cloud' && (
                                <div className="mb-4 p-3 bg-blue-50 border border-blue-100 rounded-lg text-[11px] text-blue-700">
                                    <p className="font-bold mb-1">☁️ Cloud Mode enabled</p>
                                    <p>Messages will be sent by Vercel in the background. You can safely close your laptop once launched.</p>
                                    <Button
                                        variant="outline"
                                        size="sm"
                                        className="mt-2 h-7 text-[10px] py-0"
                                        onClick={initDb}
                                        disabled={isInitializingDb}
                                    >
                                        {isInitializingDb ? "Syncing..." : "Initial Sync (Do once)"}
                                    </Button>
                                </div>
                            )}

                            {/* Scheduling Option */}
                            <Card className="mb-4">
                                <CardContent className="pt-6 space-y-4">
                                    <div className="flex items-center gap-2 text-sm font-medium text-slate-700 mb-1">
                                        <Calendar className="w-4 h-4" /> Schedule (Optional)
                                    </div>
                                    <div className="space-y-2">
                                        <Input
                                            type="datetime-local"
                                            value={scheduledTime}
                                            onChange={(e) => setScheduledTime(e.target.value)}
                                            min={new Date().toISOString().slice(0, 16)}
                                            max={new Date(Date.now() + 7 * 24 * 60 * 60 * 1000).toISOString().slice(0, 16)}
                                            disabled={isSending || isWaitingForSchedule}
                                        />
                                        <p className="text-xs text-slate-500">
                                            Max 1 week in advance. Browser must stay open.
                                        </p>
                                    </div>
                                </CardContent>
                            </Card>

                            <div className="grid grid-cols-2 gap-4 mb-6">
                                {!isSending && !isWaitingForSchedule ? (
                                    <Button
                                        className="h-12 text-lg font-bold gap-2 bg-slate-900 border-b-4 border-slate-700 active:border-b-0 active:translate-y-1 transition-all"
                                        onClick={sendingMode === 'browser' ? startSending : startCloudSending}
                                        disabled={csvData.length === 0}
                                    >
                                        <PlayCircle className="w-6 h-6" /> {sendingMode === 'browser' ? 'Start Campaign' : 'Launch to Cloud'}
                                    </Button>
                                ) : (
                                    <Button
                                        variant="destructive"
                                        className="h-12 text-lg font-bold gap-2 border-b-4 border-red-700 active:border-b-0 active:translate-y-1 transition-all"
                                        onClick={stopSending}
                                    >
                                        {isWaitingForSchedule ? (
                                            <>
                                                <StopCircle className="w-6 h-6" /> Cancel Schedule ({countdown})
                                            </>
                                        ) : (
                                            <>
                                                <StopCircle className="w-6 h-6" /> Stop Sending
                                            </>
                                        )}
                                    </Button>
                                )}

                                <Button
                                    variant="outline"
                                    className="h-12 text-lg font-bold gap-2 border-b-4 border-slate-200 active:border-b-0 active:translate-y-1 transition-all"
                                    onClick={() => {
                                        setCsvData([]);
                                        setProgress({ sent: 0, failed: 0 });
                                        setLogs([]);
                                        addToast("All data cleared", "info");
                                    }}
                                    disabled={isSending || isWaitingForSchedule}
                                >
                                    <RefreshCw className="w-6 h-6" /> Clear All
                                </Button>
                            </div>

                            {(isSending || isWaitingForSchedule) && (
                                <div className="space-y-4">
                                    {isWaitingForSchedule && (
                                        <div className="bg-blue-50 border border-blue-100 rounded-lg p-4 animate-pulse">
                                            <h3 className="text-sm font-bold text-blue-800 flex items-center gap-2 mb-1">
                                                <Calendar className="w-4 h-4" /> UPCOMING CAMPAIGN
                                            </h3>
                                            <p className="text-xs text-blue-700">
                                                Scheduled: <span className="font-bold">{new Date(scheduledTime).toLocaleString()}</span>
                                            </p>
                                            <p className="text-xs text-blue-600">
                                                File: <span className="font-bold">{fileName || "Unknown CSV"}</span> ({csvData.length} contacts)
                                            </p>
                                        </div>
                                    )}
                                    <SendingProgress
                                        progress={progress}
                                        total={csvData.length}
                                        logs={logs}
                                    />
                                </div>
                            )}
                        </section>
                    </div> {/* End Right Column */}
                </div> {/* End grid */}
            </main>

            {/* Mobile Sticky Navigation */}
            <div className="lg:hidden fixed bottom-0 left-0 right-0 bg-white/80 backdrop-blur-lg border-t border-slate-200 px-6 py-4 z-40 flex justify-between items-center shadow-[0_-8px_30px_rgb(0,0,0,0.04)]">
                <Button
                    variant="ghost"
                    size="sm"
                    className="text-slate-500 font-bold disabled:opacity-0"
                    onClick={() => setActiveStep(prev => Math.max(1, prev - 1))}
                    disabled={activeStep === 1}
                >
                    Back
                </Button>

                <div className="flex items-center gap-1">
                    {[1, 2, 3, 4, 5].map(s => (
                        <div
                            key={s}
                            className={cn(
                                "h-1 rounded-full transition-all duration-300",
                                activeStep === s ? "w-4 bg-blue-600" : "w-1 bg-slate-200"
                            )}
                        />
                    ))}
                </div>

                {activeStep < 5 ? (
                    <Button
                        size="sm"
                        className="bg-blue-600 hover:bg-blue-700 text-white font-bold rounded-full px-6 shadow-md shadow-blue-100"
                        onClick={() => setActiveStep(prev => Math.min(5, prev + 1))}
                    >
                        Next
                    </Button>
                ) : (
                    <Button
                        size="sm"
                        className="bg-slate-900 hover:bg-black text-white font-bold rounded-full px-6 shadow-lg active:scale-95"
                        onClick={sendingMode === 'browser' ? startSending : startCloudSending}
                        disabled={csvData.length === 0}
                    >
                        {sendingMode === 'browser' ? 'Start' : 'Launch'}
                    </Button>
                )}
            </div>

            {/* Data Preview Modal */}
            {showDataPreview && (
                <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/40 backdrop-blur-sm animate-in fade-in duration-200">
                    <Card className="w-full max-w-4xl max-h-[80vh] flex flex-col shadow-2xl border-slate-200 overflow-hidden animate-in zoom-in-95 duration-200">
                        <CardHeader className="p-4 border-b border-slate-100 bg-white flex flex-row items-center justify-between">
                            <div>
                                <CardTitle className="text-lg font-bold flex items-center gap-2">
                                    <Eye className="w-5 h-5 text-blue-600" /> Loaded Contacts
                                </CardTitle>
                                <p className="text-xs text-slate-500 mt-1">
                                    Previewing <span className="font-bold text-slate-700">{csvData.length}</span> rows from <span className="underline">{fileName || "Cloud Link"}</span>
                                </p>
                            </div>
                            <Button
                                variant="ghost"
                                size="icon"
                                className="rounded-full h-10 w-10 hover:bg-slate-100"
                                onClick={() => setShowDataPreview(false)}
                            >
                                <X className="w-5 h-5" />
                            </Button>
                        </CardHeader>

                        <CardContent className="flex-1 overflow-auto p-0 bg-slate-50/50">
                            <div className="inline-block min-w-full align-middle">
                                <table className="min-w-full border-separate border-spacing-0">
                                    <thead className="sticky top-0 bg-white border-b border-slate-200 z-10">
                                        <tr>
                                            {columns.map((col, idx) => (
                                                <th
                                                    key={idx}
                                                    className="px-4 py-3 text-left text-[10px] font-bold uppercase tracking-wider text-slate-500 border-b border-slate-200"
                                                >
                                                    {col}
                                                </th>
                                            ))}
                                        </tr>
                                    </thead>
                                    <tbody className="bg-transparent">
                                        {csvData.slice(0, 100).map((row, rowIdx) => (
                                            <tr key={rowIdx} className="hover:bg-white transition-colors">
                                                {columns.map((col, colIdx) => (
                                                    <td key={colIdx} className="px-4 py-2.5 text-xs text-slate-600 border-b border-slate-100">
                                                        {row[col]?.toString() || ""}
                                                    </td>
                                                ))}
                                            </tr>
                                        ))}
                                    </tbody>
                                </table>
                                {csvData.length > 100 && (
                                    <div className="p-4 text-center text-[10px] text-slate-400 font-medium">
                                        Showing first 100 of {csvData.length} rows
                                    </div>
                                )}
                            </div>
                        </CardContent>

                        <div className="p-4 bg-white border-t border-slate-100 flex items-center justify-between gap-4">
                            <Button
                                variant="destructive"
                                size="sm"
                                className="h-10 px-4 font-bold flex gap-2 rounded-xl"
                                onClick={() => {
                                    setCsvData([]);
                                    setShowDataPreview(false);
                                    addToast("Data cleared", "info");
                                }}
                            >
                                <Trash2 className="w-4 h-4" /> Delete All Data
                            </Button>

                            <div className="flex gap-2">
                                <Button
                                    variant="outline"
                                    className="h-10 font-bold rounded-xl"
                                    onClick={() => setShowDataPreview(false)}
                                >
                                    Cancel
                                </Button>
                                <Button
                                    className="h-10 bg-slate-900 text-white font-bold rounded-xl px-6 flex gap-2"
                                    onClick={() => {
                                        setShowDataPreview(false);
                                        setActiveStep(2); // Go to next step
                                    }}
                                >
                                    Use This List <ChevronRight className="w-4 h-4" />
                                </Button>
                            </div>
                        </div>
                    </Card>
                </div>
            )}

            {/* PWA Install Prompt */}
            {showInstallPrompt && (
                <div className="fixed bottom-24 lg:bottom-8 left-4 right-4 z-50 animate-in slide-in-from-bottom-5 duration-500">
                    <Card className="bg-slate-900 border-slate-800 shadow-2xl overflow-hidden rounded-2xl">
                        <CardContent className="p-0">
                            <div className="p-5 flex items-start gap-4">
                                <div className="bg-blue-600 p-3 rounded-xl shadow-lg shadow-blue-900/40">
                                    <Smartphone className="w-6 h-6 text-white" />
                                </div>
                                <div className="flex-1">
                                    <h3 className="text-white font-bold text-sm">Install BulkSMS Pro</h3>
                                    <p className="text-slate-400 text-[11px] mt-1 leading-relaxed">
                                        Install our app to your home screen for a faster, offline-ready experience.
                                    </p>
                                </div>
                                <Button
                                    variant="ghost"
                                    size="icon"
                                    className="text-slate-500 hover:text-white -mt-1 -mr-2"
                                    onClick={dismissInstall}
                                >
                                    <X className="w-4 h-4" />
                                </Button>
                            </div>

                            <div className="bg-slate-800/50 p-4 border-t border-slate-800">
                                {isIPhone ? (
                                    <div className="flex flex-col gap-2">
                                        <div className="flex items-center gap-2 text-white text-[10px] font-bold uppercase tracking-widest px-2">
                                            <Share className="w-3 h-3 text-blue-500" /> Instructions for iOS
                                        </div>
                                        <p className="text-slate-400 text-[10px] pl-2">
                                            1. Tap the <span className="text-white font-bold inline-flex items-center gap-1 bg-slate-800 px-1.5 py-0.5 rounded ml-1 mr-1"><Share className="w-3 h-3" /> Share</span> icon below
                                        </p>
                                        <p className="text-slate-400 text-[10px] pl-2">
                                            2. Select <span className="text-white font-bold bg-slate-800 px-1.5 py-0.5 rounded ml-1 mr-1">Add to Home Screen</span>
                                        </p>
                                    </div>
                                ) : (
                                    <div className="flex gap-2">
                                        <Button
                                            variant="ghost"
                                            size="sm"
                                            className="flex-1 h-10 text-slate-400 font-bold hover:text-white"
                                            onClick={dismissInstall}
                                        >
                                            Maybe Later
                                        </Button>
                                        <Button
                                            size="sm"
                                            className="flex-1 h-10 bg-blue-600 hover:bg-blue-700 text-white font-bold rounded-xl shadow-lg shadow-blue-900/20 flex gap-2"
                                            onClick={handleInstall}
                                        >
                                            <ArrowDownToLine className="w-4 h-4" /> Install Now
                                        </Button>
                                    </div>
                                )}
                            </div>
                        </CardContent>
                    </Card>
                </div>
            )}

            <Toaster toasts={toasts} removeToast={removeToast} />
        </div>
    );
}
