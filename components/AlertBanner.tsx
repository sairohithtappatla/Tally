import React, { useEffect, useRef, useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  Animated,
  TouchableOpacity,
  Dimensions,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { AlertLog } from '@/types/supabase';

const { width: SCREEN_WIDTH } = Dimensions.get('window');
const DISPLAY_DURATION = 4000; // 4 seconds per alert

interface Props {
  alerts: AlertLog[];
  monthlyBudget?: number;
  onDismissAll?: () => void;
}

function getPeriodLabel(period: string) {
  if (period === 'daily') return 'Daily';
  if (period === 'weekly') return 'Weekly';
  return 'Monthly';
}

function getThresholdConfig(threshold: number) {
  if (threshold === 100)
    return { color: '#EF4444', bg: '#FEF2F2', border: '#FCA5A5', icon: 'alert-circle' as const, label: 'Limit Reached' };
  if (threshold === 80)
    return { color: '#F97316', bg: '#FFF7ED', border: '#FDBA74', icon: 'warning' as const, label: 'High Usage' };
  return { color: '#EAB308', bg: '#FEFCE8', border: '#FDE047', icon: 'alert' as const, label: 'Heads Up' };
}

function getBudgetForPeriod(monthly: number, period: string) {
  if (period === 'daily') return monthly / 30;
  if (period === 'weekly') return monthly / 4;
  return monthly;
}

export default function AlertBanner({ alerts, monthlyBudget, onDismissAll }: Props) {
  const insets = useSafeAreaInsets();
  const [currentIndex, setCurrentIndex] = useState(0);
  const translateY = useRef(new Animated.Value(-120)).current;
  const timerRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  const currentAlert = alerts[currentIndex] ?? null;

  const slideIn = () => {
    Animated.spring(translateY, {
      toValue: 0,
      useNativeDriver: true,
      tension: 80,
      friction: 10,
    }).start();
  };

  const slideOut = (callback?: () => void) => {
    Animated.timing(translateY, {
      toValue: -120,
      duration: 280,
      useNativeDriver: true,
    }).start(callback);
  };

  const dismissCurrent = () => {
    if (timerRef.current) clearTimeout(timerRef.current);
    slideOut(() => {
      if (currentIndex + 1 < alerts.length) {
        setCurrentIndex((i) => i + 1);
      } else {
        onDismissAll?.();
      }
    });
  };

  useEffect(() => {
    if (!currentAlert) return;

    // Reset position and slide in
    translateY.setValue(-120);
    slideIn();

    timerRef.current = setTimeout(() => {
      dismissCurrent();
    }, DISPLAY_DURATION);

    return () => {
      if (timerRef.current) clearTimeout(timerRef.current);
    };
  }, [currentIndex, alerts.length]);

  if (!currentAlert) return null;

  const cfg = getThresholdConfig(currentAlert.threshold);
  const periodLabel = getPeriodLabel(currentAlert.period ?? 'monthly');

  let budgetLine = '';
  if (monthlyBudget) {
    const periodBudget = getBudgetForPeriod(monthlyBudget, currentAlert.period ?? 'monthly');
    const spent = (periodBudget * currentAlert.threshold) / 100;
    budgetLine = `₹${spent.toFixed(0)} of ₹${periodBudget.toFixed(0)} ${periodLabel.toLowerCase()} budget`;
  }

  const remainingLabel =
    alerts.length > 1 && currentIndex < alerts.length - 1
      ? `  •  ${alerts.length - currentIndex - 1} more`
      : '';

  return (
    <Animated.View
      style={[
        styles.container,
        {
          top: insets.top + 8,
          backgroundColor: cfg.bg,
          borderColor: cfg.border,
          transform: [{ translateY }],
        },
      ]}
      pointerEvents="box-none"
    >
      {/* Icon */}
      <View style={[styles.iconWrap, { backgroundColor: cfg.color + '22' }]}>
        <Ionicons name={cfg.icon} size={22} color={cfg.color} />
      </View>

      {/* Text */}
      <View style={styles.textWrap}>
        <Text style={[styles.title, { color: cfg.color }]}>
          {periodLabel} Budget — {currentAlert.threshold}%
          <Text style={styles.labelBadge}> {cfg.label}</Text>
        </Text>
        {budgetLine ? (
          <Text style={styles.sub}>{budgetLine}{remainingLabel}</Text>
        ) : (
          <Text style={styles.sub}>
            You've used {currentAlert.threshold}% of your {periodLabel.toLowerCase()} budget
            {remainingLabel}
          </Text>
        )}
      </View>

      {/* Close */}
      <TouchableOpacity onPress={dismissCurrent} style={styles.closeBtn} hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}>
        <Ionicons name="close" size={18} color={cfg.color} />
      </TouchableOpacity>
    </Animated.View>
  );
}

const styles = StyleSheet.create({
  container: {
    position: 'absolute',
    left: 16,
    right: 16,
    flexDirection: 'row',
    alignItems: 'center',
    borderRadius: 14,
    borderWidth: 1,
    paddingHorizontal: 14,
    paddingVertical: 12,
    zIndex: 9999,
    elevation: 12,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.15,
    shadowRadius: 8,
  },
  iconWrap: {
    width: 36,
    height: 36,
    borderRadius: 18,
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: 12,
    flexShrink: 0,
  },
  textWrap: {
    flex: 1,
    marginRight: 8,
  },
  title: {
    fontSize: 13.5,
    fontWeight: '700',
    marginBottom: 2,
  },
  labelBadge: {
    fontSize: 12,
    fontWeight: '500',
    opacity: 0.8,
  },
  sub: {
    fontSize: 12,
    color: '#64748B',
    lineHeight: 17,
  },
  closeBtn: {
    padding: 2,
    flexShrink: 0,
  },
});
