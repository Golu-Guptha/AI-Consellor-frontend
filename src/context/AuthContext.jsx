import { createContext, useContext, useEffect, useState, useCallback } from 'react';
import { supabase } from '../services/supabase';

const AuthContext = createContext({});

export const useAuth = () => {
    const context = useContext(AuthContext);
    if (!context) {
        throw new Error('useAuth must be used within AuthProvider');
    }
    return context;
};

export const AuthProvider = ({ children }) => {
    const [user, setUser] = useState(null);
    const [session, setSession] = useState(null);
    const [loading, setLoading] = useState(true);

    useEffect(() => {
        // Get initial session
        supabase.auth.getSession().then(({ data: { session } }) => {
            setSession(session);
            setUser(session?.user ?? null);

            // Save token to localStorage for API calls
            if (session?.access_token) {
                localStorage.setItem('supabase.auth.token', session.access_token);
            }

            setLoading(false);
        });

        // Listen for auth changes
        const { data: { subscription } } = supabase.auth.onAuthStateChange(async (event, session) => {
            setSession(session);
            setUser(session?.user ?? null);

            if (event === 'PASSWORD_RECOVERY') {
                // Determine base URL to handle production/dev differences
                const baseUrl = window.location.origin;
                window.location.href = `${baseUrl}/update-password`;
                return;
            }

            if (session?.access_token) {
                localStorage.setItem('supabase.auth.token', session.access_token);
            } else {
                localStorage.removeItem('supabase.auth.token');
            }
        });

        return () => subscription.unsubscribe();
    }, []);

    const signUp = async (email, password, name) => {
        const { data, error } = await supabase.auth.signUp({
            email,
            password,
            options: {
                data: { name }
            }
        });

        if (error) throw error;

        // Create user record in database
        if (data.user) {
            const { error: dbError } = await supabase
                .from('users')
                .insert({
                    email: data.user.email,
                    supabase_user_id: data.user.id,
                    name: name
                });

            if (dbError) console.error('Failed to create user record:', dbError);
        }

        return data;
    };

    const signIn = async (email, password) => {
        const { data, error } = await supabase.auth.signInWithPassword({
            email,
            password
        });

        if (error) throw error;
        return data;
    };

    // Handle the Google ID token credential from Google Identity Services
    const handleGoogleCredential = useCallback(async (credential) => {
        const { data, error } = await supabase.auth.signInWithIdToken({
            provider: 'google',
            token: credential,
        });

        if (error) throw error;
        return data;
    }, []);

    // Initialize Google Identity Services button on a given DOM element
    const initGoogleButton = useCallback((buttonElement) => {
        if (!buttonElement || !window.google?.accounts?.id) return;

        const googleClientId = import.meta.env.VITE_GOOGLE_CLIENT_ID;
        if (!googleClientId) {
            console.error('VITE_GOOGLE_CLIENT_ID not configured');
            return;
        }

        window.google.accounts.id.initialize({
            client_id: googleClientId,
            callback: async (response) => {
                // This will be handled by the component via handleGoogleCredential
                const event = new CustomEvent('google-credential', { detail: response.credential });
                window.dispatchEvent(event);
            },
            auto_select: false,
            use_fedcm_for_prompt: false, // Disable FedCM to avoid issues
        });

        window.google.accounts.id.renderButton(buttonElement, {
            type: 'standard',
            theme: 'filled_black',
            size: 'large',
            text: 'continue_with',
            shape: 'pill',
            width: buttonElement.offsetWidth || 380,
            locale: 'en',
        });
    }, []);

    const signOut = async () => {
        const { error } = await supabase.auth.signOut();
        if (error) throw error;
        localStorage.removeItem('supabase.auth.token');
    };

    const resetPassword = async (email) => {
        const { data, error } = await supabase.auth.resetPasswordForEmail(email, {
            redirectTo: `${window.location.origin}/update-password`,
        });
        if (error) throw error;
        return data;
    };

    const updatePassword = async (newPassword) => {
        const { data, error } = await supabase.auth.updateUser({
            password: newPassword
        });
        if (error) throw error;
        return data;
    };

    const value = {
        user,
        session,
        loading,
        signUp,
        signIn,
        handleGoogleCredential,
        initGoogleButton,
        signOut,
        resetPassword,
        updatePassword
    };

    return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
};
