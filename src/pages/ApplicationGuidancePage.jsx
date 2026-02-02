import { useState, useEffect } from 'react';
import React from 'react';
import { useProfile } from '../context/ProfileContext';
import NavigationLayout from '../components/NavigationLayout';
import api from '../services/api';
import LoadingSpinner from '../components/LoadingSpinner';
import { useToast } from '../context/ToastContext';

// Loading text component for animated dots
const LoadingText = ({ text = "Removing" }) => {
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

export default function ApplicationGuidancePage() {
    const { locks, refreshLocks, refreshTasks } = useProfile();
    const [tasks, setTasks] = useState([]);
    const [loading, setLoading] = useState(true);
    const [newTask, setNewTask] = useState({ title: '', description: '', due_date: '' });
    const [showAddTask, setShowAddTask] = useState(false);
    const [unlockingLockId, setUnlockingLockId] = useState(null);
    const { addToast } = useToast();

    useEffect(() => {
        fetchTasks();
    }, []);

    const fetchTasks = async () => {
        try {
            const response = await api.get('/api/tasks');
            setTasks(response.data.tasks || []);
        } catch (err) {
            console.error('Failed to fetch tasks:', err);
        } finally {
            setLoading(false);
        }
    };

    const handleCreateTask = async (e) => {
        e.preventDefault();
        addToast('Creating task...', 'info');
        try {
            await api.post('/api/tasks', newTask);
            setNewTask({ title: '', description: '', due_date: '' });
            setShowAddTask(false);
            await fetchTasks();
            if (refreshTasks) refreshTasks();
            addToast('Task created successfully!', 'success');
        } catch (err) {
            addToast('Failed to create task', 'error');
            alert(err.response?.data?.error?.message || 'Failed to create task');
        }
    };

    const handleUpdateTask = async (id, updates) => {
        // OPTIMISTIC UPDATE: Save previous state and update UI immediately
        addToast('Task updated', 'success');
        const previousTasks = [...tasks];
        setTasks(prevTasks =>
            prevTasks.map(task =>
                task.id === id ? { ...task, ...updates } : task
            )
        );

        try {
            await api.patch(`/api/tasks/${id}`, updates);
            if (refreshTasks) refreshTasks();
        } catch (err) {
            setTasks(previousTasks);
            addToast('Failed to update task', 'error');
            alert(err.response?.data?.error?.message || 'Failed to update task');
        }
    };

    const handleDeleteTask = async (id) => {
        if (!confirm('Delete this task?')) return;
        addToast('Task deleted', 'success');
        try {
            await api.delete(`/api/tasks/${id}`);
            await fetchTasks();
        } catch (err) {
            addToast('Failed to delete task', 'error');
            alert(err.response?.data?.error?.message || 'Failed to delete task');
        }
    };

    const handleUnlockUniversity = async (lockId, universityName) => {
        if (!confirm(`Unlock "${universityName}"? This will remove it from your application list.`)) return;

        addToast('Removing university...', 'info');
        setUnlockingLockId(lockId);
        try {
            await api.delete(`/api/lock/${lockId}`);
            await refreshLocks();
            addToast('University unlocked successfully!', 'success');
            alert('University unlocked successfully!');
        } catch (err) {
            addToast('Failed to unlock university', 'error');
            alert(err.response?.data?.error?.message || 'Failed to unlock university');
        } finally {
            setUnlockingLockId(null);
        }
    };

    const groupedTasks = {
        TODO: tasks.filter(t => t.status === 'TODO'),
        IN_PROGRESS: tasks.filter(t => t.status === 'IN_PROGRESS'),
        DONE: tasks.filter(t => t.status === 'DONE')
    };

    if (loading) {
        return <LoadingSpinner fullScreen message="Loading application guidance..." />;
    }

    return (
        <NavigationLayout>
            <div className="p-8">
                <div className="container mx-auto max-w-7xl py-8">
                    <div className="flex justify-between items-center mb-6">
                        <h1 className="text-3xl font-bold">📝 Application Guidance</h1>
                        <button
                            onClick={() => setShowAddTask(!showAddTask)}
                            className="btn btn-primary"
                        >
                            + Add Task
                        </button>
                    </div>

                    {/* Locked Universities */}
                    <div className="card mb-8">
                        {/* Locked Universities */}
                        <div className="card mb-8">
                            <h2 className="text-xl font-bold mb-4">🔒 Locked Universities</h2>
                            {locks.length === 0 ? (
                                <p className="text-[hsl(var(--color-text-muted))]">
                                    You haven't locked any universities yet
                                </p>
                            ) : (
                                <>
                                    <div className="space-y-4">
                                        {locks.map((lock) => (
                                            <UniversityGuidanceCard
                                                key={lock.id}
                                                lock={lock}
                                                onUnlock={handleUnlockUniversity}
                                                onRefresh={refreshLocks}
                                                isUnlocking={unlockingLockId === lock.id}
                                            />
                                        ))}
                                    </div>
                                    <div className="mt-4 p-3 bg-[hsl(var(--color-primary))]/10 rounded-lg border border-[hsl(var(--color-primary))]/30">
                                        <p className="text-sm">
                                            💡 <strong>Tip:</strong> Complete the Checklist for each university.
                                            "Documents" and "Timeline" are generated by AI specific to each university.
                                        </p>
                                    </div>
                                </>
                            )}
                        </div>
                    </div>

                    {/* Add Task Form */}
                    {/* Add Task Modal */}
                    {showAddTask && (
                        <div className="fixed inset-0 bg-black/70 flex items-center justify-center z-50 p-4" onClick={() => setShowAddTask(false)}>
                            <div
                                className="bg-[hsl(var(--color-bg-secondary))] border border-[hsl(var(--color-border))] rounded-xl w-full max-w-2xl p-6 shadow-2xl relative animate-fade-in"
                                onClick={e => e.stopPropagation()}
                            >
                                <div className="flex justify-between items-center mb-6">
                                    <h3 className="text-xl font-bold">Create New Task</h3>
                                    <button
                                        onClick={() => setShowAddTask(false)}
                                        className="text-[hsl(var(--color-text-muted))] hover:text-[hsl(var(--color-text))] transition-colors text-2xl"
                                    >
                                        ×
                                    </button>
                                </div>

                                <form onSubmit={handleCreateTask} className="space-y-4">
                                    <div>
                                        <label className="label">Task Title *</label>
                                        <input
                                            type="text"
                                            className="input"
                                            value={newTask.title}
                                            onChange={(e) => setNewTask({ ...newTask, title: e.target.value })}
                                            placeholder="e.g. Draft Statement of Purpose"
                                            required
                                            autoFocus
                                        />
                                    </div>
                                    <div>
                                        <label className="label">Description</label>
                                        <textarea
                                            className="input min-h-[100px]"
                                            rows="3"
                                            value={newTask.description}
                                            onChange={(e) => setNewTask({ ...newTask, description: e.target.value })}
                                            placeholder="Add details about this task..."
                                        ></textarea>
                                    </div>
                                    <div>
                                        <label className="label">Due Date</label>
                                        <input
                                            type="date"
                                            className="input"
                                            value={newTask.due_date}
                                            onChange={(e) => setNewTask({ ...newTask, due_date: e.target.value })}
                                        />
                                    </div>
                                    <div className="flex justify-end gap-3 mt-6 pt-4 border-t border-[hsl(var(--color-border))]">
                                        <button
                                            type="button"
                                            onClick={() => setShowAddTask(false)}
                                            className="btn btn-ghost"
                                        >
                                            Cancel
                                        </button>
                                        <button type="submit" className="btn btn-primary">
                                            Create Task
                                        </button>
                                    </div>
                                </form>
                            </div>
                        </div>
                    )}

                    {/* Task Board */}
                    <div className="grid lg:grid-cols-3 gap-6">
                        {/* To Do */}
                        <div>
                            <div className="flex items-center gap-2 mb-4">
                                <h2 className="text-lg font-bold">📋 To Do</h2>
                                <span className="text-sm text-[hsl(var(--color-text-muted))]">
                                    {groupedTasks.TODO.length}
                                </span>
                            </div>
                            <div className="space-y-3">
                                {groupedTasks.TODO.map(task => (
                                    <TaskCard
                                        key={task.id}
                                        task={task}
                                        onUpdate={handleUpdateTask}
                                        onDelete={handleDeleteTask}
                                    />
                                ))}
                                {groupedTasks.TODO.length === 0 && (
                                    <div className="card text-center py-6 text-[hsl(var(--color-text-muted))]">
                                        No tasks
                                    </div>
                                )}
                            </div>
                        </div>

                        {/* In Progress */}
                        <div>
                            <div className="flex items-center gap-2 mb-4">
                                <h2 className="text-lg font-bold">⏳ In Progress</h2>
                                <span className="text-sm text-[hsl(var(--color-text-muted))]">
                                    {groupedTasks.IN_PROGRESS.length}
                                </span>
                            </div>
                            <div className="space-y-3">
                                {groupedTasks.IN_PROGRESS.map(task => (
                                    <TaskCard
                                        key={task.id}
                                        task={task}
                                        onUpdate={handleUpdateTask}
                                        onDelete={handleDeleteTask}
                                    />
                                ))}
                                {groupedTasks.IN_PROGRESS.length === 0 && (
                                    <div className="card text-center py-6 text-[hsl(var(--color-text-muted))]">
                                        No tasks
                                    </div>
                                )}
                            </div>
                        </div>

                        {/* Done */}
                        <div>
                            <div className="flex items-center gap-2 mb-4">
                                <h2 className="text-lg font-bold">✅ Done</h2>
                                <span className="text-sm text-[hsl(var(--color-text-muted))]">
                                    {groupedTasks.DONE.length}
                                </span>
                            </div>
                            <div className="space-y-3">
                                {groupedTasks.DONE.map(task => (
                                    <TaskCard
                                        key={task.id}
                                        task={task}
                                        onUpdate={handleUpdateTask}
                                        onDelete={handleDeleteTask}
                                    />
                                ))}
                                {groupedTasks.DONE.length === 0 && (
                                    <div className="card text-center py-6 text-[hsl(var(--color-text-muted))]">
                                        No tasks
                                    </div>
                                )}
                            </div>
                        </div>
                    </div>
                </div>
            </div>
        </NavigationLayout>
    );
}


function UniversityGuidanceCard({ lock, onUnlock, onRefresh, isUnlocking = false }) {
    const [expanded, setExpanded] = useState(false);
    const [guidance, setGuidance] = useState(lock.application_guidance || null);
    const [checklist, setChecklist] = useState(lock.document_checklist || []);
    const [loading, setLoading] = useState(false);
    const { addToast } = useToast();

    // Initial load from props if available
    useEffect(() => {
        if (lock.application_guidance) {
            setGuidance(lock.application_guidance);
        }

        if (lock.document_checklist && lock.document_checklist.length > 0) {
            setChecklist(lock.document_checklist);
        } else if (lock.application_guidance?.required_documents) {
            // Auto-initialize checklist from guidance locally if missing in DB
            // This ensures the UI shows interactive elements immediately
            const initialChecklist = lock.application_guidance.required_documents.map(doc => ({
                name: typeof doc === 'object' ? (doc.name || doc.title || doc.description) : doc,
                status: 'TODO'
            }));
            setChecklist(initialChecklist);
        }
    }, [lock.application_guidance, lock.document_checklist]);

    const handleToggle = async () => {
        if (!expanded && !guidance) {
            // Fetch guidance on expand if missing
            console.log('[DEBUG] Generating guidance for lock:', lock.id, lock.university?.name);
            setLoading(true);
            setExpanded(true); // Expand immediately to show spinner
            try {
                console.log('[DEBUG] Calling API:', `/api/lock/${lock.id}/generate-guidance`);
                const response = await api.post(`/api/lock/${lock.id}/generate-guidance`);
                console.log('[DEBUG] Response received:', response.data);
                setGuidance(response.data.guidance);
                setChecklist(response.data.checklist || []);

                addToast(`Guidance loaded for ${lock.university?.name}`, 'success');

                if (onRefresh) onRefresh();
            } catch (err) {
                console.error('[ERROR] Failed to load guidance:', err);
                console.error('[ERROR] Error response:', err.response?.data);
                addToast('Failed to load application guidance', 'error');
            } finally {
                setLoading(false);
            }
        } else {
            setExpanded(!expanded);
        }
    };

    const handleDocumentStatusChange = async (documentName, newStatus) => {
        // Optimistic update
        const updatedChecklist = checklist.map(doc =>
            doc.name === documentName ? { ...doc, status: newStatus } : doc
        );
        setChecklist(updatedChecklist);

        try {
            await api.patch(`/api/lock/${lock.id}/document-status`, {
                documentName,
                status: newStatus
            });

            addToast(`Document updated to ${newStatus.replace('_', ' ')}`, 'success');
            if (onRefresh) onRefresh();
        } catch (err) {
            // Revert on error
            setChecklist(checklist);
            console.error('Failed to update document status:', err);
            addToast('Failed to update document status', 'error');
        }
    };

    const handleFileUpload = async (event, documentName) => {
        const file = event.target.files?.[0];
        if (!file) return;

        // Validate file size (10MB max)
        if (file.size > 10 * 1024 * 1024) {
            addToast('File size must be less than 10MB', 'error');
            return;
        }

        // Create FormData
        const formData = new FormData();
        formData.append('file', file);
        formData.append('documentName', documentName);

        try {
            addToast(`Uploading ${file.name}...`, 'info');

            const response = await api.post(`/api/lock/${lock.id}/document-upload`, formData, {
                headers: {
                    'Content-Type': 'multipart/form-data'
                }
            });

            // Update checklist with uploaded file info
            setChecklist(response.data.checklist);
            addToast('File uploaded successfully!', 'success');

            if (onRefresh) onRefresh();
        } catch (err) {
            console.error('Failed to upload file:', err);
            addToast(err.response?.data?.error?.message || 'Failed to upload file', 'error');
        }
    };

    // Calculate completion stats
    const totalDocs = checklist.length;
    const completedDocs = checklist.filter(doc => doc.status === 'DONE').length;
    const isApplicationComplete = totalDocs > 0 && completedDocs === totalDocs;
    const completionPercentage = totalDocs > 0 ? Math.round((completedDocs / totalDocs) * 100) : 0;

    // Status icon mapping
    const getStatusIcon = (status) => {
        switch (status) {
            case 'DONE': return '✅';
            case 'IN_PROGRESS': return '⏳';
            case 'TODO': return '⬜';
            default: return '⬜';
        }
    };

    const getStatusColor = (status) => {
        switch (status) {
            case 'DONE': return 'text-green-500';
            case 'IN_PROGRESS': return 'text-yellow-500';
            case 'TODO': return 'text-gray-400';
            default: return 'text-gray-400';
        }
    };

    return (
        <div className={`card overflow-hidden transition-all duration-300 ${expanded ? 'ring-2 ring-[hsl(var(--color-primary))]' : ''}`}>
            {/* Header */}
            <div className="flex justify-between items-start cursor-pointer" onClick={handleToggle}>
                <div className="flex-1">
                    <h3 className="font-bold text-lg">{lock.university?.name}</h3>
                    <p className="text-sm text-[hsl(var(--color-text-muted))]">{lock.university?.country}</p>

                    {/* Show completion badge in collapsed state */}
                    {!expanded && isApplicationComplete && (
                        <div className="mt-2 inline-flex items-center gap-1 px-2 py-1 bg-green-500/10 text-green-600 rounded text-xs font-medium">
                            ✅ Application Complete
                        </div>
                    )}
                    {!expanded && totalDocs > 0 && !isApplicationComplete && (
                        <div className="mt-2 text-xs text-[hsl(var(--color-text-muted))]">
                            {completedDocs}/{totalDocs} documents completed
                        </div>
                    )}
                </div>
                <div className="flex items-center gap-2">
                    <button
                        onClick={(e) => { e.stopPropagation(); if (!isUnlocking) onUnlock(lock.id, lock.university?.name); }}
                        disabled={isUnlocking}
                        className={`px-3 py-2 rounded-lg transition-colors text-sm font-medium ${isUnlocking
                            ? 'bg-gray-700 text-gray-400 cursor-not-allowed'
                            : 'hover:bg-[hsl(var(--color-error))]/10 text-red-500'
                            }`}
                        title={isUnlocking ? "Removing..." : "Unlock"}
                    >
                        {isUnlocking ? <LoadingText text="Removing" /> : '🔓 Unlock'}
                    </button>
                    <button className={`p-2 transition-transform duration-300 ${expanded ? 'rotate-180' : ''}`}>
                        ▼
                    </button>
                </div>
            </div>

            {/* Expanded Content */}
            {expanded && (
                <div className="mt-4 pt-4 border-t border-[hsl(var(--color-border))] animation-fade-in">
                    {loading ? (
                        <div className="p-4 text-center">
                            <div className="animate-spin h-6 w-6 border-2 border-[hsl(var(--color-primary))] rounded-full border-t-transparent mx-auto mb-2"></div>
                            <p className="text-sm text-[hsl(var(--color-text-muted))]">Generating AI Guidance...</p>
                        </div>
                    ) : guidance ? (
                        <div className="grid md:grid-cols-2 gap-6">
                            {/* Required Documents Checklist */}
                            <div>
                                <div className="flex items-center justify-between mb-3">
                                    <h4 className="font-bold flex items-center gap-2 text-[hsl(var(--color-primary))]">
                                        📄 Required Documents
                                    </h4>
                                    {totalDocs > 0 && (
                                        <span className="text-xs font-medium text-[hsl(var(--color-text-muted))]">
                                            {completedDocs}/{totalDocs} ({completionPercentage}%)
                                        </span>
                                    )}
                                </div>

                                {/* Progress Bar */}
                                {totalDocs > 0 && (
                                    <div className="mb-3 h-2 bg-gray-200 rounded-full overflow-hidden">
                                        <div
                                            className="h-full bg-gradient-to-r from-[hsl(var(--color-primary))] to-[hsl(var(--color-accent))] transition-all duration-300"
                                            style={{ width: `${completionPercentage}%` }}
                                        ></div>
                                    </div>
                                )}

                                {/* Application Complete Badge */}
                                {isApplicationComplete && (
                                    <div className="mb-4 p-3 bg-green-500/10 border border-green-500/30 rounded-lg">
                                        <p className="text-green-600 font-bold flex items-center gap-2">
                                            ✅ Application Complete!
                                        </p>
                                        <p className="text-xs text-green-600/80 mt-1">All required documents submitted</p>
                                    </div>
                                )}

                                {/* Interactive Checklist */}
                                <div className="space-y-2">
                                    {checklist.length > 0 ? (
                                        checklist.map((doc, idx) => (
                                            <div
                                                key={idx}
                                                className="p-3 rounded-lg border border-[hsl(var(--color-border))] hover:border-[hsl(var(--color-primary))] transition-all"
                                            >
                                                <div className="flex items-start gap-3">
                                                    {/* Status Dropdown */}
                                                    <div className="flex-shrink-0">
                                                        <select
                                                            value={doc.status}
                                                            onChange={(e) => handleDocumentStatusChange(doc.name, e.target.value)}
                                                            className={`text-xs font-medium p-1 rounded border border-[hsl(var(--color-border))] focus:outline-none focus:border-[hsl(var(--color-primary))] bg-transparent ${getStatusColor(doc.status)} cursor-pointer`}
                                                        >
                                                            <option value="TODO">⬜ To Do</option>
                                                            <option value="IN_PROGRESS">⏳ In Progress</option>
                                                            <option value="DONE">✅ Done</option>
                                                        </select>
                                                    </div>

                                                    {/* Document Info */}
                                                    <div className="flex-1 min-w-0 pt-0.5">
                                                        <p className={`text-sm font-medium ${doc.status === 'DONE' ? 'text-[hsl(var(--color-text-muted))]' : ''}`}>
                                                            {doc.name}
                                                        </p>

                                                        {/* File Upload/Display - Only show if DONE */}
                                                        {doc.status === 'DONE' && (
                                                            <>
                                                                {doc.fileUrl ? (
                                                                    <div className="mt-2 flex items-center gap-2">
                                                                        <a
                                                                            href={doc.fileUrl}
                                                                            target="_blank"
                                                                            rel="noopener noreferrer"
                                                                            className="text-xs text-[hsl(var(--color-primary))] hover:underline flex items-center gap-1"
                                                                        >
                                                                            📎 {doc.fileName || 'View File'}
                                                                        </a>
                                                                        <span className="text-xs text-[hsl(var(--color-text-muted))]">
                                                                            • Uploaded {new Date(doc.uploadedAt).toLocaleDateString()}
                                                                        </span>
                                                                    </div>
                                                                ) : (
                                                                    <div className="mt-2">
                                                                        <label className="cursor-pointer inline-flex items-center gap-1 px-2 py-1 bg-[hsl(var(--color-bg-secondary))] hover:bg-[hsl(var(--color-bg-tertiary))] rounded text-xs text-[hsl(var(--color-primary))] transition-colors">
                                                                            <input
                                                                                type="file"
                                                                                accept=".pdf,.doc,.docx,.jpg,.jpeg,.png"
                                                                                onChange={(e) => handleFileUpload(e, doc.name)}
                                                                                className="hidden"
                                                                            />
                                                                            📤 Upload Document
                                                                        </label>
                                                                    </div>
                                                                )}
                                                            </>
                                                        )}
                                                    </div>
                                                </div>
                                            </div>
                                        ))
                                    ) : guidance.required_documents?.map((doc, idx) => (
                                        <li key={idx} className="flex items-start gap-2 text-sm">
                                            <span className="text-[hsl(var(--color-primary))] mt-1">•</span>
                                            <span>
                                                {typeof doc === 'object' ? (doc.name || doc.title || doc.description || JSON.stringify(doc)) : doc}
                                            </span>
                                        </li>
                                    ))}
                                </div>
                            </div>

                            {/* Timeline */}
                            <div>
                                <h4 className="font-bold flex items-center gap-2 mb-3 text-[hsl(var(--color-primary))]">
                                    📅 High-Level Timeline
                                </h4>
                                <div className="space-y-4">
                                    {guidance.timeline && guidance.timeline.length > 0 ? (
                                        guidance.timeline.map((step, idx) => (
                                            <div key={idx} className="relative pl-4 border-l-2 border-[hsl(var(--color-border))] last:border-0 pb-4 last:pb-0">
                                                <div className="absolute -left-[5px] top-1.5 w-2 h-2 rounded-full bg-[hsl(var(--color-primary))]"></div>
                                                <p className="font-semibold text-sm">{step.phase}</p>
                                                <p className="text-xs text-[hsl(var(--color-text-muted))] font-mono mb-1">{step.date_range}</p>
                                                <p className="text-xs">{step.description}</p>
                                            </div>
                                        ))
                                    ) : (
                                        <div className="text-center p-4 bg-yellow-500/10 border border-yellow-500/30 rounded-lg">
                                            <p className="text-sm text-yellow-600 mb-3">No timeline available.</p>
                                            <button
                                                onClick={async () => {
                                                    setLoading(true);
                                                    try {
                                                        const response = await api.post(`/api/lock/${lock.id}/generate-guidance`, { force: true });
                                                        setGuidance(response.data.guidance);
                                                        setChecklist(response.data.checklist || []);
                                                        addToast('Guidance regenerated successfully!', 'success');
                                                        if (onRefresh) onRefresh();
                                                    } catch (err) {
                                                        console.error('[ERROR] Failed to regenerate:', err);
                                                        addToast('Failed to regenerate guidance', 'error');
                                                    } finally {
                                                        setLoading(false);
                                                    }
                                                }}
                                                className="btn btn-sm btn-primary"
                                            >
                                                🔄 Regenerate Guidance
                                            </button>
                                        </div>
                                    )}
                                </div>
                            </div>

                            {/* Tips */}
                            {guidance.application_tips && (
                                <div className="col-span-2 mt-2 p-3 bg-[hsl(var(--color-bg-secondary))] rounded text-sm italic border-l-4 border-[hsl(var(--color-accent))]">
                                    <strong>Counselor Tips:</strong>
                                    <ul className="list-disc pl-5 mt-1">
                                        {guidance.application_tips.map((tip, idx) => (
                                            <li key={idx}>
                                                {typeof tip === 'object' ? (tip.tip || tip.description || tip.text || JSON.stringify(tip)) : tip}
                                            </li>
                                        ))}
                                    </ul>
                                </div>
                            )}
                        </div>
                    ) : (
                        <div className="text-center p-4">
                            <p className="text-[hsl(var(--color-text-muted))]">No guidance available.</p>
                            <button
                                onClick={() => { setGuidance(null); handleToggle(); }} // Re-trigger fetch
                                className="btn btn-sm btn-outline mt-2"
                            >
                                Retry Generation
                            </button>
                        </div>
                    )}
                </div>
            )}
        </div>
    );
}

function TaskCard({ task, onUpdate, onDelete }) {
    const [showMenu, setShowMenu] = useState(false);

    const statusOptions = ['TODO', 'IN_PROGRESS', 'DONE'];

    return (
        <>
            {/* Backdrop to close menu when clicking outside */}
            {showMenu && (
                <div
                    className="fixed inset-0 z-10"
                    onClick={() => setShowMenu(false)}
                />
            )}

            <div className="card relative">
                <div className="flex items-start gap-2 mb-2">
                    <h3 className="font-medium line-clamp-2 flex-1 min-w-0">{task.title}</h3>
                    <button
                        onClick={() => setShowMenu(!showMenu)}
                        className="w-8 h-8 flex items-center justify-center rounded-md border border-[hsl(var(--color-border))] text-[hsl(var(--color-text-muted))] hover:text-[hsl(var(--color-text))] hover:bg-[hsl(var(--color-bg))] flex-shrink-0 transition-colors"
                    >
                        ⋯
                    </button>
                </div>

                {showMenu && (
                    <div className="absolute top-10 right-2 card p-2 space-y-1 z-20 min-w-[150px] shadow-lg">
                        {statusOptions.map(status => (
                            <button
                                key={status}
                                onClick={() => { onUpdate(task.id, { status }); setShowMenu(false); }}
                                className={`w-full text-left px-3 py-2 rounded hover:bg-[hsl(var(--color-bg))] text-sm ${task.status === status ? 'text-[hsl(var(--color-primary))] font-medium' : ''
                                    }`}
                            >
                                {status === 'TODO' && '📋 '}
                                {status === 'IN_PROGRESS' && '⏳ '}
                                {status === 'DONE' && '✅ '}
                                {status.replace('_', ' ')}
                            </button>
                        ))}
                        <div className="border-t border-[hsl(var(--color-border))] my-1"></div>
                        <button
                            onClick={() => { onDelete(task.id); setShowMenu(false); }}
                            className="w-full text-left px-3 py-2 rounded hover:bg-[hsl(var(--color-bg))] text-sm text-[hsl(var(--color-error))]"
                        >
                            🗑️ Delete
                        </button>
                    </div>
                )}

                {task.description && (
                    <p className="text-sm text-[hsl(var(--color-text-muted))] mb-3 line-clamp-2">
                        {task.description}
                    </p>
                )}

                <div className="flex items-center justify-between text-xs text-[hsl(var(--color-text-muted))]">
                    {task.due_date ? (
                        <span>📅 {new Date(task.due_date).toLocaleDateString()}</span>
                    ) : (
                        <span>No due date</span>
                    )}
                    {task.created_by === 'AI' && (
                        <span className="badge badge-primary text-xs">AI</span>
                    )}
                </div>
            </div>
        </>
    );
}
