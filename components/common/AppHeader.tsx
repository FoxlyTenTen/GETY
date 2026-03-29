import React, { useState, useRef } from 'react';
import {
    View,
    Text,
    StyleSheet,
    TouchableOpacity,
    Image,
    Modal,
    Animated,
    TouchableWithoutFeedback,
    Dimensions,
    Alert,
} from 'react-native';
import Ionicons from '@expo/vector-icons/Ionicons';
import { router } from 'expo-router';
import { useAuth } from '@/context/AuthContext';

const SCREEN_WIDTH = Dimensions.get('window').width;
const DRAWER_WIDTH = SCREEN_WIDTH * 0.72;

type AppHeaderProps = {
    title: string;
};

export default function AppHeader({ title }: AppHeaderProps) {
    const { session, signOut } = useAuth();
    const isLoggedIn = !!session;
    const [drawerOpen, setDrawerOpen] = useState(false);
    const slideAnim = useRef(new Animated.Value(-DRAWER_WIDTH)).current;
    const fadeAnim = useRef(new Animated.Value(0)).current;

    const openDrawer = () => {
        setDrawerOpen(true);
        Animated.parallel([
            Animated.spring(slideAnim, {
                toValue: 0,
                useNativeDriver: true,
                damping: 20,
                stiffness: 160,
            }),
            Animated.timing(fadeAnim, {
                toValue: 1,
                duration: 220,
                useNativeDriver: true,
            }),
        ]).start();
    };

    const closeDrawer = (cb?: () => void) => {
        Animated.parallel([
            Animated.timing(slideAnim, {
                toValue: -DRAWER_WIDTH,
                duration: 200,
                useNativeDriver: true,
            }),
            Animated.timing(fadeAnim, {
                toValue: 0,
                duration: 200,
                useNativeDriver: true,
            }),
        ]).start(() => {
            setDrawerOpen(false);
            cb?.();
        });
    };

    const handleSignOut = () => {
        closeDrawer(() => {
            Alert.alert('Sign Out', 'Are you sure you want to sign out?', [
                { text: 'Cancel', style: 'cancel' },
                { text: 'Sign Out', style: 'destructive', onPress: signOut },
            ]);
        });
    };

    const handleSignIn = () => {
        closeDrawer(() => router.push('/auth/login' as any));
    };

    const handleRegister = () => {
        closeDrawer(() => router.push('/auth/register' as any));
    };

    return (
        <>
            <View style={styles.header}>
                {/* Hamburger */}
                <TouchableOpacity style={styles.menuButton} onPress={openDrawer} activeOpacity={0.7}>
                    <Ionicons name="menu-outline" size={28} color="#111827" />
                </TouchableOpacity>

                <Text style={styles.headerTitle}>{title}</Text>

                {isLoggedIn ? (
                    <TouchableOpacity style={styles.profileBtn} activeOpacity={0.8}>
                        <Image
                            source={require('../../assets/images/profile.avif')}
                            style={styles.profileImage}
                        />
                    </TouchableOpacity>
                ) : (
                    <TouchableOpacity
                        style={styles.signInBtn}
                        onPress={handleSignIn}
                        activeOpacity={0.85}
                    >
                        <Ionicons name="person-outline" size={14} color="#fff" />
                        <Text style={styles.signInText}>Sign In</Text>
                    </TouchableOpacity>
                )}
            </View>

            {/* ── Drawer Modal ── */}
            <Modal visible={drawerOpen} transparent animationType="none" statusBarTranslucent>
                {/* Backdrop */}
                <TouchableWithoutFeedback onPress={() => closeDrawer()}>
                    <Animated.View style={[styles.backdrop, { opacity: fadeAnim }]} />
                </TouchableWithoutFeedback>

                {/* Drawer panel */}
                <Animated.View style={[styles.drawer, { transform: [{ translateX: slideAnim }] }]}>
                    {/* Drawer Header */}
                    <View style={styles.drawerHeader}>
                        <View style={styles.drawerLogoCircle}>
                            <Ionicons name="leaf" size={22} color="#fff" />
                        </View>
                        <View>
                            <Text style={styles.drawerAppName}>LatexGuard</Text>
                            {isLoggedIn ? (
                                <Text style={styles.drawerEmail} numberOfLines={1}>
                                    {session?.user?.email}
                                </Text>
                            ) : (
                                <Text style={styles.drawerEmailGuest}>Guest</Text>
                            )}
                        </View>
                    </View>

                    {/* Divider */}
                    <View style={styles.divider} />

                    {/* Menu Items */}
                    <View style={styles.menuItems}>
                        <DrawerItem
                            icon="home-outline"
                            label="Home"
                            onPress={() => closeDrawer(() => router.push('/(tabs)' as any))}
                        />
                        <DrawerItem
                            icon="scan-outline"
                            label="Scan Leaf"
                            onPress={() => closeDrawer(() => router.push('/pages/scanpage' as any))}
                        />
                        <DrawerItem
                            icon="time-outline"
                            label="History"
                            onPress={() => closeDrawer(() => router.push('/(tabs)/history' as any))}
                        />
                        <DrawerItem
                            icon="notifications-outline"
                            label="Reminders"
                            onPress={() => closeDrawer(() => router.push('/(tabs)/reminder' as any))}
                        />
                        <DrawerItem
                            icon="settings-outline"
                            label="Settings"
                            onPress={() => closeDrawer()}
                        />
                    </View>

                    {/* Divider */}
                    <View style={styles.divider} />

                    {/* Auth Section */}
                    <View style={styles.authSection}>
                        {isLoggedIn ? (
                            <DrawerItem
                                icon="log-out-outline"
                                label="Sign Out"
                                onPress={handleSignOut}
                                danger
                            />
                        ) : (
                            <>
                                <DrawerItem
                                    icon="log-in-outline"
                                    label="Sign In"
                                    onPress={handleSignIn}
                                    highlight
                                />
                                <DrawerItem
                                    icon="person-add-outline"
                                    label="Create Account"
                                    onPress={handleRegister}
                                />
                            </>
                        )}
                    </View>

                    {/* Footer */}
                    <View style={styles.drawerFooter}>
                        <Text style={styles.drawerFooterText}>LatexGuard v1.0 · FYP 2025</Text>
                    </View>
                </Animated.View>
            </Modal>
        </>
    );
}

