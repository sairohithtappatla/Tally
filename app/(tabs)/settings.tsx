import React, { useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  Image,
  TextInput,
  ScrollView,
  Dimensions,
  Modal,
  KeyboardAvoidingView,
  Platform,
  Pressable,
} from 'react-native';
import { Ionicons, Feather } from '@expo/vector-icons';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { LinearGradient } from 'expo-linear-gradient';
import { router } from 'expo-router';
import * as ImagePicker from 'expo-image-picker';
import { Alert } from 'react-native';

const { width: SCREEN_WIDTH } = Dimensions.get('window');

// Placeholder image if user hasn't uploaded any
const DEFAULT_AVATAR = 'https://ui-avatars.com/api/?name=User&background=6366F1&color=fff&size=128';

export default function SettingsScreen() {
  const insets = useSafeAreaInsets();

  // -- User State --
  const [name, setName] = useState('Sai Rohith');
  const [profileImage, setProfileImage] = useState(DEFAULT_AVATAR);
  const [isEditing, setIsEditing] = useState(false);
  const [tempName, setTempName] = useState(name);

  // -- UI State --
  const [isLogoutModalVisible, setLogoutModalVisible] = useState(false);
  const [isNameConfirmVisible, setNameConfirmVisible] = useState(false);
  const [isImageModalVisible, setImageModalVisible] = useState(false);
  const [isSuccessToastVisible, setSuccessToastVisible] = useState(false);
  const [isAboutModalVisible, setAboutModalVisible] = useState(false);
  const [toastMessage, setToastMessage] = useState('');

  const showToast = (msg: string) => {
    setToastMessage(msg);
    setSuccessToastVisible(true);
    setTimeout(() => setSuccessToastVisible(false), 3000);
  };

  const handleUpdateNamePress = () => {
    if (tempName.trim() === name) {
      setIsEditing(false);
      return;
    }
    setNameConfirmVisible(true);
  };

  const confirmNameUpdate = () => {
    setName(tempName.trim());
    setIsEditing(false);
    setNameConfirmVisible(false);
    showToast('Name updated successfully');
  };

  const pickImage = async () => {
    try {
      const { status } = await ImagePicker.requestMediaLibraryPermissionsAsync();

      if (status !== 'granted') {
        Alert.alert('Permission Denied', 'We need camera roll permissions to change your profile picture.');
        return;
      }

      const result = await ImagePicker.launchImageLibraryAsync({
        mediaTypes: ['images'],
        allowsEditing: false,
        quality: 0.8,
      });

      if (!result.canceled && result.assets && result.assets.length > 0) {
        setProfileImage(result.assets[0].uri);
        setImageModalVisible(false);
        showToast('Profile image updated');
      }
    } catch (error) {
      Alert.alert('Error', 'An error occurred while picking the image.');
      console.error(error);
    }
  };

  const deleteImage = () => {
    setProfileImage(DEFAULT_AVATAR);
    setImageModalVisible(false);
    showToast('Profile image removed');
  };

  return (
    <View style={[styles.container, { paddingTop: insets.top }]}>
      <ScrollView contentContainerStyle={styles.scrollContent}>
        {/* Header */}
        <View style={styles.header}>
          <Text style={styles.headerTitle}>Settings</Text>
          <TouchableOpacity style={styles.notificationBtn}>
            <Ionicons name="notifications-outline" size={24} color="#0F172A" />
          </TouchableOpacity>
        </View>

        {/* Profile Card */}
        <View style={styles.profileSection}>
          <View style={styles.profileCard}>
            <View style={styles.avatarContainer}>
              <Image source={{ uri: profileImage }} style={styles.avatar} />
              <TouchableOpacity
                style={styles.editImageBadge}
                onPress={() => setImageModalVisible(true)}
              >
                <Ionicons name="camera" size={16} color="#FFF" />
              </TouchableOpacity>
            </View>
            <View style={styles.profileInfo}>
              {!isEditing ? (
                <>
                  <Text style={styles.userName}>{name}</Text>
                  <TouchableOpacity onPress={() => { setTempName(name); setIsEditing(true); }}>
                    <Text style={styles.editProfileText}>Edit profile name</Text>
                  </TouchableOpacity>
                </>
              ) : (
                <View style={styles.editNameContainer}>
                  <TextInput
                    style={styles.nameInput}
                    value={tempName}
                    onChangeText={setTempName}
                    autoFocus
                  />
                  <View style={styles.editActions}>
                    <TouchableOpacity onPress={() => setIsEditing(false)} style={styles.cancelBtn}>
                      <Ionicons name="close" size={20} color="#64748B" />
                    </TouchableOpacity>
                    <TouchableOpacity onPress={handleUpdateNamePress} style={styles.confirmBtn}>
                      <Ionicons name="checkmark" size={20} color="#6366F1" />
                    </TouchableOpacity>
                  </View>
                </View>
              )}
            </View>
          </View>
        </View>

        {/* Settings Groups */}
        <View style={styles.menuSection}>
          <Text style={styles.menuLabel}>Preferences</Text>
          <TouchableOpacity
            style={styles.menuItem}
            onPress={() => router.push('/accounts')}
          >
            <View style={[styles.iconBox, { backgroundColor: '#EEF2FF' }]}>
              <Ionicons name="wallet-outline" size={20} color="#6366F1" />
            </View>
            <Text style={styles.menuItemText}>
              Account linked
            </Text>
            <Ionicons name="chevron-forward" size={18} color="#CBD5E1" />
          </TouchableOpacity>
        </View>

        <View style={styles.menuSection}>
          <Text style={styles.menuLabel}>Support</Text>
          <TouchableOpacity
            style={styles.menuItem}
            onPress={() => setAboutModalVisible(true)}
          >
            <View style={[styles.iconBox, { backgroundColor: '#F8FAFC' }]}>
              <Ionicons name="information-circle-outline" size={20} color="#64748B" />
            </View>
            <Text style={styles.menuItemText}>About Tally</Text>
            <Ionicons name="chevron-forward" size={18} color="#CBD5E1" />
          </TouchableOpacity>
        </View>

        {/* Logout Section */}
        <TouchableOpacity
          style={styles.logoutButton}
          onPress={() => setLogoutModalVisible(true)}
        >
          <LinearGradient
            colors={['#FFF1F2', '#FFE4E6']}
            style={styles.logoutGradient}
          >
            <Ionicons name="log-out-outline" size={22} color="#E11D48" />
            <Text style={styles.logoutText}>Log Out</Text>
          </LinearGradient>
        </TouchableOpacity>

        <Text style={styles.versionText}>Version 1.0.0 (BETA)</Text>
        <Text style={styles.signatureText}>Designed & Developed By Sai Rohith ❤️</Text>
        <View style={{ height: 150 }} />
      </ScrollView>

      {/* Logout Confirmation Modal */}
      <Modal visible={isLogoutModalVisible} transparent animationType="fade">
        <View style={styles.modalOverlay}>
          <View style={styles.modalContent}>
            <View style={styles.modalIconBox}>
              <Ionicons name="alert-circle" size={40} color="#E11D48" />
            </View>
            <Text style={styles.modalTitle}>Log Out?</Text>
            <Text style={styles.modalDescription}>
              Are you sure you want to log out? You will need to sign in again to access your data.
            </Text>
            <View style={styles.modalButtons}>
              <TouchableOpacity style={styles.cancelModalBtn} onPress={() => setLogoutModalVisible(false)}>
                <Text style={styles.cancelModalLabel}>No, stay</Text>
              </TouchableOpacity>
              <TouchableOpacity
                style={styles.confirmLogoutBtn}
                onPress={() => {
                  setLogoutModalVisible(false);
                  router.replace('/welcome');
                }}
              >
                <Text style={styles.confirmLogoutLabel}>Log Out</Text>
              </TouchableOpacity>
            </View>
          </View>
        </View>
      </Modal>

      {/* Name Update Confirmation Modal */}
      <Modal visible={isNameConfirmVisible} transparent animationType="fade">
        <View style={styles.modalOverlay}>
          <View style={styles.modalContent}>
            <View style={[styles.modalIconBox, { backgroundColor: '#EEF2FF' }]}>
              <Ionicons name="person-outline" size={40} color="#6366F1" />
            </View>
            <Text style={styles.modalTitle}>Update Name?</Text>
            <Text style={styles.modalDescription}>
              Are you sure you want to change your profile name to "{tempName}"?
            </Text>
            <View style={styles.modalButtons}>
              <TouchableOpacity style={styles.cancelModalBtn} onPress={() => setNameConfirmVisible(false)}>
                <Text style={styles.cancelModalLabel}>Cancel</Text>
              </TouchableOpacity>
              <TouchableOpacity style={[styles.confirmLogoutBtn, { backgroundColor: '#6366F1' }]} onPress={confirmNameUpdate}>
                <Text style={styles.confirmLogoutLabel}>Update</Text>
              </TouchableOpacity>
            </View>
          </View>
        </View>
      </Modal>

      {/* Image Options Modal */}
      <Modal visible={isImageModalVisible} transparent animationType="slide">
        <Pressable style={styles.modalOverlay} onPress={() => setImageModalVisible(false)}>
          <View style={[styles.modalContent, styles.bottomSheetContent]}>
            <View style={styles.bottomSheetHandle} />
            <Text style={styles.modalTitle}>Profile Photo</Text>

            <TouchableOpacity style={styles.imageOptionBtn} onPress={pickImage}>
              <View style={[styles.optionIconBox, { backgroundColor: '#EEF2FF' }]}>
                <Ionicons name="images" size={22} color="#6366F1" />
              </View>
              <Text style={styles.imageOptionText}>Choose from Gallery</Text>
            </TouchableOpacity>

            <TouchableOpacity style={styles.imageOptionBtn} onPress={deleteImage}>
              <View style={[styles.optionIconBox, { backgroundColor: '#FFF1F2' }]}>
                <Ionicons name="trash" size={22} color="#E11D48" />
              </View>
              <Text style={[styles.imageOptionText, { color: '#E11D48' }]}>Remove Photo</Text>
            </TouchableOpacity>

            <TouchableOpacity style={[styles.cancelModalBtn, { marginTop: 10, width: '100%' }]} onPress={() => setImageModalVisible(false)}>
              <Text style={styles.cancelModalLabel}>Cancel</Text>
            </TouchableOpacity>
          </View>
        </Pressable>
      </Modal>

      {/* About Tally Modal */}
      <Modal visible={isAboutModalVisible} transparent animationType="fade">
        <Pressable style={styles.modalOverlay} onPress={() => setAboutModalVisible(false)}>
          <View style={styles.modalContent}>
            <View style={[styles.modalIconBox, { backgroundColor: '#F1F5F9' }]}>
              <Image
                source={require('../../assets/images/logo.png')}
                style={styles.aboutLogo}
              />
            </View>
            <Text style={styles.modalTitle}>About Tally</Text>
            <Text style={styles.aboutDescription}>
              Tally is a modern, intuitive expense tracker designed to help you master your finances. With real-time insights, smart categorization, and a premium user experience, keeping track of your money has never been this beautiful.
            </Text>

            <View style={styles.developerCard}>
              <Text style={styles.devLabel}>Developed By</Text>
              <Text style={styles.devName}>Sai Rohith ❤️</Text>
            </View>

            <TouchableOpacity
              style={styles.aboutCloseBtn}
              onPress={() => setAboutModalVisible(false)}
            >
              <LinearGradient
                colors={['#1E293B', '#0F172A']}
                style={styles.aboutCloseGradient}
              >
                <Text style={styles.confirmLabelLight}>Close</Text>
              </LinearGradient>
            </TouchableOpacity>
          </View>
        </Pressable>
      </Modal>

      {/* Success Toast */}
      {isSuccessToastVisible && (
        <View style={styles.toastContainer}>
          <LinearGradient colors={['#10B981', '#059669']} style={styles.toastGradient}>
            <Ionicons name="checkmark-circle" size={20} color="#FFF" />
            <Text style={styles.toastText}>{toastMessage}</Text>
          </LinearGradient>
        </View>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#FFFFFF',
  },
  scrollContent: {
    paddingHorizontal: 20,
    paddingBottom: 40,
  },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginVertical: 20,
  },
  headerTitle: {
    fontSize: 28,
    fontWeight: '800',
    color: '#0F172A',
  },
  notificationBtn: {
    width: 44,
    height: 44,
    borderRadius: 22,
    backgroundColor: '#F1F5F9',
    justifyContent: 'center',
    alignItems: 'center',
  },
  profileSection: {
    marginVertical: 10,
  },
  profileCard: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#F8FAFC',
    padding: 24,
    borderRadius: 32,
    borderWidth: 1,
    borderColor: '#E2E8F0',
  },
  avatarContainer: {
    position: 'relative',
  },
  avatar: {
    width: 80,
    height: 80,
    borderRadius: 40,
    backgroundColor: '#E2E8F0',
  },
  editImageBadge: {
    position: 'absolute',
    bottom: 0,
    right: 0,
    backgroundColor: '#6366F1',
    width: 30,
    height: 30,
    borderRadius: 15,
    justifyContent: 'center',
    alignItems: 'center',
    borderWidth: 3,
    borderColor: '#F8FAFC',
  },
  profileInfo: {
    marginLeft: 20,
    flex: 1,
  },
  userName: {
    fontSize: 22,
    fontWeight: '800',
    color: '#0F172A',
    marginBottom: 4,
  },
  editProfileText: {
    fontSize: 14,
    color: '#6366F1',
    fontWeight: '600',
  },
  editNameContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  nameInput: {
    flex: 1,
    fontSize: 18,
    fontWeight: '700',
    color: '#0F172A',
    borderBottomWidth: 2,
    borderBottomColor: '#6366F1',
    paddingBottom: 4,
  },
  editActions: {
    flexDirection: 'row',
    marginLeft: 10,
  },
  cancelBtn: {
    padding: 8,
  },
  confirmBtn: {
    padding: 8,
  },
  menuSection: {
    marginTop: 32,
  },
  menuLabel: {
    fontSize: 13,
    fontWeight: '700',
    color: '#94A3B8',
    textTransform: 'uppercase',
    letterSpacing: 1,
    marginBottom: 16,
    marginLeft: 4,
  },
  menuItem: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#FFF',
    paddingVertical: 14,
    borderBottomWidth: 1,
    borderBottomColor: '#F1F5F9',
  },
  iconBox: {
    width: 40,
    height: 40,
    borderRadius: 12,
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 16,
  },
  menuItemText: {
    flex: 1,
    fontSize: 16,
    fontWeight: '600',
    color: '#1E293B',
  },
  logoutButton: {
    marginTop: 40,
    shadowColor: '#E11D48',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.1,
    shadowRadius: 10,
    elevation: 2,
  },
  logoutGradient: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 18,
    borderRadius: 20,
    gap: 10,
  },
  logoutText: {
    fontSize: 16,
    fontWeight: '700',
    color: '#E11D48',
  },
  versionText: {
    textAlign: 'center',
    marginTop: 24,
    fontSize: 12,
    color: '#CBD5E1',
    fontWeight: '500',
  },
  signatureText: {
    textAlign: 'center',
    color: '#6366F1',
    fontSize: 16,
    marginTop: 40,
    fontWeight: '600',
  },
  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.5)',
    justifyContent: 'center',
    alignItems: 'center',
    padding: 24,
  },
  modalContent: {
    backgroundColor: '#FFF',
    borderRadius: 32,
    padding: 32,
    width: '100%',
    alignItems: 'center',
    shadowColor: '#000',
    shadowOpacity: 0.1,
    shadowRadius: 20,
    elevation: 20,
  },
  modalIconBox: {
    width: 80,
    height: 80,
    borderRadius: 40,
    backgroundColor: '#FFF1F2',
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: 20,
  },
  modalTitle: {
    fontSize: 22,
    fontWeight: '800',
    color: '#0F172A',
    marginBottom: 12,
  },
  modalDescription: {
    fontSize: 15,
    color: '#64748B',
    textAlign: 'center',
    lineHeight: 22,
    marginBottom: 32,
  },
  modalButtons: {
    flexDirection: 'row',
    gap: 12,
  },
  cancelModalBtn: {
    flex: 1,
    paddingVertical: 16,
    borderRadius: 16,
    backgroundColor: '#F1F5F9',
    alignItems: 'center',
  },
  cancelModalLabel: {
    fontSize: 15,
    fontWeight: '700',
    color: '#64748B',
  },
  confirmLogoutBtn: {
    flex: 1,
    paddingVertical: 16,
    borderRadius: 16,
    backgroundColor: '#E11D48',
    alignItems: 'center',
  },
  confirmLogoutLabel: {
    fontSize: 15,
    fontWeight: '700',
    color: '#FFFFFF', // Restored to white for readability on dark backgrounds
  },
  confirmLabelLight: {
    fontSize: 16,
    fontWeight: '800',
    color: '#FFFFFF',
    letterSpacing: 0.5,
  },
  aboutLogo: {
    width: 70,
    height: 70,
    resizeMode: 'contain',
  },
  aboutCloseBtn: {
    width: '100%',
    marginTop: 20,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.2,
    shadowRadius: 8,
    elevation: 5,
  },
  aboutCloseGradient: {
    paddingVertical: 16,
    borderRadius: 18,
    alignItems: 'center',
    justifyContent: 'center',
  },
  bottomSheetContent: {
    borderBottomLeftRadius: 0,
    borderBottomRightRadius: 0,
    paddingBottom: 50,
    width: '100%',
    position: 'absolute',
    bottom: 0,
  },
  bottomSheetHandle: {
    width: 40,
    height: 5,
    backgroundColor: '#E2E8F0',
    borderRadius: 10,
    alignSelf: 'center',
    marginBottom: 20,
  },
  imageOptionBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    width: '100%',
    paddingVertical: 15,
    borderBottomWidth: 1,
    borderBottomColor: '#F1F5F9',
  },
  optionIconBox: {
    width: 44,
    height: 44,
    borderRadius: 12,
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 16,
  },
  imageOptionText: {
    fontSize: 16,
    fontWeight: '600',
    color: '#1E293B',
  },
  aboutDescription: {
    fontSize: 15,
    color: '#475569',
    textAlign: 'center',
    lineHeight: 22,
    marginBottom: 24,
  },
  developerCard: {
    backgroundColor: '#F8FAFC',
    paddingVertical: 12,
    paddingHorizontal: 24,
    borderRadius: 16,
    borderWidth: 1,
    borderColor: '#E2E8F0',
    alignItems: 'center',
  },
  devLabel: {
    fontSize: 11,
    color: '#94A3B8',
    textTransform: 'uppercase',
    fontWeight: '700',
    letterSpacing: 1,
    marginBottom: 4,
  },
  devName: {
    fontSize: 16,
    fontWeight: '800',
    color: '#6366F1',
  },
  toastContainer: {
    position: 'absolute',
    top: 60, // Moved to top for better visibility
    alignSelf: 'center',
    zIndex: 9999, // Ensure it's on top of everything
  },
  toastGradient: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 20,
    paddingVertical: 12,
    borderRadius: 24,
    gap: 8,
    shadowColor: '#10B981',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.3,
    shadowRadius: 8,
    elevation: 10,
  },
  toastText: {
    color: '#FFF',
    fontSize: 14,
    fontWeight: '700',
  },
});
