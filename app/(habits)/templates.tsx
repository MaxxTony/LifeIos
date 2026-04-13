import React, { useState } from 'react';
import { View, Text, StyleSheet, ScrollView, TouchableOpacity, TextInput } from 'react-native';
import { useRouter } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import { BlurView } from 'expo-blur';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Colors, Typography, Spacing, BorderRadius } from '@/constants/theme';
import { useThemeColors } from '@/hooks/useThemeColors';

const CATEGORIES = ['Popular', 'Health & Nutrition', 'Fitness', 'Growth', 'Mindfulness'];

const HABIT_TEMPLATES = [
  // Health & Nutrition
  { title: 'Drink Enough Water', icon: '💧', category: 'Health & Nutrition', color: '#4B9FFF', subtext: 'Stay hydrated throughout the day', popular: true },
  { title: '7h Sleep', icon: '😴', category: 'Health & Nutrition', color: '#8A4BFF', subtext: 'Rest and recharge fully', popular: true },
  { title: 'Eat Healthier', icon: '🥦', category: 'Health & Nutrition', color: '#00D68F', subtext: 'Make one healthier food choice' },
  { title: 'No Sugar', icon: '🚫', category: 'Health & Nutrition', color: '#FF6B6B', subtext: 'Avoid refined sugars today' },
  { title: 'Intermittent Fasting', icon: '⏲️', category: 'Health & Nutrition', color: '#4ECDC4', subtext: 'Maintain your fasting window' },

  // Fitness
  { title: 'Gym Workout', icon: '🏋️', category: 'Fitness', color: '#FF4B4B', subtext: 'Crush a gym session', popular: true },
  { title: '10k Steps', icon: '👣', category: 'Fitness', color: '#FF4BCB', subtext: 'Walk your way to wellness', popular: true },
  { title: 'Yoga', icon: '🧘‍♀️', category: 'Fitness', color: '#FF9F43', subtext: 'Improve flexibility and balance' },
  { title: 'Evening Walk', icon: '🌙', category: 'Fitness', color: '#2E86DE', subtext: 'Clear your mind at night' },
  { title: 'Morning Stretch', icon: '🌅', category: 'Fitness', color: '#F39C12', subtext: 'Wake up your body gently' },

  // Growth
  { title: 'Read a Book', icon: '📖', category: 'Growth', color: '#FFB84B', subtext: 'Read a few pages', popular: true },
  { title: 'Journaling', icon: '✍️', category: 'Growth', color: '#ee5253', subtext: 'Write down your thoughts', popular: true },
  { title: 'Learn Coding', icon: '💻', category: 'Growth', color: '#54a0ff', subtext: 'Practice your coding skills' },
  { title: 'Learn Language', icon: '🌎', category: 'Growth', color: '#10ac84', subtext: 'Master a new tongue' },
  { title: 'Listen to Podcast', icon: '🎧', category: 'Growth', color: '#5f27cd', subtext: 'Gain knowledge on the go' },

  // Mindfulness
  { title: 'Meditate', icon: '🧘', category: 'Mindfulness', color: '#4BFFB8', subtext: 'Find calm in the chaos', popular: true },
  { title: 'Gratitude', icon: '🙏', category: 'Mindfulness', color: '#FF9FF3', subtext: 'List 3 things you are thankful for', popular: true },
  { title: 'Deep Breathing', icon: '🌬️', category: 'Mindfulness', color: '#48dbfb', subtext: '5 minutes of focus breathing' },
  { title: 'Nature Time', icon: '🌲', category: 'Mindfulness', color: '#1dd1a1', subtext: 'Spend time outdoors' },
  { title: 'Digital Detox', icon: '📵', category: 'Mindfulness', color: '#222f3e', subtext: '1 hour without screens' },

  // Others
  { title: 'Save Money', icon: '💰', category: 'Growth', color: '#feca57', subtext: 'Track your daily savings', popular: true },
  { title: 'Clean Space', icon: '🧹', category: 'Mindfulness', color: '#ff9ff3', subtext: 'Tidy up your workspace' },
];

