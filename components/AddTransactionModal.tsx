import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  StyleSheet,
  Modal,
  TouchableOpacity,
  Pressable,
  TextInput,
  ScrollView,
  KeyboardAvoidingView,
  Platform,
  Alert,
  ActivityIndicator,
  Dimensions,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { LinearGradient } from 'expo-linear-gradient';
import { useAuth } from '@/contexts/AuthContext';
import { accountService } from '@/services/accountService';
import { transactionService } from '@/services/transactionService';
import { alertService } from '@/services/alertService';
import { Account, AlertLog } from '@/types/supabase';

const { width: SCREEN_WIDTH } = Dimensions.get('window');

type TransactionType = 'income' | 'expense' | 'transfer';

const CATEGORIES: Record<TransactionType, string[]> = {
  income: ['Salary', 'Gift', 'Investment', 'Business', 'Other'],
  expense: ['Food', 'Transport', 'Shopping', 'Health', 'Entertainment', 'Bills', 'Other'],
  transfer: ['Transfer'],
};

interface Props {
  visible: boolean;
  onClose: () => void;
  onSuccess: (newAlerts?: AlertLog[]) => void;
}

export default function AddTransactionModal({ visible, onClose, onSuccess }: Props) {
  const { user } = useAuth();

  const [accounts, setAccounts] = useState<Account[]>([]);
  const [loadingAccounts, setLoadingAccounts] = useState(false);
  const [saving, setSaving] = useState(false);

  const [type, setType] = useState<TransactionType>('expense');
  const [amount, setAmount] = useState('');
  const [merchant, setMerchant] = useState('');
  const [category, setCategory] = useState('Food');
  const [selectedAccount, setSelectedAccount] = useState('');
  const [selectedToAccount, setSelectedToAccount] = useState('');

  // Load accounts whenever modal becomes visible
  useEffect(() => {
    if (visible && user) {
      loadAccounts();
    }
  }, [visible, user]);

  // Reset category when type changes
  useEffect(() => {
    if (type === 'income') setCategory('Salary');
    else if (type === 'expense') setCategory('Food');
    else setCategory('Transfer');
  }, [type]);

  const loadAccounts = async () => {
    try {
      setLoadingAccounts(true);
      const data = await accountService.getAccounts(user!.id);
      // Sort: expense-type account first, then others
      const sorted = [...data].sort((a, b) =>
        a.type === 'expense' ? -1 : b.type === 'expense' ? 1 : 0
      );
      setAccounts(sorted);
      if (sorted.length > 0) {
        setSelectedAccount(sorted[0].id);
        if (sorted.length > 1) setSelectedToAccount(sorted[1].id);
      }
    } catch (e) {
      console.error('Failed to load accounts:', e);
    } finally {
      setLoadingAccounts(false);
    }
  };

  const resetForm = () => {
    setType('expense');
    setAmount('');
    setMerchant('');
    setCategory('Food');
    // Re-sort and default to expense account
    const sorted = [...accounts].sort((a, b) =>
      a.type === 'expense' ? -1 : b.type === 'expense' ? 1 : 0
    );
    if (sorted.length > 0) {
      setSelectedAccount(sorted[0].id);
      if (sorted.length > 1) setSelectedToAccount(sorted[1].id);
    }
  };

  const handleClose = () => {
    resetForm();
    onClose();
  };

  const handleSave = async () => {
    if (!amount || parseFloat(amount) <= 0) {
      Alert.alert('Missing Amount', 'Please enter a valid amount');
      return;
    }
    if (!merchant.trim()) {
      Alert.alert('Missing Description', 'Please enter a merchant or description');
      return;
    }
    if (!selectedAccount) {
      Alert.alert('No Account', 'Please select an account');
      return;
    }
    if (type === 'transfer' && !selectedToAccount) {
      Alert.alert('No Destination', 'Please select a destination account');
      return;
    }
    if (type === 'transfer' && selectedAccount === selectedToAccount) {
      Alert.alert('Same Account', 'Source and destination accounts must be different');
      return;
    }

    try {
      setSaving(true);
      const now = new Date();
      const monthStr = `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}`;
      const dateStr = now.toISOString().split('T')[0];

      let newAlerts: AlertLog[] = [];

      if (type === 'transfer') {
        await transactionService.transfer(user!.id, {
          accountId: selectedAccount,
          toAccountId: selectedToAccount,
          amount: parseFloat(amount),
          date: now.toISOString(),
          month: monthStr,
          merchant: merchant.trim(),
          category: 'Transfer',
        });
      } else {
        await transactionService.addTransaction(user!.id, {
          accountId: selectedAccount,
          amount: parseFloat(amount),
          type,
          category,
          merchant: merchant.trim(),
          date: dateStr,
          month: monthStr,
        });

        // Check budget thresholds for expense transactions
        if (type === 'expense') {
          newAlerts = await alertService.checkAndGetNewAlerts(user!.id, dateStr, monthStr);
        }
      }

      resetForm();
      onSuccess(newAlerts);
      onClose();
    } catch (error: any) {
      Alert.alert('Error', error.message || 'Failed to save transaction');
    } finally {
      setSaving(false);
    }
  };

  return (
    <Modal visible={visible} transparent animationType="slide" onRequestClose={handleClose}>
      <KeyboardAvoidingView
        behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
        style={{ flex: 1 }}
      >
        <Pressable style={styles.overlay} onPress={handleClose}>
          <Pressable style={styles.sheet} onPress={e => e.stopPropagation()}>
            {/* Handle */}
            <View style={styles.handle} />

            {/* Header */}
            <View style={styles.header}>
              <Text style={styles.title}>New Transaction</Text>
              <TouchableOpacity onPress={handleClose} style={styles.closeBtn}>
                <Ionicons name="close" size={22} color="#64748B" />
              </TouchableOpacity>
            </View>

            {loadingAccounts ? (
              <View style={styles.loadingContainer}>
                <ActivityIndicator size="large" color="#6366F1" />
                <Text style={styles.loadingText}>Loading accounts…</Text>
              </View>
            ) : accounts.length === 0 ? (
              <View style={styles.loadingContainer}>
                <Ionicons name="wallet-outline" size={48} color="#CBD5E1" />
                <Text style={styles.loadingText}>No accounts found. Please create one first.</Text>
              </View>
            ) : (
              <ScrollView showsVerticalScrollIndicator={false} keyboardShouldPersistTaps="handled">
                {/* Type Selector */}
                <View style={styles.typeRow}>
                  {(['expense', 'income', 'transfer'] as TransactionType[]).map(t => (
                    <TouchableOpacity
                      key={t}
                      style={[
                        styles.typeBtn,
                        type === t && (
                          t === 'expense' ? styles.typeBtnExpense :
                            t === 'income' ? styles.typeBtnIncome :
                              styles.typeBtnTransfer
                        ),
                      ]}
                      onPress={() => setType(t)}
                    >
                      <Ionicons
                        name={t === 'expense' ? 'arrow-up' : t === 'income' ? 'arrow-down' : 'swap-horizontal'}
                        size={14}
                        color={type === t ? '#FFF' : '#64748B'}
                      />
                      <Text style={[styles.typeBtnText, type === t && styles.typeBtnTextActive]}>
                        {t.charAt(0).toUpperCase() + t.slice(1)}
                      </Text>
                    </TouchableOpacity>
                  ))}
                </View>

                {/* Amount */}
                <View style={styles.group}>
                  <Text style={styles.label}>AMOUNT</Text>
                  <View style={styles.amountRow}>
                    <Text style={styles.rupeeSymbol}>₹</Text>
                    <TextInput
                      style={styles.amountInput}
                      placeholder="0.00"
                      placeholderTextColor="#CBD5E1"
                      keyboardType="decimal-pad"
                      value={amount}
                      onChangeText={setAmount}
                      autoFocus
                    />
                  </View>
                </View>

                {/* Merchant */}
                <View style={styles.group}>
                  <Text style={styles.label}>DESCRIPTION / MERCHANT</Text>
                  <TextInput
                    style={styles.textInput}
                    placeholder="e.g. Swiggy, Salary, Amazon"
                    placeholderTextColor="#94A3B8"
                    value={merchant}
                    onChangeText={setMerchant}
                  />
                </View>

                {/* Account */}
                <View style={styles.group}>
                  <Text style={styles.label}>{type === 'transfer' ? 'FROM ACCOUNT' : 'ACCOUNT'}</Text>
                  <View style={styles.pillRow}>
                    {accounts.map(acc => (
                      <TouchableOpacity
                        key={acc.id}
                        style={[styles.accountPill, selectedAccount === acc.id && styles.accountPillActive]}
                        onPress={() => setSelectedAccount(acc.id)}
                      >
                        <Ionicons
                          name={(acc.icon || 'wallet-outline') as any}
                          size={16}
                          color={selectedAccount === acc.id ? '#FFF' : acc.color || '#6366F1'}
                        />
                        <Text style={[styles.pillText, selectedAccount === acc.id && styles.pillTextActive]}>
                          {acc.name}
                        </Text>
                      </TouchableOpacity>
                    ))}
                  </View>
                </View>

                {/* To Account (transfer only) */}
                {type === 'transfer' && (
                  <View style={styles.group}>
                    <Text style={styles.label}>TO ACCOUNT</Text>
                    <View style={styles.pillRow}>
                      {accounts.filter(a => a.id !== selectedAccount).map(acc => (
                        <TouchableOpacity
                          key={acc.id}
                          style={[styles.accountPill, selectedToAccount === acc.id && styles.accountPillActive]}
                          onPress={() => setSelectedToAccount(acc.id)}
                        >
                          <Ionicons
                            name={(acc.icon || 'wallet-outline') as any}
                            size={16}
                            color={selectedToAccount === acc.id ? '#FFF' : acc.color || '#6366F1'}
                          />
                          <Text style={[styles.pillText, selectedToAccount === acc.id && styles.pillTextActive]}>
                            {acc.name}
                          </Text>
                        </TouchableOpacity>
                      ))}
                    </View>
                  </View>
                )}

                {/* Category (not for transfer) */}
                {type !== 'transfer' && (
                  <View style={styles.group}>
                    <Text style={styles.label}>CATEGORY</Text>
                    <ScrollView horizontal showsHorizontalScrollIndicator={false}>
                      {CATEGORIES[type].map(cat => (
                        <TouchableOpacity
                          key={cat}
                          style={[styles.catPill, category === cat && styles.catPillActive]}
                          onPress={() => setCategory(cat)}
                        >
                          <Text style={[styles.catPillText, category === cat && styles.catPillTextActive]}>
                            {cat}
                          </Text>
                        </TouchableOpacity>
                      ))}
                    </ScrollView>
                  </View>
                )}

                {/* Save Button */}
                <TouchableOpacity
                  style={styles.saveBtn}
                  onPress={handleSave}
                  disabled={saving}
                >
                  <LinearGradient colors={['#6366F1', '#4F46E5']} style={styles.saveGradient}>
                    {saving ? (
                      <ActivityIndicator color="#FFF" />
                    ) : (
                      <Text style={styles.saveBtnText}>Add Transaction</Text>
                    )}
                  </LinearGradient>
                </TouchableOpacity>

                <View style={{ height: Platform.OS === 'ios' ? 20 : 8 }} />
              </ScrollView>
            )}
            {/* Bottom fill to prevent gap on iOS when keyboard pushes sheet */}
            <View style={styles.bottomFill} />
          </Pressable>
        </Pressable>
      </KeyboardAvoidingView>
    </Modal>
  );
}

