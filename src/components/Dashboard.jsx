import React, { useState, useRef, useEffect } from 'react';
import { FileUpload } from './FileUpload';
import { MessageEditor } from './MessageEditor';
import { SendingProgress } from './SendingProgress';
import { Button, Input, Label, Card, CardContent, CardHeader, CardTitle } from './ui-base';
import { getProvider, PROVIDERS } from '../lib/sms-providers';
import { cn } from '../lib/utils';
import { normalizePhoneNumber } from '../lib/phone-utils';
import { Toaster, useToasts } from './Toaster';
import { Settings, Send, PlayCircle, StopCircle, RefreshCw, TestTube, Calendar } from 'lucide-react';

export function Dashboard() {
    // Data State
    const [csvData, setCsvData] = useState([]);
    const [fileName, setFileName] = useState("");
    const [template, setTemplate] = useState("");

    // Config State
    const [providerType, setProviderType] = useState(PROVIDERS.MOCK);
    const [apiConfig, setApiConfig] = useState({
        accountSid: '',
        authToken: '',
        fromNumber: '',
        apiKey: '',
        deviceId: ''
    });

    // Sending State
    const [isSending, setIsSending] = useState(false);
    const [progress, setProgress] = useState({ sent: 0, failed: 0 });
    const [logs, setLogs] = useState([]);

    // Test Message State
    const [testPhoneNumber, setTestPhoneNumber] = useState('');
    const [isSendingTest, setIsSendingTest] = useState(false);

    // Scheduling State
    const [scheduledTime, setScheduledTime] = useState('');
    const [isWaitingForSchedule, setIsWaitingForSchedule] = useState(false);
    const [countdown, setCountdown] = useState(null);

    // Toast Hook
    const { toasts, addToast, removeToast } = useToasts();

    const stopRef = useRef(false);
    const scheduleTimerRef = useRef(null);

    const columns = csvData.length > 0 ? Object.keys(csvData[0]) : [];

    // Load saved state from localStorage on mount
    useEffect(() => {
        const savedConfig = localStorage.getItem('bulksms_apiConfig');
        if (savedConfig) {
            try {
                setApiConfig(JSON.parse(savedConfig));
            } catch (e) {
                console.error('Failed to parse saved API config:', e);
            }
        }

        const savedProvider = localStorage.getItem('bulksms_providerType');
        if (savedProvider) setProviderType(savedProvider);

        const savedTestPhone = localStorage.getItem('bulksms_testPhoneNumber');
        if (savedTestPhone) setTestPhoneNumber(savedTestPhone);

        const savedTemplate = localStorage.getItem('bulksms_template');
        if (savedTemplate) setTemplate(savedTemplate);

        const savedFileName = localStorage.getItem('bulksms_fileName');
        if (savedFileName) setFileName(savedFileName);

        const savedScheduledTime = localStorage.getItem('bulksms_scheduledTime');
        if (savedScheduledTime) setScheduledTime(savedScheduledTime);
    }, []);

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
        <div className="min-h-screen bg-slate-50 text-slate-900 pb-20">
            {/* Header */}
            <header className="bg-white border-b border-slate-200 sticky top-0 z-10 shadow-sm">
                <div className="max-w-7xl mx-auto px-4 h-16 flex items-center justify-between">
                    <div className="flex items-center gap-2">
                        <Send className="w-6 h-6 text-blue-600" />
                        <h1 className="text-xl font-bold tracking-tight">BulkSMS <span className="text-slate-400 font-normal">Pro</span></h1>
                    </div>
                    <div className="flex items-center gap-4">
                        <div className="flex items-center gap-2 text-sm text-slate-500 bg-slate-100 px-3 py-1 rounded-full">
                            <span className={cn("w-2 h-2 rounded-full", isSending || isWaitingForSchedule ? "bg-green-500 animate-pulse" : "bg-slate-400")}></span>
                            {isSending ? "Active" : isWaitingForSchedule ? `Scheduled (${countdown || '...'})` : "Ready"}
                        </div>
                    </div>
                </div>
            </header>

            <main className="max-w-7xl mx-auto px-4 py-8 grid grid-cols-1 lg:grid-cols-12 gap-8">

                {/* Left Column: Data & Editor */}
                <div className="lg:col-span-7 space-y-6">
                    <section>
                        <h2 className="text-lg font-semibold mb-4 text-slate-800">1. Data Source</h2>
                        <FileUpload
                            onDataLoaded={setCsvData}
                            onSuccess={addToast}
                            onFileName={setFileName}
                        />
                        {fileName && (
                            <div className="mt-2 text-xs text-slate-500 flex items-center gap-1">
                                <Send className="w-3 h-3" /> Currently loaded: <span className="font-semibold text-slate-700">{fileName}</span> ({csvData.length} records)
                            </div>
                        )}
                    </section>

                    <section className="min-h-[500px]">
                        <h2 className="text-lg font-semibold mb-4 text-slate-800">2. Compose Message</h2>
                        <MessageEditor
                            template={template}
                            setTemplate={setTemplate}
                            columns={columns.filter(c => c !== "")}
                            previewRow={csvData.length > 0 ? csvData[0] : {}}
                        />
                    </section>
                </div>

                {/* Right Column: Settings & Progress */}
                <div className="lg:col-span-5 space-y-6">
                    {/* Test Message Section */}
                    <section>
                        <h2 className="text-lg font-semibold mb-4 text-slate-800">3. Test Message</h2>
                        <Card>
                            <CardHeader className="pb-3">
                                <CardTitle className="text-base flex items-center gap-2">
                                    <TestTube className="w-4 h-4" /> Send Test SMS
                                </CardTitle>
                            </CardHeader>
                            <CardContent className="space-y-4">
                                <div className="space-y-2">
                                    <Label>Test Phone Number</Label>
                                    <Input
                                        type="tel"
                                        placeholder="+15551234567"
                                        value={testPhoneNumber}
                                        onChange={(e) => setTestPhoneNumber(e.target.value)}
                                        disabled={isSendingTest}
                                    />
                                    <p className="text-xs text-slate-500">
                                        {csvData.length > 0
                                            ? "Will use first row of CSV data for variables"
                                            : "Variables will show as placeholders (no CSV loaded)"}
                                    </p>
                                </div>
                                <Button
                                    className="w-full gap-2"
                                    onClick={sendTestMessage}
                                    disabled={isSendingTest || !template.trim()}
                                >
                                    {isSendingTest ? (
                                        <>
                                            <RefreshCw className="w-4 h-4 animate-spin" /> Sending...
                                        </>
                                    ) : (
                                        <>
                                            <TestTube className="w-4 h-4" /> Send Test
                                        </>
                                    )}
                                </Button>
                            </CardContent>
                        </Card>
                    </section>

                    <section>
                        <h2 className="text-lg font-semibold mb-4 text-slate-800">4. Configuration</h2>
                        <Card>
                            <CardHeader className="pb-3">
                                <CardTitle className="text-base flex items-center gap-2">
                                    <Settings className="w-4 h-4" /> Provider Settings
                                </CardTitle>
                            </CardHeader>
                            <CardContent className="space-y-4">
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
                                    onClick={startSending}
                                    disabled={csvData.length === 0}
                                >
                                    <PlayCircle className="w-6 h-6" /> Start Campaign
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
                </div>
            </main>

            <Toaster toasts={toasts} removeToast={removeToast} />
        </div>
    );
}