export default function TemplatesScreen() {
  const router = useRouter();
  const colors = useThemeColors();
  const [search, setSearch] = useState('');
  const [activeCategory, setActiveCategory] = useState('Popular');

  const filteredTemplates = HABIT_TEMPLATES.filter(t => {
    const matchesSearch = t.title.toLowerCase().includes(search.toLowerCase());
    const matchesCategory = activeCategory === 'Popular' ? !!t.popular : t.category === activeCategory;
    return matchesSearch && matchesCategory;
  });

  const handleSelect = (template: typeof HABIT_TEMPLATES[0]) => {
    router.push({
      pathname: '/(habits)/config',
      params: { 
        title: template.title,
        icon: template.icon,
        category: template.category,
        color: template.color
      }
    });
  };

  return (
    <SafeAreaView style={[styles.container, { backgroundColor: colors.background }]}>
      <View style={styles.header}>
        <TouchableOpacity onPress={() => router.back()} style={styles.backBtn}>
          <Ionicons name="close" size={24} color={colors.text} />
        </TouchableOpacity>
        <Text style={[styles.headerTitle, { color: colors.text }]}>New Habit</Text>
        <TouchableOpacity 
          onPress={() => router.push('/(habits)/config')}
          style={[styles.headerAddBtn, { backgroundColor: colors.primaryTransparent, borderColor: colors.primaryMuted }]}
        >
          <Ionicons name="add" size={24} color={colors.primary} />
        </TouchableOpacity>
      </View>

      <View style={[styles.searchContainer, { backgroundColor: colors.isDark ? 'rgba(255,255,255,0.03)' : 'rgba(0,0,0,0.03)', borderColor: colors.border }]}>
        <Ionicons name="search" size={20} color={colors.textSecondary + '60'} style={styles.searchIcon} />
        <TextInput
          style={[styles.searchInput, { color: colors.text }]}
          placeholder="Search habits..."
          placeholderTextColor={colors.textSecondary + '60'}
          value={search}
          onChangeText={setSearch}
        />
      </View>

      <View>
        <ScrollView horizontal showsHorizontalScrollIndicator={false} style={styles.categoryScroll} contentContainerStyle={styles.categoryContent}>
          {CATEGORIES.map(cat => (
            <TouchableOpacity 
              key={cat} 
              onPress={() => setActiveCategory(cat)}
              style={[
                styles.categoryBtn, 
                { backgroundColor: colors.isDark ? 'rgba(255,255,255,0.05)' : 'rgba(0,0,0,0.05)', borderColor: colors.isDark ? 'rgba(255,255,255,0.05)' : 'rgba(0,0,0,0.05)' },
                activeCategory === cat && [styles.activeCategoryBtn, { backgroundColor: colors.primaryTransparent, borderColor: colors.primaryMuted }]
              ]}
            >
              {cat === 'Popular' && <Ionicons name="star" size={14} color={activeCategory === cat ? colors.primary : "#FFB84B"} style={{marginRight: 4}} />}
              <Text style={[styles.categoryText, { color: colors.textSecondary }, activeCategory === cat && { color: colors.primary }]}>{cat}</Text>
            </TouchableOpacity>
          ))}
        </ScrollView>
      </View>

      <ScrollView style={styles.list} contentContainerStyle={styles.listContent}>
        <Text style={[styles.sectionTitle, { color: colors.text }]}>{activeCategory}</Text>
        <Text style={[styles.sectionSub, { color: colors.textSecondary }]}>Start with proven habits that have helped thousands succeed</Text>

        {filteredTemplates.map((item, index) => (
          <TouchableOpacity 
            key={index} 
            style={[styles.templateCard, { backgroundColor: colors.isDark ? 'rgba(255,255,255,0.02)' : 'rgba(0,0,0,0.02)', borderColor: colors.border }]}
            onPress={() => handleSelect(item)}
          >
            <View style={[styles.iconContainer, { backgroundColor: item.color + '15' }]}>
              <Text style={styles.templateEmoji}>{item.icon}</Text>
            </View>
            <View style={styles.templateInfo}>
              <Text style={[styles.templateTitle, { color: colors.text }]}>{item.title}</Text>
              <Text style={[styles.templateSub, { color: colors.textSecondary }]}>{item.subtext}</Text>
            </View>
          </TouchableOpacity>
        ))}
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 20,
    paddingVertical: 10,
  },
  backBtn: {
    width: 40,
    height: 40,
    justifyContent: 'center',
  },
  headerTitle: {
    fontSize: 18,
    fontWeight: '700',
    flex: 1,
    textAlign: 'center',
  },
  headerAddBtn: {
    width: 40,
    height: 40,
    borderRadius: 12,
    borderWidth: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
  searchContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    marginHorizontal: 20,
    borderRadius: 18,
    paddingHorizontal: 15,
    height: 54,
    marginTop: 10,
    borderWidth: 1,
  },
  searchIcon: {
    marginRight: 10,
  },
  searchInput: {
    flex: 1,
    fontSize: 16,
  },
  categoryScroll: {
    maxHeight: 50,
    marginTop: 25,
  },
  categoryContent: {
    paddingHorizontal: 15,
  },
  categoryBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 18,
    paddingVertical: 10,
    borderRadius: 12,
    marginHorizontal: 5,
    borderWidth: 1,
  },
  activeCategoryBtn: {
  },
  categoryText: {
    fontSize: 14,
    fontWeight: '700',
  },
  list: {
    flex: 1,
  },
  listContent: {
    padding: 20,
    paddingBottom: 60,
  },
  sectionTitle: {
    fontSize: 24,
    fontWeight: '800',
    marginBottom: 6,
  },
  sectionSub: {
    fontSize: 14,
    marginBottom: 25,
    lineHeight: 20,
    fontWeight: '500',
  },
  templateCard: {
    flexDirection: 'row',
    alignItems: 'center',
    borderRadius: 22,
    padding: 18,
    marginBottom: 14,
    borderWidth: 1,
  },
  iconContainer: {
    width: 54,
    height: 54,
    borderRadius: 16,
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 16,
  },
  templateEmoji: {
    fontSize: 26,
  },
  templateInfo: {
    flex: 1,
  },
  templateTitle: {
    fontSize: 16,
    fontWeight: '700',
    marginBottom: 3,
  },
  templateSub: {
    fontSize: 12,
    fontWeight: '500',
  },
  customBtn: {
    borderRadius: 18,
    height: 64,
    justifyContent: 'center',
    alignItems: 'center',
    marginTop: 20,
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.1,
    shadowRadius: 10,
    elevation: 5,
  },
  customBtnText: {
    fontSize: 17,
    fontWeight: '800',
  }
});
