import React from 'react';
import { View, Text, StyleSheet, TouchableOpacity, Image } from 'react-native';
import Ionicons from '@expo/vector-icons/Ionicons';

export default function Header() {
    return (
        <View style={styles.header}>
            <TouchableOpacity style={styles.menuButton}>
                <Ionicons name="menu-outline" size={28} color="#111827" />
            </TouchableOpacity>
            
            <Text style={styles.headerTitle}>Reminders</Text>
            
            <TouchableOpacity style={styles.profileBtn}>
                <Image 
                    source={require('../../assets/images/profile.avif')} 
                    style={styles.profileImage} 
                />
            </TouchableOpacity>
        </View>
    );
}

const styles = StyleSheet.create({
    header: {
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'space-between',
        paddingHorizontal: 20,
        paddingVertical: 15,
        backgroundColor: '#fbfdfb',
    },
    menuButton: {
        padding: 5,
    },
    headerTitle: {
        fontSize: 22,
        fontWeight: '700',
        color: '#235e45',
    },
    profileBtn: {
        width: 40,
        height: 40,
        borderRadius: 20,
        overflow: 'hidden',
        borderWidth: 2,
        borderColor: '#2eb86a',
    },
    profileImage: {
        width: '100%',
        height: '100%',
    },
});
