import React from 'react';
import { View, Text, StyleSheet, Image, TouchableOpacity, Dimensions } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useRouter } from 'expo-router';
import { StatusBar } from 'expo-status-bar';
import { Ionicons } from '@expo/vector-icons';
import { LinearGradient } from 'expo-linear-gradient';

const { width } = Dimensions.get('window');

export default function WelcomeScreen() {
  const router = useRouter();

  return (
    <View style={styles.container}>
      <StatusBar style="dark" />

      <View style={styles.logoContainer}>
        <Image
          source={require('../assets/images/logo.png')}
          style={styles.logoImage}
        />
      </View>
      <View style={styles.content}>
        {/* Illustration */}
        <View style={styles.imageContainer}>
          <Image
            source={require('../assets/images/welcome.png')}
            style={styles.illustration}
            resizeMode="contain"
            fadeDuration={0}
          />
        </View>

        {/* Text Section */}
        <View style={styles.textContainer}>
          <Text style={styles.headline}>This works! Don't worry</Text>
          <Text style={styles.subtext}>Always take control of your finances</Text>
        </View>

        {/* Button */}
        <TouchableOpacity
          style={styles.button}
          onPress={() => router.push('/login')}
          activeOpacity={0.8}
        >
          <Text style={styles.buttonText}>Get Started</Text>
        </TouchableOpacity>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#FFFFFF',
    paddingTop: 60,
    paddingHorizontal: 24,
    paddingBottom: 40,

  },
  header: {
    paddingHorizontal: 24,
    paddingTop: 10,
    flexDirection: 'row',
    justifyContent: 'flex-end',
    zIndex: 10,
  },
  signInBtn: {
    width: 44,
    height: 44,
    borderRadius: 22,
    backgroundColor: '#F8FAFC',
    justifyContent: 'center',
    alignItems: 'center',
    borderWidth: 1,
    borderColor: '#F1F5F9',
  },
  content: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingBottom: 60,
    paddingHorizontal: 30,
  },
  imageContainer: {
    flex: 1,
    justifyContent: 'center',
    width: '100%',
    alignItems: 'center',
  },
  illustration: {
    width: width * 0.9,
    height: width * 0.9,
  },
  textContainer: {
    width: '100%',
    alignItems: 'center',
    marginBottom: 40,
  },
  headline: {
    fontSize: 28,
    fontWeight: '800',
    color: '#000000',
    textAlign: 'center',
    lineHeight: 36,
    marginBottom: 8,
    marginTop: 20,
  },
  subtext: {
    fontSize: 16,
    color: '#64748B',
    textAlign: 'center',
    lineHeight: 24,
    paddingHorizontal: 10,
  },
  button: {
    width: '100%',
    height: 64,
    backgroundColor: '#ACEF3C', // Vibrant lime green from the reference image
    borderRadius: 20,
    justifyContent: 'center',
    alignItems: 'center',
    shadowColor: '#ACEF3C',
    shadowOffset: { width: 0, height: 8 },
    shadowOpacity: 0.3,
    shadowRadius: 15,
    elevation: 8,
  },
  buttonText: {
    fontSize: 18,
    fontWeight: '700',
    color: '#000000',
  },
  logoContainer: {
    position: 'absolute',
    top: 70,
    left: 20,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    zIndex: 10,
  },
  logoImage: {
    width: 80, // Significantly increased size
    height: 120,
    resizeMode: 'cover',
  },
  appName: {
    fontSize: 22,
    fontWeight: '800',
    color: '#0F172A',
  },
});
