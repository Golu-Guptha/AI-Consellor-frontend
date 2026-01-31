import { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import { useProfile } from '../context/ProfileContext';
import NavigationLayout from '../components/NavigationLayout';
import api from '../services/api';
import LoadingSpinner from '../components/LoadingSpinner';

export default function Dashboard() {
    const { profile, strength, stage, locks, tasks } = useProfile();

    // No local useEffect for fetching tasks - use global state from context

    const stages = [
        { num: 1, title: 'Building Profile', active: stage === 1, complete: stage > 1 },
        { num: 2, title: 'Discovering Universities', active: stage === 2, complete: stage > 2 },
        { num: 3, title: 'Finalizing Universities', active: stage === 3, complete: stage > 3 },
        { num: 4, title: 'Preparing Applications', active: stage === 4, complete: stage > 4 },
        { num: 5, title: 'Applications Complete', active: stage === 5, complete: stage > 5 }
    ];

    return (
        <NavigationLayout>
            <div className="p-8">
                {/* Header */}
                <div className="flex justify-between items-center mb-8">
                    <h1 className="text-3xl font-bold">Dashboard</h1>
                    <Link to="/ai-counsellor" className="btn btn-primary">
                        🤖 AI Counsellor
                    </Link>
                </div>

                {/* Stage Progress */}
                <div className="card mb-8">
                    <h2 className="text-xl font-bold mb-6">Your Progress</h2>
                    <div className="flex gap-4 overflow-x-auto pb-4">
                        {stages.map(({ num, title, active }) => (
                            <div key={num} className="flex flex-col items-center min-w-[150px]">
                                <div className={`w-12 h-12 rounded-full flex items-center justify-center font-bold mb-2 ${(active && num !== 5)
                                    ? 'bg-gradient-to-r from-[hsl(var(--color-primary))] to-[hsl(var(--color-secondary))] text-white'
                                    : (stage > num || (num === 5 && stage === 5))
                                        ? (num < 5 ? 'bg-blue-500 text-white' : 'bg-[hsl(var(--color-success))] text-white')
                                        : 'bg-[hsl(var(--color-bg))] text-[hsl(var(--color-text-muted))] border border-[hsl(var(--color-border))]'
                                    }`}>
                                    {(stage > num || (num === 5 && stage === 5)) ? '✓' : num}
                                </div>
                                <span className={`text-sm text-center ${active ? 'text-[hsl(var(--color-text))]' : 'text-[hsl(var(--color-text-muted))]'}`}>
                                    {title}
                                </span>
                            </div>
                        ))}
                    </div>
                </div>

                <div className="grid lg:grid-cols-3 gap-6">
                    {/* Profile Summary */}
                    <div className="lg:col-span-1">
                        <div className="card">
                            <div className="flex justify-between items-start mb-4">
                                <h2 className="text-xl font-bold">Profile</h2>
                                <Link to="/profile/edit" className="text-sm text-[hsl(var(--color-primary))] hover:underline">
                                    Edit
                                </Link>
                            </div>

                            {profile ? (
                                <div className="space-y-3 text-sm">
                                    <div>
                                        <span className="text-[hsl(var(--color-text-muted))]">Target:</span>
                                        <br />
                                        <span className="font-medium">{profile.target_degree} in {profile.field_of_study}</span>
                                    </div>
                                    <div>
                                        <span className="text-[hsl(var(--color-text-muted))]">Countries:</span>
                                        <br />
                                        <span className="font-medium">{profile.preferred_countries?.join(', ') || 'Not set'}</span>
                                    </div>
                                    <div>
                                        <span className="text-[hsl(var(--color-text-muted))]">Budget:</span>
                                        <br />
                                        <span className="font-medium">
                                            ${profile.budget_min?.toLocaleString()} - ${profile.budget_max?.toLocaleString()}/year
                                        </span>
                                    </div>
                                </div>
                            ) : (
                                <p className="text-[hsl(var(--color-text-muted))] text-sm">
                                    Complete your profile to get started
                                </p>
                            )}
                        </div>

                        {/* Profile Strength */}
                        {strength && (
                            <div className="card mt-6">
                                <h2 className="text-xl font-bold mb-4">Profile Strength</h2>
                                <div className="space-y-4">
                                    {Object.entries(strength.metrics).map(([key, value]) => (
                                        <div key={key}>
                                            <div className="flex justify-between text-sm mb-1">
                                                <span className="capitalize">{key}</span>
                                                <span className="font-bold">{value}%</span>
                                            </div>
                                            <div className="h-2 bg-[hsl(var(--color-bg))] rounded-full overflow-hidden">
                                                <div
                                                    className="h-full bg-gradient-to-r from-[hsl(var(--color-primary))] to-[hsl(var(--color-secondary))]"
                                                    style={{ width: `${value}%` }}
                                                ></div>
                                            </div>
                                        </div>
                                    ))}
                                </div>
                                <div className="mt-4 pt-4 border-t border-[hsl(var(--color-border))]">
                                    <div className="text-center">
                                        <div className="text-3xl font-bold gradient-text">{strength.overall}%</div>
                                        <div className="text-sm text-[hsl(var(--color-text-muted))]">Overall Strength</div>
                                    </div>
                                </div>
                            </div>
                        )}
                    </div>

                    {/* Main Content */}
                    <div className="lg:col-span-2 space-y-6">
                        {/* Quick Actions */}
                        <div className="grid md:grid-cols-2 gap-4">
                            <Link to="/discover" className="card card-hover">
                                <div className="text-3xl mb-2">🔍</div>
                                <h3 className="font-bold mb-1">Discover Universities</h3>
                                <p className="text-sm text-[hsl(var(--color-text-muted))]">
                                    Search and filter 17,000+ universities
                                </p>
                            </Link>

                            <Link to="/shortlist" className="card card-hover">
                                <div className="text-3xl mb-2">⭐</div>
                                <h3 className="font-bold mb-1">My Shortlist</h3>
                                <p className="text-sm text-[hsl(var(--color-text-muted))]">
                                    View your Dream, Target, and Safe schools
                                </p>
                            </Link>
                        </div>

                        {/* Tasks */}
                        <div className="card">
                            <div className="flex justify-between items-center mb-4">
                                <h2 className="text-xl font-bold">To-Do List</h2>
                                <Link to="/application-guidance" className="text-sm text-[hsl(var(--color-primary))] hover:underline">
                                    View All
                                </Link>
                            </div>
                            <div className="space-y-3">
                                {tasks.filter(t => t.status !== 'DONE').length > 0 ? (
                                    tasks.filter(t => t.status !== 'DONE').slice(0, 3).map(task => (
                                        <div key={task.id} className="p-3 bg-[hsl(var(--color-bg))] rounded-lg border border-[hsl(var(--color-border))]">
                                            <div className="flex justify-between items-start">
                                                <div>
                                                    <h3 className="font-medium text-sm">{task.title}</h3>
                                                    {task.due_date && (
                                                        <p className="text-xs text-[hsl(var(--color-text-muted))] mt-1">
                                                            Due: {new Date(task.due_date).toLocaleDateString()}
                                                        </p>
                                                    )}
                                                </div>
                                                <span className={`text-xs px-2 py-1 rounded-full ${task.status === 'TODO'
                                                    ? 'bg-blue-100 text-blue-700 dark:bg-blue-900/30 dark:text-blue-300'
                                                    : 'bg-yellow-100 text-yellow-700 dark:bg-yellow-900/30 dark:text-yellow-300'
                                                    }`}>
                                                    {task.status.replace('_', ' ')}
                                                </span>
                                            </div>
                                        </div>
                                    ))
                                ) : (
                                    <p className="text-[hsl(var(--color-text-muted))] text-sm">
                                        No active tasks. Chat with the AI Counsellor or visit Application Guidance to add tasks.
                                    </p>
                                )}
                            </div>
                        </div>

                        {/* Welcome Message */}
                        <div className="card bg-gradient-to-r from-[hsl(var(--color-primary))]/10 to-[hsl(var(--color-secondary))]/10 border-[hsl(var(--color-primary))]/30">
                            <h3 className="font-bold mb-2">👋 Ready to get started?</h3>
                            <p className="text-sm text-[hsl(var(--color-text-muted))] mb-4">
                                Chat with our AI Counsellor to get personalized guidance on your study abroad journey.
                            </p>
                            <Link to="/ai-counsellor" className="btn btn-primary">
                                Start Chatting
                            </Link>
                        </div>
                    </div>
                </div>
            </div>
        </NavigationLayout>
    );
}
