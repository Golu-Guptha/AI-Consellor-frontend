import { useState, useRef, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { useProfile } from '../context/ProfileContext';
import LoadingSpinner from '../components/LoadingSpinner';

const COUNTRIES = ['United States', 'United Kingdom', 'Canada', 'Australia', 'Germany', 'France', 'Netherlands', 'Singapore', 'Ireland', 'New Zealand'];
const EDUCATION_LEVELS = ['HS', 'Bachelors', 'Masters', 'MBA', 'PhD'];
const TARGET_DEGREES = ['Bachelors', 'Masters', 'MBA', 'PhD'];
const FUNDING_PLANS = ['Self-Funded', 'Scholarship', 'Loan', 'Mixed'];

// Deterministic Bot Flow Configuration
const BOT_FLOW = [
    // Phase 1: Academic (steps 0-2)
    { id: 0, phase: 1, question: "Hi there! 👋 Let's build your profile together. What is your current education level?", field: 'education_level', type: 'single', options: EDUCATION_LEVELS },
    { id: 1, phase: 1, question: "Great! What is your major or field of study?", field: 'degree_major', type: 'text' },
    { id: 2, phase: 1, question: "What is your GPA (out of 4.0)? You can skip this if you prefer.", field: 'gpa', type: 'number', optional: true, skipText: 'Skip' },

    // Phase 2: Goals (steps 3-6)
    { id: 3, phase: 2, question: "Perfect! Now let's talk about your goals. What degree are you targeting?", field: 'target_degree', type: 'single', options: TARGET_DEGREES },
    { id: 4, phase: 2, question: "What field do you want to study?", field: 'field_of_study', type: 'text' },
    { id: 5, phase: 2, question: "Which countries are you interested in? (Select all that apply)", field: 'preferred_countries', type: 'multi', options: COUNTRIES },
    { id: 6, phase: 2, question: "What year are you planning to start?", field: 'intake_year', type: 'single', options: [new Date().getFullYear(), new Date().getFullYear() + 1, new Date().getFullYear() + 2] },

    // Phase 3: Budget (steps 7-8)
    { id: 7, phase: 3, question: "Let's discuss budget. What's your maximum budget per year (USD)?", field: 'budget_max', type: 'single', options: ['10000', '20000', '30000', '50000', '75000', '100000'], displayOptions: ['$10,000', '$20,000', '$30,000', '$50,000', '$75,000', '$100,000+'] },
    { id: 8, phase: 3, question: "How will you fund your studies?", field: 'funding_plan', type: 'single', options: FUNDING_PLANS },

    // Phase 4: Tests (steps 9-11)
    { id: 9, phase: 4, question: "Almost done! Do you have an IELTS score?", field: 'ielts_score', type: 'number', optional: true, skipText: 'Not yet', placeholder: 'e.g., 7.5' },
    { id: 10, phase: 4, question: "How about a TOEFL score?", field: 'toefl_score', type: 'number', optional: true, skipText: 'Not yet', placeholder: 'e.g., 105' },
    { id: 11, phase: 4, question: "Do you have GRE or GMAT scores?", field: 'test_scores', type: 'single', options: ['GRE', 'GMAT', 'Both', 'None yet'], skipText: 'None yet' },
    { id: 12, phase: 4, question: "What's your Statement of Purpose (SOP) status?", field: 'sop_status', type: 'single', options: ['NOT_STARTED', 'DRAFT', 'READY'], displayOptions: ['Not Started', 'Draft', 'Ready'] },

    // Phase 5: Review (step 13)
    { id: 13, phase: 5, question: 'REVIEW' }
];

export default function OnboardingPage() {
    const navigate = useNavigate();
    const { updateProfile } = useProfile();
    const [step, setStep] = useState(1);
    const [loading, setLoading] = useState(false);
    const [error, setError] = useState('');

    // Mode State
    const [onboardingMode, setOnboardingMode] = useState('MANUAL'); // 'MANUAL' | 'AI'

    // Bot Chat State (replaces AI state)
    const [messages, setMessages] = useState([]);
    const [currentStep, setCurrentStep] = useState(0);
    const [botInput, setBotInput] = useState('');
    const [selectedMultiOptions, setSelectedMultiOptions] = useState([]);
    const [isReviewMode, setIsReviewMode] = useState(false);
    const [editingField, setEditingField] = useState(null);

    const [isListening, setIsListening] = useState(false);
    const [recognition, setRecognition] = useState(null);
    const [interimTranscript, setInterimTranscript] = useState('');
    const [speakingMessageId, setSpeakingMessageId] = useState(null);
    const [paused, setPaused] = useState(false);
    const messagesEndRef = useRef(null);
    const currentUtterance = useRef(null);

    const [formData, setFormData] = useState({
        // Academic
        education_level: '',
        degree_major: '',
        grad_year: new Date().getFullYear(),
        gpa: '',

        // Goals
        target_degree: '',
        field_of_study: '',
        intake_year: new Date().getFullYear() + 1,
        preferred_countries: [],

        // Budget
        budget_min: '',
        budget_max: '',
        funding_plan: '',

        // Tests
        ielts_score: '',
        toefl_score: '',
        gre_score: '',
        gmat_score: '',
        sop_status: 'NOT_STARTED'
    });

    // Initialize bot conversation when switching to AI mode
    useEffect(() => {
        if (onboardingMode === 'AI' && messages.length === 0) {
            const firstStep = BOT_FLOW[0];
            setMessages([{
                role: 'assistant',
                content: firstStep.question
            }]);
            setCurrentStep(0);
        }
    }, [onboardingMode]);

    // Auto-scroll to bottom of chat
    useEffect(() => {
        messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
    }, [messages, onboardingMode]);

    // --- Voice Recognition Setup (Copied from AICounsellorPage) ---
    useEffect(() => {
        if ('webkitSpeechRecognition' in window || 'SpeechRecognition' in window) {
            const SpeechRecognition = window.SpeechRecognition || window.webkitSpeechRecognition;
            const recognitionInstance = new SpeechRecognition();

            recognitionInstance.continuous = false;
            recognitionInstance.interimResults = true;
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
                setInterimTranscript(interimText);
                if (finalText) {
                    setBotInput(prev => prev + (prev ? ' ' : '') + finalText.trim());
                }
            };

            recognitionInstance.onerror = (event) => {
                console.error('Speech recognition error:', event.error);
                setIsListening(false);
            };

            recognitionInstance.onend = () => {
                setIsListening(false);
                setInterimTranscript('');
            };

            setRecognition(recognitionInstance);
        }
    }, []);

    const toggleVoiceInput = () => {
        if (!recognition) {
            alert('⚠️ Speech recognition is not supported in your browser.');
            return;
        }
        if (isListening) {
            recognition.stop();
        } else {
            try {
                recognition.start();
            } catch (err) {
                console.error(err);
                setIsListening(false);
            }
        }
    };

    // --- Text-to-Speech (TTS) ---
    const handleSpeak = (text, idx) => {
        // If clicking the same message that is paused, just resume
        if (speakingMessageId === idx && paused) {
            window.speechSynthesis.resume();
            setPaused(false);
            return;
        }

        // Stop any current speech
        window.speechSynthesis.cancel();
        setPaused(false);

        if (speakingMessageId === idx && !paused) {
            // If clicking the same, active message, stop it
            setSpeakingMessageId(null);
            currentUtterance.current = null;
            return;
        }

        // Start new speech
        const utterance = new SpeechSynthesisUtterance(text);
        currentUtterance.current = utterance;

        utterance.onend = () => {
            if (currentUtterance.current === utterance) {
                setSpeakingMessageId(null);
                setPaused(false);
                currentUtterance.current = null;
            }
        };

        utterance.onerror = (e) => {
            console.error("TTS Error:", e);
            if (currentUtterance.current === utterance) {
                setSpeakingMessageId(null);
                setPaused(false);
                currentUtterance.current = null;
            }
        };

        window.speechSynthesis.speak(utterance);
        setSpeakingMessageId(idx);
    };

    // --- Bot Chat Logic (Deterministic) ---
    const handleBotSend = (overrideInput = null) => {
        const inputToSend = overrideInput || botInput;
        // Convert to string and check if empty
        const inputStr = String(inputToSend);
        if (!inputStr.trim()) return;

        const userMessage = inputStr;
        setBotInput('');
        setSelectedMultiOptions([]);

        // Add user message
        setMessages(prev => [...prev, { role: 'user', content: userMessage }]);

        // Determine next step
        setTimeout(() => {
            processUserInput(userMessage);
        }, 300); // Small delay for smooth UX
    };

    const processUserInput = (userInput) => {
        const step = BOT_FLOW[currentStep];

        // Handle review mode
        if (isReviewMode) {
            if (userInput.toLowerCase() === 'no' || userInput.toLowerCase() === 'complete') {
                // Complete profile
                setMessages(prev => [...prev, {
                    role: 'assistant',
                    content: "Perfect! Your profile is complete. Click 'Complete Profile' on the left to finish! ✅"
                }]);
                return;
            } else if (userInput.toLowerCase() === 'yes') {
                // Show editable fields
                setMessages(prev => [...prev, {
                    role: 'assistant',
                    content: "Which field would you like to edit? (Type the field name or select from options)"
                }]);
                return;
            } else if (editingField) {
                // User is editing a specific field
                const fieldToEdit = BOT_FLOW.find(s => s.field === editingField);
                if (fieldToEdit) {
                    updateFormField(fieldToEdit.field, userInput, fieldToEdit.type);
                    setEditingField(null);
                    setMessages(prev => [...prev, {
                        role: 'assistant',
                        content: "Updated! Do you want to edit anything else?"
                    }]);
                }
                return;
            }
        }

        // Save the answer to formData
        if (step.field) {
            updateFormField(step.field, userInput, step.type);
        }

        // Check if we reached the end of questions
        if (currentStep >= BOT_FLOW.length - 2) {
            // Show review
            showReview();
        } else {
            // Move to next question
            moveToNextStep();
        }
    };

    const updateFormField = (field, value, type) => {
        if (type === 'multi') {
            // Multi-select from selectedMultiOptions
            setFormData(prev => ({
                ...prev,
                [field]: selectedMultiOptions.length > 0 ? selectedMultiOptions : value.split(',').map(v => v.trim())
            }));
        } else if (type === 'number') {
            const numVal = parseFloat(value);
            setFormData(prev => ({
                ...prev,
                [field]: isNaN(numVal) ? '' : numVal
            }));
        } else if (field === 'budget_max') {
            // Remove $ and commas
            const cleanValue = value.replace(/[$,]/g, '').trim();
            setFormData(prev => ({
                ...prev,
                [field]: cleanValue.replace('+', '')
            }));
        } else if (field === 'test_scores') {
            // Handle test scores mapping
            if (value === 'GRE' || value === 'Both') {
                setFormData(prev => ({ ...prev, gre_score: 0 })); // Flag for later entry
            }
            if (value === 'GMAT' || value === 'Both') {
                setFormData(prev => ({ ...prev, gmat_score: 0 })); // Flag for later entry
            }
        } else {
            setFormData(prev => ({
                ...prev,
                [field]: value
            }));
        }
    };

    const moveToNextStep = () => {
        const nextStepIndex = currentStep + 1;
        if (nextStepIndex < BOT_FLOW.length) {
            const nextStep = BOT_FLOW[nextStepIndex];
            setCurrentStep(nextStepIndex);
            setMessages(prev => [...prev, {
                role: 'assistant',
                content: nextStep.question
            }]);

            // Auto-speak for immersive experience
            handleSpeak(nextStep.question, messages.length + 1);
        }
    };

    const showReview = () => {
        setIsReviewMode(true);
        const summary = `
🎉 Great! Let's review your profile:

📚 **Academic**: ${formData.education_level || 'N/A'} in ${formData.degree_major || 'N/A'}
${formData.gpa ? `GPA: ${formData.gpa}` : ''}

🎯 **Goals**: ${formData.target_degree || 'N/A'} in ${formData.field_of_study || 'N/A'}
📍 **Countries**: ${formData.preferred_countries?.join(', ') || 'N/A'}
📅 **Intake**: ${formData.intake_year || 'N/A'}

💰 **Budget**: $${formData.budget_max || 'N/A'}/year
💳 **Funding**: ${formData.funding_plan || 'N/A'}

📝 **Tests**: 
${formData.ielts_score ? `IELTS: ${formData.ielts_score}` : ''}
${formData.toefl_score ? `TOEFL: ${formData.toefl_score}` : ''}
${formData.gre_score ? `GRE: ${formData.gre_score}` : ''}
${formData.gmat_score ? `GMAT: ${formData.gmat_score}` : ''}
SOP: ${formData.sop_status || 'Not Started'}

**Do you want to make any edits?**
        `.trim();

        setMessages(prev => [...prev, {
            role: 'assistant',
            content: summary
        }]);
    };

    const handleOptionClick = (option, optionType) => {
        if (optionType === 'multi') {
            // Toggle multi-select
            setSelectedMultiOptions(prev =>
                prev.includes(option)
                    ? prev.filter(o => o !== option)
                    : [...prev, option]
            );
        } else if (optionType === 'review') {
            // Handle review actions
            if (option === 'Complete') {
                handleBotSend('complete');
            } else if (option === 'Edit') {
                handleBotSend('yes');
            }
        } else {
            // Single select - immediately send
            handleBotSend(option);
        }
    };

    const handleMultiSelectSubmit = () => {
        if (selectedMultiOptions.length === 0) return;
        handleBotSend(selectedMultiOptions.join(', '));
    };

    // --- Standard Handlers ---
    const handleChange = (field, value) => {
        setFormData(prev => ({ ...prev, [field]: value }));
    };

    const handleCountryToggle = (country) => {
        setFormData(prev => ({
            ...prev,
            preferred_countries: prev.preferred_countries.includes(country)
                ? prev.preferred_countries.filter(c => c !== country)
                : [...prev.preferred_countries, country]
        }));
    };

    const handleSubmit = async () => {
        setLoading(true);
        setError('');

        try {
            const profileData = {
                ...formData,
                gpa: formData.gpa ? parseFloat(formData.gpa) : null,
                budget_min: formData.budget_min ? parseInt(formData.budget_min) : null,
                budget_max: formData.budget_max ? parseInt(formData.budget_max) : null,
                ielts_score: formData.ielts_score ? parseFloat(formData.ielts_score) : null,
                toefl_score: formData.toefl_score ? parseInt(formData.toefl_score) : null,
                gre_score: formData.gre_score ? parseInt(formData.gre_score) : null,
                gmat_score: formData.gmat_score ? parseInt(formData.gmat_score) : null,
            };

            await updateProfile(profileData);
            navigate('/dashboard');
        } catch (err) {
            setError(err.response?.data?.error?.message || 'Failed to save profile');
        } finally {
            setLoading(false);
        }
    };

    const nextStep = () => {
        setStep(prev => Math.min(prev + 1, 4));
    };

    const prevStep = () => {
        setStep(prev => Math.max(prev - 1, 1));
    };

    if (loading && onboardingMode === 'MANUAL') {
        return <LoadingSpinner fullScreen message="Saving your profile..." />;
    }

    return (
        <div className="min-h-screen bg-gradient-to-br from-[hsl(var(--color-bg))] via-[hsl(var(--color-bg-secondary))] to-[hsl(var(--color-bg))] p-4">
            <div className="container mx-auto max-w-5xl py-8">

                {/* Mode Toggle Header */}
                <div className="flex flex-col items-center mb-8">
                    <h1 className="text-4xl font-bold mb-6 text-center">
                        Build Your <span className="gradient-text">Profile</span>
                    </h1>

                    <div className="flex bg-gray-800/50 p-1 rounded-full border border-gray-700/50 backdrop-blur-sm">
                        <button
                            onClick={() => setOnboardingMode('MANUAL')}
                            className={`px-6 py-2 rounded-full text-sm font-medium transition-all duration-300 flex items-center gap-2 ${onboardingMode === 'MANUAL'
                                ? 'bg-blue-600 text-white shadow-lg shadow-blue-500/25'
                                : 'text-gray-400 hover:text-white hover:bg-white/5'
                                }`}
                        >
                            <svg xmlns="http://www.w3.org/2000/svg" className="w-4 h-4" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                                <path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z"></path>
                                <polyline points="14 2 14 8 20 8"></polyline>
                                <line x1="16" y1="13" x2="8" y2="13"></line>
                                <line x1="16" y1="17" x2="8" y2="17"></line>
                                <polyline points="10 9 9 9 8 9"></polyline>
                            </svg>
                            Manual Form
                        </button>
                        <button
                            onClick={() => setOnboardingMode('AI')}
                            className={`px-6 py-2 rounded-full text-sm font-medium transition-all duration-300 flex items-center gap-2 ${onboardingMode === 'AI'
                                ? 'bg-purple-600 text-white shadow-lg shadow-purple-500/25'
                                : 'text-gray-400 hover:text-white hover:bg-white/5'
                                }`}
                        >
                            <svg xmlns="http://www.w3.org/2000/svg" className="w-4 h-4" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                                <path d="M12 2a3 3 0 0 0-3 3v7a3 3 0 0 0 6 0V5a3 3 0 0 0-3-3Z" />
                                <path d="M19 10v2a7 7 0 0 1-14 0v-2" />
                                <line x1="12" y1="19" x2="12" y2="22" />
                                <line x1="8" y1="22" x2="16" y2="22" />
                            </svg>
                            AI Interview
                        </button>
                    </div>
                </div>

                {/* MANUAL MODE */}
                {onboardingMode === 'MANUAL' && (
                    <div className="max-w-3xl mx-auto animate-slide-up">
                        {/* Progress Bar */}
                        <div className="mb-8">
                            <div className="flex justify-between text-xs text-gray-400 mb-2 px-1">
                                <span>Academic</span>
                                <span>Goals</span>
                                <span>Budget</span>
                                <span>Tests</span>
                            </div>
                            <div className="h-2 bg-[hsl(var(--color-bg))] rounded-full overflow-hidden">
                                <div
                                    className="h-full bg-gradient-to-r from-[hsl(var(--color-primary))] to-[hsl(var(--color-secondary))] transition-all duration-300"
                                    style={{ width: `${(step / 4) * 100}%` }}
                                ></div>
                            </div>
                        </div>

                        {error && (
                            <div className="mb-6 bg-[hsl(var(--color-error))]/10 border border-[hsl(var(--color-error))]/30 text-[hsl(var(--color-error))] p-4 rounded-lg">
                                {error}
                            </div>
                        )}

                        {/* Standard Form */}
                        <div className="card">
                            {/* Step 1: Academic Background */}
                            {step === 1 && (
                                <div className="space-y-6">
                                    <h2 className="text-2xl font-bold mb-6">📚 Academic Background</h2>

                                    <div>
                                        <label className="label">Current Education Level *</label>
                                        <select
                                            className="input"
                                            value={formData.education_level}
                                            onChange={(e) => handleChange('education_level', e.target.value)}
                                            required
                                        >
                                            <option value="">Select...</option>
                                            {EDUCATION_LEVELS.map(level => (
                                                <option key={level} value={level}>{level}</option>
                                            ))}
                                        </select>
                                    </div>

                                    <div>
                                        <label className="label">Degree/Major</label>
                                        <input
                                            type="text"
                                            className="input"
                                            value={formData.degree_major}
                                            onChange={(e) => handleChange('degree_major', e.target.value)}
                                            placeholder="e.g., Computer Science"
                                        />
                                    </div>

                                    <div className="grid md:grid-cols-2 gap-4">
                                        <div>
                                            <label className="label">Graduation Year</label>
                                            <input
                                                type="number"
                                                className="input"
                                                value={formData.grad_year}
                                                onChange={(e) => handleChange('grad_year', parseInt(e.target.value))}
                                                min="1980"
                                                max="2030"
                                            />
                                        </div>

                                        <div>
                                            <label className="label">GPA (out of 4.0)</label>
                                            <input
                                                type="number"
                                                className="input"
                                                value={formData.gpa}
                                                onChange={(e) => handleChange('gpa', e.target.value)}
                                                min="0"
                                                max="4.0"
                                                step="0.01"
                                                placeholder="e.g., 3.75"
                                            />
                                        </div>
                                    </div>
                                </div>
                            )}

                            {/* Step 2: Study Goals */}
                            {step === 2 && (
                                <div className="space-y-6">
                                    <h2 className="text-2xl font-bold mb-6">🎯 Study Goals</h2>

                                    <div>
                                        <label className="label">Target Degree *</label>
                                        <select
                                            className="input"
                                            value={formData.target_degree}
                                            onChange={(e) => handleChange('target_degree', e.target.value)}
                                            required
                                        >
                                            <option value="">Select...</option>
                                            {TARGET_DEGREES.map(degree => (
                                                <option key={degree} value={degree}>{degree}</option>
                                            ))}
                                        </select>
                                    </div>

                                    <div>
                                        <label className="label">Field of Study *</label>
                                        <input
                                            type="text"
                                            className="input"
                                            value={formData.field_of_study}
                                            onChange={(e) => handleChange('field_of_study', e.target.value)}
                                            placeholder="e.g., Data Science, MBA, Medicine"
                                            required
                                        />
                                    </div>

                                    <div>
                                        <label className="label">Intake Year *</label>
                                        <input
                                            type="number"
                                            className="input"
                                            value={formData.intake_year}
                                            onChange={(e) => handleChange('intake_year', parseInt(e.target.value))}
                                            min={new Date().getFullYear()}
                                            max="2030"
                                            required
                                        />
                                    </div>

                                    <div>
                                        <label className="label">Preferred Countries * (select at least one)</label>
                                        <div className="grid grid-cols-2 md:grid-cols-3 gap-3 mt-2">
                                            {COUNTRIES.map(country => (
                                                <button
                                                    key={country}
                                                    type="button"
                                                    onClick={() => handleCountryToggle(country)}
                                                    className={`px-4 py-2 rounded-lg text-sm border transition-all ${formData.preferred_countries.includes(country)
                                                        ? 'bg-[hsl(var(--color-primary))]/20 border-[hsl(var(--color-primary))] text-[hsl(var(--color-primary))]'
                                                        : 'bg-[hsl(var(--color-bg))] border-[hsl(var(--color-border))] hover:border-[hsl(var(--color-primary))]/50'
                                                        }`}
                                                >
                                                    {country}
                                                </button>
                                            ))}
                                        </div>
                                    </div>
                                </div>
                            )}

                            {/* Step 3: Budget */}
                            {step === 3 && (
                                <div className="space-y-6">
                                    <h2 className="text-2xl font-bold mb-6">💰 Budget</h2>

                                    <div className="grid md:grid-cols-2 gap-4">
                                        <div>
                                            <label className="label">Min Budget (USD/year)</label>
                                            <input
                                                type="number"
                                                className="input"
                                                value={formData.budget_min}
                                                onChange={(e) => handleChange('budget_min', e.target.value)}
                                                placeholder="10000"
                                                min="0"
                                            />
                                        </div>

                                        <div>
                                            <label className="label">Max Budget (USD/year) *</label>
                                            <input
                                                type="number"
                                                className="input"
                                                value={formData.budget_max}
                                                onChange={(e) => handleChange('budget_max', e.target.value)}
                                                placeholder="50000"
                                                min="0"
                                                required
                                            />
                                        </div>
                                    </div>

                                    <div>
                                        <label className="label">Funding Plan</label>
                                        <select
                                            className="input"
                                            value={formData.funding_plan}
                                            onChange={(e) => handleChange('funding_plan', e.target.value)}
                                        >
                                            <option value="">Select...</option>
                                            {FUNDING_PLANS.map(plan => (
                                                <option key={plan} value={plan}>{plan}</option>
                                            ))}
                                        </select>
                                    </div>
                                </div>
                            )}

                            {/* Step 4: Test Scores */}
                            {step === 4 && (
                                <div className="space-y-6">
                                    <h2 className="text-2xl font-bold mb-6">📝 Test Scores</h2>
                                    <p className="text-sm text-[hsl(var(--color-text-muted))] mb-4">
                                        Enter scores you've already taken. You can update these later.
                                    </p>

                                    <div className="grid md:grid-cols-2 gap-6">
                                        <div>
                                            <label className="label">IELTS Score (0-9)</label>
                                            <input
                                                type="number"
                                                className="input"
                                                value={formData.ielts_score}
                                                onChange={(e) => handleChange('ielts_score', e.target.value)}
                                                min="0"
                                                max="9"
                                                step="0.5"
                                                placeholder="e.g., 7.5"
                                            />
                                        </div>

                                        <div>
                                            <label className="label">TOEFL Score (0-120)</label>
                                            <input
                                                type="number"
                                                className="input"
                                                value={formData.toefl_score}
                                                onChange={(e) => handleChange('toefl_score', e.target.value)}
                                                min="0"
                                                max="120"
                                                placeholder="e.g., 105"
                                            />
                                        </div>

                                        <div>
                                            <label className="label">GRE Score (260-340)</label>
                                            <input
                                                type="number"
                                                className="input"
                                                value={formData.gre_score}
                                                onChange={(e) => handleChange('gre_score', e.target.value)}
                                                min="260"
                                                max="340"
                                                placeholder="e.g., 325"
                                            />
                                        </div>

                                        <div>
                                            <label className="label">GMAT Score (200-800)</label>
                                            <input
                                                type="number"
                                                className="input"
                                                value={formData.gmat_score}
                                                onChange={(e) => handleChange('gmat_score', e.target.value)}
                                                min="200"
                                                max="800"
                                                placeholder="e.g., 720"
                                            />
                                        </div>
                                    </div>

                                    <div>
                                        <label className="label">SOP Status</label>
                                        <select
                                            className="input"
                                            value={formData.sop_status}
                                            onChange={(e) => handleChange('sop_status', e.target.value)}
                                        >
                                            <option value="NOT_STARTED">Not Started</option>
                                            <option value="DRAFT">Draft</option>
                                            <option value="READY">Ready</option>
                                        </select>
                                    </div>
                                </div>
                            )}
                            <div className="flex justify-between mt-8 pt-6 border-t border-[hsl(var(--color-border))]">
                                <button
                                    onClick={prevStep}
                                    disabled={step === 1}
                                    className="btn btn-ghost"
                                >
                                    ← Previous
                                </button>

                                {step < 4 ? (
                                    <button
                                        onClick={nextStep}
                                        disabled={
                                            (step === 1 && !formData.education_level) ||
                                            (step === 2 && (!formData.target_degree || !formData.field_of_study || formData.preferred_countries.length === 0))
                                        }
                                        className="btn btn-primary"
                                    >
                                        Next →
                                    </button>
                                ) : (
                                    <button
                                        onClick={handleSubmit}
                                        disabled={!formData.budget_max}
                                        className="btn btn-primary"
                                    >
                                        Complete Profile ✓
                                    </button>
                                )}
                            </div>
                        </div>
                    </div>
                )}

                {/* AI MODE */}
                {onboardingMode === 'AI' && (
                    <div className="flex gap-6 h-[600px] animate-slide-up">

                        {/* LEFT: Live Form Visualization */}
                        <div className="w-1/3 bg-gray-900/50 backdrop-blur rounded-xl border border-gray-700 p-6 overflow-y-auto">
                            <div className="flex items-center justify-between mb-4">
                                <h3 className="font-bold text-gray-300">Live Profile Status</h3>
                                <div className="text-xs px-2 py-1 bg-blue-900/30 text-blue-400 rounded border border-blue-800">
                                    Auto-Updating
                                </div>
                            </div>

                            <div className="space-y-4 text-sm">
                                <div className={`p-3 rounded border transition-all duration-500 ${formData.education_level ? 'bg-green-900/20 border-green-800' : 'bg-gray-800/50 border-gray-700'}`}>
                                    <div className="text-xs text-gray-500 mb-1">Education</div>
                                    <div className={formData.education_level ? 'text-white font-medium' : 'text-gray-600 italic'}>
                                        {formData.education_level || 'Pending...'}
                                        {formData.degree_major && ` in ${formData.degree_major}`}
                                        {formData.gpa && ` (GPA: ${formData.gpa})`}
                                    </div>
                                </div>

                                <div className={`p-3 rounded border transition-all duration-500 ${formData.target_degree ? 'bg-green-900/20 border-green-800' : 'bg-gray-800/50 border-gray-700'}`}>
                                    <div className="text-xs text-gray-500 mb-1">Goals</div>
                                    <div className={formData.target_degree ? 'text-white font-medium' : 'text-gray-600 italic'}>
                                        {formData.target_degree} in {formData.field_of_study || '...'}
                                    </div>
                                    {formData.preferred_countries?.length > 0 && (
                                        <div className="flex flex-wrap gap-1 mt-2">
                                            {(formData.preferred_countries || []).map(c => (
                                                <span key={c} className="text-[10px] px-1.5 py-0.5 bg-blue-500/20 text-blue-300 rounded">{c}</span>
                                            ))}
                                        </div>
                                    )}
                                </div>

                                <div className={`p-3 rounded border transition-all duration-500 ${formData.budget_max ? 'bg-green-900/20 border-green-800' : 'bg-gray-800/50 border-gray-700'}`}>
                                    <div className="text-xs text-gray-500 mb-1">Budget</div>
                                    <div className={formData.budget_max ? 'text-white font-medium' : 'text-gray-600 italic'}>
                                        {formData.budget_max ? `$${formData.budget_max}` : 'Pending...'}
                                    </div>
                                </div>

                                <div className={`p-3 rounded border transition-all duration-500 ${formData.ielts_score || formData.toefl_score ? 'bg-green-900/20 border-green-800' : 'bg-gray-800/50 border-gray-700'}`}>
                                    <div className="text-xs text-gray-500 mb-1">Tests</div>
                                    <div className="text-white">
                                        {formData.ielts_score && <div>IELTS: {formData.ielts_score}</div>}
                                        {formData.toefl_score && <div>TOEFL: {formData.toefl_score}</div>}
                                        {!formData.ielts_score && !formData.toefl_score && <span className="text-gray-600 italic">Pending...</span>}
                                    </div>
                                </div>

                                <button
                                    onClick={handleSubmit}
                                    disabled={!formData.budget_max || !formData.target_degree}
                                    className="w-full mt-4 py-3 bg-gradient-to-r from-green-600 to-emerald-600 hover:from-green-500 hover:to-emerald-500 text-white rounded-lg font-bold shadow-lg shadow-green-900/20 disabled:opacity-50 disabled:cursor-not-allowed transition-all"
                                >
                                    Complete Profile ✓
                                </button>
                            </div>
                        </div>

                        {/* RIGHT: Chat Interface */}
                        <div className="flex-1 flex flex-col bg-gray-900/30 backdrop-blur rounded-xl border border-gray-700 overflow-hidden">
                            {/* Messages */}
                            <div className="flex-1 overflow-y-auto p-6 space-y-4">
                                {messages.map((msg, idx) => (
                                    <div key={idx} className={`flex ${msg.role === 'user' ? 'justify-end' : 'justify-start'}`}>
                                        <div className={`relative max-w-[80%] p-4 rounded-lg ${msg.role === 'user'
                                            ? 'bg-blue-600 text-white'
                                            : 'bg-gray-800 border border-gray-700 text-gray-200'
                                            }`}>
                                            <p className="whitespace-pre-wrap">{msg.content}</p>

                                            {/* Play/Control Buttons for AI */}
                                            {msg.role === 'assistant' && (
                                                <div className="absolute -bottom-8 left-0 flex items-center gap-2">
                                                    {speakingMessageId === idx ? (
                                                        <>
                                                            <button
                                                                onClick={() => {
                                                                    if (paused) {
                                                                        window.speechSynthesis.resume();
                                                                        setPaused(false);
                                                                    } else {
                                                                        window.speechSynthesis.pause();
                                                                        setPaused(true);
                                                                    }
                                                                }}
                                                                className="flex items-center gap-1 text-xs px-2 py-1 rounded-full bg-blue-500/20 text-blue-300 hover:bg-blue-500/30 transition-colors border border-blue-500/30"
                                                            >
                                                                {paused ? (
                                                                    <>
                                                                        <svg xmlns="http://www.w3.org/2000/svg" className="w-3 h-3" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><polygon points="5 3 19 12 5 21 5 3"></polygon></svg>
                                                                        Resume
                                                                    </>
                                                                ) : (
                                                                    <>
                                                                        <svg xmlns="http://www.w3.org/2000/svg" className="w-3 h-3 animate-pulse" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><rect x="6" y="4" width="4" height="16"></rect><rect x="14" y="4" width="4" height="16"></rect></svg>
                                                                        Pause
                                                                    </>
                                                                )}
                                                            </button>

                                                            <button
                                                                onClick={() => handleSpeak(msg.content, idx)}
                                                                className="flex items-center gap-1 text-xs px-2 py-1 rounded-full bg-gray-700 text-gray-300 hover:bg-gray-600 transition-colors border border-gray-600"
                                                            >
                                                                <svg xmlns="http://www.w3.org/2000/svg" className="w-3 h-3" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M21 12a9 9 0 0 0-9-9 9.75 9.75 0 0 0-6.74 2.74L3 8"></path><path d="M3 3v5h5"></path><path d="M3 12a9 9 0 0 0 9 9 9.75 9 0 0 0 6.74-2.74L21 16"></path><path d="M16 21h5v-5"></path></svg>
                                                                Restart
                                                            </button>
                                                        </>
                                                    ) : (
                                                        <button
                                                            onClick={() => handleSpeak(msg.content, idx)}
                                                            className="flex items-center gap-1 text-xs text-purple-400 hover:text-purple-300 transition-colors"
                                                        >
                                                            <svg xmlns="http://www.w3.org/2000/svg" className="w-3 h-3" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                                                                <polygon points="11 5 6 9 2 9 2 15 6 15 11 19 11 5"></polygon>
                                                                <path d="M19.07 4.93a10 10 0 0 1 0 14.14M15.54 8.46a5 5 0 0 1 0 7.07"></path>
                                                            </svg>
                                                            Listen
                                                        </button>
                                                    )}
                                                </div>
                                            )}
                                        </div>
                                    </div>
                                ))}
                                <div ref={messagesEndRef} />
                            </div>

                            {/* Input Area */}
                            <div className="p-4 bg-gray-800/50 border-t border-gray-700 relative">
                                {/* Floating Options (Bot) */}
                                {(() => {
                                    const step = BOT_FLOW[currentStep];

                                    // Review mode buttons
                                    if (isReviewMode && !editingField) {
                                        return (
                                            <div className="mb-3 px-1 animate-slide-up">
                                                <div className="flex flex-wrap gap-2 justify-end">
                                                    <button
                                                        onClick={() => handleOptionClick('Complete', 'review')}
                                                        className="px-6 py-3 rounded-full text-sm font-medium transition-all shadow-lg bg-gradient-to-r from-green-600 to-emerald-600 text-white hover:from-green-500 hover:to-emerald-500"
                                                    >
                                                        ✓ Complete Profile
                                                    </button>
                                                    <button
                                                        onClick={() => handleOptionClick('Edit', 'review')}
                                                        className="px-6 py-3 rounded-full text-sm font-medium transition-all shadow-lg bg-gray-800/90 text-gray-300 border border-gray-600 hover:bg-gray-700 hover:text-white hover:border-gray-500"
                                                    >
                                                        ✏️ Edit
                                                    </button>
                                                </div>
                                            </div>
                                        );
                                    }

                                    // Step options
                                    if (step && step.options && step.question !== 'REVIEW') {
                                        const displayOpts = step.displayOptions || step.options;
                                        const actualOpts = step.options;

                                        return (
                                            <div className="mb-3 px-1 animate-slide-up">
                                                <div className="flex flex-wrap gap-2 justify-end">
                                                    {displayOpts.map((option, idx) => {
                                                        const isSelected = selectedMultiOptions.includes(actualOpts[idx] || option);
                                                        const actualValue = actualOpts[idx] || option;

                                                        return (
                                                            <button
                                                                key={actualValue}
                                                                onClick={() => handleOptionClick(actualValue, step.type)}
                                                                className={`px-4 py-2 rounded-full text-sm font-medium transition-all shadow-lg backdrop-blur-sm
                                                                    ${isSelected
                                                                        ? 'bg-gradient-to-r from-purple-600 to-blue-600 text-white shadow-purple-500/30'
                                                                        : 'bg-gray-800/90 text-gray-300 border border-gray-600 hover:bg-gray-700 hover:text-white hover:border-gray-500'
                                                                    }`}
                                                            >
                                                                {option} {isSelected && '✓'}
                                                            </button>
                                                        );
                                                    })}
                                                    {step.skipText && (
                                                        <button
                                                            onClick={() => handleBotSend(step.skipText)}
                                                            className="px-4 py-2 rounded-full text-sm font-medium transition-all shadow-lg bg-gray-700/80 text-gray-400 border border-gray-600 hover:bg-gray-600 hover:text-gray-300"
                                                        >
                                                            {step.skipText}
                                                        </button>
                                                    )}
                                                </div>
                                                {step.type === 'multi' && selectedMultiOptions.length > 0 && (
                                                    <div className="flex justify-end mt-2">
                                                        <button
                                                            onClick={handleMultiSelectSubmit}
                                                            className="px-4 py-2 bg-green-600 text-white rounded-lg text-sm font-bold shadow-lg hover:bg-green-500 transition-colors flex items-center gap-2"
                                                        >
                                                            Confirm Selection ({selectedMultiOptions.length}) →
                                                        </button>
                                                    </div>
                                                )}
                                            </div>
                                        );
                                    }
                                    return null;
                                })()}

                                {/* Live Transcript Overlay */}
                                {isListening && (interimTranscript || botInput) && (
                                    <div className="absolute bottom-full left-0 right-0 mb-2 px-4">
                                        <div className="bg-gradient-to-r from-purple-600/90 to-blue-600/90 backdrop-blur p-3 rounded-lg shadow-lg border border-purple-400/30 text-white">
                                            <p className="text-xs text-purple-200 mb-1">Recording...</p>
                                            <p>
                                                {botInput} <span className="text-purple-200 italic">{interimTranscript}</span>
                                            </p>
                                        </div>
                                    </div>
                                )}

                                <div className="flex gap-2">
                                    <button
                                        onClick={toggleVoiceInput}
                                        className={`p-3 rounded-lg transition-all ${isListening
                                            ? 'bg-red-500/20 text-red-400 border border-red-500/50 animate-pulse'
                                            : 'bg-gray-700 text-gray-400 hover:bg-gray-600 hover:text-white'
                                            }`}
                                        title="Voice Input"
                                    >
                                        {isListening ? (
                                            <svg xmlns="http://www.w3.org/2000/svg" className="w-5 h-5" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                                                <line x1="1" y1="1" x2="23" y2="23"></line>
                                                <path d="M9 9v3a3 3 0 0 0 5.12 2.12M15 9.34V4a3 3 0 0 0-5.94-.6"></path>
                                                <path d="M17 16.95A7 7 0 0 1 5 12v-2m14 0v2a7 7 0 0 1-.11 1.23"></path>
                                                <line x1="12" y1="19" x2="12" y2="23"></line>
                                                <line x1="8" y1="23" x2="16" y2="23"></line>
                                            </svg>
                                        ) : (
                                            <svg xmlns="http://www.w3.org/2000/svg" className="w-5 h-5" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                                                <path d="M12 1a3 3 0 0 0-3 3v8a3 3 0 0 0 6 0V4a3 3 0 0 0-3-3z"></path>
                                                <path d="M19 10v2a7 7 0 0 1-14 0v-2"></path>
                                                <line x1="12" y1="19" x2="12" y2="23"></line>
                                                <line x1="8" y1="23" x2="16" y2="23"></line>
                                            </svg>
                                        )}
                                    </button>

                                    <input
                                        type="text"
                                        value={botInput}
                                        onChange={(e) => setBotInput(e.target.value)}
                                        onKeyDown={(e) => e.key === 'Enter' && handleBotSend()}
                                        placeholder={(() => {
                                            const step = BOT_FLOW[currentStep];
                                            if (step?.placeholder) return step.placeholder;
                                            if (step?.type === 'text') return "Type your answer...";
                                            if (step?.type === 'number') return "Enter a number...";
                                            return "Type or use buttons above...";
                                        })()}
                                        className="flex-1 bg-gray-900 border border-gray-600 rounded-lg px-4 focus:outline-none focus:border-purple-500 transition-colors"
                                    />

                                    <button
                                        onClick={() => handleBotSend()}
                                        disabled={!botInput.trim()}
                                        className="px-6 bg-purple-600 hover:bg-purple-500 text-white rounded-lg font-medium transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
                                    >
                                        Send
                                    </button>
                                </div>
                            </div>
                        </div>
                    </div>
                )}
            </div>
        </div>
    );
}