// ── Reusable Drawer Item ──────────────────────────────────────────────────────
function DrawerItem({
    icon, label, onPress, danger = false, highlight = false,
}: {
    icon: string;
    label: string;
    onPress: () => void;
    danger?: boolean;
    highlight?: boolean;
}) {
    const color = danger ? '#ef4444' : highlight ? '#1e5b43' : '#374151';
    const bg = highlight ? '#e8f5e9' : 'transparent';
    return (
        <TouchableOpacity
            style={[styles.drawerItem, { backgroundColor: bg }]}
            onPress={onPress}
            activeOpacity={0.7}
        >
            <Ionicons name={icon as any} size={20} color={color} />
            <Text style={[styles.drawerItemText, { color }]}>{label}</Text>
        </TouchableOpacity>
    );
}

// ── Styles ────────────────────────────────────────────────────────────────────
const styles = StyleSheet.create({
    // Header bar
    header: {
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'space-between',
        paddingHorizontal: 20,
        paddingVertical: 15,
        backgroundColor: '#fbfdfb',
    },
    menuButton: { padding: 5 },
    headerTitle: { fontSize: 22, fontWeight: '700', color: '#235e45' },

    // Profile avatar (logged in)
    profileBtn: {
        width: 40, height: 40, borderRadius: 20,
        overflow: 'hidden', borderWidth: 2, borderColor: '#2eb86a',
    },
    profileImage: { width: '100%', height: '100%' },

    // Sign In pill (logged out)
    signInBtn: {
        flexDirection: 'row', alignItems: 'center',
        backgroundColor: '#1e5b43',
        paddingHorizontal: 14, paddingVertical: 8,
        borderRadius: 20, gap: 6,
        shadowColor: '#1e5b43',
        shadowOffset: { width: 0, height: 3 },
        shadowOpacity: 0.25, shadowRadius: 6, elevation: 4,
    },
    signInText: { fontSize: 13, fontWeight: '700', color: '#fff' },

    // Backdrop
    backdrop: {
        ...StyleSheet.absoluteFillObject,
        backgroundColor: 'rgba(0,0,0,0.45)',
    },

    // Drawer panel
    drawer: {
        position: 'absolute',
        top: 0, bottom: 0, left: 0,
        width: DRAWER_WIDTH,
        backgroundColor: '#fff',
        shadowColor: '#000',
        shadowOffset: { width: 4, height: 0 },
        shadowOpacity: 0.12,
        shadowRadius: 20,
        elevation: 20,
        paddingTop: 56,
    },
    drawerHeader: {
        flexDirection: 'row', alignItems: 'center', gap: 14,
        paddingHorizontal: 24, paddingBottom: 24,
    },
    drawerLogoCircle: {
        width: 44, height: 44, borderRadius: 22,
        backgroundColor: '#1e5b43',
        alignItems: 'center', justifyContent: 'center',
    },
    drawerAppName: { fontSize: 18, fontWeight: '800', color: '#111827' },
    drawerEmail: { fontSize: 12, color: '#6b7280', marginTop: 2, maxWidth: 160 },
    drawerEmailGuest: { fontSize: 12, color: '#9ca3af', marginTop: 2 },

    divider: { height: 1, backgroundColor: '#f3f4f6', marginHorizontal: 24, marginVertical: 8 },

    menuItems: { paddingHorizontal: 12, paddingTop: 4 },
    authSection: { paddingHorizontal: 12, paddingTop: 4 },

    drawerItem: {
        flexDirection: 'row', alignItems: 'center', gap: 14,
        paddingHorizontal: 16, paddingVertical: 14,
        borderRadius: 16, marginBottom: 2,
    },
    drawerItemText: { fontSize: 15, fontWeight: '600' },

    drawerFooter: {
        position: 'absolute', bottom: 32, left: 0, right: 0,
        alignItems: 'center',
    },
    drawerFooterText: { fontSize: 11, color: '#d1d5db' },
});
