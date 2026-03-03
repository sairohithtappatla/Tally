import React, { useState, useEffect } from 'react';
import { View, Text, StyleSheet, ScrollView, TouchableOpacity, TextInput, Alert, ActivityIndicator } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useAuth } from '@/contexts/AuthContext';
import { AddTransactionSkeleton } from '@/components/ui/SkeletonLoader';
import { accountService } from '@/services/accountService';
import { transactionService } from '@/services/transactionService';
import { Account as AccountType } from '@/types/supabase';

type TransactionType = 'income' | 'expense' | 'transfer';

const CATEGORIES = {
  income: ['Salary', 'Gift', 'Investment', 'Business', 'Other'],
  expense: ['Food', 'Shopping', 'Transport', 'Salary', 'Health', 'Entertainment', 'Bills', 'Gift', 'Other'],
  transfer: ['Transfer']
};


export default function AddTransactionScreen() {
  const insets = useSafeAreaInsets();
  const { user } = useAuth();

  const [type, setType] = useState<TransactionType>('expense');
  const [amount, setAmount] = useState('');
  const [category, setCategory] = useState('Food');
  const [merchant, setMerchant] = useState('');
  const [selectedAccount, setSelectedAccount] = useState<string>('');
  const [selectedToAccount, setSelectedToAccount] = useState<string>('');
  const [accounts, setAccounts] = useState<AccountType[]>([]);
  const [loading, setLoading] = useState(false);
  const [loadingAccounts, setLoadingAccounts] = useState(true);

  useEffect(() => {
    loadAccounts();
  }, [user]);

  useEffect(() => {
    // Reset category when type changes
    if (type === 'income') {
      setCategory('Salary');
    } else if (type === 'expense') {
      setCategory('Food');
    } else {
      setCategory('Transfer');
    }
  }, [type]);

  const loadAccounts = async () => {
    if (!user) return;

    try {
      setLoadingAccounts(true);
      const fetchedAccounts = await accountService.getAccounts(user.id);
      setAccounts(fetchedAccounts);
      if (fetchedAccounts.length > 0) {
        setSelectedAccount(fetchedAccounts[0].id);
        if (fetchedAccounts.length > 1) {
          setSelectedToAccount(fetchedAccounts[1].id);
        }
      }
    } catch (error) {
      console.error('Failed to load accounts:', error);
    } finally {
      setLoadingAccounts(false);
    }
  };

  const handleAddTransaction = async () => {
    if (!user || !selectedAccount) {
      Alert.alert('Error', 'Please select an account');
      return;
    }

    if (!amount || parseFloat(amount) <= 0) {
      Alert.alert('Error', 'Please enter a valid amount');
      return;
    }

    if (!merchant.trim()) {
      Alert.alert('Error', 'Please enter a description/merchant name');
      return;
    }

    if (type === 'transfer' && !selectedToAccount) {
      Alert.alert('Error', 'Please select a destination account');
      return;
    }

    if (type === 'transfer' && selectedAccount === selectedToAccount) {
      Alert.alert('Error', 'Source and destination accounts cannot be the same');
      return;
    }

    try {
      setLoading(true);
      const now = new Date();
      const monthStr = `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}`;

      if (type === 'transfer') {
        await transactionService.transfer(user.id, {
          accountId: selectedAccount,
          toAccountId: selectedToAccount,
          amount: parseFloat(amount),
          date: now.toISOString(),
          month: monthStr,
          merchant: merchant,
          category: 'Transfer'
        });
      } else {
        await transactionService.addTransaction(user.id, {
          accountId: selectedAccount,
          amount: parseFloat(amount),
          type: type,
          category: category,
          merchant: merchant,
          date: now.toISOString().split('T')[0],
          month: monthStr,
        });
      }

      Alert.alert('Success', 'Transaction added successfully');
      // Reset form
      setAmount('');
      setMerchant('');
      setCategory(type === 'expense' ? 'Food' : 'Salary');
    } catch (error: any) {
      Alert.alert('Error', error.message || 'Failed to add transaction');
    } finally {
      setLoading(false);
    }
  };

  if (loadingAccounts) {
    return <AddTransactionSkeleton insetTop={insets.top} />;
  }

  if (accounts.length === 0) {
    return (
      <View style={[styles.container, { paddingTop: insets.top }]}>
        <View style={styles.emptyState}>
          <Ionicons name="wallet-outline" size={64} color="#CBD5E1" />
          <Text style={styles.emptyStateText}>No accounts found</Text>
          <Text style={styles.emptyStateSubtext}>Please create an account first</Text>
        </View>
      </View>
    );
  }

  return (
    <View style={[styles.container, { paddingTop: insets.top }]}>
      <ScrollView showsVerticalScrollIndicator={false} contentContainerStyle={styles.scrollContent}>
        {/* Header */}
        <View style={styles.header}>
          <Text style={styles.headerTitle}>Add Transaction</Text>
          <Text style={styles.headerSubtitle}>Record your income, expense, or transfer</Text>
        </View>

        {/* Type Selector */}
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Transaction Type</Text>
          <View style={styles.typeSelector}>
            <TouchableOpacity
              style={[styles.typeOption, type === 'income' && styles.typeOptionActive]}
              onPress={() => setType('income')}
            >
              <Ionicons name="arrow-down" size={20} color={type === 'income' ? '#10B981' : '#64748B'} />
              <Text style={[styles.typeOptionText, type === 'income' && styles.typeOptionTextActive]}>Income</Text>
            </TouchableOpacity>
            <TouchableOpacity
              style={[styles.typeOption, type === 'expense' && styles.typeOptionActive]}
              onPress={() => setType('expense')}
            >
              <Ionicons name="arrow-up" size={20} color={type === 'expense' ? '#EF4444' : '#64748B'} />
              <Text style={[styles.typeOptionText, type === 'expense' && styles.typeOptionTextActive]}>Expense</Text>
            </TouchableOpacity>
            <TouchableOpacity
              style={[styles.typeOption, type === 'transfer' && styles.typeOptionActive]}
              onPress={() => setType('transfer')}
            >
              <Ionicons name="swap-horizontal" size={20} color={type === 'transfer' ? '#3B82F6' : '#64748B'} />
              <Text style={[styles.typeOptionText, type === 'transfer' && styles.typeOptionTextActive]}>Transfer</Text>
            </TouchableOpacity>
          </View>
        </View>

        {/* Amount Input */}
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Amount</Text>
          <View style={styles.amountInputContainer}>
            <Text style={styles.currencySymbol}>₹</Text>
            <TextInput
              style={styles.amountInput}
              placeholder="0.00"
              placeholderTextColor="#CBD5E1"
              value={amount}
              onChangeText={setAmount}
              keyboardType="decimal-pad"
            />
          </View>
        </View>

        {/* Account Selector */}
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>{type === 'transfer' ? 'From Account' : 'Account'}</Text>
          <View style={styles.accountSelector}>
            {accounts.map((account) => (
              <TouchableOpacity
                key={account.id}
                style={[
                  styles.accountOption,
                  selectedAccount === account.id && styles.accountOptionActive
                ]}
                onPress={() => setSelectedAccount(account.id)}
              >
                <Ionicons
                  name={account.icon as any}
                  size={20}
                  color={selectedAccount === account.id ? '#FFFFFF' : account.color}
                />
                <Text style={[
                  styles.accountOptionText,
                  selectedAccount === account.id && styles.accountOptionTextActive
                ]}>
                  {account.name}
                </Text>
              </TouchableOpacity>
            ))}
          </View>
        </View>

        {/* To Account Selector (for transfers) */}
        {type === 'transfer' && (
          <View style={styles.section}>
            <Text style={styles.sectionTitle}>To Account</Text>
            <View style={styles.accountSelector}>
              {accounts
                .filter(acc => acc.id !== selectedAccount)
                .map(account => (
                  <TouchableOpacity
                    key={account.id}
                    style={[
                      styles.accountOption,
                      selectedToAccount === account.id && styles.accountOptionActive
                    ]}
                    onPress={() => setSelectedToAccount(account.id)}
                  >
                    <Ionicons
                      name={account.icon as any}
                      size={20}
                      color={selectedToAccount === account.id ? '#FFFFFF' : account.color}
                    />
                    <Text style={[
                      styles.accountOptionText,
                      selectedToAccount === account.id && styles.accountOptionTextActive
                    ]}>
                      {account.name}
                    </Text>
                  </TouchableOpacity>
                ))}
            </View>
          </View>
        )}

        {/* Category Selector */}
        {type !== 'transfer' && (
          <View style={styles.section}>
            <Text style={styles.sectionTitle}>Category</Text>
            <View style={styles.categoryGrid}>
              {CATEGORIES[type].map((cat) => (
                <TouchableOpacity
                  key={cat}
                  style={[
                    styles.categoryOption,
                    category === cat && styles.categoryOptionActive
                  ]}
                  onPress={() => setCategory(cat)}
                >
                  <Text style={[
                    styles.categoryOptionText,
                    category === cat && styles.categoryOptionTextActive
                  ]}>
                    {cat}
                  </Text>
                </TouchableOpacity>
              ))}
            </View>
          </View>
        )}

        {/* Merchant/Description Input */}
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Description / Merchant</Text>
          <TextInput
            style={styles.textInput}
            placeholder="Enter description or merchant name"
            placeholderTextColor="#CBD5E1"
            value={merchant}
            onChangeText={setMerchant}
          />
        </View>

        {/* Add Button */}
        <TouchableOpacity
          style={[styles.addButton, loading && styles.addButtonDisabled]}
          onPress={handleAddTransaction}
          disabled={loading}
        >
          {loading ? (
            <ActivityIndicator color="#FFFFFF" />
          ) : (
            <>
              <Ionicons name="add-circle-outline" size={24} color="#FFFFFF" />
              <Text style={styles.addButtonText}>Add Transaction</Text>
            </>
          )}
        </TouchableOpacity>

        <View style={{ height: 40 }} />
      </ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#F8FAFC',
  },
  scrollContent: {
    paddingHorizontal: 20,
  },
  header: {
    marginTop: 20,
    marginBottom: 30,
  },
  headerTitle: {
    fontSize: 28,
    fontWeight: '700',
    color: '#0F172A',
    marginBottom: 4,
  },
  headerSubtitle: {
    fontSize: 14,
    color: '#64748B',
  },
  section: {
    marginBottom: 24,
  },
  sectionTitle: {
    fontSize: 14,
    fontWeight: '600',
    color: '#475569',
    marginBottom: 12,
  },
  typeSelector: {
    flexDirection: 'row',
    gap: 10,
  },
  typeOption: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 16,
    backgroundColor: '#FFFFFF',
    borderRadius: 16,
    borderWidth: 2,
    borderColor: '#F1F5F9',
    gap: 8,
  },
  typeOptionActive: {
    borderColor: '#0F172A',
    backgroundColor: '#F8FAFC',
  },
  typeOptionText: {
    fontSize: 14,
    fontWeight: '600',
    color: '#64748B',
  },
  typeOptionTextActive: {
    color: '#0F172A',
  },
  amountInputContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#FFFFFF',
    borderRadius: 16,
    borderWidth: 2,
    borderColor: '#F1F5F9',
    paddingHorizontal: 20,
    height: 70,
  },
  currencySymbol: {
    fontSize: 32,
    fontWeight: '700',
    color: '#0F172A',
    marginRight: 8,
  },
  amountInput: {
    flex: 1,
    fontSize: 32,
    fontWeight: '700',
    color: '#0F172A',
  },
  accountSelector: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 10,
  },
  accountOption: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 12,
    paddingHorizontal: 16,
    backgroundColor: '#FFFFFF',
    borderRadius: 12,
    borderWidth: 2,
    borderColor: '#F1F5F9',
    gap: 8,
  },
  accountOptionActive: {
    backgroundColor: '#0F172A',
    borderColor: '#0F172A',
  },
  accountOptionText: {
    fontSize: 14,
    fontWeight: '600',
    color: '#475569',
  },
  accountOptionTextActive: {
    color: '#FFFFFF',
  },
  categoryGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 10,
  },
  categoryOption: {
    paddingVertical: 10,
    paddingHorizontal: 16,
    backgroundColor: '#FFFFFF',
    borderRadius: 12,
    borderWidth: 2,
    borderColor: '#F1F5F9',
  },
  categoryOptionActive: {
    backgroundColor: '#0F172A',
    borderColor: '#0F172A',
  },
  categoryOptionText: {
    fontSize: 14,
    fontWeight: '600',
    color: '#475569',
  },
  categoryOptionTextActive: {
    color: '#FFFFFF',
  },
  textInput: {
    backgroundColor: '#FFFFFF',
    borderRadius: 16,
    borderWidth: 2,
    borderColor: '#F1F5F9',
    paddingHorizontal: 16,
    paddingVertical: 16,
    fontSize: 16,
    color: '#0F172A',
  },
  addButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: '#0F172A',
    borderRadius: 16,
    paddingVertical: 18,
    gap: 8,
    marginTop: 20,
  },
  addButtonDisabled: {
    opacity: 0.6,
  },
  addButtonText: {
    fontSize: 16,
    fontWeight: '700',
    color: '#FFFFFF',
  },
  emptyState: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: 40,
  },
  emptyStateText: {
    fontSize: 20,
    fontWeight: '600',
    color: '#475569',
    marginTop: 16,
    marginBottom: 8,
  },
  emptyStateSubtext: {
    fontSize: 14,
    color: '#94A3B8',
    textAlign: 'center',
  },
});
