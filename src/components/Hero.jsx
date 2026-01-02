import React from 'react';
import { ArrowRight, CheckCircle2 } from 'lucide-react';

export default function Hero() {
    return (
        <section className="pt-32 pb-20 relative overflow-hidden">
            {/* Background glow */}
            <div className="absolute top-0 left-1/2 -translate-x-1/2 w-full h-[500px] bg-gradient-to-b from-indigo-900/20 to-transparent pointer-events-none" />

            <div className="container relative z-10 flex flex-col items-center text-center">
                <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-white/5 border border-white/10 text-sm mb-8 animate-fade-in">
                    <span className="flex h-2 w-2 rounded-full bg-green-500"></span>
                    <span>New: AI Assistant 2.0 is live</span>
                </div>

                <h1 className="text-4xl md:text-6xl font-bold leading-tight mb-6 max-w-4xl">
                    The All-in-One <br />
                    <span className="text-transparent bg-clip-text bg-gradient-to-r from-indigo-400 to-purple-400">
                        Business Platform.
                    </span>
                </h1>

                <p className="text-lg md:text-xl text-gray-400 mb-10 max-w-2xl">
                    AI-powered CRM, Calendar, Learning & Community — all in one place.
                    Perfect for Networkers, Coaches & Entrepreneurs to scale faster.
                </p>

                <div className="flex flex-col sm:flex-row items-center gap-4 mb-16">
                    <button className="btn btn-primary flex items-center gap-2 text-lg px-8">
                        Start Free Trial <ArrowRight size={20} />
                    </button>
                    <button className="btn btn-outline text-lg px-8">
                        Watch Demo
                    </button>
                </div>

                <div className="flex flex-wrap justify-center gap-8 text-sm text-gray-500">
                    <div className="flex items-center gap-2">
                        <CheckCircle2 size={16} className="text-indigo-500" />
                        <span>No credit card required</span>
                    </div>
                    <div className="flex items-center gap-2">
                        <CheckCircle2 size={16} className="text-indigo-500" />
                        <span>14-day free trial</span>
                    </div>
                    <div className="flex items-center gap-2">
                        <CheckCircle2 size={16} className="text-indigo-500" />
                        <span>Cancel anytime</span>
                    </div>
                </div>
            </div>
        </section>
    );
}
