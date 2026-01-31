import React, { useState, useEffect } from 'react';

// Inline Icons to avoid dependency issues
const SparklesIcon = ({ className }) => (
    <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor" className={className}>
        <path strokeLinecap="round" strokeLinejoin="round" d="M9.813 15.904 9 19.75l-3.75-3.75 3.75-3.75 3.75 3.75 3.75-3.75 3.75 3.75 3.75-3.75 3.75 3.75-3.75 3.75-3.75-3.75-3.75 3.75-3.75-3.75-3.75 3.75-3.75-3.75L9.813 15.904ZM12 9a3 3 0 1 0 0-6 3 3 0 0 0 0 6Z" />
    </svg>
);

const GlobeAltIcon = ({ className }) => (
    <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor" className={className}>
        <path strokeLinecap="round" strokeLinejoin="round" d="M12 21a9.004 9.004 0 0 0 8.716-6.747M12 21a9.004 9.004 0 0 1-8.716-6.747M12 21c2.485 0 4.5-4.03 4.5-9S12 3 12 3m0 18c-2.485 0-4.5-4.03-4.5-9S12 3 12 3m0 0a8.997 8.997 0 0 1 7.843 4.582M12 3a8.997 8.997 0 0 0-7.843 4.582m15.686 0A11.953 11.953 0 0 1 12 10.5c-2.998 0-5.74-1.1-7.843-2.918m15.686 0A8.959 8.959 0 0 1 21 12c0 .778-.099 1.533-.284 2.253m0 0A17.919 17.919 0 0 1 12 16.5c-3.162 0-6.133-.815-8.716-2.247m0 0A9.015 9.015 0 0 1 3 12c0-1.605.42-3.113 1.157-4.418" />
    </svg>
);

const CalculatorIcon = ({ className }) => (
    <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor" className={className}>
        <path strokeLinecap="round" strokeLinejoin="round" d="M15.75 15.75V18m-7.5-6.75h.008v.008H8.25v-.008Zm0 2.25h.008v.008H8.25v-.008Zm0 2.25h.008v.008H8.25v-.008Zm0 2.25h.008v.008H8.25v-.008Zm2.25-4.5h.008v.008H10.5v-.008Zm0 2.25h.008v.008H10.5v-.008Zm0 2.25h.008v.008H10.5v-.008Zm2.25-4.5h.008v.008H12.75v-.008Zm0 2.25h.008v.008H12.75v-.008Zm0 2.25h.008v.008H12.75v-.008Zm2.25-4.5h.008v.008H15v-.008Zm0 2.25h.008v.008H15v-.008Zm0 2.25h.008v.008H15v-.008ZM2.25 12c0-5.385 4.365-9.75 9.75-9.75s9.75 4.365 9.75 9.75-4.365 9.75-9.75 9.75S2.25 17.385 2.25 12Zm13.36-1.814a.75.75 0 1 0-1.22-.872l-3.236 4.53L9.53 12.22a.75.75 0 0 0-1.06 1.06l2.25 2.25a.75.75 0 0 0 1.14-.094l3.75-5.25Z" />
    </svg>
);

const AcademicCapIcon = ({ className }) => (
    <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor" className={className}>
        <path strokeLinecap="round" strokeLinejoin="round" d="M4.26 10.147a60.436 60.436 0 0 0-.491 6.347A48.627 48.627 0 0 1 12 20.904a48.627 48.627 0 0 1 8.232-4.41 60.46 60.46 0 0 0-.491-6.347m-15.482 0a50.57 50.57 0 0 0-2.658-.813A59.905 59.905 0 0 1 12 3.493a59.902 59.902 0 0 1 10.499 5.24 50.552 50.552 0 0 0-2.658.814m-15.482 0A50.55 50.55 0 0 1 12 13.489a50.55 50.55 0 0 1 6.744-3.342M15 21v-8" />
    </svg>
);

const ChatBubbleBottomCenterTextIcon = ({ className }) => (
    <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor" className={className}>
        <path strokeLinecap="round" strokeLinejoin="round" d="M7.5 8.25h9m-9 3H12m-9.75 1.51c0 1.6 1.123 2.994 2.707 3.227 1.129.166 2.27.293 3.423.379.35.026.67.21.865.501L12 21l2.755-4.133a1.14 1.14 0 0 1 .865-.501 48.172 48.172 0 0 0 3.423-.379c1.584-.233 2.707-1.626 2.707-3.228V6.741c0-1.602-1.123-2.995-2.707-3.228A48.394 48.394 0 0 0 12 3c-2.392 0-4.744.175-7.043.513C3.373 3.746 2.25 5.14 2.25 6.741v6.018Z" />
    </svg>
);

const THINKING_STEPS = [
    { text: "Analyzing your profile...", icon: SparklesIcon, color: "text-purple-500" },
    { text: "Scanning university database...", icon: GlobeAltIcon, color: "text-blue-500" },
    { text: "Calculating acceptance odds...", icon: CalculatorIcon, color: "text-green-500" },
    { text: "Checking specific requirements...", icon: AcademicCapIcon, color: "text-indigo-500" },
    { text: "Formulating response...", icon: ChatBubbleBottomCenterTextIcon, color: "text-pink-500" }
];

export default function ThinkingIndicator() {
    const [currentStep, setCurrentStep] = useState(0);

    useEffect(() => {
        const interval = setInterval(() => {
            setCurrentStep((prev) => (prev + 1) % THINKING_STEPS.length);
        }, 1500); // Change step every 1.5 seconds

        return () => clearInterval(interval);
    }, []);

    const StepIcon = THINKING_STEPS[currentStep].icon;

    return (
        <div className="flex flex-col items-start space-y-2 p-4 max-w-[80%] bg-gray-50 rounded-2xl rounded-tl-none border border-gray-100 shadow-sm animate-pulse">
            <div className="flex items-center space-x-3">
                <div className={`p-2 bg-white rounded-lg shadow-sm ${THINKING_STEPS[currentStep].color}`}>
                    <StepIcon className="w-5 h-5 animate-bounce" />
                </div>
                <div className="flex flex-col">
                    <span className="text-sm font-medium text-gray-700">
                        {THINKING_STEPS[currentStep].text}
                    </span>
                    <span className="text-xs text-gray-400">
                        AI Counsellor is thinking...
                    </span>
                </div>
            </div>

            {/* Progress dots */}
            <div className="flex space-x-1 pl-11">
                <div className="w-1.5 h-1.5 bg-gray-300 rounded-full animate-bounce" style={{ animationDelay: '0ms' }} />
                <div className="w-1.5 h-1.5 bg-gray-300 rounded-full animate-bounce" style={{ animationDelay: '150ms' }} />
                <div className="w-1.5 h-1.5 bg-gray-300 rounded-full animate-bounce" style={{ animationDelay: '300ms' }} />
            </div>
        </div>
    );
}
