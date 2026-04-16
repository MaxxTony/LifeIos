import { useStore } from '@/store/useStore';
import { useMemo } from 'react';

export const useProfileStats = () => {
  // Selector pattern: subscribe to each field individually.
  // focusSecondsToday is a primitive so it doesn't re-render on tick until value changes.
  const habits = useStore(s => s.habits);
  const focusHistory = useStore(s => s.focusHistory);
  const getStreak = useStore(s => s.actions.getStreak);
  const moodHistory = useStore(s => s.moodHistory);
  const focusSecondsToday = useStore(s => s.focusSession.totalSecondsToday);
  const userLevel = useStore(s => s.level);
  const totalXP = useStore(s => s.totalXP);

  const stats = useMemo(() => {
    // 1. Lifetime Totals
    const historicalFocusSeconds = Object.values(focusHistory || {}).reduce((acc, sec) => acc + (typeof sec === 'number' ? sec : 0), 0);
    const todayFocusSeconds = focusSecondsToday || 0;
    const totalFocusSeconds = historicalFocusSeconds + todayFocusSeconds;
    const totalFocusHours = parseFloat((totalFocusSeconds / 3600).toFixed(1));
    const totalHabitCompletions = (habits || []).reduce((acc, h) => acc + (h.completedDays?.length || 0), 0);
    const totalMoodLogs = Object.keys(moodHistory || {}).length;

    // 2. XP & Level Logic (Now persistent from store)
    const level = userLevel;
    const xpInCurrentLevel = totalXP % 100;
    const xpNeeded = 100 - xpInCurrentLevel;
    const xpProgress = xpInCurrentLevel / 100;

    // 4. Rank Determination
    const rankNames = ['Novice', 'Striker', 'Achiever', 'Master', 'Champion', 'Legend'];
    const rank = rankNames[Math.min(level - 1, rankNames.length - 1)];

    // 5. Streaks
    const streaks = habits.map(h => getStreak(h.id));
    const maxStreak = streaks.length > 0 ? Math.max(...streaks) : 0;

    // 6. Mood Sentiment
    const moodEntries = Object.values(moodHistory || {});
    const avgMood = moodEntries.length > 0 
      ? moodEntries.reduce((acc, curr) => acc + curr.mood, 0) / moodEntries.length 
      : 0;
      
    let moodStatus = "Getting Started";
    let moodEmoji = "✨";
    let moodColor = "#A855F7";
    
    if (moodEntries.length > 0) {
      if (avgMood >= 4.0) {
        moodStatus = "High Clarity";
        moodEmoji = "⚡";
        moodColor = "#10B981"; // Emerald/Success
      } else if (avgMood >= 2.8) {
        moodStatus = "Stable & Balanced";
        moodEmoji = "🌿";
        moodColor = "#6366F1"; // Indigo/Primary
      } else {
        moodStatus = "Processing";
        moodEmoji = "🧘";
        moodColor = "#F59E0B"; // Amber
      }
    }

    return {
      level,
      totalXP,
      xpInCurrentLevel,
      xpNeeded,
      xpProgress,
      rank,
      totalHabitCompletions,
      totalFocusHours,
      totalMoodLogs,
      maxStreak,
      totalFocusSeconds,
      moodStatus,
      moodEmoji,
      moodColor,
      avgMood
    };
  }, [habits, focusHistory, moodHistory, getStreak, focusSecondsToday]);

  return stats;
};
