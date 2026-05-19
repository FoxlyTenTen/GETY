import React, { useState } from 'react';
import {
    View,
    Text,
    StyleSheet,
    TextInput,
    TouchableOpacity,
    KeyboardAvoidingView,
    Platform,
    ActivityIndicator,
    ScrollView,
    Alert,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { StatusBar } from 'expo-status-bar';
import { router } from 'expo-router';
import Ionicons from '@expo/vector-icons/Ionicons';
import { supabase } from '@/lib/supabase';

export default function RegisterPage() {
    const [fullName, setFullName] = useState('');
    const [email, setEmail] = useState('');
    const [password, setPassword] = useState('');
    const [confirmPassword, setConfirmPassword] = useState('');
    const [showPassword, setShowPassword] = useState(false);
    const [showConfirm, setShowConfirm] = useState(false);
    const [loading, setLoading] = useState(false);
    const [errors, setErrors] = useState<Record<string, string>>({});

    const validate = () => {
        const e: Record<string, string> = {};
        if (!fullName.trim()) e.fullName = 'Full name is required.';
        if (!email.trim()) e.email = 'Email is required.';
        else if (!/\S+@\S+\.\S+/.test(email)) e.email = 'Enter a valid email.';
        if (!password) e.password = 'Password is required.';
        else if (password.length < 6) e.password = 'Password must be at least 6 characters.';
        if (!confirmPassword) e.confirmPassword = 'Please confirm your password.';
        else if (password !== confirmPassword) e.confirmPassword = 'Passwords do not match.';
        setErrors(e);
        return Object.keys(e).length === 0;
    };

    const handleRegister = async () => {
        if (!validate()) return;
        setLoading(true);

        // 1. Create auth user
        const { data, error } = await supabase.auth.signUp({
            email: email.trim(),
            password,
            options: {
                data: { full_name: fullName.trim() }, // stored in auth.users metadata
            },
        });

        if (error) {
            setLoading(false);
            Alert.alert('Registration Failed', error.message);
            return;
        }

        // 2. Insert into public users table
        if (data.user) {
            await supabase.from('users').insert({
                id: data.user.id,
                full_name: fullName.trim(),
                email: email.trim(),
            });
        }

        setLoading(false);
        // Email confirmation is OFF — session is live immediately, go straight to app
        router.replace('/(tabs)' as any);
    };

    const field = (key: string) => ({
        hasError: !!errors[key],
        errorText: errors[key],
    });

    return (
        <SafeAreaView style={styles.container}>
            <StatusBar style="dark" />
            <KeyboardAvoidingView
                behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
                style={styles.kav}
            >
                <ScrollView
                    contentContainerStyle={styles.scroll}
                    showsVerticalScrollIndicator={false}
                    keyboardShouldPersistTaps="handled"
                >
                    {/* ── Logo ── */}
                    <View style={styles.logoSection}>
                        <View style={styles.logoCircle}>
                            <Ionicons name="leaf" size={36} color="#fff" />
                        </View>
                        <Text style={styles.appName}>GETY</Text>
                        <Text style={styles.tagline}>
                            Create your estate account{'\n'}and start monitoring today.
                        </Text>
                    </View>

                    {/* ── Card ── */}
                    <View style={styles.card}>
                        <Text style={styles.cardTitle}>Create Account</Text>
                        <Text style={styles.cardSubtitle}>Join the smart estate network</Text>

                        {/* Full Name */}
                        <Text style={styles.label}>Full Name</Text>
                        <View style={[styles.inputBox, field('fullName').hasError && styles.inputError]}>
                            <Ionicons name="person-outline" size={18} color="#9ca3af" />
                            <TextInput
                                style={styles.input}
                                placeholder="e.g. Adli Mohd"
                                placeholderTextColor="#c4c4c4"
                                value={fullName}
                                onChangeText={setFullName}
                                autoCapitalize="words"
                                returnKeyType="next"
                            />
                        </View>
                        {field('fullName').hasError && <Text style={styles.errorText}>{field('fullName').errorText}</Text>}

                        {/* Email */}
                        <Text style={[styles.label, { marginTop: 18 }]}>Email Address</Text>
                        <View style={[styles.inputBox, field('email').hasError && styles.inputError]}>
                            <Ionicons name="mail-outline" size={18} color="#9ca3af" />
                            <TextInput
                                style={styles.input}
                                placeholder="farmer@estate.com"
                                placeholderTextColor="#c4c4c4"
                                value={email}
                                onChangeText={setEmail}
                                autoCapitalize="none"
                                keyboardType="email-address"
                                returnKeyType="next"
                            />
                        </View>
                        {field('email').hasError && <Text style={styles.errorText}>{field('email').errorText}</Text>}

                        {/* Password */}
                        <Text style={[styles.label, { marginTop: 18 }]}>Password</Text>
                        <View style={[styles.inputBox, field('password').hasError && styles.inputError]}>
                            <Ionicons name="lock-closed-outline" size={18} color="#9ca3af" />
                            <TextInput
                                style={styles.input}
                                placeholder="Min. 6 characters"
                                placeholderTextColor="#c4c4c4"
                                value={password}
                                onChangeText={setPassword}
                                secureTextEntry={!showPassword}
                                returnKeyType="next"
                            />
                            <TouchableOpacity onPress={() => setShowPassword(p => !p)} hitSlop={10}>
                                <Ionicons name={showPassword ? 'eye-outline' : 'eye-off-outline'} size={18} color="#9ca3af" />
                            </TouchableOpacity>
                        </View>
                        {field('password').hasError && <Text style={styles.errorText}>{field('password').errorText}</Text>}

                        {/* Confirm Password */}
                        <Text style={[styles.label, { marginTop: 18 }]}>Confirm Password</Text>
                        <View style={[styles.inputBox, field('confirmPassword').hasError && styles.inputError]}>
                            <Ionicons name="shield-checkmark-outline" size={18} color="#9ca3af" />
                            <TextInput
                                style={styles.input}
                                placeholder="Re-enter your password"
                                placeholderTextColor="#c4c4c4"
                                value={confirmPassword}
                                onChangeText={setConfirmPassword}
                                secureTextEntry={!showConfirm}
                                returnKeyType="done"
                                onSubmitEditing={handleRegister}
                            />
                            <TouchableOpacity onPress={() => setShowConfirm(p => !p)} hitSlop={10}>
                                <Ionicons name={showConfirm ? 'eye-outline' : 'eye-off-outline'} size={18} color="#9ca3af" />
                            </TouchableOpacity>
                        </View>
                        {field('confirmPassword').hasError && <Text style={styles.errorText}>{field('confirmPassword').errorText}</Text>}

                        {/* Password strength hint */}
                        <View style={styles.hintRow}>
                            <Ionicons name="information-circle-outline" size={13} color="#9ca3af" />
                            <Text style={styles.hintText}>Use at least 6 characters with a mix of letters and numbers</Text>
                        </View>

                        {/* Register Button */}
                        <TouchableOpacity
                            style={[styles.registerBtn, loading && { opacity: 0.7 }]}
                            activeOpacity={0.88}
                            onPress={handleRegister}
                            disabled={loading}
                        >
                            {loading ? (
                                <ActivityIndicator color="#fff" />
                            ) : (
                                <>
                                    <Text style={styles.registerBtnText}>Create Account</Text>
                                    <Ionicons name="arrow-forward" size={20} color="#fff" />
                                </>
                            )}
                        </TouchableOpacity>
                    </View>

                    {/* ── Back to Login ── */}
                    <View style={styles.loginRow}>
                        <Text style={styles.loginPrompt}>Already have an account? </Text>
                        <TouchableOpacity onPress={() => router.replace('/auth/login' as any)} activeOpacity={0.7}>
                            <Text style={styles.loginLink}>Sign In</Text>
                        </TouchableOpacity>
                    </View>
                </ScrollView>
            </KeyboardAvoidingView>
        </SafeAreaView>
    );
}

const styles = StyleSheet.create({
    container: { flex: 1, backgroundColor: '#f5f7f5' },
    kav: { flex: 1 },
    scroll: { flexGrow: 1, paddingHorizontal: 24, paddingTop: 20, paddingBottom: 40 },

    // Logo
    logoSection: { alignItems: 'center', marginBottom: 32 },
    logoCircle: {
        width: 80, height: 80, borderRadius: 40,
        backgroundColor: '#1e5b43',
        alignItems: 'center', justifyContent: 'center',
        marginBottom: 16,
        shadowColor: '#1e5b43',
        shadowOffset: { width: 0, height: 8 },
        shadowOpacity: 0.3,
        shadowRadius: 16,
        elevation: 8,
    },
    appName: { fontSize: 30, fontWeight: '800', color: '#1a1a1a', marginBottom: 10 },
    tagline: { fontSize: 15, color: '#6b7280', textAlign: 'center', lineHeight: 22 },

    // Card
    card: {
        backgroundColor: '#fff',
        borderRadius: 28,
        padding: 28,
        shadowColor: '#000',
        shadowOffset: { width: 0, height: 8 },
        shadowOpacity: 0.06,
        shadowRadius: 20,
        elevation: 4,
        marginBottom: 24,
    },
    cardTitle: { fontSize: 24, fontWeight: '800', color: '#111827', marginBottom: 6 },
    cardSubtitle: { fontSize: 14, color: '#9ca3af', marginBottom: 24 },
    label: { fontSize: 13, fontWeight: '700', color: '#374151', marginBottom: 8 },
    inputBox: {
        flexDirection: 'row',
        alignItems: 'center',
        backgroundColor: '#f9fafb',
        borderRadius: 16,
        paddingHorizontal: 16,
        paddingVertical: 14,
        gap: 10,
        borderWidth: 1.5,
        borderColor: '#e5e7eb',
    },
    inputError: { borderColor: '#ef4444' },
    input: { flex: 1, fontSize: 15, color: '#111827' },
    errorText: { fontSize: 12, color: '#ef4444', marginTop: 6, marginLeft: 4 },
    hintRow: { flexDirection: 'row', alignItems: 'flex-start', gap: 6, marginTop: 12, marginBottom: 24 },
    hintText: { fontSize: 12, color: '#9ca3af', flex: 1, lineHeight: 18 },

    // Button
    registerBtn: {
        backgroundColor: '#1e5b43',
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'center',
        paddingVertical: 18,
        borderRadius: 30,
        gap: 10,
        shadowColor: '#1e5b43',
        shadowOffset: { width: 0, height: 6 },
        shadowOpacity: 0.28,
        shadowRadius: 12,
        elevation: 6,
    },
    registerBtnText: { color: '#fff', fontSize: 17, fontWeight: '700' },

    // Login link
    loginRow: { flexDirection: 'row', justifyContent: 'center', alignItems: 'center' },
    loginPrompt: { fontSize: 14, color: '#6b7280' },
    loginLink: { fontSize: 14, fontWeight: '800', color: '#1e5b43' },
});
