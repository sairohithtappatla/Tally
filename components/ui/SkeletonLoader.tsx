/**
 * SkeletonLoader.tsx
 * Shared animated shimmer skeleton building blocks + screen-level skeleton layouts.
 * Import the screen skeleton you need (e.g. <DashboardSkeleton>) wherever an
 * ActivityIndicator loading state used to live.
 */

import React, { useEffect, useRef } from 'react';
import { View, Animated, StyleSheet, Dimensions } from 'react-native';

const { width: SCREEN_WIDTH } = Dimensions.get('window');

// ─── Base Skeleton Block ────────────────────────────────────────────────────

interface SkeletonProps {
  width: number | string;
  height: number;
  borderRadius?: number;
  style?: object;
}

export function Skeleton({ width, height, borderRadius = 8, style }: SkeletonProps) {
  const shimmer = useRef(new Animated.Value(0)).current;

  useEffect(() => {
    Animated.loop(
      Animated.sequence([
        Animated.timing(shimmer, { toValue: 1, duration: 850, useNativeDriver: true }),
        Animated.timing(shimmer, { toValue: 0, duration: 850, useNativeDriver: true }),
      ])
    ).start();
  }, []);

  const opacity = shimmer.interpolate({ inputRange: [0, 1], outputRange: [0.35, 0.8] });

  return (
    <Animated.View
      style={[{ width, height, borderRadius, backgroundColor: '#E2E8F0', opacity }, style]}
    />
  );
}

// ─── Dashboard (Home) Skeleton ──────────────────────────────────────────────

export function DashboardSkeleton({ insetTop = 0 }: { insetTop?: number }) {
  const CARD_W = SCREEN_WIDTH - 40;
  const STAT_W = (SCREEN_WIDTH - 52) / 2;

  return (
    <View style={[sk.container, { paddingTop: insetTop + 10 }]}>
      {/* Header row */}
      <View style={sk.row}>
        <View>
          <Skeleton width={72} height={13} borderRadius={6} style={{ marginBottom: 8 }} />
          <Skeleton width={130} height={22} borderRadius={9} />
        </View>
        <Skeleton width={48} height={48} borderRadius={14} />
      </View>

      {/* Bank card */}
      <Skeleton width={CARD_W} height={182} borderRadius={24} style={{ marginBottom: 14 }} />

      {/* Stats row */}
      <View style={[sk.row, { gap: 12, marginBottom: 0 }]}>
        <Skeleton width={STAT_W} height={84} borderRadius={20} />
        <Skeleton width={STAT_W} height={84} borderRadius={20} />
      </View>

      {/* Section heading */}
      <Skeleton width={150} height={16} borderRadius={7} style={{ marginTop: 28, marginBottom: 16 }} />

      {/* 3 transaction rows */}
      {[0, 1, 2].map(i => (
        <View key={i} style={sk.txRow}>
          <Skeleton width={44} height={44} borderRadius={14} />
          <View style={{ flex: 1, marginLeft: 14 }}>
            <Skeleton width="65%" height={13} borderRadius={6} style={{ marginBottom: 8 }} />
            <Skeleton width="42%" height={10} borderRadius={5} />
          </View>
          <Skeleton width={68} height={13} borderRadius={6} />
        </View>
      ))}
    </View>
  );
}

// ─── Accounts Skeleton ──────────────────────────────────────────────────────

export function AccountsSkeleton({ insetTop = 0 }: { insetTop?: number }) {
  return (
    <View style={[sk.container, { paddingTop: insetTop + 10 }]}>
      {/* Header */}
      <View style={[sk.row, { marginBottom: 20 }]}>
        <Skeleton width={160} height={26} borderRadius={10} />
        <Skeleton width={40} height={40} borderRadius={20} />
      </View>

      {/* Balance summary card */}
      <Skeleton width="100%" height={104} borderRadius={24} style={{ marginBottom: 24 }} />

      {/* Section label */}
      <Skeleton width={90} height={12} borderRadius={5} style={{ marginBottom: 14 }} />

      {/* Savings account cards */}
      {[0, 1].map(i => (
        <View key={i} style={sk.accountRow}>
          <Skeleton width={44} height={44} borderRadius={14} />
          <View style={{ flex: 1, marginLeft: 14 }}>
            <Skeleton width="58%" height={14} borderRadius={6} style={{ marginBottom: 8 }} />
            <Skeleton width="38%" height={11} borderRadius={5} />
          </View>
          <Skeleton width={82} height={13} borderRadius={6} />
        </View>
      ))}

      {/* Section label */}
      <Skeleton width={105} height={12} borderRadius={5} style={{ marginTop: 28, marginBottom: 14 }} />

      {/* Expense account card */}
      <View style={sk.accountRow}>
        <Skeleton width={44} height={44} borderRadius={14} />
        <View style={{ flex: 1, marginLeft: 14 }}>
          <Skeleton width="58%" height={14} borderRadius={6} style={{ marginBottom: 8 }} />
          <Skeleton width="38%" height={11} borderRadius={5} />
        </View>
        <Skeleton width={82} height={13} borderRadius={6} />
      </View>
    </View>
  );
}

