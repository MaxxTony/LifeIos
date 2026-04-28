export interface HabitTemplate {
  id: string;
  title: string;
  icon: string;
  category: string;
  color: string;
  frequency: 'daily' | 'weekly';
  description: string;
}

export const HABIT_TEMPLATES: HabitTemplate[] = [
  {
    id: 'tpl-water',
    title: 'Hydrate (2L)',
    icon: '💧',
    category: 'Health',
    color: '#2196F3',
    frequency: 'daily',
    description: 'Keep your body functioning at its best by drinking at least 2 liters of water.'
  },
  {
    id: 'tpl-meditation',
    title: 'Morning Zen',
    icon: '🌿',
    category: 'Mindfulness',
    color: '#4CAF50',
    frequency: 'daily',
    description: 'Start your day with 10 minutes of mindfulness to reduce stress and improve focus.'
  },
  {
    id: 'tpl-reading',
    title: 'Bookworm',
    icon: '📖',
    category: 'Growth',
    color: '#FF9800',
    frequency: 'daily',
    description: 'Read at least 10 pages of a book to expand your knowledge and perspective.'
  },
  {
    id: 'tpl-exercise',
    title: 'Sweat Session',
    icon: '💪',
    category: 'Fitness',
    color: '#F44336',
    frequency: 'daily',
    description: 'Get moving for at least 30 minutes to boost your mood and energy levels.'
  },
  {
    id: 'tpl-journal',
    title: 'Brain Dump',
    icon: '📓',
    category: 'Reflection',
    color: '#9C27B0',
    frequency: 'daily',
    description: 'Write down your thoughts and feelings to clear your mind and track your journey.'
  },
  {
    id: 'tpl-planning',
    title: 'Master Plan',
    icon: '📅',
    category: 'Productivity',
    color: '#607D8B',
    frequency: 'daily',
    description: 'Plan your next day before bed to hit the ground running every morning.'
  }
];
