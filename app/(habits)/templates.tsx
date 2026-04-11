import React, { useState } from 'react';
import { View, Text, StyleSheet, ScrollView, TouchableOpacity, TextInput } from 'react-native';
import { useRouter } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import { BlurView } from 'expo-blur';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Colors, Typography, Spacing, BorderRadius } from '@/constants/theme';

const CATEGORIES = ['Popular', 'Health & Nutrition', 'Fitness', 'Growth', 'Mindfulness'];

const HABIT_TEMPLATES = [
  { title: 'Gym Workout', icon: '🏋️', category: 'Fitness', color: '#FF4B4B', subtext: 'Crush a gym session' },
  { title: 'Drink Enough Water', icon: '💧', category: 'Health & Nutrition', color: '#4B9FFF', subtext: 'Stay hydrated throughout the day' },
  { title: '7h Sleep', icon: '😴', category: 'Health & Nutrition', color: '#8A4BFF', subtext: 'Rest and recharge fully' },
  { title: 'Read a Book', icon: '📖', category: 'Growth', color: '#FFB84B', subtext: 'Read a few pages' },
  { title: 'Meditation', icon: '🧘', category: 'Mindfulness', color: '#4BFFB8', subtext: 'Find calm in the chaos' },
  { title: '10k Steps', icon: '👣', category: 'Fitness', color: '#FF4BCB', subtext: 'Walk your way to wellness' },
  { title: 'Eat Healthier', icon: '🥦', category: 'Health & Nutrition', color: '#00D68F', subtext: 'Make one healthier food choice today' },
];

export default function TemplatesScreen() {
  const router = useRouter();
  const [search, setSearch] = useState('');
  const [activeCategory, setActiveCategory] = useState('Popular');

  const filteredTemplates = HABIT_TEMPLATES.filter(t => 
    t.title.toLowerCase().includes(search.toLowerCase()) &&
    (activeCategory === 'Popular' || t.category === activeCategory)
  );

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
    <SafeAreaView style={styles.container}>
      <View style={styles.header}>
        <TouchableOpacity onPress={() => router.back()} style={styles.backBtn}>
          <Ionicons name="close" size={24} color="#FFF" />
        </TouchableOpacity>
        <Text style={styles.headerTitle}>New Habit</Text>
      </View>

      <View style={styles.searchContainer}>
        <Ionicons name="search" size={20} color="rgba(255,255,255,0.3)" style={styles.searchIcon} />
        <TextInput
          style={styles.searchInput}
          placeholder="Search habits..."
          placeholderTextColor="rgba(255,255,255,0.3)"
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
              style={[styles.categoryBtn, activeCategory === cat && styles.activeCategoryBtn]}
            >
              {cat === 'Popular' && <Ionicons name="star" size={14} color={activeCategory === cat ? "#FFF" : "#FFB84B"} style={{marginRight: 4}} />}
              <Text style={[styles.categoryText, activeCategory === cat && styles.activeCategoryText]}>{cat}</Text>
            </TouchableOpacity>
          ))}
        </ScrollView>
      </View>

      <ScrollView style={styles.list} contentContainerStyle={styles.listContent}>
        <Text style={styles.sectionTitle}>{activeCategory}</Text>
        <Text style={styles.sectionSub}>Start with proven habits that have helped thousands succeed</Text>

        {filteredTemplates.map((item, index) => (
          <TouchableOpacity 
            key={index} 
            style={styles.templateCard}
            onPress={() => handleSelect(item)}
          >
            <View style={[styles.iconContainer, { backgroundColor: item.color + '15' }]}>
              <Text style={styles.templateEmoji}>{item.icon}</Text>
            </View>
            <View style={styles.templateInfo}>
              <Text style={styles.templateTitle}>{item.title}</Text>
              <Text style={styles.templateSub}>{item.subtext}</Text>
            </View>
          </TouchableOpacity>
        ))}

        <TouchableOpacity 
          style={styles.customBtn}
          onPress={() => router.push('/(habits)/config')}
        >
          <Text style={styles.customBtnText}>Create a custom habit</Text>
        </TouchableOpacity>
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#0b0b0f',
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
    color: '#FFF',
    flex: 1,
    textAlign: 'center',
    marginRight: 40,
  },
  searchContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: 'rgba(255,255,255,0.03)',
    marginHorizontal: 20,
    borderRadius: 18,
    paddingHorizontal: 15,
    height: 54,
    marginTop: 10,
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.06)',
  },
  searchIcon: {
    marginRight: 10,
  },
  searchInput: {
    flex: 1,
    color: '#FFF',
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
    backgroundColor: 'rgba(255,255,255,0.05)',
    marginHorizontal: 5,
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.05)',
  },
  activeCategoryBtn: {
    backgroundColor: 'rgba(255,255,255,0.1)',
    borderColor: 'rgba(255,255,255,0.2)',
  },
  categoryText: {
    color: 'rgba(255,255,255,0.4)',
    fontSize: 14,
    fontWeight: '700',
  },
  activeCategoryText: {
    color: '#FFF',
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
    color: '#FFF',
    marginBottom: 6,
  },
  sectionSub: {
    fontSize: 14,
    color: 'rgba(255,255,255,0.4)',
    marginBottom: 25,
    lineHeight: 20,
    fontWeight: '500',
  },
  templateCard: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: 'rgba(255,255,255,0.02)',
    borderRadius: 22,
    padding: 18,
    marginBottom: 14,
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.05)',
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
    color: '#FFF',
    marginBottom: 3,
  },
  templateSub: {
    fontSize: 12,
    color: 'rgba(255,255,255,0.3)',
    fontWeight: '500',
  },
  customBtn: {
    backgroundColor: '#FFF',
    borderRadius: 18,
    height: 64,
    justifyContent: 'center',
    alignItems: 'center',
    marginTop: 20,
    shadowColor: '#FFF',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.1,
    shadowRadius: 10,
    elevation: 5,
  },
  customBtnText: {
    color: '#000',
    fontSize: 17,
    fontWeight: '800',
  }
});
