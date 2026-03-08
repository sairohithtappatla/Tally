import React, { useState, useMemo, useRef, useEffect, useCallback } from 'react';
import {
  View,
  Text,
  StyleSheet,
  SectionList,
  TouchableOpacity,
  Pressable,
  Dimensions,
  Animated,
  Image,
  ScrollView,
  TextInput,
  Modal,
  FlatList,
  Keyboard,
  Platform,
  KeyboardAvoidingView,
  RefreshControl,
  Alert,
} from 'react-native';
import { Ionicons, Feather } from '@expo/vector-icons';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { LinearGradient } from 'expo-linear-gradient';
import { useRouter, useLocalSearchParams } from 'expo-router';
import { useFocusEffect } from '@react-navigation/native';
import { useAuth } from '@/contexts/AuthContext';
import { TransactionsSkeleton } from '@/components/ui/SkeletonLoader';
import { transactionService } from '@/services/transactionService';
import { accountService } from '@/services/accountService';
import { Transaction as SupabaseTransaction, Account } from '@/types/supabase';

const { width: SCREEN_WIDTH, height: SCREEN_HEIGHT } = Dimensions.get('window');
const CARD_WIDTH = SCREEN_WIDTH - 40;
const SPACING = 10;

// --- TYPES ---
interface Transaction {
  id: string;
  amount: number;
  type: 'income' | 'expense' | 'transfer';
  category: string;
  account_id: string;
  to_account_id?: string | null;
  merchant: string;
  date: string;
  time?: string | null;
  month: string;
}

interface SectionData {
  title: string;
  year?: string;
  month?: string;
  netBalance?: number;
  data: Transaction[];
}

interface SummaryData {
  id: string;
  title: string;
  period: string;
  income: string;
  expenses: string;
  topCategory: string;
  color: string;
}

const CATEGORIES = ['Food', 'Shopping', 'Transport', 'Salary', 'Health', 'Entertainment', 'Bills', 'Gift', 'Other'];
const DATE_RANGES = ['Today', 'This Week', 'This Month', 'All Time', 'Custom Range'];

// --- SUB-COMPONENTS ---

const FilterModal = ({ visible, selected, options, onSelect, onClose, title }: any) => {
  const [showCustomRange, setShowCustomRange] = useState(false);
  const todayDefault = new Date();
  const firstDay = new Date(todayDefault.getFullYear(), todayDefault.getMonth(), 1);
  const lastDay = new Date(todayDefault.getFullYear(), todayDefault.getMonth() + 1, 0);

  const formatDate = (d: Date) => {
    const year = d.getFullYear();
    const month = String(d.getMonth() + 1).padStart(2, '0');
    const day = String(d.getDate()).padStart(2, '0');
    return `${year}-${month}-${day}`;
  };

  const [startDate, setStartDate] = useState(formatDate(firstDay));
  const [endDate, setEndDate] = useState(formatDate(lastDay));

  return (
    <Modal visible={visible} transparent animationType="slide">
      <Pressable style={styles.modalOverlay} onPress={() => { setShowCustomRange(false); onClose(); }}>
        <View style={styles.modalContent}>
          <View style={styles.modalHandle} />
          <Text style={styles.modalTitle}>{title}</Text>
          <ScrollView>
            {['All', ...options].map((opt: string) => (
              <View key={opt}>
                <TouchableOpacity
                  style={styles.categoryOption}
                  onPress={() => {
                    if (opt === 'Custom Range') {
                      setShowCustomRange(!showCustomRange);
                    } else {
                      onSelect(opt);
                      onClose();
                    }
                  }}
                >
                  <Text style={[styles.categoryOptionText, selected === opt && styles.categoryOptionActive]}>{opt}</Text>
                  {selected === opt && <Ionicons name="checkmark" size={20} color="#6366F1" />}
                </TouchableOpacity>

                {opt === 'Custom Range' && showCustomRange && (
                  <View style={styles.customRangeContainer}>
                    <View style={styles.rangeRow}>
                      <View style={styles.rangeInputBox}>
                        <Text style={styles.rangeLabel}>Start Date</Text>
                        <TextInput style={styles.rangeInput} value={startDate} onChangeText={setStartDate} placeholder="YYYY-MM-DD" />
                      </View>
                      <View style={styles.rangeInputBox}>
                        <Text style={styles.rangeLabel}>End Date</Text>
                        <TextInput style={styles.rangeInput} value={endDate} onChangeText={setEndDate} placeholder="YYYY-MM-DD" />
                      </View>
                    </View>
                    <TouchableOpacity
                      style={styles.applyRangeBtn}
                      onPress={() => { onSelect(`Range: ${startDate} - ${endDate}`); onClose(); }}
                    >
                      <Text style={styles.applyRangeText}>Apply Range</Text>
                    </TouchableOpacity>
                  </View>
                )}
              </View>
            ))}
          </ScrollView>
        </View>
      </Pressable>
    </Modal>
  );
};

const CustomConfirmModal = ({ visible, title, message, onConfirm, onCancel, confirmText, confirmColor }: any) => (
  <Modal visible={visible} transparent animationType="fade">
    <View style={styles.confirmOverlay}>
      <View style={styles.confirmContent}>
        <Text style={styles.confirmTitle}>{title}</Text>
        <Text style={styles.confirmMessage}>{message}</Text>
        <View style={styles.confirmButtons}>
          <TouchableOpacity style={styles.confirmBtnCancel} onPress={onCancel}>
            <Text style={styles.confirmBtnLabelCancel}>Cancel</Text>
          </TouchableOpacity>
          <TouchableOpacity
            style={[styles.confirmBtnAction, { backgroundColor: confirmColor || '#6366F1' }]}
            onPress={onConfirm}
          >
            <Text style={styles.confirmBtnLabelAction}>{confirmText || 'Confirm'}</Text>
          </TouchableOpacity>
        </View>
      </View>
    </View>
  </Modal>
);

// --- MAIN SCREEN ---

