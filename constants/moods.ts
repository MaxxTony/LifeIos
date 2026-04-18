import { Ionicons } from '@expo/vector-icons';

export const MoodColors = {
  awful: '#5B8CFF',
  meh: '#9B8EC4',
  okay: '#00D68F',
  good: '#FFB347',
  amazing: '#FF6B6B',
};

export const MOOD_LEVELS = [
  { level: 1, label: 'Awful', color: MoodColors.awful, bgColor: 'rgba(91,140,255,0.15)', icon: 'sad-outline' as const },
  { level: 2, label: 'Meh', color: MoodColors.meh, bgColor: 'rgba(155,142,196,0.15)', icon: 'remove-circle-outline' as const },
  { level: 3, label: 'Okay', color: MoodColors.okay, bgColor: 'rgba(0,214,143,0.15)', icon: 'happy-outline' as const },
  { level: 4, label: 'Good', color: MoodColors.good, bgColor: 'rgba(255,179,71,0.15)', icon: 'sunny-outline' as const },
  { level: 5, label: 'Amazing', color: MoodColors.amazing, bgColor: 'rgba(255,107,107,0.15)', icon: 'star-outline' as const },
];

export const ACTIVITIES = [
  { id: 'exercise', label: 'Exercise', icon: 'fitness-outline' as const },
  { id: 'work', label: 'Work', icon: 'briefcase-outline' as const },
  { id: 'social', label: 'Social', icon: 'people-outline' as const },
  { id: 'reading', label: 'Reading', icon: 'book-outline' as const },
  { id: 'music', label: 'Music', icon: 'musical-notes-outline' as const },
  { id: 'gaming', label: 'Gaming', icon: 'game-controller-outline' as const },
  { id: 'movie', label: 'Movie', icon: 'film-outline' as const },
  { id: 'walk', label: 'Walk', icon: 'walk-outline' as const },
];

export const EMOTIONS = [
  { id: 'excited', label: 'Excited', icon: 'flash-outline' as const },
  { id: 'relaxed', label: 'Relaxed', icon: 'leaf-outline' as const },
  { id: 'proud', label: 'Proud', icon: 'trophy-outline' as const },
  { id: 'hopeful', label: 'Hopeful', icon: 'balloon-outline' as const },
  { id: 'happy', label: 'Happy', icon: 'heart-outline' as const },
  { id: 'stressed', label: 'Stressed', icon: 'thunderstorm-outline' as const },
  { id: 'tired', label: 'Tired', icon: 'moon-outline' as const },
  { id: 'anxious', label: 'Anxious', icon: 'pulse-outline' as const },
];

export const getMoodConfig = (level: number) => {
  return MOOD_LEVELS.find(m => m.level === level) || MOOD_LEVELS[2]; // Default to 'Okay'
};

export const getMoodFromLegacy = (emoji: string): number => {
  switch (emoji) {
    case '😔': return 1;
    case '😐': return 2;
    case '🙂': return 3;
    case '😊': return 4;
    case '🔥': return 5;
    default: return 3;
  }
};
