import React from 'react';
import { Users, Calendar, BookOpen, MessageSquare, BarChart3, Globe } from 'lucide-react';

const features = [
    {
        icon: <Users size={24} />,
        title: "Smart CRM",
        description: "Manage relationships with an AI-powered CRM that tracks every interaction and automates follow-ups."
    },
    {
        icon: <Calendar size={24} />,
        title: "Calendar & Booking",
        description: "Seamless scheduling with automated reminders. Never miss a meeting or double-book again."
    },
    {
        icon: <BookOpen size={24} />,
        title: "Course Platform",
        description: "Host and sell your online courses directly. Drip content, quizzes, and certificates included."
    },
    {
        icon: <MessageSquare size={24} />,
        title: "Community Hub",
        description: "Build a thriving community with dedicated spaces for discussions, events, and networking."
    },
    {
        icon: <BarChart3 size={24} />,
        title: "Analytics Dashboard",
        description: "Get deep insights into your business performance with real-time analytics and reporting."
    },
    {
        icon: <Globe size={24} />,
        title: "Global Payments",
        description: "Accept payments from anywhere in the world with integrated multi-currency support."
    }
];

export default function Features() {
    return (
        <section id="features" className="py-20 bg-white/5">
            <div className="container">
                <div className="text-center mb-16">
                    <h2 className="text-3xl md:text-4xl font-bold mb-4">Everything you need to grow</h2>
                    <p className="text-gray-400 max-w-2xl mx-auto">
                        Stop juggling multiple tools. Creativable brings everything together in one seamless, powerful platform.
                    </p>
                </div>

                <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-8">
                    {features.map((feature, index) => (
                        <div key={index} className="p-6 rounded-2xl glass hover:bg-white/10 transition-colors">
                            <div className="w-12 h-12 rounded-lg bg-indigo-500/20 text-indigo-400 flex items-center justify-center mb-4">
                                {feature.icon}
                            </div>
                            <h3 className="text-xl font-bold mb-2">{feature.title}</h3>
                            <p className="text-gray-400 text-sm leading-relaxed">
                                {feature.description}
                            </p>
                        </div>
                    ))}
                </div>
            </div>
        </section>
    );
}
