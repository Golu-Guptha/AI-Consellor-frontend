import { useState, useEffect } from 'react';
import React from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { useProfile } from '../context/ProfileContext';
import { useToast } from '../context/ToastContext';
import NavigationLayout from '../components/NavigationLayout';
import api from '../services/api';
import LoadingSpinner from '../components/LoadingSpinner';

// Loading text component for animated dots
const LoadingText = ({ text = "Locking" }) => {
    const [dots, setDots] = React.useState("");

    React.useEffect(() => {
        const interval = setInterval(() => {
            setDots(prev => prev.length >= 6 ? "" : prev + ".");
        }, 300);
        return () => clearInterval(interval);
    }, []);

    return (
        <span className="inline-flex items-center min-w-[70px]">
            {text}
            <span className="inline-block w-[24px] text-left overflow-hidden ml-0.5">
                {dots}
            </span>
        </span>
    );
};

export default function ShortlistPage() {
    const [shortlist, setShortlist] = useState([]);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState('');
    const { profile, refreshLocks, locks } = useProfile(); // For immediate dashboard update and profile timestamp
    const [isReanalyzing, setIsReanalyzing] = useState(false);
    const [lockingUniversityId, setLockingUniversityId] = useState(null);
    const { addToast } = useToast();
    const navigate = useNavigate();

    useEffect(() => {
        fetchShortlist();
    }, []);

    // Check for re-analysis status and pool
    useEffect(() => {
        if (!profile?.updated_at || shortlist.length === 0) return;

        const profileTime = new Date(profile.updated_at).getTime();
        const needsUpdate = shortlist.some(item => {
            if (!item.analyzed_at) return true;
            return new Date(item.analyzed_at).getTime() < profileTime;
        });

        setIsReanalyzing(needsUpdate);

        let interval;
        if (needsUpdate) {
            // Poll every 5 seconds until updated
            interval = setInterval(fetchShortlist, 5000);
        }

        return () => {
            if (interval) clearInterval(interval);
        };
    }, [shortlist, profile?.updated_at]);

    const fetchShortlist = async () => {
        try {
            const response = await api.get('/api/shortlist');
            setShortlist(response.data.shortlist || []);
        } catch (err) {
            setError(err.response?.data?.error?.message || 'Failed to fetch shortlist');
        } finally {
            setLoading(false);
        }
    };

    const handleUpdateCategory = async (id, newCategory) => {
        // OPTIMISTIC UPDATE + TOAST: Show immediately
        addToast(`Moved to ${newCategory} list`, 'success');

        const previousShortlist = [...shortlist];
        setShortlist(prev => prev.map(item =>
            item.id === id ? { ...item, category: newCategory } : item
        ));

        try {
            await api.patch(`/api/shortlist/${id}`, { category: newCategory });
            // Success - no need to refetch, UI already updated
        } catch (err) {
            // ROLLBACK + ERROR TOAST
            setShortlist(previousShortlist);
            addToast('Failed to update category', 'error');
            alert(err.response?.data?.error?.message || 'Failed to update');
        }
    };

    const handleRemove = async (id) => {
        if (!confirm('Remove this university from your shortlist?')) return;

        // OPTIMISTIC UPDATE + TOAST: Show immediately
        addToast('Removed from shortlist', 'success');

        const previousShortlist = [...shortlist];
        setShortlist(prev => prev.filter(item => item.id !== id));

        try {
            await api.delete(`/api/shortlist/${id}`);
            // Success - UI already updated
        } catch (err) {
            // ROLLBACK + ERROR TOAST
            setShortlist(previousShortlist);
            addToast('Failed to remove university', 'error');
            alert(err.response?.data?.error?.message || 'Failed to remove');
        }
    };

    const handleLock = async (universityId) => {
        if (!confirm('Lock this university? You will not be able to change your shortlist after locking.')) return;

        // IMMEDIATE TOAST: Show before locking
        addToast('Locking university...', 'info');

        setLockingUniversityId(universityId);
        try {
            await api.post('/api/lock', {
                university_id: universityId,
                reason: 'User locked university from shortlist'
            });

            await refreshLocks();
            addToast('University locked successfully!', 'success');
            navigate('/application-guidance');
        } catch (err) {
            if (err.response?.status === 409) {
                navigate('/application-guidance');
                return;
            }
            addToast('Failed to lock university', 'error');
            alert(err.response?.data?.error?.message || 'Failed to lock');
        } finally {
            setLockingUniversityId(null);
        }
    };

    const groupedByCategory = {
        DREAM: shortlist.filter(s => s.category === 'DREAM'),
        TARGET: shortlist.filter(s => s.category === 'TARGET'),
        SAFE: shortlist.filter(s => s.category === 'SAFE')
    };

    if (loading) {
        return <LoadingSpinner fullScreen message="Loading shortlist..." />;
    }

    return (
        <NavigationLayout>
            <div className="p-8">
                <div className="container mx-auto max-w-7xl py-8">
                    <div className="flex justify-between items-center mb-6">
                        <h1 className="text-3xl font-bold">⭐ My Shortlist</h1>
                        <Link to="/discover" className="btn btn-primary">
                            + Add Universities
                        </Link>
                    </div>

                    {isReanalyzing && (
                        <div className="mb-6 bg-blue-500/10 border border-blue-500/30 text-blue-400 p-4 rounded-lg flex items-center gap-3 animate-pulse">
                            <div className="animate-spin h-5 w-5 border-2 border-blue-500 rounded-full border-t-transparent"></div>
                            <div>
                                <p className="font-bold">AI is re-analyzing your updated profile...</p>
                                <p className="text-sm opacity-80">University matches and risks are being recalculated.</p>
                            </div>
                        </div>
                    )}

                    {error && (
                        <div className="mb-6 bg-[hsl(var(--color-error))]/10 border border-[hsl(var(--color-error))]/30 text-[hsl(var(--color-error))] p-4 rounded-lg">
                            {error}
                        </div>
                    )}

                    {shortlist.length === 0 ? (
                        <div className="card text-center py-12">
                            <div className="text-5xl mb-4">📚</div>
                            <h3 className="text-xl font-bold mb-2">Your shortlist is empty</h3>
                            <p className="text-[hsl(var(--color-text-muted))] mb-6">
                                Start discovering universities and add them to your shortlist
                            </p>
                            <Link to="/discover" className="btn btn-primary">
                                Discover Universities
                            </Link>
                        </div>
                    ) : (
                        <div className="space-y-8">
                            {/* Dream Schools */}
                            <div>
                                <div className="flex items-center gap-3 mb-4">
                                    <h2 className="text-2xl font-bold">🌟 Dream Schools</h2>
                                    <span className="badge badge-dream">{groupedByCategory.DREAM.length}</span>
                                </div>
                                <p className="text-sm text-[hsl(var(--color-text-muted))] mb-4">
                                    Reach schools with lower acceptance likelihood
                                </p>
                                {groupedByCategory.DREAM.length === 0 ? (
                                    <div className="card text-center py-6 text-[hsl(var(--color-text-muted))]">
                                        No dream schools yet
                                    </div>
                                ) : (
                                    <div className="grid md:grid-cols-2 lg:grid-cols-2 gap-6">
                                        {groupedByCategory.DREAM.map((item) => (
                                            <UniversityCard
                                                key={item.id}
                                                item={item}
                                                onUpdateCategory={handleUpdateCategory}
                                                onRemove={handleRemove}
                                                onLock={handleLock}
                                                isLocked={locks?.some(l => l.university_id === item.university_id)}
                                                isLocking={lockingUniversityId === item.university?.id}
                                                onNavigate={() => navigate('/application-guidance')}
                                            />
                                        ))}
                                    </div>
                                )}
                            </div>

                            {/* Target Schools */}
                            <div>
                                <div className="flex items-center gap-3 mb-4">
                                    <h2 className="text-2xl font-bold">🎯 Target Schools</h2>
                                    <span className="badge badge-target">{groupedByCategory.TARGET.length}</span>
                                </div>
                                <p className="text-sm text-[hsl(var(--color-text-muted))] mb-4">
                                    Universities that match your profile well
                                </p>
                                {groupedByCategory.TARGET.length === 0 ? (
                                    <div className="card text-center py-6 text-[hsl(var(--color-text-muted))]">
                                        No target schools yet
                                    </div>
                                ) : (
                                    <div className="grid md:grid-cols-2 lg:grid-cols-2 gap-6">
                                        {groupedByCategory.TARGET.map((item) => (
                                            <UniversityCard
                                                key={item.id}
                                                item={item}
                                                onUpdateCategory={handleUpdateCategory}
                                                onRemove={handleRemove}
                                                onLock={handleLock}
                                                isLocked={locks?.some(l => l.university_id === item.university_id)}
                                                isLocking={lockingUniversityId === item.university?.id}
                                                onNavigate={() => navigate('/application-guidance')}
                                            />
                                        ))}
                                    </div>
                                )}
                            </div>

                            {/* Safe Schools */}
                            <div>
                                <div className="flex items-center gap-3 mb-4">
                                    <h2 className="text-2xl font-bold">✅ Safe Schools</h2>
                                    <span className="badge badge-safe">{groupedByCategory.SAFE.length}</span>
                                </div>
                                <p className="text-sm text-[hsl(var(--color-text-muted))] mb-4">
                                    Backup options with higher acceptance likelihood
                                </p>
                                {groupedByCategory.SAFE.length === 0 ? (
                                    <div className="card text-center py-6 text-[hsl(var(--color-text-muted))]">
                                        No safe schools yet
                                    </div>
                                ) : (
                                    <div className="grid md:grid-cols-2 lg:grid-cols-2 gap-6">
                                        {groupedByCategory.SAFE.map((item) => (
                                            <UniversityCard
                                                key={item.id}
                                                item={item}
                                                onUpdateCategory={handleUpdateCategory}
                                                onRemove={handleRemove}
                                                onLock={handleLock}
                                                isLocked={locks?.some(l => l.university_id === item.university_id)}
                                                isLocking={lockingUniversityId === item.university?.id}
                                                onNavigate={() => navigate('/application-guidance')}
                                            />
                                        ))}
                                    </div>
                                )}
                            </div>
                        </div>
                    )}
                </div>
            </div>
        </NavigationLayout>
    );
}

