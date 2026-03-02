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
} from 'react-native';
import { Ionicons, Feather } from '@expo/vector-icons';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { LinearGradient } from 'expo-linear-gradient';
import { useRouter, useLocalSearchParams } from 'expo-router';

const { width: SCREEN_WIDTH, height: SCREEN_HEIGHT } = Dimensions.get('window');
const CARD_WIDTH = SCREEN_WIDTH - 40;
const SPACING = 10;

// --- TYPES ---
interface Transaction {
  id: string;
  amount: number;
  type: 'income' | 'expense';
  category: string;
  accountId: string;
  merchant: string;
  date: string;
  time: string;
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

// --- MOCK DATA ---
const INITIAL_TRANSACTIONS: Transaction[] = [
  { id: '1', amount: 100.00, type: 'expense', category: 'Food', accountId: 'SBI', merchant: 'MANYAM RADHAKRISHNA CHAITANYA', date: '2026-03-01', time: '10:30 AM' },
  { id: '2', amount: 60.00, type: 'expense', category: 'Food', accountId: 'Union', merchant: 'SR FOOD PARK', date: '2026-03-01', time: '09:00 AM' },
  { id: '3', amount: 5000.00, type: 'income', category: 'Salary', accountId: 'SBI', merchant: 'BHANU TAPPATLA', date: '2026-03-01', time: '08:45 PM' },
  { id: '4', amount: 1000.00, type: 'expense', category: 'Entertainment', accountId: 'Union', merchant: 'AuraGold', date: '2026-03-01', time: '12:00 AM' },
  { id: '5', amount: 2500.00, type: 'expense', category: 'Shopping', accountId: 'SBI', merchant: 'AuraGold', date: '2026-03-01', time: '08:00 PM' },
  { id: '6', amount: 2500.00, type: 'expense', category: 'Shopping', accountId: 'SBI', merchant: 'AuraGold', date: '2026-03-01', time: '08:00 PM' },
  { id: '7', amount: 6000.00, type: 'income', category: 'Salary', accountId: 'Union', merchant: 'Sapthagiri Rajan Rajamanickam', date: '2026-03-01', time: '09:00 AM' },
  { id: '8', amount: 150.00, type: 'expense', category: 'Health', accountId: 'SBI', merchant: 'Sapthagiri Rajan Rajamanickam', date: '2026-03-01', time: '10:30 AM' }
];

const CATEGORIES = ['Food', 'Salary', 'Entertainment', 'Shopping', 'Health', 'Transport', 'Bills'];
const ACCOUNTS = ['SBI', 'Union'];
const DATE_RANGES = ['Today', 'This Week', 'This Month', 'All Time', 'Custom Range'];

// --- SUB-COMPONENTS ---

const FilterModal = ({ visible, selected, options, onSelect, onClose, title }: any) => {
  const [showCustomRange, setShowCustomRange] = useState(false);
  const [startDate, setStartDate] = useState('2026-03-01');
  const [endDate, setEndDate] = useState('2026-03-31');

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

  // Core State
  const [transactions, setTransactions] = useState<Transaction[]>(INITIAL_TRANSACTIONS);
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedAccountId, setSelectedAccountId] = useState('All');
  const [selectedCategory, setSelectedCategory] = useState('All');
  const [selectedDateRange, setSelectedDateRange] = useState('This Month');
  const [showBalance, setShowBalance] = useState(true);

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
  const [formAccount, setFormAccount] = useState(ACCOUNTS[0]);

  // Confirmation state
  const [confirmConfig, setConfirmConfig] = useState({
    title: '',
    message: '',
    confirmText: '',
    confirmColor: '',
    onConfirm: () => { },
  });

  const scrollX = useRef(new Animated.Value(0)).current;

  // Listen for 'openModal' parameter from Navbar + button
  useEffect(() => {
    if (params.openModal === 'true') {
      openAddForm();
      router.setParams({ openModal: undefined });
    }
  }, [params.openModal]);

  // Filter Logic
  const filteredTransactions = useMemo(() => {
    return transactions.filter(t => {
      const matchSearch = t.merchant.toLowerCase().includes(searchQuery.toLowerCase()) ||
        t.category.toLowerCase().includes(searchQuery.toLowerCase());
      const matchAccount = selectedAccountId === 'All' || t.accountId === selectedAccountId;
      const matchCategory = selectedCategory === 'All' || t.category === selectedCategory;
      return matchSearch && matchAccount && matchCategory;
    });
  }, [searchQuery, selectedAccountId, selectedCategory, transactions]);

  const summaries: SummaryData[] = useMemo(() => {
    const calc = (data: Transaction[]) => {
      const income = data.filter(t => t.type === 'income').reduce((acc, t) => acc + t.amount, 0);
      const expense = data.filter(t => t.type === 'expense').reduce((acc, t) => acc + t.amount, 0);
      return { income, expense };
    };
    const todayVal = calc(transactions.filter(t => t.date === '2026-03-01'));
    const weekVal = calc(transactions);
    const monthVal = calc(transactions);
    return [
      { id: '1', title: "Today's Summary", period: "March 1st", income: `₹${todayVal.income.toLocaleString()}`, expenses: `₹${todayVal.expense.toLocaleString()}`, topCategory: "Food", color: '#6366F1' },
      { id: '2', title: "This Week", period: "Feb 23 – Mar 1", income: `₹${weekVal.income.toLocaleString()}`, expenses: `₹${weekVal.expense.toLocaleString()}`, topCategory: "Shopping", color: '#0EA5E9' },
      { id: '3', title: "This Month", period: "March 2026", income: `₹${monthVal.income.toLocaleString()}`, expenses: `₹${monthVal.expense.toLocaleString()}`, topCategory: "Food", color: '#F43F5E' }
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
        netBalance: groups[date].reduce((acc, t) => acc + (t.type === 'income' ? t.amount : -t.amount), 0),
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
      onConfirm: () => {
        setTransactions(prev => prev.filter(t => !selectedIds.has(t.id)));
        cancelSelection();
        setIsConfirmVisible(false);
      },
    });
    setIsConfirmVisible(true);
  };

