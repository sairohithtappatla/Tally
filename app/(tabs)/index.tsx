import React, { useState, useEffect, useCallback } from 'react';
import { View, Text, StyleSheet, ScrollView, TouchableOpacity, FlatList, Dimensions, RefreshControl, Alert } from 'react-native';
import { DashboardSkeleton } from '@/components/ui/SkeletonLoader';
import { Ionicons } from '@expo/vector-icons';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useRouter, useLocalSearchParams } from 'expo-router';
import { useFocusEffect } from '@react-navigation/native';
import { useAuth } from '@/contexts/AuthContext';
import { accountService } from '@/services/accountService';
import { transactionService } from '@/services/transactionService';
import { alertService } from '@/services/alertService';
import { Account, Transaction, AlertLog } from '@/types/supabase';
import AddTransactionModal from '@/components/AddTransactionModal';
import AlertBanner from '@/components/AlertBanner';

const CATEGORY_ICONS: { [key: string]: string } = {
  'Food': 'restaurant',
  'Transport': 'car',
  'Shopping': 'cart',
  'Health': 'heart',
  'Entertainment': 'game-controller',
  'Bills': 'receipt',
  'Salary': 'cash',
  'Gift': 'gift',
  'Other': 'ellipsis-horizontal',
};

const CATEGORY_COLORS: { [key: string]: string } = {
  'Food': '#FF9800',
  'Transport': '#3B82F6',
  'Shopping': '#EC4899',
  'Health': '#FF4B55',
  'Entertainment': '#8B5CF6',
  'Bills': '#F59E0B',
  'Salary': '#10B981',
  'Gift': '#4CAF50',
  'Other': '#6366F1',
};

