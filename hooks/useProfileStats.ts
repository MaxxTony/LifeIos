import { useStore } from '@/store/useStore';
import { useMemo } from 'react';
import { getLevelProgress } from '@/store/helpers';

export const useProfileStats = () => {
  // ... existing selectors ...
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

    // 2. XP & Level Logic (Synchronized with helpers)
    const { progress: xpProgress, xpInLevel: xpInCurrentLevel, xpRequiredForNext } = getLevelProgress(totalXP);
    const xpNeeded = xpRequiredForNext - xpInCurrentLevel;

    // 4. Rank Determination
    const rankNames = [
      'Spark', 'Seeker', 'Challenger', 'Pathfinder', 'Striker',
      'Warrior', 'Guardian', 'Architect', 'Enforcer', 'Legend',
      'Phantom', 'Titan', 'Sovereign', 'Ascendant', 'Immortal',
      'Eclipse', 'Ethereal', 'Mythic', 'Transcendent', 'Apex',
    ];
    const rank = rankNames[Math.min(userLevel - 1, rankNames.length - 1)];

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
      level: userLevel,
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
  }, [habits, focusHistory, moodHistory, getStreak, focusSecondsToday, userLevel, totalXP]);

  return stats;
};
