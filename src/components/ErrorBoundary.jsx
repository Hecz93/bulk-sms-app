import React from 'react';

export class ErrorBoundary extends React.Component {
    constructor(props) {
        super(props);
        this.state = { hasError: false, error: null, errorInfo: null };
    }

    static getDerivedStateFromError(error) {
        return { hasError: true, error };
    }

    componentDidCatch(error, errorInfo) {
        console.error("Uncaught error:", error, errorInfo);
        this.setState({ error, errorInfo });
    }

    render() {
        if (this.state.hasError) {
            return (
                <div className="p-8 max-w-2xl mx-auto mt-10 bg-red-50 border border-red-200 rounded-lg text-red-900 font-sans">
                    <h1 className="text-2xl font-bold mb-4">Something went wrong.</h1>
                    <p className="mb-4">The application crashed with the following error:</p>
                    <pre className="bg-white p-4 rounded border border-red-100 overflow-auto text-sm font-mono mb-4">
                        {this.state.error?.toString()}
                    </pre>
                    <p className="text-sm opacity-75">
                        Please check the browser console for more details.
                        <br />
                        Component Stack:
                    </p>
                    <pre className="bg-white p-4 rounded border border-red-100 overflow-auto text-xs font-mono mt-2">
                        {this.state.errorInfo?.componentStack}
                    </pre>
                    <button
                        onClick={() => window.location.reload()}
                        className="mt-6 px-4 py-2 bg-red-600 text-white rounded hover:bg-red-700 transition"
                    >
                        Reload Page
                    </button>
                </div>
            );
        }

        return this.props.children;
    }
}
