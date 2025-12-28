import { Tabs } from 'expo-router';
import React from 'react';

export default function TabLayout() {
  return (
    <Tabs
      screenOptions={{
        headerShown: false,
        // ALT BARI TAMAMEN KALDIRAN KRİTİK SATIR:
        tabBarStyle: { display: 'none' }, 
      }}>
      <Tabs.Screen
        name="index"
        options={{
          title: 'Home',
        }}
      />
      {/* Explore ekranını navigasyondan tamamen gizliyoruz */}
      <Tabs.Screen
        name="explore"
        options={{
          href: null,
        }}
      />
    </Tabs>
  );
}