export default function TransactionsScreen() {
  const insets = useSafeAreaInsets();
  const router = useRouter();
  const params = useLocalSearchParams();
  const searchInputRef = useRef<TextInput>(null);
  const { user } = useAuth();

  // Core State
  const [transactions, setTransactions] = useState<Transaction[]>([]);
  const [accounts, setAccounts] = useState<Account[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedAccountId, setSelectedAccountId] = useState('All');
  const [selectedCategory, setSelectedCategory] = useState('All');
  const [selectedDateRange, setSelectedDateRange] = useState('This Month');
  const [showBalance, setShowBalance] = useState(true);
  const [accountNames, setAccountNames] = useState<{ [key: string]: string }>({});

  // Selection Mode State (Bulk Actions)
  const [isSelectionMode, setIsSelectionMode] = useState(false);
  const [selectedIds, setSelectedIds] = useState<Set<string>>(new Set());

  // Modal Visibility State
  const [isAccountFilterVisible, setAccountFilterVisible] = useState(false);
  const [isCategoryFilterVisible, setCategoryFilterVisible] = useState(false);
  const [isDateFilterVisible, setDateFilterVisible] = useState(false);
  const [isFormVisible, setFormVisible] = useState(false);
  const [isConfirmVisible, setIsConfirmVisible] = useState(false);

  // Form State
  const [editingTransaction, setEditingTransaction] = useState<Transaction | null>(null);
  const [formType, setFormType] = useState<'income' | 'expense'>('expense');
  const [formAmount, setFormAmount] = useState('');
  const [formMerchant, setFormMerchant] = useState('');
  const [formCategory, setFormCategory] = useState(CATEGORIES[0]);
  const [formAccount, setFormAccount] = useState('');

  // Confirmation state
  const [confirmConfig, setConfirmConfig] = useState({
    title: '',
    message: '',
    confirmText: '',
    confirmColor: '',
    onConfirm: () => { },
  });

  const scrollX = useRef(new Animated.Value(0)).current;

  // Reload data when screen comes into focus
  useFocusEffect(
    useCallback(() => {
      if (user) {
        loadTransactionsData();
      }
    }, [user])
  );

  // Initial load
  useEffect(() => {
    if (user) {
      loadTransactionsData();
    }
  }, [user]);

  // Listen for 'openModal' parameter from Navbar + button
  useEffect(() => {
    if (params.openModal === 'true') {
      openAddForm();
      router.setParams({ openModal: undefined });
    }
  }, [params.openModal]);

  const loadTransactionsData = async () => {
    try {
      setLoading(true);
      const [transactionsData, accountsData] = await Promise.all([
        transactionService.getTransactions(user!.id, 100),
        accountService.getAccounts(user!.id)
      ]);

      setTransactions(transactionsData as any);
      setAccounts(accountsData);

      // Create account name mapping
      const nameMap: { [key: string]: string } = {};
      accountsData.forEach(acc => {
        nameMap[acc.id] = acc.name;
      });
      setAccountNames(nameMap);
    } catch (error) {
      console.error('Failed to load transactions:', error);
      Alert.alert('Error', 'Failed to load transactions. Please try again.');
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  };

  const onRefresh = async () => {
    setRefreshing(true);
    await loadTransactionsData();
  };

  // Filter Logic
  const filteredTransactions = useMemo(() => {
    return transactions.filter(t => {
      // 1. Search filter
      const matchSearch = t.merchant.toLowerCase().includes(searchQuery.toLowerCase()) ||
        t.category.toLowerCase().includes(searchQuery.toLowerCase());

      // 2. Account filter
      const matchAccount = selectedAccountId === 'All' || t.account_id === selectedAccountId;

      // 3. Category filter
      const matchCategory = selectedCategory === 'All' || t.category === selectedCategory;

      // 4. Date Range filter
      let matchDate = true;
      if (selectedDateRange !== 'All Time') {
        const txnDate = new Date(t.date);
        const today = new Date();
        today.setHours(0, 0, 0, 0);

        if (selectedDateRange === 'Today') {
          const tDate = new Date(t.date);
          tDate.setHours(0, 0, 0, 0);
          matchDate = tDate.getTime() === today.getTime();
        } else if (selectedDateRange === 'This Week') {
          const weekAgo = new Date(today);
          weekAgo.setDate(today.getDate() - 7);
          matchDate = txnDate >= weekAgo;
        } else if (selectedDateRange === 'This Month') {
          const monthStart = new Date(today.getFullYear(), today.getMonth(), 1);
          matchDate = txnDate >= monthStart;
        } else if (selectedDateRange.startsWith('Range:')) {
          // Range: YYYY-MM-DD - YYYY-MM-DD
          try {
            const parts = selectedDateRange.replace('Range: ', '').split(' - ');
            const start = new Date(parts[0]);
            const end = new Date(parts[1]);
            end.setHours(23, 59, 59, 999);
            matchDate = txnDate >= start && txnDate <= end;
          } catch (e) {
            console.warn('Invalid range format:', selectedDateRange);
            matchDate = true;
          }
        }
      }

      return matchSearch && matchAccount && matchCategory && matchDate;
    });
  }, [searchQuery, selectedAccountId, selectedCategory, selectedDateRange, transactions]);

  const summaries: SummaryData[] = useMemo(() => {
    const calc = (data: Transaction[]) => {
      const income = data.filter(t => t.type === 'income').reduce((acc, t) => acc + Number(t.amount), 0);
      const expense = data.filter(t => t.type === 'expense').reduce((acc, t) => acc + Number(t.amount), 0);
      return { income, expense };
    };

    const now = new Date();
    const formatDate = (d: Date) => {
      const year = d.getFullYear();
      const month = String(d.getMonth() + 1).padStart(2, '0');
      const day = String(d.getDate()).padStart(2, '0');
      return `${year}-${month}-${day}`;
    };

    const today = formatDate(now);
    const weekAgoDate = new Date(now);
    weekAgoDate.setDate(now.getDate() - 7);
    const weekAgo = formatDate(weekAgoDate);

    const monthStartDate = new Date(now.getFullYear(), now.getMonth(), 1);
    const monthStart = formatDate(monthStartDate);

    const todayVal = calc(transactions.filter(t => t.date === today));
    const weekVal = calc(transactions.filter(t => t.date >= weekAgo));
    const monthVal = calc(transactions.filter(t => t.date >= monthStart));

    const getTopCategory = (data: Transaction[]) => {
      const catSpend: { [key: string]: number } = {};
      data.filter(t => t.type === 'expense').forEach(t => {
        catSpend[t.category] = (catSpend[t.category] || 0) + Number(t.amount);
      });
      const sorted = Object.entries(catSpend).sort((a, b) => b[1] - a[1]);
      return sorted[0]?.[0] || 'None';
    };

    const todayDate = new Date();
    const monthName = todayDate.toLocaleString('default', { month: 'long' });

    return [
      { id: '1', title: "Today's Summary", period: todayDate.toLocaleDateString('en-US', { month: 'short', day: 'numeric' }), income: `₹${todayVal.income.toLocaleString()}`, expenses: `₹${todayVal.expense.toLocaleString()}`, topCategory: getTopCategory(transactions.filter(t => t.date === today)), color: '#6366F1' },
      { id: '2', title: "This Week", period: "Last 7 days", income: `₹${weekVal.income.toLocaleString()}`, expenses: `₹${weekVal.expense.toLocaleString()}`, topCategory: getTopCategory(transactions.filter(t => t.date >= weekAgo)), color: '#0EA5E9' },
      { id: '3', title: "This Month", period: `${monthName} ${todayDate.getFullYear()}`, income: `₹${monthVal.income.toLocaleString()}`, expenses: `₹${monthVal.expense.toLocaleString()}`, topCategory: getTopCategory(transactions.filter(t => t.date >= monthStart)), color: '#F43F5E' }
    ];
  }, [transactions]);

  const sections: SectionData[] = useMemo(() => {
    if (filteredTransactions.length === 0) return [];
    const groups: { [key: string]: Transaction[] } = {};
    filteredTransactions.forEach(t => {
      if (!groups[t.date]) groups[t.date] = [];
      groups[t.date].push(t);
    });
    return Object.keys(groups).sort((a, b) => b.localeCompare(a)).map(date => {
      const dateObj = new Date(date);
      const monthStr = dateObj.toLocaleString('en-IN', { month: 'long' });
      return {
        title: `${dateObj.getDate()} ${monthStr}`,
        year: dateObj.getFullYear().toString(),
        month: monthStr,
        netBalance: groups[date].reduce((acc, t) => acc + (t.type === 'income' ? Number(t.amount) : -Number(t.amount)), 0),
        data: groups[date],
      };
    });
  }, [filteredTransactions]);

  // --- ACTIONS ---

  const toggleSelection = (id: string) => {
    const newSelected = new Set(selectedIds);
    isSelected(id) ? newSelected.delete(id) : newSelected.add(id);
    setSelectedIds(newSelected);
    if (newSelected.size === 0) setIsSelectionMode(false);
  };

  const isSelected = (id: string) => selectedIds.has(id);

  const handleLongPress = (id: string) => {
    setIsSelectionMode(true);
    toggleSelection(id);
  };

  const cancelSelection = () => {
    setIsSelectionMode(false);
    setSelectedIds(new Set());
  };

  const confirmBulkDelete = () => {
    setConfirmConfig({
      title: 'Delete Transactions?',
      message: `Are you sure you want to delete ${selectedIds.size} transactions?`,
      confirmText: 'Delete All',
      confirmColor: '#EF4444',
      onConfirm: async () => {
        try {
          await Promise.all(
            Array.from(selectedIds).map(id => transactionService.deleteTransaction(user!.id, id))
          );
          await loadTransactionsData();
          cancelSelection();
          setIsConfirmVisible(false);
        } catch (error) {
          console.error('Bulk delete failed:', error);
          Alert.alert('Error', 'Failed to delete transactions');
          setIsConfirmVisible(false);
        }
      },
    });
    setIsConfirmVisible(true);
  };

  const saveWithConfirm = () => {
    if (!formAmount || !formMerchant) {
      Alert.alert('Missing Fields', 'Please enter amount and merchant');
      return;
    }

    if (!editingTransaction) {
      // Direct Save for New Transactions (No Confirmation)
      saveTransaction();
    } else {
      // Confirm for Updates
      setConfirmConfig({
        title: 'Update Transaction?',
        message: `Confirm changes to this transaction of ₹${formAmount}?`,
        confirmText: 'Update',
        confirmColor: '#6366F1',
        onConfirm: () => {
          saveTransaction();
          setIsConfirmVisible(false);
        }
      });
      setIsConfirmVisible(true);
    }
  };

  const saveTransaction = async () => {
    try {
      const amount = parseFloat(formAmount);
      const date = new Date();
      const year = date.getFullYear();
      const monthNum = String(date.getMonth() + 1).padStart(2, '0');
      const day = String(date.getDate()).padStart(2, '0');
      const month = `${year}-${monthNum}`;
      const dateStr = `${year}-${monthNum}-${day}`;

      if (editingTransaction) {
        // Update existing transaction
        await transactionService.editTransaction(user!.id, editingTransaction.id, {
          amount,
          type: formType as 'income' | 'expense',
          merchant: formMerchant,
          category: formCategory,
          accountId: formAccount,
        });
      } else {
        // Add new transaction
        await transactionService.addTransaction(user!.id, {
          accountId: formAccount,
          amount,
          type: formType as 'income' | 'expense',
          category: formCategory,
          merchant: formMerchant,
          date: dateStr,
          month,
        });
      }

      await loadTransactionsData();
      setFormVisible(false);
    } catch (error) {
      console.error('Save transaction failed:', error);
      Alert.alert('Error', 'Failed to save transaction. Please try again.');
    }
  };

  const handleDeleteWithConfirm = (id: string) => {
    setConfirmConfig({
      title: 'Delete Transaction?',
      message: 'Are you sure you want to delete this record?',
      confirmText: 'Delete',
      confirmColor: '#EF4444',
      onConfirm: async () => {
        try {
          await transactionService.deleteTransaction(user!.id, id);
          await loadTransactionsData();
          setFormVisible(false);
          setIsConfirmVisible(false);
        } catch (error) {
          console.error('Delete transaction failed:', error);
          Alert.alert('Error', 'Failed to delete transaction');
          setIsConfirmVisible(false);
        }
      }
    });
    setIsConfirmVisible(true);
  };

  // --- RENDERING ---

  const renderTransaction = useCallback(({ item }: { item: Transaction }) => {
    const isSel = isSelected(item.id);
    const getAvatarColor = (name: string) => {
      const colors = ['#9C27B0', '#1976D2', '#D32F2F', '#0288D1', '#388E3C', '#FBC02D'];
      return colors[name.charCodeAt(0) % colors.length];
    };

    const accountName = accountNames[item.account_id] || 'Unknown';
    const formattedDate = new Date(item.date).toLocaleDateString('en-US', { month: 'short', day: 'numeric' });
    const timeStr = item.time
      ? (() => {
        const [h, m] = item.time.split(':').map(Number);
        const suffix = h >= 12 ? 'PM' : 'AM';
        return `${((h % 12) || 12)}:${String(m).padStart(2, '0')} ${suffix}`;
      })()
      : null;

    return (
      <TouchableOpacity
        style={[styles.transactionCard, isSel && styles.transactionCardSelected]}
        onPress={() => isSelectionMode ? toggleSelection(item.id) : openEditForm(item)}
        onLongPress={() => handleLongPress(item.id)}
        activeOpacity={0.7}
      >
        <View style={styles.cardLeft}>
          {isSelectionMode ? (
            <View style={[styles.checkbox, isSel && styles.checkboxSelected]}>
              {isSel && <Ionicons name="checkmark" size={14} color="#FFF" />}
            </View>
          ) : (
            <View style={[styles.avatar, { backgroundColor: getAvatarColor(item.merchant) }]}>
              <Text style={styles.avatarText}>{item.merchant.charAt(0)}</Text>
            </View>
          )}
        </View>
        <View style={styles.cardCenter}>
          <Text style={styles.merchantName} numberOfLines={1}>{item.merchant}</Text>
          <Text style={styles.dateSubtext}>{item.category} • {accountName} • {formattedDate}{timeStr ? ` • ${timeStr}` : ''}</Text>
        </View>
        <View style={styles.cardRight}>
          <Text style={[styles.amountText, { color: item.type === 'income' ? '#10B981' : '#0F172A' }]}>
            {item.type === 'income' ? '+ ' : ''}₹{Number(item.amount).toLocaleString('en-IN')}
          </Text>
        </View>
      </TouchableOpacity>
    );
  }, [transactions, isSelectionMode, selectedIds, accountNames]);

  const openAddForm = () => {
    if (accounts.length === 0) {
      Alert.alert('No Accounts', 'Please create an account first');
      return;
    }
    setEditingTransaction(null);
    setFormType('expense');
    setFormAmount('');
    setFormMerchant('');
    setFormCategory(CATEGORIES[0]);
    setFormAccount(accounts[0].id);
    setFormVisible(true);
  };

  const openEditForm = (t: Transaction) => {
    setEditingTransaction(t);
    setFormType(t.type as 'income' | 'expense');
    setFormAmount(t.amount.toString());
    setFormMerchant(t.merchant);
    setFormCategory(t.category);
    setFormAccount(t.account_id);
    setFormVisible(true);
  };

  const ListHeader = useCallback(() => {
    const selectedAccountName = selectedAccountId === 'All'
      ? 'All'
      : (accountNames[selectedAccountId] || 'All');

    return (
      <View style={styles.listHeaderWrapper}>
        <View style={styles.filtersContainer}>
          <View style={styles.filterSection}>
            <Text style={styles.outsideLabel}>Account</Text>
            <TouchableOpacity style={styles.filterPillCompact} onPress={() => setAccountFilterVisible(true)}>
              <Text style={styles.filterPillText}>{selectedAccountName}</Text>
              <Ionicons name="caret-down" size={10} color="#64748B" />
            </TouchableOpacity>
          </View>
          <View style={styles.filterSection}>
            <Text style={styles.outsideLabel}>Category</Text>
            <TouchableOpacity style={styles.filterPillCompact} onPress={() => setCategoryFilterVisible(true)}>
              <Text style={styles.filterPillText}>{selectedCategory}</Text>
              <Ionicons name="caret-down" size={10} color="#64748B" />
            </TouchableOpacity>
          </View>
          <View style={styles.filterSection}>
            <Text style={styles.outsideLabel}>Date</Text>
            <TouchableOpacity style={styles.filterPillCompact} onPress={() => setDateFilterVisible(true)}>
              <Ionicons name="calendar-outline" size={12} color="#64748B" style={{ marginRight: 2 }} />
              <Text style={styles.filterPillText} numberOfLines={1}>{selectedDateRange}</Text>
              <Ionicons name="caret-down" size={10} color="#64748B" />
            </TouchableOpacity>
          </View>
        </View>

        <View style={styles.carouselWrapper}>
          <Animated.FlatList
            data={summaries} horizontal pagingEnabled={false} showsHorizontalScrollIndicator={false}
            snapToInterval={CARD_WIDTH + SPACING} decelerationRate="fast" contentContainerStyle={{ paddingHorizontal: 20, gap: SPACING }}
            keyExtractor={(item) => item.id} onScroll={Animated.event([{ nativeEvent: { contentOffset: { x: scrollX } } }], { useNativeDriver: true })}
            scrollEventThrottle={16}
            renderItem={({ item, index }) => {
              const inputRange = [(index - 1) * (CARD_WIDTH + SPACING), index * (CARD_WIDTH + SPACING), (index + 1) * (CARD_WIDTH + SPACING)];
              const scale = scrollX.interpolate({ inputRange, outputRange: [0.95, 1, 0.95], extrapolate: 'clamp' });
              const opacity = scrollX.interpolate({ inputRange, outputRange: [0.85, 1, 0.85], extrapolate: 'clamp' });
              return (
                <Animated.View style={{ width: CARD_WIDTH, transform: [{ scale }], opacity }}>
                  <LinearGradient
                    colors={item.color === '#6366F1' ? ['#4F46E5', '#6366F1'] : item.color === '#0EA5E9' ? ['#0284C7', '#0EA5E9'] : ['#E11D48', '#F43F5E']}
                    start={{ x: 0, y: 0 }} end={{ x: 1, y: 1 }}
                    style={[styles.modernSummaryCard, { width: CARD_WIDTH }]}
                  >
                    <View style={styles.cardTopRow}>
                      <View><Text style={styles.cardLabelSmall}>{item.title.toUpperCase()}</Text><Text style={styles.periodTextPremium}>{item.period}</Text></View>
                      <View style={styles.sparkleWrapper}><Ionicons name="sparkles-outline" size={18} color="#FFFFFF" /></View>
                    </View>
                    <View style={styles.middleRow}>
                      <View><Text style={styles.columnLabel}>Income</Text><Text style={styles.columnValue}>{showBalance ? item.income : '••••••'}</Text></View>
                      <View style={{ alignItems: 'flex-end' }}><Text style={styles.columnLabel}>Expenses</Text><Text style={styles.columnValue}>{showBalance ? item.expenses : '••••••'}</Text></View>
                    </View>
                    <TouchableOpacity style={styles.topSpendPill} onPress={() => setShowBalance(!showBalance)}>
                      <Text style={styles.topSpendText}>Top Spend: {item.topCategory}</Text>
                    </TouchableOpacity>
                  </LinearGradient>
                </Animated.View>
              );
            }}
          />
        </View>
      </View>
    );
  }, [selectedAccountId, selectedCategory, selectedDateRange, scrollX, showBalance, summaries, accountNames]);

  return (
    <View style={[styles.mainContainer, { paddingTop: insets.top }]}>
      {loading && !refreshing ? (
        <TransactionsSkeleton insetTop={0} />
      ) : (
        <>
          <View style={styles.headerContainer}>
            {isSelectionMode ? (
              <View style={styles.selectionHeader}>
                <TouchableOpacity onPress={cancelSelection} style={styles.headerIconBtn}><Ionicons name="close" size={24} color="#0F172A" /></TouchableOpacity>
                <Text style={styles.selectionCount}>{selectedIds.size} Selected</Text>
                <TouchableOpacity onPress={confirmBulkDelete} style={styles.headerIconBtn}><Ionicons name="trash-outline" size={24} color="#EF4444" /></TouchableOpacity>
              </View>
            ) : (
              <View style={styles.searchBarContainer}>
                <TouchableOpacity onPress={() => searchQuery ? setSearchQuery('') : router.push('/')} style={styles.backButton}><Ionicons name="arrow-back" size={24} color="#0F172A" /></TouchableOpacity>
                <TextInput ref={searchInputRef} placeholder="Search transactions" style={styles.searchPlaceholder} placeholderTextColor="#64748B" value={searchQuery} onChangeText={setSearchQuery} autoCorrect={false} spellCheck={false} />
                {searchQuery.length > 0 && (
                  <TouchableOpacity onPress={() => setSearchQuery('')} style={styles.clearButton}><Ionicons name="close-circle" size={20} color="#94A3B8" /></TouchableOpacity>
                )}
              </View>
            )}
          </View>

          <SectionList
            sections={sections}
            ListHeaderComponent={ListHeader}
            keyExtractor={(item) => item.id}
            renderItem={renderTransaction}
            renderSectionHeader={({ section }) => (
              <View style={styles.monthHeaderRow}>
                <View><Text style={styles.yearText}>{section.year}</Text><Text style={styles.monthText}>{section.title}</Text></View>
                {!isSelectionMode && (
                  <Text style={[styles.monthNetText, { color: section.netBalance! >= 0 ? '#10B981' : '#DC2626' }]}>
                    {section.netBalance! >= 0 ? '+ ' : ''}₹{Math.abs(section.netBalance!).toLocaleString('en-IN')}
                  </Text>
                )}
              </View>
            )}
            stickySectionHeadersEnabled={false}
            showsVerticalScrollIndicator={false}
            contentContainerStyle={styles.scrollContent}
            keyboardShouldPersistTaps="always"
            keyboardDismissMode="on-drag"
            refreshControl={
              <RefreshControl
                refreshing={refreshing}
                onRefresh={onRefresh}
                tintColor="#6366F1"
                colors={['#6366F1']}
              />
            }
            ListEmptyComponent={
              <View style={styles.emptyState}>
                <Ionicons name="receipt-outline" size={60} color="#E2E8F0" />
                <Text style={styles.emptyText}>No transactions found</Text>
                <TouchableOpacity
                  style={{ marginTop: 16, backgroundColor: '#6366F1', paddingHorizontal: 20, paddingVertical: 10, borderRadius: 12 }}
                  onPress={openAddForm}
                >
                  <Text style={{ color: '#FFF', fontWeight: '600' }}>Add Transaction</Text>
                </TouchableOpacity>
              </View>
            }
          />

          <FilterModal visible={isAccountFilterVisible} title="Select Account" selected={selectedAccountId} options={accounts.map(a => a.name)} onSelect={(name: string) => {
            if (name === 'All') {
              setSelectedAccountId('All');
            } else {
              const account = accounts.find(a => a.name === name);
              if (account) setSelectedAccountId(account.id);
            }
          }} onClose={() => setAccountFilterVisible(false)} />
          <FilterModal visible={isCategoryFilterVisible} title="Select Category" selected={selectedCategory} options={CATEGORIES} onSelect={setSelectedCategory} onClose={() => setCategoryFilterVisible(false)} />
          <FilterModal visible={isDateFilterVisible} title="Select Date Range" selected={selectedDateRange} options={DATE_RANGES} onSelect={setSelectedDateRange} onClose={() => setDateFilterVisible(false)} />

          {/* REFINED TRANSACTION FORM MODAL */}
          <Modal visible={isFormVisible} transparent animationType="slide">
            <KeyboardAvoidingView
              behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
              style={{ flex: 1 }}
            >
              <Pressable style={styles.modalOverlay} onPress={() => setFormVisible(false)}>
                <Pressable style={styles.formContainerCompact} onPress={e => e.stopPropagation()}>
                  <View style={styles.modalHandle} />

                  <View style={styles.formHeader}>
                    <Text style={styles.formTitle}>{editingTransaction ? 'Details' : 'New Transaction'}</Text>
                    {editingTransaction && (
                      <TouchableOpacity onPress={() => handleDeleteWithConfirm(editingTransaction.id)}>
                        <Ionicons name="trash-outline" size={24} color="#EF4444" />
                      </TouchableOpacity>
                    )}
                  </View>

                  <View style={styles.typeSelector}>
                    <TouchableOpacity style={[styles.typeButton, formType === 'expense' && styles.typeButtonActiveExpense]} onPress={() => setFormType('expense')}>
                      <Text style={[styles.typeButtonText, formType === 'expense' && styles.typeButtonTextActive]}>Expense</Text>
                    </TouchableOpacity>
                    <TouchableOpacity style={[styles.typeButton, formType === 'income' && styles.typeButtonActiveIncome]} onPress={() => setFormType('income')}>
                      <Text style={[styles.typeButtonText, formType === 'income' && styles.typeButtonTextActive]}>Income</Text>
                    </TouchableOpacity>
                  </View>

                  <View style={styles.inputGroupCompact}>
                    <Text style={styles.inputLabelCompact}>Amount</Text>
                    <View style={styles.amountInputWrapperCompact}>
                      <Text style={styles.currencySymbolCompact}>₹</Text>
                      <TextInput
                        style={styles.amountInputCompact}
                        placeholder="0.00"
                        keyboardType="decimal-pad"
                        value={formAmount}
                        onChangeText={setFormAmount}
                        placeholderTextColor="#94A3B8"
                        autoFocus={!editingTransaction}
                      />
                    </View>
                  </View>

                  <View style={styles.inputGroupCompact}>
                    <Text style={styles.inputLabelCompact}>Merchant / Title</Text>
                    <TextInput style={styles.textInputCompact} placeholder="e.g. Starbucks, Salary" value={formMerchant} onChangeText={setFormMerchant} placeholderTextColor="#94A3B8" />
                  </View>

                  <View style={styles.inputGroupCompact}>
                    <Text style={styles.inputLabelCompact}>Category</Text>
                    <ScrollView horizontal showsHorizontalScrollIndicator={false} style={styles.horizontalScroll}>
                      {CATEGORIES.map(cat => (
                        <TouchableOpacity key={cat} style={[styles.miniPill, formCategory === cat && styles.miniPillActive]} onPress={() => setFormCategory(cat)}>
                          <Text style={[styles.miniPillText, formCategory === cat && styles.miniPillTextActive]}>{cat}</Text>
                        </TouchableOpacity>
                      ))}
                    </ScrollView>
                  </View>

                  <View style={styles.inputGroupCompact}>
                    <Text style={styles.inputLabelCompact}>Account</Text>
                    <View style={styles.accountFastSelector}>
                      {accounts.map(acc => (
                        <TouchableOpacity
                          key={acc.id}
                          style={[styles.accSelectorPill, formAccount === acc.id && styles.accSelectorPillActive]}
                          onPress={() => setFormAccount(acc.id)}
                        >
                          <Text style={[styles.accSelectorText, formAccount === acc.id && styles.accSelectorTextActive]}>{acc.name}</Text>
                        </TouchableOpacity>
                      ))}
                    </View>
                  </View>

                  <TouchableOpacity style={styles.saveButtonCompact} onPress={saveWithConfirm}>
                    <LinearGradient colors={['#6366F1', '#4F46E5']} style={styles.saveGradientCompact}>
                      <Text style={styles.saveButtonText}>{editingTransaction ? 'Save Changes' : 'Add Transaction'}</Text>
                    </LinearGradient>
                  </TouchableOpacity>
                  {/* Decorative background to fill the gap at the bottom when keyboard pushes modal */}
                  <View style={styles.modalBottomFill} />
                </Pressable>
              </Pressable>
            </KeyboardAvoidingView>
          </Modal>

          <CustomConfirmModal visible={isConfirmVisible} title={confirmConfig.title} message={confirmConfig.message} confirmText={confirmConfig.confirmText} confirmColor={confirmConfig.confirmColor} onConfirm={confirmConfig.onConfirm} onCancel={() => setIsConfirmVisible(false)} />
        </>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  mainContainer: { flex: 1, backgroundColor: '#FFFFFF' },
  scrollContent: { paddingBottom: 150 },
  headerContainer: { paddingHorizontal: 16, paddingVertical: 12 },
  searchBarContainer: { flexDirection: 'row', alignItems: 'center', backgroundColor: '#F1F5F9', borderRadius: 24, paddingHorizontal: 12, height: 48 },
  selectionHeader: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', backgroundColor: '#F8FAFC', borderRadius: 24, paddingHorizontal: 16, height: 48, borderWidth: 1, borderColor: '#E2E8F0' },
  selectionCount: { fontSize: 16, fontWeight: '700', color: '#0F172A' },
  headerIconBtn: { padding: 8 },
  backButton: { padding: 4 },
  searchPlaceholder: { flex: 1, marginLeft: 12, fontSize: 16, color: '#0F172A', padding: 0 },
  clearButton: { padding: 4 },

  listHeaderWrapper: { paddingBottom: 8 },
  filtersContainer: { flexDirection: 'row', paddingHorizontal: 16, marginTop: 12, justifyContent: 'space-between', marginBottom: 16 },
  filterSection: { alignItems: 'flex-start', gap: 4, flex: 1 },
  outsideLabel: { fontSize: 11, color: '#94A3B8', fontWeight: '600', textTransform: 'uppercase', marginLeft: 4 },
  filterPillCompact: { flexDirection: 'row', alignItems: 'center', paddingHorizontal: 8, paddingVertical: 6, borderRadius: 12, borderWidth: 1, borderColor: '#E2E8F0', gap: 4, backgroundColor: '#F8FAFC', minWidth: 80, justifyContent: 'space-between' },
  filterPillText: { fontSize: 11, color: '#475569', fontWeight: '700' },

  carouselWrapper: { marginTop: 8, marginBottom: 24 },
  modernSummaryCard: { height: 195, borderRadius: 28, padding: 24, justifyContent: 'space-between', shadowColor: '#4F46E5', shadowOffset: { width: 0, height: 8 }, shadowOpacity: 0.12, shadowRadius: 12, elevation: 6 },
  cardTopRow: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'flex-start' },
  cardLabelSmall: { color: 'rgba(255,255,255,0.7)', fontSize: 11, fontWeight: '700', letterSpacing: 1 },
  periodTextPremium: { fontSize: 22, color: '#FFF', fontWeight: '800', marginTop: 4 },
  sparkleWrapper: { backgroundColor: 'rgba(255,255,255,0.15)', padding: 8, borderRadius: 14 },
  middleRow: { flexDirection: 'row', justifyContent: 'space-between', marginTop: 10 },
  columnLabel: { fontSize: 12, color: 'rgba(255,255,255,0.6)' },
  columnValue: { fontSize: 18, fontWeight: '700', color: '#FFFFFF', marginTop: 2 },
  topSpendPill: { alignSelf: 'flex-start', backgroundColor: 'rgba(255,255,255,0.15)', paddingHorizontal: 12, paddingVertical: 6, borderRadius: 12 },
  topSpendText: { color: '#FFFFFF', fontSize: 12, fontWeight: '600' },

  modalOverlay: { flex: 1, backgroundColor: 'rgba(0,0,0,0.5)', justifyContent: 'flex-end' },
  modalContent: { backgroundColor: '#FFF', borderTopLeftRadius: 32, borderTopRightRadius: 32, padding: 24, paddingBottom: 40, maxHeight: '85%' },
  formContainerCompact: {
    backgroundColor: '#FFF',
    borderTopLeftRadius: 32,
    borderTopRightRadius: 32,
    paddingHorizontal: 24,
    paddingTop: 16,
    paddingBottom: Platform.OS === 'ios' ? 40 : 24,
    width: SCREEN_WIDTH,
    zIndex: 10,
  },
  modalBottomFill: {
    position: 'absolute',
    bottom: -100, // Extends below the modal to hide gaps
    left: 0,
    right: 0,
    height: 100,
    backgroundColor: '#FFF',
  },
  inputGroupCompact: {
    marginBottom: 16,
  },
  inputLabelCompact: {
    fontSize: 11,
    color: '#64748B',
    fontWeight: '700',
    marginBottom: 6,
    textTransform: 'uppercase',
    letterSpacing: 0.5,
  },
  amountInputWrapperCompact: {
    flexDirection: 'row',
    alignItems: 'center',
    borderBottomWidth: 2,
    borderBottomColor: '#6366F1',
    paddingVertical: 4,
  },
  currencySymbolCompact: {
    fontSize: 28,
    fontWeight: '800',
    color: '#0F172A',
    marginRight: 12,
    marginBottom: -2, // Optical alignment
  },
  amountInputCompact: {
    flex: 1,
    fontSize: 28,
    fontWeight: '800',
    color: '#0F172A',
    padding: 0,
    includeFontPadding: false, // Fix Android text clipping
  },
  textInputCompact: {
    backgroundColor: '#F8FAFC',
    borderRadius: 14,
    paddingHorizontal: 16,
    paddingVertical: 12,
    fontSize: 15,
    color: '#0F172A',
    borderWidth: 1,
    borderColor: '#E2E8F0',
  },
  horizontalScroll: {
    marginHorizontal: -4,
  },
  saveButtonCompact: {
    marginTop: 10,
  },
  saveGradientCompact: {
    paddingVertical: 16,
    borderRadius: 16,
    alignItems: 'center',
  },
  modalHandle: { width: 40, height: 5, backgroundColor: '#E2E8F0', borderRadius: 10, alignSelf: 'center', marginBottom: 20 },
  modalTitle: { fontSize: 18, fontWeight: '800', color: '#0F172A', marginBottom: 20, textAlign: 'center' },
  categoryOption: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', paddingVertical: 16, borderBottomWidth: 1, borderBottomColor: '#F8FAFC' },
  categoryOptionText: { fontSize: 16, color: '#64748B', fontWeight: '500' },
  categoryOptionActive: { color: '#6366F1', fontWeight: '700' },

  customRangeContainer: { padding: 16, backgroundColor: '#F8FAFC', borderRadius: 16, marginTop: 8 },
  rangeRow: { flexDirection: 'row', gap: 12 },
  rangeInputBox: { flex: 1 },
  rangeLabel: { fontSize: 11, fontWeight: '700', color: '#94A3B8', marginBottom: 4 },
  rangeInput: { backgroundColor: '#FFF', borderWidth: 1, borderColor: '#E2E8F0', borderRadius: 10, padding: 10, fontSize: 14, color: '#0F172A' },
  applyRangeBtn: { backgroundColor: '#6366F1', paddingVertical: 12, borderRadius: 12, alignItems: 'center', marginTop: 16 },
  applyRangeText: { color: '#FFF', fontWeight: '700', fontSize: 14 },

  monthHeaderRow: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', paddingHorizontal: 16, paddingVertical: 16, marginTop: 8, backgroundColor: '#F8FAFC' },
  yearText: { fontSize: 11, color: '#94A3B8', textTransform: 'uppercase', letterSpacing: 0.5 },
  monthText: { fontSize: 18, fontWeight: '700', color: '#1E293B' },
  monthNetText: { fontSize: 15, fontWeight: '700' },

  transactionCard: { flexDirection: 'row', alignItems: 'center', backgroundColor: '#FFFFFF', paddingHorizontal: 16, paddingVertical: 14, borderBottomWidth: 1, borderBottomColor: '#F1F5F9' },
  transactionCardSelected: { backgroundColor: '#F1F5FF' },
  cardLeft: { width: 44, alignItems: 'center' },
  checkbox: { width: 22, height: 22, borderRadius: 6, borderWidth: 2, borderColor: '#CBD5E1', justifyContent: 'center', alignItems: 'center' },
  checkboxSelected: { backgroundColor: '#6366F1', borderColor: '#6366F1' },
  avatar: { width: 44, height: 44, borderRadius: 22, justifyContent: 'center', alignItems: 'center' },
  avatarText: { color: '#FFFFFF', fontSize: 18, fontWeight: '700' },
  cardCenter: { flex: 1, marginLeft: 16 },
  merchantName: { fontSize: 16, color: '#1E293B', fontWeight: '600' },
  dateSubtext: { fontSize: 12, color: '#64748B', marginTop: 2 },
  cardRight: { alignItems: 'flex-end' },
  amountText: { fontSize: 16, fontWeight: '700' },
  emptyState: { padding: 80, alignItems: 'center' },
  emptyText: { marginTop: 16, fontSize: 14, color: '#94A3B8' },

  formHeader: {
    flexDirection: 'row',
    justifyContent: 'center', // Center title by default
    alignItems: 'center',
    marginBottom: 24,
    position: 'relative',
  },
  formTitle: {
    fontSize: 22,
    fontWeight: '800',
    color: '#0F172A',
    textAlign: 'center',
  },
  typeSelector: { flexDirection: 'row', backgroundColor: '#F1F5F9', borderRadius: 16, padding: 4, marginBottom: 24 },
  typeButton: { flex: 1, paddingVertical: 12, alignItems: 'center', borderRadius: 12 },
  typeButtonActiveExpense: { backgroundColor: '#EF4444' },
  typeButtonActiveIncome: { backgroundColor: '#10B981' },
  typeButtonText: { fontSize: 14, fontWeight: '600', color: '#64748B' },
  typeButtonTextActive: { color: '#FFF' },
  inputGroup: { marginBottom: 24 },
  inputLabel: { fontSize: 13, color: '#64748B', fontWeight: '600', marginBottom: 8, textTransform: 'uppercase', letterSpacing: 0.5 },
  amountInputWrapper: { flexDirection: 'row', alignItems: 'center', borderBottomWidth: 2, borderBottomColor: '#6366F1', paddingVertical: 8 },
  currencySymbol: { fontSize: 36, fontWeight: '800', color: '#0F172A', marginRight: 8 },
  amountInput: { flex: 1, fontSize: 36, fontWeight: '800', color: '#0F172A', padding: 0 },
  textInput: { backgroundColor: '#F8FAFC', borderRadius: 16, padding: 18, fontSize: 16, color: '#0F172A', borderWidth: 1, borderColor: '#E2E8F0' },
  pickerButton: { backgroundColor: '#F8FAFC', borderRadius: 16, padding: 14, borderWidth: 1, borderColor: '#E2E8F0' },
  miniPill: { paddingHorizontal: 16, paddingVertical: 8, borderRadius: 12, backgroundColor: '#FFF', marginRight: 10, borderWidth: 1, borderColor: '#E2E8F0' },
  miniPillActive: { backgroundColor: '#6366F1', borderColor: '#6366F1' },
  miniPillText: { fontSize: 14, color: '#64748B', fontWeight: '600' },
  miniPillTextActive: { color: '#FFF' },
  accountFastSelector: { flexDirection: 'row', gap: 12 },
  accSelectorPill: { flex: 1, paddingVertical: 14, borderRadius: 14, backgroundColor: '#F8FAFC', alignItems: 'center', borderWidth: 1, borderColor: '#E2E8F0' },
  accSelectorPillActive: { backgroundColor: '#0F172A', borderColor: '#0F172A' },
  accSelectorText: { fontSize: 14, fontWeight: '600', color: '#64748B' },
  accSelectorTextActive: { color: '#FFF' },
  metaInfoRow: { marginTop: 12, marginBottom: 24 },
  metaInfoText: { fontSize: 13, color: '#94A3B8', fontStyle: 'italic' },
  saveButton: { marginTop: 8 },
  saveGradient: { paddingVertical: 18, borderRadius: 18, alignItems: 'center' },
  saveButtonText: { color: '#FFF', fontSize: 18, fontWeight: '700' },

  confirmOverlay: { flex: 1, backgroundColor: 'rgba(0,0,0,0.6)', justifyContent: 'center', alignItems: 'center', padding: 32 },
  confirmContent: { backgroundColor: '#FFF', borderRadius: 24, padding: 24, alignItems: 'center', width: '100%', shadowColor: '#000', shadowOpacity: 0.1, shadowRadius: 20, elevation: 10 },
  confirmTitle: { fontSize: 20, fontWeight: '800', color: '#0F172A', marginBottom: 12 },
  confirmMessage: { fontSize: 15, color: '#64748B', lineHeight: 22, textAlign: 'center', marginBottom: 24 },
  confirmButtons: { flexDirection: 'row', gap: 12, width: '100%' },
  confirmBtnCancel: { flex: 1, paddingVertical: 12, borderRadius: 12, backgroundColor: '#F1F5F9', alignItems: 'center' },
  confirmBtnLabelCancel: { fontSize: 14, fontWeight: '600', color: '#64748B' },
  confirmBtnAction: { flex: 1, paddingVertical: 12, borderRadius: 12, alignItems: 'center' },
  confirmBtnLabelAction: { fontSize: 14, fontWeight: '600', color: '#FFF' },
});
