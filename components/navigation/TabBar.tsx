import React from 'react';
import { View, StyleSheet, TouchableOpacity, Dimensions, Text } from 'react-native';
import { BottomTabBarProps } from '@react-navigation/bottom-tabs';
import { Feather, Ionicons } from '@expo/vector-icons';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import Animated, { useAnimatedStyle, withSpring, useSharedValue } from 'react-native-reanimated';
import { useRouter } from 'expo-router';

const { width } = Dimensions.get('window');

const TAB_BAR_WIDTH = width * 0.92;
const TAB_BAR_HEIGHT = 85;
const CENTER_BUTTON_SIZE = 64;

interface TabItemProps {
  isFocused: boolean;
  route: any;
  label: string;
  onPress: () => void;
  onLongPress: () => void;
  icon: (props: { color: string; size?: number }) => React.ReactNode;
}

const TabItem = ({
  isFocused,
  route,
  label,
  onPress,
  onLongPress,
  icon
}: TabItemProps) => {
  const scale = useSharedValue(1);

  const animatedStyle = useAnimatedStyle(() => ({
    transform: [{ scale: scale.value }],
  }));

  const primaryColor = '#11181C';
  const inactiveColor = '#94A3B8';
  const accentColor = '#6366F1';

  const handlePressIn = () => {
    scale.value = withSpring(0.92, { damping: 10, stiffness: 100 });
  };

  const handlePressOut = () => {
    scale.value = withSpring(1, { damping: 10, stiffness: 100 });
  };

  if (route.name === 'add') {
    return (
      <TouchableOpacity
        onPress={onPress}
        onLongPress={onLongPress}
        onPressIn={handlePressIn}
        onPressOut={handlePressOut}
        style={styles.centerButtonContainer}
        activeOpacity={1}
      >
        <Animated.View style={[styles.centerButton, animatedStyle]}>
          {icon({ color: '#FFF' })}
        </Animated.View>
        <Text style={[styles.labelText, { color: primaryColor, fontWeight: '600', marginTop: 8 }]}>Add</Text>
      </TouchableOpacity>
    );
  }

  return (
    <TouchableOpacity
      accessibilityRole="button"
      accessibilityState={isFocused ? { selected: true } : {}}
      onPress={onPress}
      onLongPress={onLongPress}
      onPressIn={handlePressIn}
      onPressOut={handlePressOut}
      style={styles.tabItem}
      activeOpacity={1}
    >
      <Animated.View style={[styles.iconContainer, animatedStyle]}>
        {icon({
          color: isFocused ? accentColor : inactiveColor,
          size: 24,
        })}
      </Animated.View>
      <Text style={[
        styles.labelText,
        { color: isFocused ? accentColor : inactiveColor, fontWeight: isFocused ? '600' : '400' }
      ]}>
        {label || 'Tab'}
      </Text>
    </TouchableOpacity>
  );
};

export function TabBar({ state, descriptors, navigation }: BottomTabBarProps) {
  const router = useRouter();

  const tabBarData: Record<string, { label: string, icon: (props: any) => React.ReactNode }> = {
    index: {
      label: 'Home',
      icon: (props) => <Ionicons name={props.color === '#6366F1' ? "home" : "home-outline"} size={props.size || 24} color={props.color} />,
    },
    transactions: {
      label: 'History',
      icon: (props) => <Ionicons name={props.color === '#6366F1' ? "receipt" : "receipt-outline"} size={props.size || 24} color={props.color} />,
    },
    history: {
      label: 'History',
      icon: (props) => <Ionicons name={props.color === '#6366F1' ? "receipt" : "receipt-outline"} size={props.size || 24} color={props.color} />,
    },
    add: {
      label: 'Add',
      icon: (props) => <Feather name="plus" size={32} color={props.color} />,
    },
    accounts: {
      label: 'Accounts',
      icon: (props) => <Ionicons name={props.color === '#6366F1' ? "card" : "card-outline"} size={props.size || 24} color={props.color} />,
    },
    settings: {
      label: 'Settings',
      icon: (props) => <Ionicons name={props.color === '#6366F1' ? "settings" : "settings-outline"} size={props.size || 24} color={props.color} />,
    },
  };

  return (
    <>
      {state.routes.map((route, index) => {
        const descriptor = descriptors[route.key];
        if (!descriptor) return null;

        const { options } = descriptor;
        const isFocused = state.index === index;

        const customData = tabBarData[route.name];
        const label = customData?.label || (options.tabBarLabel as string) || (options.title as string) || route.name || 'Tab';
        const icon = customData?.icon || ((props: any) => <Ionicons name="help-circle-outline" size={props.size || 24} color={props.color} />);

        const onPress = () => {
          if (route.name === 'add') {
            // Trigger the transaction modal on the history page
            router.push({
              pathname: '/(tabs)/transactions',
              params: { openModal: 'true' }
            });
            return;
          }

          const event = navigation.emit({
            type: 'tabPress',
            target: route.key,
            canPreventDefault: true,
          });

          if (!isFocused && !event.defaultPrevented) {
            navigation.navigate(route.name, route.params);
          }
        };

        const onLongPress = () => {
          navigation.emit({
            type: 'tabLongPress',
            target: route.key,
          });
        };

        return (
          <TabItem
            key={route.key}
            route={route}
            label={label}
            isFocused={isFocused}
            onPress={onPress}
            onLongPress={onLongPress}
            icon={icon}
          />
        );
      })}
    </>
  );
}

export default function TabBarComponent(props: BottomTabBarProps) {
  const insets = useSafeAreaInsets();

  return (
    <View style={[styles.container, { bottom: insets.bottom + 15 }]}>
      <View style={styles.tabBar}>
        <TabBar {...props} />
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    position: 'absolute',
    alignSelf: 'center',
    width: TAB_BAR_WIDTH,
    zIndex: 100,
  },
  tabBar: {
    flexDirection: 'row',
    backgroundColor: '#FFFFFF',
    height: TAB_BAR_HEIGHT,
    borderRadius: 40,
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 12,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 10 },
    shadowOpacity: 0.1,
    shadowRadius: 20,
    elevation: 20,
    borderWidth: 1,
    borderColor: 'rgba(0,0,0,0.02)',
  },
  tabItem: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    height: '100%',
  },
  iconContainer: {
    alignItems: 'center',
    justifyContent: 'center',
    width: 40,
    height: 32,
  },
  labelText: {
    fontSize: 10,
    fontWeight: '600',
    marginTop: 4,
  },
  centerButtonContainer: {
    top: -24,
    width: CENTER_BUTTON_SIZE,
    height: CENTER_BUTTON_SIZE + 20,
    alignItems: 'center',
    justifyContent: 'center',
  },
  centerButton: {
    width: CENTER_BUTTON_SIZE,
    height: CENTER_BUTTON_SIZE,
    borderRadius: CENTER_BUTTON_SIZE / 2,
    backgroundColor: '#0F172A',
    alignItems: 'center',
    justifyContent: 'center',
    shadowColor: '#0F172A',
    shadowOffset: { width: 0, height: 8 },
    shadowOpacity: 0.3,
    shadowRadius: 12,
    elevation: 15,
  },
});