// ─── Transactions Skeleton ──────────────────────────────────────────────────

export function TransactionsSkeleton({ insetTop = 0 }: { insetTop?: number }) {
  const SUMMARY_W = (SCREEN_WIDTH - 60) / 3;

  return (
    <View style={[sk.container, { paddingTop: insetTop }]}>
      {/* Search bar */}
      <Skeleton width="100%" height={50} borderRadius={16} style={{ marginBottom: 16 }} />

      {/* Summary cards */}
      <View style={[sk.row, { gap: 10, marginBottom: 18 }]}>
        {[0, 1, 2].map(i => (
          <Skeleton key={i} width={SUMMARY_W} height={92} borderRadius={20} />
        ))}
      </View>

      {/* Filter chip row */}
      <View style={[sk.row, { gap: 10, marginBottom: 20 }]}>
        {[90, 100, 80].map((w, i) => (
          <Skeleton key={i} width={w} height={34} borderRadius={20} />
        ))}
      </View>

      {/* Month section header */}
      <Skeleton width={110} height={17} borderRadius={8} style={{ marginBottom: 16 }} />

      {/* 5 transaction rows */}
      {[0, 1, 2, 3, 4].map(i => (
        <View key={i} style={sk.txRow}>
          <Skeleton width={44} height={44} borderRadius={14} />
          <View style={{ flex: 1, marginLeft: 14 }}>
            <Skeleton width="66%" height={13} borderRadius={6} style={{ marginBottom: 8 }} />
            <Skeleton width="40%" height={10} borderRadius={5} />
          </View>
          <Skeleton width={68} height={13} borderRadius={6} />
        </View>
      ))}
    </View>
  );
}

// ─── Add Transaction Skeleton ───────────────────────────────────────────────

export function AddTransactionSkeleton({ insetTop = 0 }: { insetTop?: number }) {
  return (
    <View style={[sk.container, { paddingTop: insetTop }]}>
      {/* Header */}
      <Skeleton width={200} height={26} borderRadius={10} style={{ marginBottom: 8, marginTop: 16 }} />
      <Skeleton width={260} height={14} borderRadius={6} style={{ marginBottom: 28 }} />

      {/* Type selector row */}
      <Skeleton width={100} height={13} borderRadius={5} style={{ marginBottom: 12 }} />
      <View style={[sk.row, { gap: 10, marginBottom: 28 }]}>
        {[0, 1, 2].map(i => (
          <Skeleton key={i} width={(SCREEN_WIDTH - 64) / 3} height={52} borderRadius={14} />
        ))}
      </View>

      {/* Amount */}
      <Skeleton width={100} height={13} borderRadius={5} style={{ marginBottom: 12 }} />
      <Skeleton width="100%" height={62} borderRadius={16} style={{ marginBottom: 28 }} />

      {/* Account */}
      <Skeleton width={90} height={13} borderRadius={5} style={{ marginBottom: 12 }} />
      <Skeleton width="100%" height={56} borderRadius={16} style={{ marginBottom: 28 }} />

      {/* Category chips */}
      <Skeleton width={80} height={13} borderRadius={5} style={{ marginBottom: 12 }} />
      <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: 10, marginBottom: 28 }}>
        {[70, 90, 80, 100, 70, 65, 85].map((w, i) => (
          <Skeleton key={i} width={w} height={34} borderRadius={20} />
        ))}
      </View>

      {/* Date / time row */}
      <View style={[sk.row, { gap: 12, marginBottom: 28 }]}>
        <Skeleton width={(SCREEN_WIDTH - 52) / 2} height={52} borderRadius={16} />
        <Skeleton width={(SCREEN_WIDTH - 52) / 2} height={52} borderRadius={16} />
      </View>

      {/* Submit button */}
      <Skeleton width="100%" height={56} borderRadius={18} />
    </View>
  );
}

// ─── Shared styles ──────────────────────────────────────────────────────────

const sk = StyleSheet.create({
  container: {
    flex: 1,
    paddingHorizontal: 20,
    backgroundColor: '#FFFFFF',
  },
  row: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 20,
  },
  txRow: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 12,
    borderBottomWidth: 1,
    borderBottomColor: '#F8FAFC',
  },
  accountRow: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 14,
    borderBottomWidth: 1,
    borderBottomColor: '#F8FAFC',
  },
});
