import React, { useState } from 'react';
import { View, Text, StyleSheet, ScrollView, TouchableOpacity, TextInput, Platform } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useRouter } from 'expo-router';
import { BlurView } from 'expo-blur';
import { Colors, Spacing, BorderRadius, Typography } from '@/constants/theme';
import { GlassCard } from '@/components/GlassCard';
import { IconSymbol } from '@/components/ui/icon-symbol';
import { useStore } from '@/store/useStore';
import { LinearGradient } from 'expo-linear-gradient';

const EMOJIS = ['😔', '😐', '🙂', '😊', '🔥'];

export default function HomeScreen() {
  const { userName, tasks, addTask, toggleTask, setMood, mood } = useStore();
  const [newTask, setNewTask] = useState('');
  const router = useRouter();

  const handleAddTask = () => {
    if (newTask.trim()) {
      addTask(newTask.trim());
      setNewTask('');
    }
  };

  return (
    <SafeAreaView style={styles.container} edges={['top']}>
      <ScrollView contentContainerStyle={styles.scrollContent} showsVerticalScrollIndicator={false}>
        {/* Header */}
        <View style={styles.header}>
          <View>
            <Text style={styles.greeting}>Good morning,</Text>
            <Text style={styles.userName}>{userName || 'User'}</Text>
          </View>
          
          <TouchableOpacity 
            style={styles.chatButtonContainer}
            onPress={() => router.push('/ai-chat')}
            activeOpacity={0.7}
          >
            <BlurView intensity={30} tint="dark" style={styles.chatButtonBlur}>
              <IconSymbol name="sparkles" size={24} color={Colors.dark.primary} />
            </BlurView>
          </TouchableOpacity>
        </View>

        {/* AI Suggestion Card */}
        <GlassCard style={styles.aiCard}>
          <Text style={styles.cardLabel}>AI SUGGESTION</Text>
          <Text style={styles.aiText}>
            "Focus on completing your top 3 tasks today. You've got this!"
          </Text>
        </GlassCard>

        {/* Mood Selector */}
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>How are you feeling?</Text>
          <View style={styles.moodContainer}>
            {EMOJIS.map((e, index) => (
              <TouchableOpacity 
                key={index} 
                style={[styles.moodItem, mood === e && styles.moodItemSelected]}
                onPress={() => setMood(e)}
              >
                <Text style={styles.emoji}>{e}</Text>
              </TouchableOpacity>
            ))}
          </View>
        </View>

        {/* Task List */}
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Daily Tasks</Text>
          {tasks.slice(0, 5).map((task) => (
            <TouchableOpacity 
              key={task.id} 
              style={[styles.taskItem, task.completed && styles.taskItemCompleted]}
              onPress={() => toggleTask(task.id)}
            >
              <View style={[styles.checkbox, task.completed && styles.checkboxChecked]} />
              <Text style={[styles.taskText, task.completed && styles.taskTextCompleted]}>
                {task.text}
              </Text>
            </TouchableOpacity>
          ))}
          
          {/* Add Task Input */}
          <View style={styles.addInputContainer}>
            <TextInput
              style={styles.input}
              placeholder="Add a new task..."
              placeholderTextColor={Colors.dark.textSecondary}
              value={newTask}
              onChangeText={setNewTask}
              onSubmitEditing={handleAddTask}
            />
            <TouchableOpacity onPress={handleAddTask}>
              <LinearGradient colors={Colors.dark.gradient} style={styles.addButton} start={{x: 0, y: 0}} end={{x: 1, y: 1}}>
                <Text style={styles.addButtonText}>+</Text>
              </LinearGradient>
            </TouchableOpacity>
          </View>
        </View>
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: Colors.dark.background,
  },
  scrollContent: {
    padding: Spacing.md,
    paddingBottom: 100, // Space for tab bar
  },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: Spacing.xl,
  },
  chatButtonContainer: {
    width: 48,
    height: 48,
    borderRadius: 24,
    overflow: 'hidden',
    backgroundColor: 'rgba(255, 255, 255, 0.05)',
    borderWidth: 1,
    borderColor: 'rgba(255, 255, 255, 0.1)',
  },
  chatButtonBlur: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
  greeting: {
    ...Typography.body,
    color: Colors.dark.textSecondary,
  },
  userName: {
    ...Typography.h1,
    color: Colors.dark.text,
  },
  aiCard: {
    marginBottom: Spacing.xl,
  },
  cardLabel: {
    ...Typography.caption,
    fontSize: 10,
    letterSpacing: 1,
    marginBottom: Spacing.xs,
  },
  aiText: {
    ...Typography.body,
    fontWeight: '500',
    color: Colors.dark.text,
  },
  section: {
    marginBottom: Spacing.xl,
  },
  sectionTitle: {
    ...Typography.h3,
    color: Colors.dark.text,
    marginBottom: Spacing.md,
  },
  moodContainer: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    backgroundColor: Colors.dark.card,
    padding: Spacing.md,
    borderRadius: BorderRadius.md,
  },
  moodItem: {
    width: 44,
    height: 44,
    justifyContent: 'center',
    alignItems: 'center',
    borderRadius: BorderRadius.sm,
  },
  moodItemSelected: {
    backgroundColor: Colors.dark.primary + '30',
    borderColor: Colors.dark.primary,
    borderWidth: 1,
  },
  emoji: {
    fontSize: 24,
  },
  taskItem: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: Colors.dark.card,
    padding: Spacing.md,
    borderRadius: BorderRadius.md,
    marginBottom: Spacing.sm,
    borderWidth: 1,
    borderColor: Colors.dark.border,
  },
  taskItemCompleted: {
    opacity: 0.6,
  },
  checkbox: {
    width: 20,
    height: 20,
    borderRadius: 6,
    borderWidth: 1,
    borderColor: Colors.dark.primary,
    marginRight: Spacing.md,
  },
  checkboxChecked: {
    backgroundColor: Colors.dark.primary,
  },
  taskText: {
    ...Typography.body,
    color: Colors.dark.text,
  },
  taskTextCompleted: {
    textDecorationLine: 'line-through',
    color: Colors.dark.textSecondary,
  },
  addInputContainer: {
    flexDirection: 'row',
    marginTop: Spacing.md,
  },
  input: {
    flex: 1,
    backgroundColor: Colors.dark.card,
    padding: Spacing.md,
    borderRadius: BorderRadius.md,
    color: Colors.dark.text,
    borderWidth: 1,
    borderColor: Colors.dark.border,
    marginRight: Spacing.sm,
  },
  addButton: {
    width: 50,
    height: 50,
    borderRadius: BorderRadius.md,
    justifyContent: 'center',
    alignItems: 'center',
  },
  addButtonText: {
    fontSize: 24,
    color: '#FFFFFF',
  },
});