  const saveWithConfirm = () => {
    if (!formAmount || !formMerchant) return;

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

  const saveTransaction = () => {
    const transactionData: Transaction = {
      id: editingTransaction ? editingTransaction.id : Math.random().toString(36).substr(2, 9),
      amount: parseFloat(formAmount),
      type: formType,
      merchant: formMerchant,
      category: formCategory,
      accountId: formAccount,
      date: editingTransaction ? editingTransaction.date : new Date().toISOString().split('T')[0],
      time: editingTransaction ? editingTransaction.time : new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
    };

    setTransactions(prev => editingTransaction
      ? prev.map(t => t.id === editingTransaction.id ? transactionData : t)
      : [transactionData, ...prev]
    );
    setFormVisible(false);
  };

  const handleDeleteWithConfirm = (id: string) => {
    setConfirmConfig({
      title: 'Delete Transaction?',
      message: 'Are you sure you want to delete this record?',
      confirmText: 'Delete',
      confirmColor: '#EF4444',
      onConfirm: () => {
        setTransactions(prev => prev.filter(t => t.id !== id));
        setFormVisible(false);
        setIsConfirmVisible(false);
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
          {/* UPDATED: Added logged time beside category/account */}
          <Text style={styles.dateSubtext}>{item.category} • {item.accountId} • {item.time}</Text>
        </View>
        <View style={styles.cardRight}>
          <Text style={[styles.amountText, { color: item.type === 'income' ? '#16A34A' : '#0F172A' }]}>
            {item.type === 'income' ? '+ ' : ''}₹{item.amount.toLocaleString('en-IN')}
          </Text>
        </View>
      </TouchableOpacity>
    );
  }, [transactions, isSelectionMode, selectedIds]);

  const openAddForm = () => {
    setEditingTransaction(null); setFormType('expense'); setFormAmount(''); setFormMerchant(''); setFormCategory(CATEGORIES[0]); setFormAccount(ACCOUNTS[0]);
    setFormVisible(true);
  };

  const openEditForm = (t: Transaction) => {
    setEditingTransaction(t); setFormType(t.type); setFormAmount(t.amount.toString()); setFormMerchant(t.merchant); setFormCategory(t.category); setFormAccount(t.accountId);
    setFormVisible(true);
  };

  const ListHeader = useCallback(() => (
    <View style={styles.listHeaderWrapper}>
      <View style={styles.filtersContainer}>
        <View style={styles.filterSection}>
          <Text style={styles.outsideLabel}>Account</Text>
          <TouchableOpacity style={styles.filterPillCompact} onPress={() => setAccountFilterVisible(true)}>
            <Text style={styles.filterPillText}>{selectedAccountId}</Text>
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
  ), [selectedAccountId, selectedCategory, selectedDateRange, scrollX, showBalance, summaries]);

  return (
    <View style={[styles.mainContainer, { paddingTop: insets.top }]}>
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
        sections={sections} ListHeaderComponent={ListHeader} keyExtractor={(item) => item.id}
        renderItem={renderTransaction}
        renderSectionHeader={({ section }) => (
          <View style={styles.monthHeaderRow}>
            <View><Text style={styles.yearText}>{section.year}</Text><Text style={styles.monthText}>{section.title}</Text></View>
            {!isSelectionMode && (
              <Text style={[styles.monthNetText, { color: section.netBalance! >= 0 ? '#16A34A' : '#DC2626' }]}>
                {section.netBalance! >= 0 ? '+ ' : ''}₹{Math.abs(section.netBalance!).toLocaleString('en-IN')}
              </Text>
            )}
          </View>
        )}
        stickySectionHeadersEnabled={false} showsVerticalScrollIndicator={false} contentContainerStyle={styles.scrollContent}
        keyboardShouldPersistTaps="always" keyboardDismissMode="on-drag"
        ListEmptyComponent={<View style={styles.emptyState}><Ionicons name="search-outline" size={60} color="#E2E8F0" /><Text style={styles.emptyText}>No transactions found</Text></View>}
      />

      <FilterModal visible={isAccountFilterVisible} title="Select Account" selected={selectedAccountId} options={ACCOUNTS} onSelect={setSelectedAccountId} onClose={() => setAccountFilterVisible(false)} />
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
                  {ACCOUNTS.map(acc => (
                    <TouchableOpacity key={acc} style={[styles.accSelectorPill, formAccount === acc && styles.accSelectorPillActive]} onPress={() => setFormAccount(acc)}>
                      <Text style={[styles.accSelectorText, formAccount === acc && styles.accSelectorTextActive]}>{acc}</Text>
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