const styles = StyleSheet.create({
  overlay: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.5)',
    justifyContent: 'flex-end',
  },
  sheet: {
    backgroundColor: '#FFF',
    borderTopLeftRadius: 32,
    borderTopRightRadius: 32,
    paddingHorizontal: 24,
    paddingTop: 16,
    paddingBottom: Platform.OS === 'ios' ? 40 : 24,
    width: SCREEN_WIDTH,
    maxHeight: '92%',
  },
  bottomFill: {
    position: 'absolute',
    bottom: -100,
    left: 0,
    right: 0,
    height: 100,
    backgroundColor: '#FFF',
  },
  handle: {
    width: 40,
    height: 5,
    backgroundColor: '#E2E8F0',
    borderRadius: 10,
    alignSelf: 'center',
    marginBottom: 20,
  },
  header: {
    flexDirection: 'row',
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: 24,
    position: 'relative',
  },
  title: {
    fontSize: 22,
    fontWeight: '800',
    color: '#0F172A',
    textAlign: 'center',
  },
  closeBtn: {
    position: 'absolute',
    right: 0,
    padding: 4,
  },
  loadingContainer: {
    alignItems: 'center',
    paddingVertical: 40,
    gap: 12,
  },
  loadingText: {
    fontSize: 14,
    color: '#64748B',
    textAlign: 'center',
    lineHeight: 20,
  },
  typeRow: {
    flexDirection: 'row',
    backgroundColor: '#F1F5F9',
    borderRadius: 16,
    padding: 4,
    marginBottom: 24,
    gap: 4,
  },
  typeBtn: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 10,
    borderRadius: 12,
    gap: 5,
  },
  typeBtnExpense: { backgroundColor: '#EF4444' },
  typeBtnIncome: { backgroundColor: '#10B981' },
  typeBtnTransfer: { backgroundColor: '#3B82F6' },
  typeBtnText: {
    fontSize: 13,
    fontWeight: '600',
    color: '#64748B',
  },
  typeBtnTextActive: { color: '#FFF' },
  group: { marginBottom: 18 },
  label: {
    fontSize: 11,
    fontWeight: '700',
    color: '#64748B',
    letterSpacing: 0.5,
    marginBottom: 8,
  },
  amountRow: {
    flexDirection: 'row',
    alignItems: 'center',
    borderBottomWidth: 2,
    borderBottomColor: '#6366F1',
    paddingVertical: 4,
  },
  rupeeSymbol: {
    fontSize: 28,
    fontWeight: '800',
    color: '#0F172A',
    marginRight: 10,
  },
  amountInput: {
    flex: 1,
    fontSize: 28,
    fontWeight: '800',
    color: '#0F172A',
    padding: 0,
    includeFontPadding: false,
  },
  textInput: {
    backgroundColor: '#F8FAFC',
    borderRadius: 14,
    paddingHorizontal: 16,
    paddingVertical: 12,
    fontSize: 15,
    color: '#0F172A',
    borderWidth: 1,
    borderColor: '#E2E8F0',
  },
  pillRow: { flexDirection: 'row', flexWrap: 'wrap', gap: 10 },
  accountPill: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 16,
    paddingVertical: 10,
    borderRadius: 14,
    backgroundColor: '#F8FAFC',
    borderWidth: 1,
    borderColor: '#E2E8F0',
    gap: 8,
  },
  accountPillActive: { backgroundColor: '#0F172A', borderColor: '#0F172A' },
  pillText: { fontSize: 14, fontWeight: '600', color: '#475569' },
  pillTextActive: { color: '#FFF' },
  catPill: {
    paddingHorizontal: 16,
    paddingVertical: 8,
    borderRadius: 12,
    backgroundColor: '#F8FAFC',
    marginRight: 10,
    borderWidth: 1,
    borderColor: '#E2E8F0',
  },
  catPillActive: { backgroundColor: '#6366F1', borderColor: '#6366F1' },
  catPillText: { fontSize: 14, color: '#64748B', fontWeight: '600' },
  catPillTextActive: { color: '#FFF' },
  saveBtn: { marginTop: 10 },
  saveGradient: {
    paddingVertical: 16,
    borderRadius: 16,
    alignItems: 'center',
  },
  saveBtnText: { color: '#FFF', fontSize: 18, fontWeight: '700' },
});
