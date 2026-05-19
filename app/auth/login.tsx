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

export default function LoginPage() {
    const [email, setEmail] = useState('');
    const [password, setPassword] = useState('');
    const [showPassword, setShowPassword] = useState(false);
    const [loading, setLoading] = useState(false);
    const [emailError, setEmailError] = useState('');
    const [passwordError, setPasswordError] = useState('');

    const validate = () => {
        let valid = true;
        setEmailError('');
        setPasswordError('');
        if (!email.trim()) { setEmailError('Email is required.'); valid = false; }
        else if (!/\S+@\S+\.\S+/.test(email)) { setEmailError('Enter a valid email.'); valid = false; }
        if (!password) { setPasswordError('Password is required.'); valid = false; }
        return valid;
    };

    const handleLogin = async () => {
        if (!validate()) return;
        setLoading(true);
        const { error } = await supabase.auth.signInWithPassword({
            email: email.trim(),
            password,
        });
        setLoading(false);
        if (error) {
            Alert.alert('Login Failed', error.message);
        } else {
            router.replace('/(tabs)');
        }
    };

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
                            Securing the harvest of the{'\n'}rubber estates with intelligent insights.
                        </Text>
                    </View>

                    {/* ── Card ── */}
                    <View style={styles.card}>
                        <Text style={styles.cardTitle}>Welcome back</Text>

                        {/* Email */}
                        <Text style={styles.label}>Email Address</Text>
                        <View style={[styles.inputBox, !!emailError && styles.inputError]}>
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
                        {!!emailError && <Text style={styles.errorText}>{emailError}</Text>}

                        {/* Password */}
                        <Text style={[styles.label, { marginTop: 18 }]}>Password</Text>
                        <View style={[styles.inputBox, !!passwordError && styles.inputError]}>
                            <Ionicons name="lock-closed-outline" size={18} color="#9ca3af" />
                            <TextInput
                                style={styles.input}
                                placeholder="••••••••"
                                placeholderTextColor="#c4c4c4"
                                value={password}
                                onChangeText={setPassword}
                                secureTextEntry={!showPassword}
                                returnKeyType="done"
                                onSubmitEditing={handleLogin}
                            />
                            <TouchableOpacity onPress={() => setShowPassword(p => !p)} hitSlop={10}>
                                <Ionicons
                                    name={showPassword ? 'eye-outline' : 'eye-off-outline'}
                                    size={18}
                                    color="#9ca3af"
                                />
                            </TouchableOpacity>
                        </View>
                        {!!passwordError && <Text style={styles.errorText}>{passwordError}</Text>}

                        {/* Forgot Password */}
                        <TouchableOpacity style={styles.forgotRow} activeOpacity={0.7}>
                            <Text style={styles.forgotText}>Forgot password?</Text>
                        </TouchableOpacity>

                        {/* Sign In Button */}
                        <TouchableOpacity
                            style={[styles.signInBtn, loading && { opacity: 0.7 }]}
                            activeOpacity={0.88}
                            onPress={handleLogin}
                            disabled={loading}
                        >
                            {loading ? (
                                <ActivityIndicator color="#fff" />
                            ) : (
                                <>
                                    <Text style={styles.signInText}>Sign In</Text>
                                    <Ionicons name="arrow-forward" size={20} color="#fff" />
                                </>
                            )}
                        </TouchableOpacity>
                    </View>

                    {/* ── Decorative leaf ── */}
                    <View style={styles.leafDecor}>
                        <View style={styles.leafCircle}>
                            <Ionicons name="leaf" size={100} color="#c6e8d4" />
                        </View>
                    </View>

                    {/* ── Register Link ── */}
                    <View style={styles.registerRow}>
                        <Text style={styles.registerPrompt}>New to the estate? </Text>
                        <TouchableOpacity onPress={() => router.push('/auth/register' as any)} activeOpacity={0.7}>
                            <Text style={styles.registerLink}>Create an account</Text>
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
    logoSection: { alignItems: 'center', marginBottom: 36 },
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
        marginBottom: 20,
    },
    cardTitle: { fontSize: 24, fontWeight: '800', color: '#111827', marginBottom: 24 },
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
    forgotRow: { alignSelf: 'flex-end', marginTop: 10, marginBottom: 24 },
    forgotText: { fontSize: 14, fontWeight: '700', color: '#1e5b43' },

    // Buttons
    signInBtn: {
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
    signInText: { color: '#fff', fontSize: 17, fontWeight: '700' },

    // Leaf decor
    leafDecor: { alignItems: 'flex-end', marginTop: -30, marginRight: -24, overflow: 'hidden' },
    leafCircle: {
        width: 180, height: 180, borderRadius: 90,
        backgroundColor: '#e8f5e9',
        alignItems: 'center', justifyContent: 'center',
        opacity: 0.7,
    },

    // Register
    registerRow: { flexDirection: 'row', justifyContent: 'center', alignItems: 'center', marginTop: 8 },
    registerPrompt: { fontSize: 14, color: '#6b7280' },
    registerLink: { fontSize: 14, fontWeight: '800', color: '#1e5b43' },
});