function UniversityCard({ item, onUpdateCategory, onRemove, onLock, isLocked, isLocking, onNavigate }) {
    const [showActions, setShowActions] = useState(false);

    // Calculate cost level based on tuition
    const getCostLevel = (tuition) => {
        if (!tuition) return null;
        if (tuition < 20000) return { label: 'Low', color: 'text-green-500', bg: 'bg-green-900/30' };
        if (tuition < 40000) return { label: 'Medium', color: 'text-yellow-500', bg: 'bg-yellow-900/30' };
        return { label: 'High', color: 'text-red-500', bg: 'bg-red-900/30' };
    };

    // Calculate acceptance chance from acceptance_rate
    const getAcceptanceChance = (rate) => {
        if (!rate) return null;
        if (rate > 50) return { label: 'High', color: 'text-green-500', bg: 'bg-green-900/30' };
        if (rate > 20) return { label: 'Medium', color: 'text-yellow-500', bg: 'bg-yellow-900/30' };
        return { label: 'Low', color: 'text-red-500', bg: 'bg-red-900/30' };
    };

    const costLevel = getCostLevel(item.university?.tuition_estimate);
    const acceptanceChance = getAcceptanceChance(item.university?.acceptance_rate);

    // Generate profile fit and risks based on university data
    const getProfileFit = () => {
        const fits = [];
        const uni = item.university;

        if (uni?.tuition_estimate && uni.tuition_estimate < 30000) {
            fits.push('Affordable tuition');
        }
        if (uni?.acceptance_rate && uni.acceptance_rate > 30) {
            fits.push('Good acceptance rate');
        }
        if (uni?.rank && uni.rank < 200) {
            fits.push('High-ranking institution');
        }
        if (uni?.country) {
            fits.push(`Located in ${uni.country}`);
        }

        return fits.length > 0 ? fits : ['Matches your preferences'];
    };

    const getRisks = () => {
        const risks = [];
        const uni = item.university;

        if (uni?.acceptance_rate && uni.acceptance_rate < 15) {
            risks.push('Highly competitive');
        }
        if (uni?.tuition_estimate && uni.tuition_estimate > 50000) {
            risks.push('High tuition fees');
        }
        if (!uni?.rank) {
            risks.push('Limited ranking data');
        }

        return risks.length > 0 ? risks : ['No major risks identified'];
    };

    const profileFits = item.ai_analysis?.profile_fit?.reasons || getProfileFit();
    const risks = item.ai_analysis?.key_risks?.reasons || getRisks();

    // Override cost/chance if AI analysis exists
    const aiCostLevel = item.ai_analysis?.cost_analysis ? {
        label: item.ai_analysis.cost_analysis.level,
        color: item.ai_analysis.cost_analysis.level === 'Low' ? 'text-green-500' : item.ai_analysis.cost_analysis.level === 'Medium' ? 'text-yellow-500' : 'text-red-500',
        bg: item.ai_analysis.cost_analysis.level === 'Low' ? 'bg-green-900/30' : item.ai_analysis.cost_analysis.level === 'Medium' ? 'bg-yellow-900/30' : 'bg-red-900/30'
    } : null;

    const aiAcceptanceChance = item.ai_analysis?.acceptance_score ? {
        label: item.ai_analysis.acceptance_score.category === 'SAFE' ? 'High' : item.ai_analysis.acceptance_score.category === 'TARGET' ? 'Medium' : 'Low',
        color: item.ai_analysis.acceptance_score.category === 'SAFE' ? 'text-green-500' : item.ai_analysis.acceptance_score.category === 'TARGET' ? 'text-yellow-500' : 'text-red-500',
        bg: item.ai_analysis.acceptance_score.category === 'SAFE' ? 'bg-green-900/30' : item.ai_analysis.acceptance_score.category === 'TARGET' ? 'bg-yellow-900/30' : 'bg-red-900/30',
        score: item.ai_analysis.acceptance_score.percentage
    } : null;

    const finalCostLevel = aiCostLevel || costLevel;
    const finalAcceptanceChance = aiAcceptanceChance || acceptanceChance;

    return (
        <div className="card relative">
            <div className="flex justify-between items-start mb-3">
                <div className="flex-1">
                    <div className="flex items-center gap-2">
                        <h3 className="font-bold line-clamp-2">{item.university?.name}</h3>
                        {isLocking && (
                            <span className="inline-flex items-center px-2 py-1 bg-yellow-500/20 text-yellow-500 rounded text-xs font-medium animate-pulse">
                                <LoadingText text="Locking" />
                            </span>
                        )}
                    </div>
                    {item.ai_analysis && (
                        <span className="text-[10px] text-purple-400 font-medium flex items-center gap-1 mt-1">
                            <svg className="w-3 h-3" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 10V3L4 14h7v7l9-11h-7z" />
                            </svg>
                            AI Analyzed
                        </span>
                    )}
                </div>
                <button
                    onClick={() => setShowActions(!showActions)}
                    className="text-[hsl(var(--color-text-muted))] hover:text-[hsl(var(--color-text))]"
                >
                    ⋯
                </button>
            </div>

            {showActions && (
                <div className="absolute top-12 right-4 card p-2 space-y-1 z-10 min-w-[150px]">
                    <button
                        onClick={() => { onUpdateCategory(item.id, 'DREAM'); setShowActions(false); }}
                        className="w-full text-left px-3 py-2 rounded hover:bg-[hsl(var(--color-bg))] text-sm"
                    >
                        🌟 Dream
                    </button>
                    <button
                        onClick={() => { onUpdateCategory(item.id, 'TARGET'); setShowActions(false); }}
                        className="w-full text-left px-3 py-2 rounded hover:bg-[hsl(var(--color-bg))] text-sm"
                    >
                        🎯 Target
                    </button>
                    <button
                        onClick={() => { onUpdateCategory(item.id, 'SAFE'); setShowActions(false); }}
                        className="w-full text-left px-3 py-2 rounded hover:bg-[hsl(var(--color-bg))] text-sm"
                    >
                        ✅ Safe
                    </button>
                    <div className="border-t border-[hsl(var(--color-border))] my-1"></div>
                    {isLocked ? (
                        <button
                            onClick={() => { onNavigate(); setShowActions(false); }}
                            className="w-full text-left px-3 py-2 rounded hover:bg-[hsl(var(--color-bg))] text-sm text-[hsl(var(--color-primary))]"
                        >
                            📝 Application
                        </button>
                    ) : (
                        <button
                            onClick={() => { if (!isLocking) { onLock(item.university?.id); setShowActions(false); } }}
                            disabled={isLocking}
                            className={`w-full text-left px-3 py-2 rounded text-sm ${isLocking
                                ? 'bg-gray-700 text-gray-400 cursor-not-allowed'
                                : 'hover:bg-[hsl(var(--color-bg))] text-[hsl(var(--color-primary))]'
                                }`}
                        >
                            {isLocking ? <LoadingText text="Locking" /> : '🔒 Lock'}
                        </button>
                    )}
                    <button
                        onClick={() => { onRemove(item.id); setShowActions(false); }}
                        className="w-full text-left px-3 py-2 rounded hover:bg-[hsl(var(--color-bg))] text-sm text-[hsl(var(--color-error))]"
                    >
                        🗑️ Remove
                    </button>
                </div>
            )}

            <div className="space-y-2 text-sm">
                <div className="flex items-center gap-2">
                    <span className="text-[hsl(var(--color-text-muted))]">📍</span>
                    <span>{item.university?.country}</span>
                </div>

                {item.university?.tuition_estimate && (
                    <div className="flex items-center gap-2">
                        <span className="text-[hsl(var(--color-text-muted))]">💰</span>
                        <span>${item.university.tuition_estimate.toLocaleString()}/year</span>
                    </div>
                )}
            </div>

            {/* Profile Fit */}
            <div className="mt-4 p-3 bg-green-900/10 border border-green-700/30 rounded-lg">
                <div className="font-semibold text-green-400 text-xs mb-2 flex items-center gap-1">
                    <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
                    </svg>
                    Why It Fits
                </div>
                <ul className="text-xs space-y-1 text-gray-300">
                    {profileFits.slice(0, 3).map((fit, idx) => (
                        <li key={idx} className="flex items-start gap-1">
                            <span className="text-green-500 mt-0.5">•</span>
                            <span>{fit}</span>
                        </li>
                    ))}
                </ul>
            </div>

            {/* Key Risks */}
            <div className="mt-3 p-3 bg-red-900/10 border border-red-700/30 rounded-lg">
                <div className="font-semibold text-red-400 text-xs mb-2 flex items-center gap-1">
                    <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" />
                    </svg>
                    Key Risks
                </div>
                <ul className="text-xs space-y-1 text-gray-300">
                    {risks.slice(0, 3).map((risk, idx) => (
                        <li key={idx} className="flex items-start gap-1">
                            <span className="text-red-500 mt-0.5">•</span>
                            <span>{risk}</span>
                        </li>
                    ))}
                </ul>
            </div>

            <div className="mt-4 pt-4 border-t border-[hsl(var(--color-border))] flex items-center justify-between gap-2">
                <span className={`badge badge-${item.category.toLowerCase()}`}>
                    {item.category}
                </span>

                <div className="flex gap-2">
                    {finalCostLevel && (
                        <span className={`px-2 py-1 rounded text-xs font-medium ${finalCostLevel.bg} ${finalCostLevel.color}`}>
                            {finalCostLevel.label} Cost
                        </span>
                    )}
                    {finalAcceptanceChance && (
                        <span className={`px-2 py-1 rounded text-xs font-medium ${finalAcceptanceChance.bg} ${finalAcceptanceChance.color}`}>
                            {finalAcceptanceChance.label} Chance {finalAcceptanceChance.score && `(${finalAcceptanceChance.score}%)`}
                        </span>
                    )}
                </div>
            </div>
        </div>
    );
}
