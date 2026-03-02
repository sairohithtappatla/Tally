import React, { useState } from 'react';
import { View, Text, StyleSheet, ScrollView, TouchableOpacity, FlatList, Dimensions, Image } from 'react-native';
import { Ionicons, Feather } from '@expo/vector-icons';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useRouter } from 'expo-router';

export default function HomeScreen() {
  const insets = useSafeAreaInsets();
  const router = useRouter();
  const [showBalance, setShowBalance] = useState(true);

  // Get current date
  const today = new Date();
  const day = today.getDate();
  const month = today.toLocaleString('default', { month: 'short' });

  const { width: SCREEN_WIDTH } = Dimensions.get('window');
  const CARD_WIDTH = SCREEN_WIDTH - 40;

  // Card Data
  const cards = [
    { id: '1', name: 'SBI', balance: 4484.00, color: '#6366F1', secondaryColor: '#4F46E5' },
    { id: '2', name: 'UNION', balance: 12250.50, color: '#0EA5E9', secondaryColor: '#0284C7' },
  ];

  // Mock data for transactions
  const transactions = [
    { id: '1', category: 'Health', sub: 'checkup fee', amount: '-₹25.00', date: '11 Dec', icon: 'heart', color: '#FF4B55' },
    { id: '2', category: 'Income', sub: 'Gift from Family', amount: '+₹60.00', date: '10 Dec', icon: 'logo-usd', color: '#4CAF50' },
    { id: '3', category: 'Clothing', sub: 'Winter Clothing', amount: '-₹20.40', date: '10 Dec', icon: 'shirt', color: '#8862F0' },
  ];

  return (
    <View style={styles.mainContainer}>
      <ScrollView
        showsVerticalScrollIndicator={false}
        contentContainerStyle={[styles.scrollContent, { paddingTop: insets.top + 10 }]}
      >
        {/* Header Section */}
        <View style={styles.header}>
          <View>
            <Text style={styles.greetingText}>Hello,</Text>
            <Text style={styles.nameText}>Sai Rohith</Text>
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
          <FlatList
            data={cards}
            horizontal
            pagingEnabled
            showsHorizontalScrollIndicator={false}
            snapToInterval={SCREEN_WIDTH - 40 + 10}
            decelerationRate="fast"
            contentContainerStyle={{ gap: 10 }}
            keyExtractor={(item) => item.id}
            renderItem={({ item }) => (
              <View style={[styles.bankCard, { backgroundColor: item.color, width: CARD_WIDTH }]}>
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
                    <Text style={styles.holderName}>Sai Rohith</Text>
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
            )}
          />
        </View>

        {/* Quick Summary Boxes */}
        <View style={styles.summaryRow}>
          <View style={styles.summaryBox}>
            <Text style={styles.summaryLabel}>Today's spent</Text>
            <Text style={styles.summaryValue}>₹ 45.00</Text>
          </View>
          <View style={styles.summaryBox}>
            <Text style={styles.summaryLabel}>This week</Text>
            <Text style={styles.summaryValue}>₹ 420.00</Text>
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
          {transactions.map((item) => (
            <View key={item.id} style={styles.transactionItem}>
              <View style={[styles.iconBox, { backgroundColor: item.color + '15' }]}>
                <Ionicons name={item.icon as any} size={22} color={item.color} />
              </View>
              <View style={styles.transactionInfo}>
                <Text style={styles.categoryText}>{item.category}</Text>
                <Text style={styles.subText}>{item.sub}</Text>
              </View>
              <View style={styles.transactionRight}>
                <Text style={[
                  styles.amountText,
                  { color: item.amount.startsWith('+') ? '#4CAF50' : '#11181C' }
                ]}>
                  {item.amount}
                </Text>
                <Text style={styles.dateText}>{item.date}</Text>
              </View>
            </View>
          ))}
        </View>

        {/* Bottom Spacing for Floating Nav */}
        <View style={{ height: 120 }} />
      </ScrollView>
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
    fontSize: 13,
    color: '#94A3B8',
    marginTop: 2,
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
