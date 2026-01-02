import React from 'react';
import { Menu } from 'lucide-react';

export default function Header() {
    return (
        <header className="fixed top-0 left-0 right-0 z-50 glass">
            <div className="container flex items-center justify-between h-16">
                <div className="flex items-center gap-2">
                    {/* Logo Placeholder */}
                    <div className="w-8 h-8 bg-indigo-500 rounded-lg flex items-center justify-center text-white font-bold text-xl">
                        C
                    </div>
                    <span className="font-bold text-xl tracking-tight">Creativable</span>
                </div>

                <nav className="hidden md:flex items-center gap-8 text-sm font-medium text-gray-300">
                    <a href="#features" className="hover:text-white transition-colors">Features</a>
                    <a href="#solutions" className="hover:text-white transition-colors">Solutions</a>
                    <a href="#pricing" className="hover:text-white transition-colors">Pricing</a>
                    <a href="#about" className="hover:text-white transition-colors">About</a>
                </nav>

                <div className="flex items-center gap-4">
                    <a href="#" className="hidden md:block text-sm font-medium hover:text-white">Login</a>
                    <button className="btn btn-primary text-sm">Start Free Trial</button>
                    <button className="md:hidden p-2">
                        <Menu size={24} />
                    </button>
                </div>
            </div>
        </header>
    );
}
