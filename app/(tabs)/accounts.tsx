import React, { useState, useEffect } from 'react';
import { View, Text, StyleSheet, ScrollView, Animated, Modal, TextInput, Alert, Pressable } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { LinearGradient } from 'expo-linear-gradient';

// --- TYPES ---
type AccountType = 'savings' | 'expense';

interface Account {
  id: string;
  name: string;
  balance: number;
  subtitle: string;
  icon: string;
  iconColor: string;
  type: AccountType;
}

// --- COMPONENTS ---

const AccountTag = ({ type }: { type: AccountType }) => (
  <View style={[styles.tag, type === 'savings' ? styles.savingsTag : styles.expenseTag]}>
    <Text style={[styles.tagText, type === 'savings' ? styles.savingsTagText : styles.expenseTagText]}>
      {type === 'savings' ? 'Savings' : 'Expense'}
    </Text>
  </View>
);

const AccountCard = ({ item, onPress }: { item: Account; onPress: () => void }) => {
  return (
    <Pressable
      style={({ pressed }) => [
        styles.accountCard,
        pressed && { transform: [{ scale: 0.97 }] }
      ]}
      onPress={onPress}
    >
      <View style={[styles.iconContainer, { backgroundColor: item.iconColor + '15' }]}>
        <Ionicons name={item.icon as any} size={20} color={item.iconColor} />
      </View>
      <View style={styles.accountInfo}>
        <View style={styles.nameRow}>
          <Text style={styles.accountName}>{item.name}</Text>
          <AccountTag type={item.type} />
        </View>
        <Text style={styles.accountSubtitle}>{item.subtitle}</Text>
      </View>
      <View style={styles.accountBalanceContainer}>
        <Text style={[
          styles.accountBalanceText,
          item.type === 'expense' && { color: '#0F172A' }
        ]}>
          ₹{item.balance.toLocaleString('en-IN', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
        </Text>
        <Ionicons name="chevron-forward" size={16} color="#CBD5E1" />
      </View>
    </Pressable>
  );
};

const SuccessToast = ({ visible, message }: { visible: boolean; message: string }) => {
  const translateY = React.useRef(new Animated.Value(-100)).current;

  useEffect(() => {
    if (visible) {
      Animated.spring(translateY, {
        toValue: 20,
        useNativeDriver: true,
      }).start();

      const timer = setTimeout(() => {
        Animated.timing(translateY, {
          toValue: -100,
          duration: 300,
          useNativeDriver: true,
        }).start();
      }, 2500);
      return () => clearTimeout(timer);
    }
  }, [visible]);

  return (
    <Animated.View style={[styles.toastContainer, { transform: [{ translateY }] }]}>
      <View style={styles.toastContent}>
        <Ionicons name="checkmark-circle" size={24} color="#10B981" />
        <Text style={styles.toastText}>{message}</Text>
      </View>
    </Animated.View>
  );
};

// --- MAIN SCREEN ---

export default function AccountsScreen() {
  const insets = useSafeAreaInsets();

  const [accounts, setAccounts] = useState<Account[]>([
    { id: '1', name: 'SBI Savings', balance: 4484.00, subtitle: '**** 4829', icon: 'business-outline', iconColor: '#6366F1', type: 'savings' },
    { id: '2', name: 'Union Bank', balance: 12250.50, subtitle: '**** 9102', icon: 'card-outline', iconColor: '#0EA5E9', type: 'expense' },
  ]);

  const [isEditModalVisible, setIsEditModalVisible] = useState(false);
  const [isAddModalVisible, setIsAddModalVisible] = useState(false);
  const [selectedAccount, setSelectedAccount] = useState<Account | null>(null);

  const [toastVisible, setToastVisible] = useState(false);
  const [toastMessage, setToastMessage] = useState('');

  const [editName, setEditName] = useState('');
  const [editBalance, setEditBalance] = useState('');
  const [editType, setEditType] = useState<AccountType>('savings');

  const showToast = (message: string) => {
    setToastMessage(message);
    setToastVisible(true);
    setTimeout(() => setToastVisible(false), 3000);
  };

  const openEditModal = (account: Account) => {
    setSelectedAccount(account);
    setEditName(account.name);
    setEditBalance(account.balance.toString());
    setEditType(account.type);
    setIsEditModalVisible(true);
  };

  const handleUpdateAccount = () => {
    if (!selectedAccount) return;
    const numBalance = parseFloat(editBalance.replace(/,/g, '')) || 0;

    setAccounts(accounts.map(acc =>
      acc.id === selectedAccount.id
        ? { ...acc, name: editName, balance: numBalance, type: editType }
        : acc
    ));
    setIsEditModalVisible(false);
    showToast('Account updated successfully');
  };

  const handleDeleteAccount = () => {
    if (!selectedAccount) return;
    Alert.alert(
      "Delete Account",
      "Are you sure you want to remove this account?",
      [
        { text: "Cancel", style: "cancel" },
        {
          text: "Delete",
          style: "destructive",
          onPress: () => {
            setAccounts(accounts.filter(acc => acc.id !== selectedAccount.id));
            setIsEditModalVisible(false);
            showToast('Account deleted');
          }
        }
      ]
    );
  };

  const handleAddAccount = () => {
    const newId = Date.now().toString();
    const numBalance = parseFloat(editBalance.replace(/,/g, '')) || 0;

    const newAccount: Account = {
      id: newId,
      name: editName || 'New Account',
      balance: numBalance,
      subtitle: '**** ' + Math.floor(1000 + Math.random() * 9000),
      icon: 'card-outline',
      iconColor: accounts.length % 2 === 0 ? '#6366F1' : '#0EA5E9',
      type: editType
    };
    setAccounts([...accounts, newAccount]);
    setIsAddModalVisible(false);
    resetForm();
    showToast('New account added');
  };

  const resetForm = () => {
    setEditName('');
    setEditBalance('');
    setEditType('savings');
  };

  const savingsAccounts = accounts.filter(a => a.type === 'savings');
  const expenseAccounts = accounts.filter(a => a.type === 'expense');

  const totalWorth = accounts.reduce((sum, acc) => sum + acc.balance, 0);

  return (
    <View style={[styles.mainContainer, { paddingTop: insets.top }]}>
      <SuccessToast visible={toastVisible} message={toastMessage} />

      <ScrollView
        showsVerticalScrollIndicator={false}
        contentContainerStyle={styles.scrollContent}
      >
        {/* HEADER */}
        <View style={styles.header}>
          <Text style={styles.headerTitle}>Accounts</Text>
          <Pressable
            style={styles.addIconButton}
            onPress={() => {
              resetForm();
              setIsAddModalVisible(true);
            }}
          >
            <Ionicons name="add" size={24} color="#0F172A" />
          </Pressable>
        </View>

        {/* NET WORTH CARD (Hero Section) */}
        <LinearGradient
          colors={['#4F46E5', '#6366F1']}
          start={{ x: 0, y: 0 }}
          end={{ x: 1, y: 1 }}
          style={styles.netWorthCard}
        >
          <Text style={styles.netWorthLabel}>Net Worth</Text>
          <Text style={styles.netWorthAmount}>₹{totalWorth.toLocaleString('en-IN', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}</Text>
          <View style={styles.changeIndicator}>
            <Ionicons name="shield-checkmark" size={14} color="#FFFFFF" />
            <Text style={styles.changeText}>Securely Synced</Text>
          </View>
        </LinearGradient>

        {/* ACCOUNT GROUP SECTIONS */}
        <View style={styles.section}>
          {savingsAccounts.length > 0 && (
            <View style={{ marginBottom: 20 }}>
              <Text style={styles.sectionLabel}>Savings Accounts</Text>
              {savingsAccounts.map(item => (
                <AccountCard key={item.id} item={item} onPress={() => openEditModal(item)} />
              ))}
            </View>
          )}

          {expenseAccounts.length > 0 && (
            <View>
              <Text style={styles.sectionLabel}>Expense Accounts</Text>
              {expenseAccounts.map(item => (
                <AccountCard key={item.id} item={item} onPress={() => openEditModal(item)} />
              ))}
            </View>
          )}

          {accounts.length === 0 && (
            <View style={styles.emptyState}>
              <Ionicons name="wallet-outline" size={60} color="#CBD5E1" />
              <Text style={styles.emptyTitle}>No accounts yet</Text>
              <Text style={styles.emptySub}>Add your first bank account to start tracking.</Text>
            </View>
          )}
        </View>

        {/* ADD NEW ACCOUNT BUTTON */}
        <Pressable
          style={({ pressed }) => [
            styles.addNewAccountButton,
            pressed && { opacity: 0.8, transform: [{ scale: 0.98 }] }
          ]}
          onPress={() => {
            resetForm();
            setIsAddModalVisible(true);
          }}
        >
          <Text style={styles.addNewAccountText}>Add New Account</Text>
        </Pressable>

        <View style={{ height: 120 }} />
      </ScrollView>

      {/* EDIT/UPDATE MODAL */}
      <Modal
        animationType="slide"
        transparent={true}
        visible={isEditModalVisible}
        onRequestClose={() => setIsEditModalVisible(false)}
      >
        <View style={styles.modalOverlay}>
          <View style={styles.modalContent}>
            <View style={styles.modalHeader}>
              <View>
                <Text style={styles.modalTitle}>Update Account</Text>
                <Text style={styles.modalSubtitle}>Edit details or purpose</Text>
              </View>
              <Pressable onPress={() => setIsEditModalVisible(false)}>
                <Ionicons name="close" size={24} color="#64748B" />
              </Pressable>
            </View>

            <View style={styles.inputGroup}>
              <Text style={styles.inputLabel}>Account Name</Text>
              <TextInput
                style={styles.input}
                value={editName}
                onChangeText={setEditName}
                placeholder="e.g. SBI Savings"
              />
            </View>

            <View style={styles.inputGroup}>
              <Text style={styles.inputLabel}>Current Balance (₹)</Text>
              <TextInput
                style={styles.input}
                value={editBalance}
                onChangeText={setEditBalance}
                keyboardType="numeric"
                placeholder="0"
              />
            </View>

            <View style={styles.inputGroup}>
              <Text style={styles.inputLabel}>Account Purpose</Text>
              <View style={styles.switchGroup}>
                <Pressable
                  style={[styles.typeBtn, editType === 'savings' && styles.typeBtnActive]}
                  onPress={() => setEditType('savings')}
                >
                  <Text style={[styles.typeBtnText, editType === 'savings' && styles.typeBtnTextActive]}>Savings Account</Text>
                </Pressable>
                <Pressable
                  style={[styles.typeBtn, editType === 'expense' && styles.typeBtnActive]}
                  onPress={() => setEditType('expense')}
                >
                  <Text style={[styles.typeBtnText, editType === 'expense' && styles.typeBtnTextActive]}>Expense Account</Text>
                </Pressable>
              </View>
            </View>

            <View style={styles.modalFooter}>
              <Pressable style={styles.deleteBtn} onPress={handleDeleteAccount}>
                <Ionicons name="trash-outline" size={20} color="#EF4444" />
              </Pressable>
              <Pressable style={styles.saveBtn} onPress={handleUpdateAccount}>
                <Text style={styles.saveBtnText}>Save Changes</Text>
              </Pressable>
            </View>
          </View>
        </View>
      </Modal>

      {/* ADD MODAL */}
      <Modal
        animationType="slide"
        transparent={true}
        visible={isAddModalVisible}
        onRequestClose={() => setIsAddModalVisible(false)}
      >
        <View style={styles.modalOverlay}>
          <View style={styles.modalContent}>
            <View style={styles.modalHeader}>
              <View>
                <Text style={styles.modalTitle}>New Account</Text>
                <Text style={styles.modalSubtitle}>Link a fresh bank account</Text>
              </View>
              <Pressable onPress={() => setIsAddModalVisible(false)}>
                <Ionicons name="close" size={24} color="#64748B" />
              </Pressable>
            </View>

            <View style={styles.inputGroup}>
              <Text style={styles.inputLabel}>Bank Name</Text>
              <TextInput
                style={styles.input}
                value={editName}
                onChangeText={setEditName}
                placeholder="e.g. HDFC Bank"
              />
            </View>

            <View style={styles.inputGroup}>
              <Text style={styles.inputLabel}>Initial Balance (₹)</Text>
              <TextInput
                style={styles.input}
                value={editBalance}
                onChangeText={setEditBalance}
                keyboardType="numeric"
                placeholder="0"
              />
            </View>

            <View style={styles.inputGroup}>
              <Text style={styles.inputLabel}>Goal for this Account</Text>
              <View style={styles.switchGroup}>
                <Pressable
                  style={[styles.typeBtn, editType === 'savings' && styles.typeBtnActive]}
                  onPress={() => setEditType('savings')}
                >
                  <Text style={[styles.typeBtnText, editType === 'savings' && styles.typeBtnTextActive]}>Savings</Text>
                </Pressable>
                <Pressable
                  style={[styles.typeBtn, editType === 'expense' && styles.typeBtnActive]}
                  onPress={() => setEditType('expense')}
                >
                  <Text style={[styles.typeBtnText, editType === 'expense' && styles.typeBtnTextActive]}>Expenses</Text>
                </Pressable>
              </View>
            </View>

            <Pressable style={styles.fullSaveBtn} onPress={handleAddAccount}>
              <Text style={styles.saveBtnText}>Create Account</Text>
            </Pressable>
          </View>
        </View>
      </Modal>
    </View>
  );
}

const styles = StyleSheet.create({
  mainContainer: {
    flex: 1,
    backgroundColor: '#F8FAFC',
  },
  scrollContent: {
    paddingBottom: 40,
  },
  header: {
    paddingHorizontal: 24,
    paddingTop: 24,
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 24,
  },
  headerTitle: {
    fontSize: 24,
    fontWeight: '600',
    color: '#0F172A',
  },
  addIconButton: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: '#FFF',
    justifyContent: 'center',
    alignItems: 'center',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.05,
    shadowRadius: 5,
    elevation: 2,
  },
  toastContainer: {
    position: 'absolute',
    top: 0,
    left: 20,
    right: 20,
    zIndex: 1000,
    alignItems: 'center',
  },
  toastContent: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#FFFFFF',
    paddingHorizontal: 16,
    paddingVertical: 12,
    borderRadius: 20,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 10 },
    shadowOpacity: 0.1,
    shadowRadius: 20,
    elevation: 10,
    borderWidth: 1,
    borderColor: '#E2E8F0',
    gap: 12,
  },
  toastText: {
    fontSize: 14,
    fontWeight: '600',
    color: '#0F172A',
  },
  netWorthCard: {
    marginHorizontal: 24,
    borderRadius: 28,
    padding: 24,
  },
  netWorthLabel: {
    color: 'rgba(255, 255, 255, 0.7)',
    fontSize: 14,
    fontWeight: '500',
    marginBottom: 8,
  },
  netWorthAmount: {
    color: '#FFFFFF',
    fontSize: 32,
    fontWeight: '700',
    marginBottom: 12,
  },
  changeIndicator: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: 'rgba(255, 255, 255, 0.15)',
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 12,
    alignSelf: 'flex-start',
  },
  changeText: {
    color: '#FFFFFF',
    fontSize: 12,
    fontWeight: '600',
    marginLeft: 4,
  },
  section: {
    marginTop: 32,
  },
  sectionLabel: {
    fontSize: 12,
    fontWeight: '700',
    color: '#64748B',
    textTransform: 'uppercase',
    letterSpacing: 1.5,
    marginHorizontal: 24,
    marginBottom: 16,
  },
  accountCard: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#FFFFFF',
    marginHorizontal: 24,
    marginBottom: 12,
    padding: 16,
    borderRadius: 20,
    borderWidth: 1,
    borderColor: '#F1F5F9',
  },
  iconContainer: {
    width: 44,
    height: 44,
    borderRadius: 14,
    justifyContent: 'center',
    alignItems: 'center',
  },
  accountInfo: {
    flex: 1,
    marginLeft: 16,
  },
  nameRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  accountName: {
    fontSize: 16,
    fontWeight: '600',
    color: '#0F172A',
  },
  accountSubtitle: {
    fontSize: 13,
    color: '#64748B',
    marginTop: 2,
  },
  accountBalanceContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  accountBalanceText: {
    fontSize: 16,
    fontWeight: '700',
    color: '#0F172A',
  },
  tag: {
    paddingHorizontal: 8,
    paddingVertical: 2,
    borderRadius: 6,
  },
  savingsTag: {
    backgroundColor: '#ECFDF5',
  },
  expenseTag: {
    backgroundColor: '#FEF2F2',
  },
  tagText: {
    fontSize: 10,
    fontWeight: '700',
  },
  savingsTagText: {
    color: '#10B981',
  },
  expenseTagText: {
    color: '#EF4444',
  },
  addNewAccountButton: {
    backgroundColor: '#0F172A',
    marginHorizontal: 24,
    marginTop: 32,
    height: 56,
    borderRadius: 16,
    justifyContent: 'center',
    alignItems: 'center',
  },
  addNewAccountText: {
    color: '#FFFFFF',
    fontSize: 16,
    fontWeight: '600',
  },
  emptyState: {
    alignItems: 'center',
    padding: 40,
    gap: 12,
  },
  emptyTitle: {
    fontSize: 18,
    fontWeight: '700',
    color: '#0F172A',
    marginTop: 10,
  },
  emptySub: {
    fontSize: 14,
    color: '#64748B',
    textAlign: 'center',
    paddingHorizontal: 20,
  },
  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(15, 23, 42, 0.5)',
    justifyContent: 'flex-end',
  },
  modalContent: {
    backgroundColor: '#FFF',
    borderTopLeftRadius: 28,
    borderTopRightRadius: 28,
    padding: 24,
    paddingBottom: 40,
  },
  modalHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
    marginBottom: 24,
  },
  modalTitle: {
    fontSize: 20,
    fontWeight: '700',
    color: '#0F172A',
  },
  modalSubtitle: {
    fontSize: 14,
    color: '#64748B',
    marginTop: 2,
  },
  inputGroup: {
    marginBottom: 20,
  },
  inputLabel: {
    fontSize: 14,
    fontWeight: '600',
    color: '#64748B',
    marginBottom: 8,
  },
  input: {
    backgroundColor: '#F8FAFC',
    borderWidth: 1,
    borderColor: '#F1F5F9',
    borderRadius: 14,
    padding: 16,
    fontSize: 16,
    color: '#0F172A',
  },
  switchGroup: {
    flexDirection: 'row',
    gap: 12,
  },
  typeBtn: {
    flex: 1,
    height: 48,
    borderRadius: 12,
    backgroundColor: '#F8FAFC',
    justifyContent: 'center',
    alignItems: 'center',
    borderWidth: 1,
    borderColor: '#F1F5F9',
  },
  typeBtnActive: {
    backgroundColor: '#6366F1',
    borderColor: '#6366F1',
  },
  typeBtnText: {
    fontSize: 13,
    fontWeight: '600',
    color: '#64748B',
  },
  typeBtnTextActive: {
    color: '#FFF',
  },
  modalFooter: {
    flexDirection: 'row',
    gap: 12,
    marginTop: 12,
  },
  saveBtn: {
    flex: 1,
    backgroundColor: '#0F172A',
    height: 56,
    borderRadius: 16,
    justifyContent: 'center',
    alignItems: 'center',
  },
  fullSaveBtn: {
    backgroundColor: '#0F172A',
    height: 56,
    borderRadius: 16,
    justifyContent: 'center',
    alignItems: 'center',
    marginTop: 12,
  },
  deleteBtn: {
    width: 56,
    height: 56,
    borderRadius: 16,
    backgroundColor: '#FEF2F2',
    justifyContent: 'center',
    alignItems: 'center',
    borderWidth: 1,
    borderColor: '#FEE2E2',
  },
  saveBtnText: {
    color: '#FFF',
    fontSize: 16,
    fontWeight: '700',
  },
});