export default function HomeScreen() {
  const insets = useSafeAreaInsets();
  const router = useRouter();
  const params = useLocalSearchParams();
  const { user } = useAuth();
  const [showBalance, setShowBalance] = useState(true);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [accounts, setAccounts] = useState<Account[]>([]);
  const [recentTransactions, setRecentTransactions] = useState<Transaction[]>([]);
  const [todaySpent, setTodaySpent] = useState(0);
  const [weekSpent, setWeekSpent] = useState(0);
  const [totalBalance, setTotalBalance] = useState(0);
  const [showAddModal, setShowAddModal] = useState(false);
  const [pendingAlerts, setPendingAlerts] = useState<AlertLog[]>([]);
  const [monthlyBudget, setMonthlyBudget] = useState(0);
  const [dailyBudget, setDailyBudget] = useState<number | null>(null);
  const [weeklyBudget, setWeeklyBudget] = useState<number | null>(null);

  // Get current date
  const today = new Date();
  const day = today.getDate();
  const month = today.toLocaleString('default', { month: 'short' });

  const { width: SCREEN_WIDTH } = Dimensions.get('window');
  const CARD_WIDTH = SCREEN_WIDTH - 40;

  // Reload data when screen comes into focus
  useFocusEffect(
    useCallback(() => {
      if (user) {
        loadDashboardData();
      }
    }, [user])
  );

  // Listen for openModal param (triggered by TabBar + button)
  useEffect(() => {
    if (params.openModal === 'true') {
      setShowAddModal(true);
      router.setParams({ openModal: undefined });
    }
  }, [params.openModal]);

  useEffect(() => {
    if (user) {
      loadDashboardData();
    }
  }, [user]);

  const loadDashboardData = async () => {
    // Guard: do nothing if user session not yet available
    if (!user) {
      setLoading(false);
      setRefreshing(false);
      return;
    }
    try {
      setLoading(true);

      // Load accounts, transactions, and all budgets in parallel
      const [accountsData, transactionsData, budgets] = await Promise.all([
        accountService.getAccounts(user!.id),
        transactionService.getTransactions(user!.id, 50),
        alertService.getAllBudgets(user!.id),
      ]);

      setMonthlyBudget(budgets.monthly);
      setDailyBudget(budgets.daily);
      setWeeklyBudget(budgets.weekly);

      // Sort accounts: expense type first, then others
      const sortedAccounts = [...accountsData].sort((a, b) =>
        a.type === 'expense' ? -1 : b.type === 'expense' ? 1 : 0
      );

      setAccounts(sortedAccounts);
      setRecentTransactions(transactionsData.slice(0, 3)); // Still show only 3 in UI

      // Calculate total balance from all accounts
      const total = accountsData.reduce((sum, acc) => sum + Number(acc.balance), 0);
      setTotalBalance(total);

      // Calculate today's and week's spending
      calculateSpending(transactionsData);
    } catch (error) {
      console.error('Failed to load dashboard:', error);
      Alert.alert('Error', 'Failed to load dashboard data. Please try again.');
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  };

  const onRefresh = async () => {
    setRefreshing(true);
    await loadDashboardData();
  };

  const calculateSpending = (transactions: Transaction[]) => {
    const today = new Date();
    today.setHours(0, 0, 0, 0);

    const weekAgo = new Date(today);
    weekAgo.setDate(today.getDate() - 7);

    let todayTotal = 0;
    let weekTotal = 0;

    transactions.forEach(txn => {
      if (txn.type === 'expense') {
        const txnDate = new Date(txn.date);
        txnDate.setHours(0, 0, 0, 0);

        if (txnDate.getTime() === today.getTime()) {
          todayTotal += Number(txn.amount);
        }
        if (txnDate >= weekAgo) {
          weekTotal += Number(txn.amount);
        }
      }
    });

    setTodaySpent(todayTotal);
    setWeekSpent(weekTotal);
  };

  const formatDate = (dateString: string) => {
    if (!dateString) return 'N/A';
    try {
      const date = new Date(dateString);
      if (isNaN(date.getTime())) return 'Invalid Date';
      return date.toLocaleDateString('en-US', { day: 'numeric', month: 'short' });
    } catch (error) {
      return 'N/A';
    }
  };

  if (loading) {
    return <DashboardSkeleton insetTop={insets.top} />;
  }

  return (
    <View style={styles.mainContainer}>
      <ScrollView
        showsVerticalScrollIndicator={false}
        contentContainerStyle={[styles.scrollContent, { paddingTop: insets.top + 10 }]}
        refreshControl={
          <RefreshControl
            refreshing={refreshing}
            onRefresh={onRefresh}
            tintColor="#6366F1"
            colors={['#6366F1']}
          />
        }
      >
        {/* Header Section */}
        <View style={styles.header}>
          <View>
            <Text style={styles.greetingText}>Hello,</Text>
            <Text style={styles.nameText}>{user?.user_metadata?.name || user?.email?.split('@')[0] || 'User'}</Text>
          </View>
          <TouchableOpacity style={styles.calendarButton}>
            <View style={styles.calendarHeader}>
              <Text style={styles.calendarHeaderText}>{month}</Text>
            </View>
            <View style={styles.calendarBody}>
              <Text style={styles.calendarBodyText}>{day}</Text>
            </View>
          </TouchableOpacity>
        </View>

        {/* Switchable Bank Cards Carousel */}
        <View style={styles.carouselContainer}>
          {accounts.length > 0 ? (
            <>
              <FlatList
                data={accounts}
                horizontal
                pagingEnabled
                showsHorizontalScrollIndicator={false}
                snapToInterval={SCREEN_WIDTH - 40 + 10}
                decelerationRate="fast"
                contentContainerStyle={{ gap: 10 }}
                keyExtractor={(item) => item.id}
                renderItem={({ item }) => (
                  <TouchableOpacity
                    activeOpacity={0.9}
                    onPress={() => router.push('/accounts')}
                  >
                    <View style={[styles.bankCard, { backgroundColor: item.color || '#6366F1', width: CARD_WIDTH }]}>
                      <View style={styles.cardTopRow}>
                        <View style={styles.cardInfoLeft}>
                          <Text style={styles.cardBalanceLabel}>Available Balance</Text>
                        </View>
                      </View>

                      <View style={styles.balanceRow}>
                        <Text style={styles.cardBalanceValue}>
                          {showBalance ? `₹ ${item.balance.toLocaleString('en-IN', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}` : '••••••••'}
                        </Text>
                        <TouchableOpacity
                          onPress={() => setShowBalance(!showBalance)}
                          style={styles.eyeBtnInside}
                        >
                          <Ionicons
                            name={showBalance ? "eye-outline" : "eye-off-outline"}
                            size={20}
                            color="rgba(255,255,255,0.6)"
                          />
                        </TouchableOpacity>
                      </View>

                      <View style={styles.cardBottomRow}>
                        <View>
                          <Text style={styles.holderLabel}>Card Holder</Text>
                          <Text style={styles.holderName}>{user?.user_metadata?.name || user?.email?.split('@')[0] || 'User'}</Text>
                        </View>
                        <View style={styles.bankNameWrapper}>
                          <Text style={styles.bankNameText}>{item.name}</Text>
                          <View style={styles.bankLogoCircles}>
                            <View style={[styles.logoCircle, { backgroundColor: 'rgba(255,255,255,0.2)' }]} />
                            <View style={[styles.logoCircle, { backgroundColor: 'rgba(255,255,255,0.4)', marginLeft: -12 }]} />
                          </View>
                        </View>
                      </View>
                    </View>
                  </TouchableOpacity>
                )}
              />
              {accounts.length > 1 && (
                <View style={styles.accountIndicator}>
                  <Text style={styles.accountIndicatorText}>
                    Tap card to manage • {accounts.length} account{accounts.length > 1 ? 's' : ''}
                  </Text>
                </View>
              )}
            </>
          ) : (
            <View style={[styles.bankCard, { backgroundColor: '#6366F1', width: CARD_WIDTH }]}>
              <Text style={[styles.cardBalanceLabel, { textAlign: 'center' }]}>No accounts yet</Text>
              <TouchableOpacity
                style={{ backgroundColor: 'rgba(255,255,255,0.2)', padding: 12, borderRadius: 12, marginTop: 20 }}
                onPress={() => router.push('/accounts')}
              >
                <Text style={{ color: '#FFF', textAlign: 'center', fontWeight: '600' }}>Add Account</Text>
              </TouchableOpacity>
            </View>
          )}
        </View>

        {/* Quick Summary Boxes */}
        <View style={styles.summaryRow}>
          <View style={styles.summaryBox}>
            <Text style={styles.summaryLabel}>Today's spent</Text>
            <Text style={styles.summaryValue}>₹ {todaySpent.toFixed(2)}</Text>
          </View>
          <View style={styles.summaryBox}>
            <Text style={styles.summaryLabel}>This week</Text>
            <Text style={styles.summaryValue}>₹ {weekSpent.toFixed(2)}</Text>
          </View>
          <TouchableOpacity
            style={[styles.summaryBox, styles.viewMoreBox]}
            onPress={() => router.push('/transactions')}
          >
            <Text style={styles.viewMoreText}>View More</Text>
            <Ionicons name="arrow-forward" size={16} color="#3B82F6" />
          </TouchableOpacity>
        </View>

        {/* Transactions Section */}
        <View style={styles.transactionsHeader}>
          <Text style={styles.sectionTitle}>Recent Transactions</Text>
          <TouchableOpacity onPress={() => router.push('/transactions')}>
            <Text style={styles.viewAllText}>View All</Text>
          </TouchableOpacity>
        </View>

        <View style={styles.transactionsList}>
          {recentTransactions.length > 0 ? (
            recentTransactions.map((item) => {
              const icon = CATEGORY_ICONS[item.category] || 'ellipsis-horizontal';
              const color = CATEGORY_COLORS[item.category] || '#6366F1';
              const isIncome = item.type === 'income';
              const amount = isIncome ? `+₹${item.amount}` : `-₹${item.amount}`;
              const timeStr = item.time
                ? (() => {
                  const [h, m] = item.time.split(':').map(Number);
                  const suffix = h >= 12 ? 'PM' : 'AM';
                  return `${((h % 12) || 12)}:${String(m).padStart(2, '0')} ${suffix}`;
                })()
                : null;

              return (
                <TouchableOpacity
                  key={item.id}
                  style={styles.transactionItem}
                  onPress={() => router.push('/transactions')}
                  activeOpacity={0.7}
                >
                  <View style={[styles.iconBox, { backgroundColor: color + '15' }]}>
                    <Ionicons name={icon as any} size={22} color={color} />
                  </View>
                  <View style={styles.transactionInfo}>
                    <Text style={styles.categoryText}>{item.category}</Text>
                    <Text style={styles.subText}>{item.merchant || item.type}</Text>
                  </View>
                  <View style={styles.transactionRight}>
                    <Text style={[
                      styles.amountText,
                      { color: isIncome ? '#10B981' : '#11181C' }
                    ]}>
                      {amount}
                    </Text>
                    <Text style={styles.dateText}>
                      {formatDate(item.date)}{timeStr ? `  ${timeStr}` : ''}
                    </Text>
                  </View>
                </TouchableOpacity>
              );
            })
          ) : (
            <View style={[styles.transactionItem, { justifyContent: 'center' }]}>
              <Text style={styles.subText}>No transactions yet</Text>
              <TouchableOpacity
                style={{ marginTop: 10 }}
                onPress={() => setShowAddModal(true)}
              >
                <Text style={{ color: '#3B82F6', fontWeight: '600', fontSize: 14, left: 12, bottom: 2 }}>Add Transaction</Text>
              </TouchableOpacity>
            </View>
          )}
        </View>

        {/* Bottom Spacing for Floating Nav */}
        <View style={{ height: 120 }} />
      </ScrollView>

      {/* Floating Add Button */}


      {/* Add Transaction Modal */}
      <AddTransactionModal
        visible={showAddModal}
        onClose={() => setShowAddModal(false)}
        onSuccess={(newAlerts) => {
          loadDashboardData();
          if (newAlerts && newAlerts.length > 0) {
            setPendingAlerts(newAlerts);
          }
        }}
      />

      {/* Alert Banner — budget threshold notifications */}
      {pendingAlerts.length > 0 && (
        <AlertBanner
          alerts={pendingAlerts}
          monthlyBudget={monthlyBudget}
          dailyBudget={dailyBudget}
          weeklyBudget={weeklyBudget}
          onDismissAll={() => setPendingAlerts([])}
        />
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  mainContainer: {
    flex: 1,
    backgroundColor: '#F8FAFC',
  },
  scrollContent: {
    paddingHorizontal: 20,
  },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 25,
  },
  greetingText: {
    fontSize: 14,
    color: '#64748B',
    fontWeight: '400',
  },
  nameText: {
    fontSize: 22,
    fontWeight: '700',
    color: '#11181C',
    marginTop: 2,
  },
  totalBalanceContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    marginTop: 6,
  },
  totalBalanceLabel: {
    fontSize: 12,
    color: '#64748B',
    fontWeight: '500',
  },
  totalBalanceValue: {
    fontSize: 14,
    fontWeight: '700',
    color: '#10B981',
  },
  calendarButton: {
    width: 48,
    height: 48,
    borderRadius: 14,
    backgroundColor: '#FFF',
    overflow: 'hidden',
    borderWidth: 1,
    borderColor: '#F1F5F9',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.05,
    shadowRadius: 5,
    elevation: 2,
  },
  calendarHeader: {
    backgroundColor: '#FF4B55',
    height: '35%',
    justifyContent: 'center',
    alignItems: 'center',
  },
  calendarHeaderText: {
    color: '#FFF',
    fontSize: 10,
    fontWeight: '700',
    textTransform: 'uppercase',
  },
  calendarBody: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: '#FFF',
  },
  calendarBodyText: {
    fontSize: 18,
    fontWeight: '800',
    color: '#11181C',
  },
  carouselContainer: {
    marginBottom: 20,
  },
  accountIndicator: {
    alignItems: 'center',
    marginTop: 10,
  },
  accountIndicatorText: {
    fontSize: 12,
    color: '#94A3B8',
    fontWeight: '500',
  },
  bankCard: {
    height: 200,
    borderRadius: 28,
    padding: 24,
    justifyContent: 'space-between',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 8 },
    shadowOpacity: 0.2,
    shadowRadius: 12,
    elevation: 8,
    position: 'relative',
  },
  cardTopRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
  },
  cardInfoLeft: {
    alignItems: 'flex-start',
    gap: 8,
  },
  chipWrapper: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  contactlessWrapper: {
    opacity: 0.5,
  },
  balanceRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
  },
  cardBalanceValue: {
    color: '#FFF',
    fontSize: 28,
    fontWeight: '800',
  },
  cardLogo: {
    width: 50,
    height: 30,
    resizeMode: 'contain',
    opacity: 0.9,
    marginBottom: 6,
  },
  cardBalanceLabel: {
    color: 'rgba(255,255,255,0.7)',
    fontSize: 22,
    fontWeight: '600',
  },
  cardBottomRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-end',
  },
  holderLabel: {
    color: 'rgba(255,255,255,0.4)',
    fontSize: 10,
    fontWeight: '600',
    textTransform: 'uppercase',
    letterSpacing: 1,
    marginBottom: 4,
  },
  holderName: {
    color: '#FFF',
    fontSize: 16,
    fontWeight: '700',
  },
  bankNameWrapper: {
    alignItems: 'flex-end',
  },
  bankNameText: {
    color: '#FFF',
    fontSize: 18,
    fontWeight: '800',
    fontStyle: 'italic',
    marginBottom: 4,
  },
  bankLogoCircles: {
    flexDirection: 'row',
  },
  logoCircle: {
    width: 25,
    height: 25,
    borderRadius: 12.5,
  },
  eyeBtnInside: {
    padding: 8,
  },
  summaryRow: {
    flexDirection: 'row',
    gap: 10,
    marginBottom: 30,
  },
  summaryBox: {
    flex: 1,
    backgroundColor: '#FFF',
    borderRadius: 20,
    padding: 14,
    borderWidth: 1,
    borderColor: '#F1F5F9',
    justifyContent: 'center',
  },
  summaryLabel: {
    fontSize: 11,
    color: '#64748B',
    fontWeight: '500',
    marginBottom: 4,
  },
  summaryValue: {
    fontSize: 15,
    fontWeight: '700',
    color: '#11181C',
  },
  viewMoreBox: {
    backgroundColor: '#EFF6FF',
    borderColor: '#DBEAFE',
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 4,
  },
  viewMoreText: {
    fontSize: 12,
    fontWeight: '700',
    color: '#3B82F6',
  },
  transactionsHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 15,
  },
  sectionTitle: {
    fontSize: 18,
    fontWeight: '700',
    color: '#11181C',
  },
  viewAllText: {
    fontSize: 14,
    color: '#3B82F6',
    fontWeight: '600',
  },
  transactionsList: {
    gap: 12,
  },
  fab: {
    position: 'absolute',
    bottom: 110,
    right: 20,
    width: 56,
    height: 56,
    borderRadius: 28,
    backgroundColor: '#6366F1',
    justifyContent: 'center',
    alignItems: 'center',
    shadowColor: '#6366F1',
    shadowOffset: { width: 0, height: 6 },
    shadowOpacity: 0.35,
    shadowRadius: 10,
    elevation: 8,
  },
  transactionItem: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#FFF',
    padding: 16,
    borderRadius: 20,
    borderWidth: 1,
    borderColor: '#F1F5F9',
  },
  iconBox: {
    width: 48,
    height: 48,
    borderRadius: 16,
    justifyContent: 'center',
    alignItems: 'center',
  },
  transactionInfo: {
    flex: 1,
    marginLeft: 15,
  },
  categoryText: {
    fontSize: 16,
    fontWeight: '600',
    color: '#11181C',
  },
  subText: {
    fontSize: 15,
    color: '#94A3B8',
    marginTop: 5,
  },
  transactionRight: {
    alignItems: 'flex-end',
  },
  amountText: {
    fontSize: 16,
    fontWeight: '700',
  },
  dateText: {
    fontSize: 12,
    color: '#CBD5E1',
    marginTop: 4,
  },
});
