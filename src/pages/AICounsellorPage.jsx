import { useState, useRef, useEffect } from 'react';
import { useProfile } from '../context/ProfileContext';
import { useToast } from '../context/ToastContext';
import NavigationLayout from '../components/NavigationLayout';
import ThinkingIndicator from '../components/ThinkingIndicator';
import api from '../services/api';

const LoadingText = ({ text = "Adding" }) => {
    const [dots, setDots] = useState("");

    useEffect(() => {
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

export default function AICounsellorPage() {
    const { profile, stage } = useProfile();
    const { addToast } = useToast();
    // State for chat status
    // State for chat status
    const [messages, setMessages] = useState([]); // Removed default state, will load from DB or init new
    const [input, setInput] = useState('');
    const [loading, setLoading] = useState(false); // Used for fetching messages/history
    const [isReasoning, setIsReasoning] = useState(false); // Used for AI thinking state

    // Conversation State
    const [conversations, setConversations] = useState([]);
    const [currentConversationId, setCurrentConversationId] = useState(null);
    const [loadingConversations, setLoadingConversations] = useState(true);

    const [suggestedActions, setSuggestedActions] = useState([]);
    const [executingActions, setExecutingActions] = useState([]); // Track which actions are currently executing
    const [recommendations, setRecommendations] = useState([]);
    const [reasoning, setReasoning] = useState(null);
    const [nextSteps, setNextSteps] = useState([]);
    const [activities, setActivities] = useState([]);
    const [loadingActivities, setLoadingActivities] = useState(false);
    const [momentum, setMomentum] = useState(null);
    const [isSidebarOpen, setIsSidebarOpen] = useState(true);
    const [isListening, setIsListening] = useState(false);
    const [recognition, setRecognition] = useState(null);
    const [interimTranscript, setInterimTranscript] = useState('');
    const messagesEndRef = useRef(null);
    const textareaRef = useRef(null);

    // Text-to-Speech State
    const [speakingMessageId, setSpeakingMessageId] = useState(null);
    const [pausedMessageId, setPausedMessageId] = useState(null);
    const currentUtteranceRef = useRef(null);

    // UI State
    const [showSidebar, setShowSidebar] = useState(true);

    // Fetch user activities and stats on mount
    useEffect(() => {
        fetchActivities();
        fetchConversations();
    }, []);

    // Initialize voice recognition
    useEffect(() => {
        if ('webkitSpeechRecognition' in window || 'SpeechRecognition' in window) {
            const SpeechRecognition = window.SpeechRecognition || window.webkitSpeechRecognition;
            const recognitionInstance = new SpeechRecognition();

            recognitionInstance.continuous = false;
            recognitionInstance.interimResults = true; // Enable interim results for live feedback
            recognitionInstance.lang = 'en-US';

            recognitionInstance.onstart = () => {
                setIsListening(true);
                setInterimTranscript('');
            };

            recognitionInstance.onresult = (event) => {
                let interimText = '';
                let finalText = '';

                for (let i = 0; i < event.results.length; i++) {
                    const transcriptPiece = event.results[i][0].transcript;
                    if (event.results[i].isFinal) {
                        finalText += transcriptPiece + ' ';
                    } else {
                        interimText += transcriptPiece;
                    }
                }

                // Update interim display
                setInterimTranscript(interimText);

                // Add final text to input
                if (finalText) {
                    setInput(prevInput => prevInput + (prevInput ? ' ' : '') + finalText.trim());
                }
            };

            recognitionInstance.onerror = (event) => {
                console.error('Speech recognition error:', event.error);
                setIsListening(false);
                if (event.error === 'not-allowed') {
                    alert('⚠️ Microphone access denied. Please enable microphone permissions in your browser settings.');
                } else if (event.error === 'no-speech') {
                    alert('⚠️ No speech detected. Please try again.');
                }
            };

            recognitionInstance.onend = () => {
                setIsListening(false);
                setInterimTranscript('');
            };

            setRecognition(recognitionInstance);
        }

        return () => {
            if (recognition) {
                recognition.abort();
            }
        };
    }, []);

    const fetchActivities = async () => {
        try {
            setLoadingActivities(true);
            const response = await api.get('/api/activities');
            setActivities(response.data.activities || []);
            setMomentum(response.data.momentum);
        } catch (err) {
            console.error('Failed to fetch activities:', err);
        } finally {
            setLoadingActivities(false);
        }
    };

    // Auto-scroll to bottom when messages change
    const scrollToBottom = () => {
        messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
    };

    useEffect(() => {
        scrollToBottom();
    }, [messages, suggestedActions, recommendations]);

    // Auto-resize textarea based on content
    useEffect(() => {
        if (textareaRef.current) {
            textareaRef.current.style.height = 'auto';
            const newHeight = Math.min(Math.max(textareaRef.current.scrollHeight, 44), 200);
            textareaRef.current.style.height = `${newHeight} px`;
        }
    }, [input]);



    const fetchConversations = async () => {
        try {
            setLoadingConversations(true);
            const response = await api.get('/api/chat/conversations');
            const convs = response.data.conversations || [];

            setConversations(convs);

            if (convs.length > 0) {
                // Select most recent if none selected
                if (!currentConversationId) {
                    setCurrentConversationId(convs[0].id);
                    fetchMessages(convs[0].id);
                }
            } else {
                // No conversations, create one
                createNewConversation();
            }
        } catch (err) {
            console.error('Failed to fetch conversations:', err);
        } finally {
            setLoadingConversations(false);
        }
    };

    const createNewConversation = async () => {
        try {
            const response = await api.post('/api/chat/conversations', { title: 'New Conversation' });
            const newConv = response.data.conversation;
            setConversations(prev => [newConv, ...prev]);
            setCurrentConversationId(newConv.id);
            setMessages([{
                role: 'assistant',
                content: "Hi! I'm your AI Study Abroad Counsellor. I can see your complete profile, recent activities, and progress. I'm here to guide you every step of the way. What would you like help with today?"
            }]);
            setSuggestedActions([]);
            setRecommendations([]);
            setNextSteps([]);
        } catch (err) {
            console.error('Failed to create conversation:', err);
        }
    };

    const fetchMessages = async (convId) => {
        try {
            setLoading(true);
            const response = await api.get(`/api/chat/conversations/${convId}/messages`);
            const fetchedMessages = response.data.messages || [];

            if (fetchedMessages.length > 0) {
                setMessages(fetchedMessages);
            } else {
                // Default welcome message for empty conversation
                setMessages([{
                    role: 'assistant',
                    content: "Hi! I'm your AI Study Abroad Counsellor. I can see your complete profile, recent activities, and progress. I'm here to guide you every step of the way. What would you like help with today?"
                }]);
            }

            // Clear context from previous conversation
            setSuggestedActions([]);
            setRecommendations([]);
            setNextSteps([]);

        } catch (err) {
            console.error('Failed to fetch messages:', err);
        } finally {
            setLoading(false);
        }
    };

    const handleSwitchConversation = (convId) => {
        if (convId === currentConversationId) return;
        setCurrentConversationId(convId);
        // Clear state immediately to show loading screen
        setMessages([]);
        setRecommendations([]);
        setSuggestedActions([]);
        setNextSteps([]);
        fetchMessages(convId);
    };

    const handleDeleteConversation = async (e, convId) => {
        e.stopPropagation(); // Prevent selection when clicking delete

        if (!window.confirm('Are you sure you want to delete this conversation? This cannot be undone.')) return;

        try {
            await api.delete(`/api/chat/conversations/${convId}`);

            const updatedConversations = conversations.filter(c => c.id !== convId);
            setConversations(updatedConversations);

            if (updatedConversations.length === 0) {
                // Deleted all, create new
                createNewConversation();
            } else if (convId === currentConversationId) {
                // Deleted active, switch to first available
                setCurrentConversationId(updatedConversations[0].id);
                fetchMessages(updatedConversations[0].id);
            }
        } catch (err) {
            console.error('Failed to delete conversation:', err);
            alert('Failed to delete conversation');
        }
    };

    const handleSend = async () => {
        if (!input.trim() || isReasoning || !currentConversationId) return;

        const userMessage = input;
        setInput('');
        setSuggestedActions([]);
        setRecommendations([]);
        // Optimistic update
        setMessages(prev => [...prev, { role: 'user', content: userMessage }]);
        setIsReasoning(true);

        try {
            const response = await api.post('/api/ai/reason', {
                user_query: userMessage,
                conversationId: currentConversationId
            });

            setMessages(prev => [...prev, {
                role: 'assistant',
                content: response.data.text
            }]);

            setSuggestedActions(response.data.actions || []);
            setRecommendations(response.data.recommendations || []);
            setReasoning(response.data.reasoning);
            setNextSteps(response.data.nextSteps || []);

            // Refresh activities after AI interaction
            fetchActivities();

            // Update conversation list title if it was "New Conversation" and changed
            // We can just refresh the list or optimistically update if we had the new title from response (backend does it)
            // For now, let's refresh the list to get updated timestamps and titles
            fetchConversations();

        } catch (err) {
            setMessages(prev => [...prev, {
                role: 'assistant',
                content: `Sorry, I encountered an error: ${err.response?.data?.error?.message || 'AI service unavailable'}. Please try again.`
            }]);
            setSuggestedActions([]);
        } finally {
            setIsReasoning(false);
        }
    };

    const handleExecuteAction = async (action) => {
        // OPTIMISTIC UPDATE: Remove action immediately
        addToast('Executing action...', 'info');
        const previousActions = [...suggestedActions];
        setSuggestedActions(prev => prev.filter(a => a !== action));

        try {
            const response = await api.post('/api/ai/execute-action', { action });

            // Show success message (non-blocking)
            const successMsg = response.data.result?.ai_enriched
                ? 'University added! (AI-enriched data)'
                : 'Action executed successfully!';

            addToast(successMsg, 'success');

            // Optimistically refresh activities
            fetchActivities();
        } catch (err) {
            // ROLLBACK: Restore action on error
            setSuggestedActions(previousActions);

            const errorMsg = err.response?.data?.error?.message || 'Failed to execute action';
            addToast(`Error: ${errorMsg}`, 'error');
            alert(`❌ ${errorMsg}`);
        }
    };

    const toggleVoiceInput = () => {
        if (!recognition) {
            alert('⚠️ Speech recognition is not supported in your browser. Please use Chrome, Edge, or Safari.');
            return;
        }

        if (isListening) {
            recognition.stop();
        } else {
            try {
                recognition.start();
            } catch (err) {
                console.error('Error starting recognition:', err);
                setIsListening(false);
            }
        }
    };

    const getActivityIcon = (type) => {
        const icons = {
            'SHORTLIST_ADD': '➕',
            'SHORTLIST_REMOVE': '➖',
            'LOCK_UNIVERSITY': '🔒',
            'UNLOCK_UNIVERSITY': '🔓',
            'TASK_CREATE': '📝',
            'TASK_UPDATE': '✏️',
            'TASK_COMPLETE': '✅',
            'PROFILE_UPDATE': '👤'
        };
        return icons[type] || '📌';
    };

    const formatTimeAgo = (dateStr) => {
        const date = new Date(dateStr);
        const hours = Math.floor((Date.now() - date) / (1000 * 60 * 60));
        if (hours < 1) return 'Just now';
        if (hours < 24) return `${hours}h ago`;
        const days = Math.floor(hours / 24);
        return `${days}d ago`;
    };

    const getMomentumColor = (level) => {
        if (level === 'HIGH') return 'bg-green-500';
        if (level === 'MEDIUM') return 'bg-yellow-500';
        return 'bg-gray-400';
    };

    const getCategoryColor = (category) => {
        if (category === 'SAFE') return 'bg-green-500';
        if (category === 'TARGET') return 'bg-blue-500';
        return 'bg-purple-500';
    };

    // Stop speech when component unmounts
    useEffect(() => {
        return () => {
            window.speechSynthesis.cancel();
        };
    }, []);

    const handleSpeak = (text, idx) => {
        // Cancel logic
        window.speechSynthesis.cancel();
        setPausedMessageId(null);

        const utterance = new SpeechSynthesisUtterance(text);
        currentUtteranceRef.current = utterance;

        utterance.onend = () => {
            // Only clear state if this is the currently tracked utterance
            if (currentUtteranceRef.current === utterance) {
                setSpeakingMessageId(null);
                setPausedMessageId(null);
                currentUtteranceRef.current = null;
            }
        };

        utterance.onerror = (event) => {
            console.error("Speech synthesis error", event);
            if (currentUtteranceRef.current === utterance) {
                setSpeakingMessageId(null);
                setPausedMessageId(null);
                currentUtteranceRef.current = null;
            }
        };

        // Optional: Select a better voice if available
        const voices = window.speechSynthesis.getVoices();
        const preferredVoice = voices.find(voice => voice.name.includes('Google US English') || voice.name.includes('Samantha'));
        if (preferredVoice) utterance.voice = preferredVoice;

        setSpeakingMessageId(idx);
        window.speechSynthesis.speak(utterance);
    };

    const handlePause = () => {
        window.speechSynthesis.pause();
        setPausedMessageId(speakingMessageId);
        setSpeakingMessageId(null);
    };

    const handleResume = () => {
        window.speechSynthesis.resume();
        setSpeakingMessageId(pausedMessageId);
        setPausedMessageId(null);
    };



    return (
        <NavigationLayout>
            <div className="flex h-full gap-4">
                {/* Left Sidebar - Conversations (Collapsible) */}
                <div className={`${showSidebar ? 'w-64' : 'w-0 opacity-0 overflow-hidden'} transition-all duration-300 flex flex-col gap-4 border-r border-[hsl(var(--color-border))] bg-[hsl(var(--color-bg))] overflow-y-auto ${showSidebar ? 'p-4' : 'p-0'}`}>
                    <div className="flex gap-2">
                        <button
                            onClick={createNewConversation}
                            className="btn btn-primary flex-1 flex items-center justify-center gap-2"
                        >
                            <svg xmlns="http://www.w3.org/2000/svg" className="w-4 h-4" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                                <line x1="12" y1="5" x2="12" y2="19"></line>
                                <line x1="5" y1="12" x2="19" y2="12"></line>
                            </svg>
                            New Chat
                        </button>
                        <button
                            onClick={() => setShowSidebar(false)}
                            className="btn btn-square btn-ghost hover:bg-white/10"
                            title="Close Sidebar"
                        >
                            <svg xmlns="http://www.w3.org/2000/svg" className="w-5 h-5" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                                <line x1="18" y1="6" x2="6" y2="18"></line>
                                <line x1="6" y1="6" x2="18" y2="18"></line>
                            </svg>
                        </button>
                    </div>

                    <div className="flex-1 overflow-y-auto space-y-2">
                        {loadingConversations ? (
                            <div className="space-y-2">
                                {[1, 2, 3].map(i => (
                                    <div key={i} className="p-3 rounded-lg bg-gray-800/30 border border-transparent animate-pulse">
                                        <div className="h-4 bg-gray-700 rounded w-3/4 mb-2"></div>
                                        <div className="h-3 bg-gray-700 rounded w-1/2"></div>
                                    </div>
                                ))}
                            </div>
                        ) : (
                            conversations.map(conv => (
                                <div
                                    key={conv.id}
                                    onClick={() => handleSwitchConversation(conv.id)}
                                    className={`group flex items-center justify-between p-3 rounded-lg cursor-pointer transition-all border ${conv.id === currentConversationId
                                        ? 'bg-blue-600/20 border-blue-500/50 text-white'
                                        : 'bg-gray-800/30 border-transparent hover:bg-gray-800/50 text-gray-300'
                                        }`}
                                >
                                    <div className="flex-1 min-w-0 mr-2">
                                        <div className="font-medium text-sm truncate" title={conv.title}>
                                            {conv.title}
                                        </div>
                                        <div className="text-xs text-gray-500">
                                            {formatTimeAgo(conv.updated_at)}
                                        </div>
                                    </div>
                                    <button
                                        onClick={(e) => handleDeleteConversation(e, conv.id)}
                                        className="opacity-0 group-hover:opacity-100 p-1.5 text-gray-400 hover:text-red-400 hover:bg-red-900/20 rounded transition-all"
                                        title="Delete conversation"
                                    >
                                        <svg xmlns="http://www.w3.org/2000/svg" className="w-4 h-4" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                                            <polyline points="3 6 5 6 21 6"></polyline>
                                            <path d="M19 6v14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V6m3 0V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2"></path>
                                        </svg>
                                    </button>
                                </div>
                            ))
                        )}

                        {!loadingConversations && conversations.length === 0 && (
                            <div className="text-center text-sm text-gray-500 py-4">
                                No conversations yet
                            </div>
                        )}
                    </div>
                </div>

                {/* Right Sidebar and Main Chat remains largely the same logic, but we need to adjust layout container to fit 3 columns */}

                {/* Main Chat Area */}
                <div className="flex-1 flex flex-col bg-[hsl(var(--color-bg-secondary))]">
                    {/* Header */}
                    <div className="p-6 border-b border-[hsl(var(--color-border))] flex justify-between items-center">
                        <div className="flex items-center gap-3">
                            {/* Toggle Sidebar Button */}
                            <button
                                onClick={() => setShowSidebar(!showSidebar)}
                                className="p-2 hover:bg-gray-800 rounded-lg transition-colors text-gray-400 hover:text-white"
                                title={showSidebar ? "Hide History" : "Show History"}
                            >
                                <svg xmlns="http://www.w3.org/2000/svg" className="w-5 h-5" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                                    <line x1="3" y1="12" x2="21" y2="12"></line>
                                    <line x1="3" y1="6" x2="21" y2="6"></line>
                                    <line x1="3" y1="18" x2="21" y2="18"></line>
                                </svg>
                            </button>

                            <div>
                                <h1 className="text-2xl font-bold">🤖 AI Counsellor</h1>
                                <p className="text-sm text-[hsl(var(--color-text-muted))]">
                                    {conversations.find(c => c.id === currentConversationId)?.title || 'New Conversation'}
                                </p>
                            </div>
                        </div>
                        {/* Recent Activity Toggle (when sidebar closed) */}
                        {!isSidebarOpen && (
                            <button
                                onClick={() => setIsSidebarOpen(true)}
                                className="flex items-center gap-2 px-4 py-2 bg-gray-800 hover:bg-gray-700 border border-gray-700 rounded-lg transition-all"
                                title="Show Recent Activity"
                            >
                                <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 6h16M4 12h16M4 18h16" />
                                </svg>
                                <span className="text-sm font-medium">Recent Activity</span>
                            </button>
                        )}
                    </div>

                    {/* Chat Messages */}
                    <div className="flex-1 overflow-y-auto p-6 space-y-4">
                        {/* Loading State for Conversation Switch */}
                        {loading && messages.length === 0 ? (
                            <div className="flex h-full items-center justify-center">
                                <div className="flex flex-col items-center gap-3">
                                    <span className="loading loading-spinner text-primary loading-lg"></span>
                                    <p className="text-[hsl(var(--color-text-muted))] font-medium animate-pulse">
                                        Loading conversation data...
                                    </p>
                                </div>
                            </div>
                        ) : (
                            // Existing message mapping
                            messages.map((msg, idx) => (
                                <div key={idx} className={`flex ${msg.role === 'user' ? 'justify-end' : 'justify-start'}`}>
                                    <div className={`relative max-w-[85%] p-4 rounded-lg group ${msg.role === 'user'
                                        ? 'bg-gradient-to-r from-[hsl(var(--color-primary))] to-[hsl(var(--color-secondary))] text-white'
                                        : 'bg-gray-800/50 border border-gray-700 pb-12'
                                        }`}>
                                        <p className="whitespace-pre-wrap">{msg.content}</p>

                                        {/* Text-to-Speech Controls (Reused from existing) */}
                                        {msg.role === 'assistant' && (
                                            <div className="absolute bottom-2 left-4 flex items-center gap-2">
                                                {/* ... (Keep existing TTS buttons) ... */}
                                                {(speakingMessageId !== idx && pausedMessageId !== idx) && (
                                                    <button
                                                        onClick={() => handleSpeak(msg.content, idx)}
                                                        className="flex items-center gap-1.5 px-3 py-1.5 rounded-full bg-gray-700/80 hover:bg-gray-600 border border-gray-600 text-xs text-blue-300 hover:text-white transition-all shadow-sm"
                                                        title="Listen to response"
                                                    >
                                                        <svg xmlns="http://www.w3.org/2000/svg" className="w-3.5 h-3.5" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                                                            <polygon points="11 5 6 9 2 9 2 15 6 15 11 19 11 5"></polygon>
                                                            <path d="M19.07 4.93a10 10 0 0 1 0 14.14M15.54 8.46a5 5 0 0 1 0 7.07"></path>
                                                        </svg>
                                                        <span className="font-medium">Listen</span>
                                                    </button>
                                                )}

                                                {speakingMessageId === idx && (
                                                    <button
                                                        onClick={handlePause}
                                                        className="flex items-center gap-1.5 px-3 py-1.5 rounded-full bg-blue-900/30 hover:bg-blue-800/50 border border-blue-800 text-xs text-blue-400 transition-all shadow-sm"
                                                        title="Pause"
                                                    >
                                                        <svg xmlns="http://www.w3.org/2000/svg" className="w-3.5 h-3.5 animate-pulse" viewBox="0 0 24 24" fill="currentColor">
                                                            <rect x="6" y="4" width="4" height="16" rx="1" />
                                                            <rect x="14" y="4" width="4" height="16" rx="1" />
                                                        </svg>
                                                        <span className="font-medium">Pause</span>
                                                    </button>
                                                )}

                                                {pausedMessageId === idx && (
                                                    <>
                                                        <button
                                                            onClick={handleResume}
                                                            className="flex items-center gap-1.5 px-3 py-1.5 rounded-full bg-green-900/30 hover:bg-green-800/50 border border-green-800 text-xs text-green-400 transition-all shadow-sm"
                                                            title="Resume"
                                                        >
                                                            <svg xmlns="http://www.w3.org/2000/svg" className="w-3.5 h-3.5" viewBox="0 0 24 24" fill="currentColor">
                                                                <polygon points="5 3 19 12 5 21 5 3"></polygon>
                                                            </svg>
                                                            <span className="font-medium">Resume</span>
                                                        </button>

                                                        <button
                                                            onClick={() => handleSpeak(msg.content, idx)}
                                                            className="flex items-center gap-1.5 px-3 py-1.5 rounded-full bg-gray-700/80 hover:bg-gray-600 border border-gray-600 text-xs text-gray-300 hover:text-white transition-all shadow-sm"
                                                            title="Restart"
                                                        >
                                                            <svg xmlns="http://www.w3.org/2000/svg" className="w-3.5 h-3.5" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                                                                <path d="M21.5 2v6h-6M2.5 22v-6h6M2 11.5a10 10 0 0 1 18.8-4.3M22 12.5a10 10 0 0 1-18.8 4.2" />
                                                            </svg>
                                                            <span className="font-medium">Restart</span>
                                                        </button>
                                                    </>
                                                )}
                                            </div>
                                        )}
                                    </div>
                                </div>
                            ))
                        )}

                        {isReasoning && <ThinkingIndicator />}
                        {/* Recommendations and Actions components follow... (same as before) */}
                        {/* University Recommendations */}
                        {recommendations.length > 0 && (
                            <div className="p-4 bg-gray-800/50 border border-gray-700 rounded-lg">
                                <h3 className="font-bold mb-4 text-lg">🎓 University Recommendations</h3>
                                <div className="space-y-3">
                                    {recommendations.map((rec, idx) => (
                                        <div key={idx} className="p-4 bg-gray-700/50 rounded-lg border border-gray-600">
                                            <div className="flex justify-between items-start mb-3">
                                                <h4 className="font-bold text-lg">{rec.university}</h4>
                                                <span className={`px-3 py-1 rounded-full text-white text-xs font-bold ${getCategoryColor(rec.category)}`}>
                                                    {rec.category}
                                                </span>
                                            </div>

                                            {/* Acceptance Chance Progress Bar */}
                                            <div className="mb-3">
                                                <div className="flex justify-between text-sm mb-1">
                                                    <span className="font-medium text-gray-300">Acceptance Chance</span>
                                                    <span className="font-bold text-[hsl(var(--color-primary))]">{rec.acceptanceChance}%</span>
                                                </div>
                                                <div className="w-full bg-gray-600 rounded-full h-3 overflow-hidden">
                                                    <div
                                                        className={`h-3 rounded-full transition-all duration-500 ${rec.acceptanceChance > 70 ? 'bg-green-500' :
                                                            rec.acceptanceChance > 40 ? 'bg-blue-500' :
                                                                'bg-purple-500'
                                                            }`}
                                                        style={{ width: `${rec.acceptanceChance}%` }}
                                                    />
                                                </div>
                                            </div>

                                            {/* Reasoning */}
                                            <p className="text-sm text-gray-300 mb-3">
                                                {rec.reasoning}
                                            </p>

                                            {/* Strengths & Risks */}
                                            <div className="grid grid-cols-2 gap-3 text-xs">
                                                <div className="bg-green-900/30 border border-green-700/50 p-2 rounded">
                                                    <div className="font-bold text-green-400 mb-1">✓ Strengths</div>
                                                    {rec.strengths?.map((s, i) => <div key={i} className="text-green-300">• {s}</div>)}
                                                </div>
                                                <div className="bg-red-900/30 border border-red-700/50 p-2 rounded">
                                                    <div className="font-bold text-red-400 mb-1">⚠️ Risks</div>
                                                    {rec.risks?.map((r, i) => <div key={i} className="text-red-300">• {r}</div>)}
                                                </div>
                                            </div>
                                        </div>
                                    ))}
                                </div>
                            </div>
                        )}

                        {/* Next Steps */}
                        {nextSteps.length > 0 && (
                            <div className="p-4 bg-blue-900/20 border border-blue-700/50 rounded-lg">
                                <h3 className="font-bold mb-3">🎯 Next Steps</h3>
                                <ul className="space-y-2">
                                    {nextSteps.map((step, idx) => (
                                        <li key={idx} className="flex items-start gap-2">
                                            <span className="text-blue-400 font-bold">{idx + 1}.</span>
                                            <span className="text-gray-300">{step}</span>
                                        </li>
                                    ))}
                                </ul>
                            </div>
                        )}

                        {/* Suggested Actions */}
                        {suggestedActions.length > 0 && (
                            <div className="p-4 bg-purple-900/20 border border-purple-700/50 rounded-lg">
                                <h3 className="font-bold mb-3">💡 Suggested Actions</h3>
                                <div className="space-y-2">
                                    {suggestedActions.map((action, idx) => {
                                        const formatPayload = (type, payload) => {
                                            if (!payload) return '';
                                            switch (type) {
                                                case 'SUGGEST_SHORTLIST':
                                                    return `Add ${payload.univ_external_id || 'University'} to ${payload.category || 'Shortlist'}`;
                                                case 'CREATE_TASK':
                                                    return `Task: ${payload.title || 'New Task'} ${payload.due_date ? `(Due: ${payload.due_date})` : ''}`;
                                                case 'RECOMMEND_LOCK':
                                                    return `Lock ${payload.university_id || 'University'}: ${payload.reason || 'Recommended'}`;
                                                default:
                                                    return JSON.stringify(payload).substring(0, 100);
                                            }
                                        };

                                        return (
                                            <div key={idx} className="flex items-center justify-between p-3 bg-gray-700/50 rounded-lg">
                                                <div className="flex-1 mr-4">
                                                    <div className="font-medium text-sm text-purple-400">
                                                        {action.type.replace(/_/g, ' ')}
                                                    </div>
                                                    <div className="text-sm text-gray-300">
                                                        {formatPayload(action.type, action.payload)}
                                                    </div>
                                                </div>
                                                <button
                                                    onClick={() => handleExecuteAction(action)}
                                                    disabled={executingActions.includes(action)}
                                                    className={`btn btn-primary btn-sm whitespace-nowrap transition-all duration-200 ${executingActions.includes(action)
                                                        ? '!bg-gray-900 !border-gray-700 !text-gray-300 cursor-not-allowed'
                                                        : ''
                                                        }`}
                                                >
                                                    {executingActions.includes(action) ? (
                                                        <LoadingText text="Adding" />
                                                    ) : (
                                                        'Execute'
                                                    )}
                                                </button>
                                            </div>
                                        );
                                    })}
                                </div>
                            </div>
                        )}
                        <div ref={messagesEndRef} />
                    </div>

                    {/* Input Area (Reused) */}
                    <div className="p-6 border-t border-[hsl(var(--color-border))] relative">
                        {/* Live Transcript Overlay */}
                        {isListening && (interimTranscript || input) && (
                            <div className="absolute bottom-full left-0 right-0 mb-2 px-6">
                                <div className="bg-gradient-to-r from-blue-600/90 to-purple-600/90 backdrop-blur-sm p-4 rounded-lg shadow-lg border border-blue-400/30">
                                    <div className="flex items-start gap-3">
                                        <div className="flex-shrink-0 mt-1">
                                            <svg xmlns="http://www.w3.org/2000/svg" className="w-5 h-5 text-white animate-pulse" viewBox="0 0 24 24" fill="none">
                                                <circle cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="2" fill="none" />
                                                <circle cx="12" cy="12" r="5" fill="currentColor" />
                                            </svg>
                                        </div>
                                        <div className="flex-1 min-w-0">
                                            <p className="text-xs text-blue-200 mb-1 font-medium">Recording...</p>
                                            <p className="text-white text-base leading-relaxed">
                                                {input}
                                                {input && interimTranscript && ' '}
                                                <span className="text-blue-200 italic">{interimTranscript}</span>
                                                {!input && !interimTranscript && (
                                                    <span className="text-blue-200 italic">Start speaking...</span>
                                                )}
                                            </p>
                                        </div>
                                    </div>
                                </div>
                            </div>
                        )}

                        <div className="flex gap-3 items-end">
                            <button
                                onClick={toggleVoiceInput}
                                disabled={isReasoning}
                                className={`btn ${isListening ? 'btn-secondary' : 'btn-outline'} px-4 transition-all duration-300`}
                                title={isListening ? "Recording... Click to stop" : "Start voice input"}
                            >
                                {isListening ? (
                                    <svg xmlns="http://www.w3.org/2000/svg" className="w-6 h-6 animate-pulse" viewBox="0 0 24 24" fill="none">
                                        <circle cx="12" cy="12" r="10" stroke="#ef4444" strokeWidth="2" fill="none" />
                                        <circle cx="12" cy="12" r="5" fill="#ef4444" />
                                    </svg>
                                ) : (
                                    <svg xmlns="http://www.w3.org/2000/svg" className="w-5 h-5" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                                        <path d="M12 2a3 3 0 0 0-3 3v7a3 3 0 0 0 6 0V5a3 3 0 0 0-3-3Z" />
                                        <path d="M19 10v2a7 7 0 0 1-14 0v-2" />
                                        <line x1="12" y1="19" x2="12" y2="22" />
                                        <line x1="8" y1="22" x2="16" y2="22" />
                                    </svg>
                                )}
                            </button>
                            <textarea
                                ref={textareaRef}
                                className="input flex-1 resize-none overflow-hidden min-h-[44px] max-h-[200px]"
                                value={input}
                                onChange={(e) => setInput(e.target.value)}
                                onKeyDown={(e) => {
                                    if (e.key === 'Enter' && !e.shiftKey) {
                                        e.preventDefault();
                                        handleSend();
                                    }
                                }}
                                placeholder="Ask me anything about studying abroad..."
                                disabled={isReasoning}
                                rows={1}
                            />
                            <button
                                onClick={handleSend}
                                disabled={isReasoning || !input.trim()}
                                className="btn btn-primary"
                            >
                                {isReasoning ? <span className="spinner"></span> : 'Send'}
                            </button>
                        </div>
                        <p className="text-xs text-[hsl(var(--color-text-muted))] mt-2">
                            💡 Try: "Analyze my profile" or "Recommend universities for Computer Science" | 🎤 Click the microphone to use voice input
                        </p>
                    </div>
                </div>

                {/* Right Sidebar - Activity & Momentum */}
                <div className={`w-80 flex flex-col gap-4 p-4 overflow-y-auto bg-[hsl(var(--color-bg))] transition-all duration-300 ${isSidebarOpen ? 'translate-x-0' : 'translate-x-full absolute right-0 top-0 h-full'
                    }`}>
                    {/* Momentum Indicator (Reused) */}
                    {momentum && (
                        <div className="p-4 bg-gray-800/50 border border-gray-700 rounded-lg">
                            <div className="flex items-center justify-between mb-3">
                                <h3 className="font-bold flex items-center gap-2">
                                    🔥 Your Momentum
                                </h3>
                                <button
                                    onClick={() => setIsSidebarOpen(false)}
                                    className="p-1 hover:bg-gray-700 rounded transition-colors"
                                    title="Hide sidebar"
                                >
                                    <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                                    </svg>
                                </button>
                            </div>
                            <div className="flex items-center gap-3 mb-2">
                                <div className={`w-3 h-3 rounded-full ${getMomentumColor(momentum.momentum)}`}></div>
                                <span className="font-bold text-lg">{momentum.momentum}</span>
                            </div>
                            <p className="text-sm text-gray-400">
                                {momentum.actionsThisWeek} actions this week
                            </p>
                            {momentum.lastAction && (
                                <p className="text-xs text-gray-500 mt-2">
                                    Last: {momentum.lastAction.activity_type.replace(/_/g, ' ')} {formatTimeAgo(momentum.lastAction.created_at)}
                                </p>
                            )}
                        </div>
                    )}

                    {/* Activity Timeline (Reused) */}
                    <div className="flex-1 p-4 bg-gray-800/50 border border-gray-700 rounded-lg">
                        <h3 className="font-bold mb-3">📊 Recent Activity</h3>
                        <div className="space-y-2 max-h-[400px] overflow-y-auto">
                            {loadingActivities ? (
                                <div className="space-y-2">
                                    {[1, 2, 3, 4, 5].map(i => (
                                        <div key={i} className="flex items-start gap-2 p-2 bg-gray-700/50 rounded animate-pulse">
                                            <div className="w-8 h-8 bg-gray-600 rounded"></div>
                                            <div className="flex-1 space-y-2">
                                                <div className="h-3 bg-gray-600 rounded w-3/4"></div>
                                                <div className="h-3 bg-gray-600 rounded w-1/2"></div>
                                            </div>
                                            <div className="h-3 bg-gray-600 rounded w-12"></div>
                                        </div>
                                    ))}
                                </div>
                            ) : activities.length > 0 ? activities.slice(0, 15).map((activity, idx) => (
                                <div key={idx} className="flex items-start gap-2 p-2 bg-gray-700/50 rounded text-sm">
                                    <span className="text-xl">{getActivityIcon(activity.activity_type)}</span>
                                    <div className="flex-1">
                                        <div className="font-medium text-gray-200">
                                            {activity.activity_type.replace(/_/g, ' ')}
                                        </div>
                                        <div className="text-xs text-gray-400">
                                            {activity.metadata?.university_name || activity.metadata?.task_title || 'Action'}
                                        </div>
                                    </div>
                                    <span className="text-xs text-gray-500 whitespace-nowrap">
                                        {formatTimeAgo(activity.created_at)}
                                    </span>
                                </div>
                            )) : (
                                <p className="text-sm text-gray-400 text-center py-4">
                                    No activity yet. Start by completing your profile!
                                </p>
                            )}
                        </div>
                    </div>
                </div>
            </div>
        </NavigationLayout>
    );
}
