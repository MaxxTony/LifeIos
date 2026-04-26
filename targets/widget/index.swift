import WidgetKit
import SwiftUI

// MARK: - Color Extension

extension Color {
    init(hex: String) {
        let hex = hex.trimmingCharacters(in: CharacterSet.alphanumerics.inverted)
        var int: UInt64 = 0
        Scanner(string: hex).scanHexInt64(&int)
        let r, g, b: UInt64
        switch hex.count {
        case 3:
            (r, g, b) = ((int >> 8) * 17, (int >> 4 & 0xF) * 17, (int & 0xF) * 17)
        case 6:
            (r, g, b) = (int >> 16, int >> 8 & 0xFF, int & 0xFF)
        default:
            (r, g, b) = (124, 92, 255) // fallback purple
        }
        self.init(.sRGB, red: Double(r)/255, green: Double(g)/255, blue: Double(b)/255)
    }
}

// MARK: - Data Models

struct WidgetTask: Decodable, Identifiable {
    let id: String
    let text: String
    let completed: Bool
    let priority: String
}

struct WidgetHabit: Decodable, Identifiable {
    let id: String
    let title: String
    let icon: String
    let isDoneToday: Bool
}

struct WidgetHabitProgress: Decodable {
    let completed: Int
    let total: Int
}

struct WidgetFocus: Decodable {
    let isActive: Bool
    let totalSecondsToday: Double
    let goalSeconds: Double
    let lastStartTime: Double?
}

struct WidgetStats: Decodable {
    let level: Int
    let totalXP: Int
    let streak: Int
    let xpProgress: Double
    let levelName: String
}

struct WidgetMood: Decodable {
    let today: Int
    let last5Days: [Int]
}

struct WidgetData: Decodable {
    let isLoggedIn: Bool
    let accentColor: String
    let tasks: [WidgetTask]
    let habits: [WidgetHabit]
    let habitProgress: WidgetHabitProgress
    let focus: WidgetFocus
    let stats: WidgetStats
    let mood: WidgetMood
    let lastUpdated: Double
}

struct LifeOSEntry: TimelineEntry {
    let date: Date
    let data: WidgetData
}

// MARK: - Provider

struct LifeOSProvider: TimelineProvider {
    func placeholder(in context: Context) -> LifeOSEntry {
        LifeOSEntry(date: Date(), data: fallbackData())
    }
    func getSnapshot(in context: Context, completion: @escaping (LifeOSEntry) -> Void) {
        completion(LifeOSEntry(date: Date(), data: readData() ?? fallbackData()))
    }
    func getTimeline(in context: Context, completion: @escaping (Timeline<LifeOSEntry>) -> Void) {
        let data = readData() ?? fallbackData()
        let entry = LifeOSEntry(date: Date(), data: data)
        // WID-001: Shorten refresh to 60s when data was written in the last 90s
        // (JS debounces widget sync to 500ms, so fresh data appears within ~1 min).
        // Fall back to 15 min otherwise — half the original 30 min.
        let dataAge = Date().timeIntervalSince1970 - data.lastUpdated
        let nextInterval: Int = dataAge < 90 ? 1 : 15
        let next = Calendar.current.date(byAdding: .minute, value: nextInterval, to: Date()) ?? Date()
        completion(Timeline(entries: [entry], policy: .after(next)))
    }

    private func readData() -> WidgetData? {
        guard
            let defaults = UserDefaults(suiteName: "group.com.lifeos.prime"),
            let json = defaults.string(forKey: "widgetData"),
            !json.isEmpty,
            let data = json.data(using: .utf8)
        else { return nil }
        return try? JSONDecoder().decode(WidgetData.self, from: data)
    }

    private func fallbackData() -> WidgetData {
        WidgetData(
            isLoggedIn: false, accentColor: "#7C5CFF",
            tasks: [], habits: [],
            habitProgress: WidgetHabitProgress(completed: 0, total: 0),
            focus: WidgetFocus(isActive: false, totalSecondsToday: 0, goalSeconds: 28800, lastStartTime: nil),
            stats: WidgetStats(level: 1, totalXP: 0, streak: 0, xpProgress: 0, levelName: "Spark"),
            mood: WidgetMood(today: 0, last5Days: [0,0,0,0,0]),
            lastUpdated: Date().timeIntervalSince1970
        )
    }
}

// MARK: - Shared Components

struct WidgetBackground: View {
    @Environment(\.colorScheme) var colorScheme
    var body: some View {
        // WID-004: Respect system dark/light mode instead of forcing dark.
        if colorScheme == .dark {
            LinearGradient(
                colors: [Color(hex: "#0D0D1A"), Color(hex: "#141428")],
                startPoint: .top, endPoint: .bottom
            )
        } else {
            LinearGradient(
                colors: [Color(hex: "#FFFFFF"), Color(hex: "#F2F3F8")],
                startPoint: .top, endPoint: .bottom
            )
        }
    }
}

struct NotLoggedInView: View {
    // WID-005: Use lastUpdated to distinguish "never synced" (first install) from
    // "logged out" — show a syncing hint so users aren't confused on first launch.
    var lastUpdated: Double = 0
    @Environment(\.colorScheme) var colorScheme

    private var isFreshInstall: Bool { lastUpdated == 0 }

    var body: some View {
        VStack(spacing: 8) {
            Image(systemName: isFreshInstall ? "arrow.triangle.2.circlepath" : "lock.fill")
                .font(.system(size: 22, weight: .semibold))
                .foregroundColor(colorScheme == .dark ? .white.opacity(0.4) : .black.opacity(0.3))
            Text("LifeOS")
                .font(.system(size: 14, weight: .bold, design: .rounded))
                .foregroundColor(colorScheme == .dark ? .white : .black)
            Text(isFreshInstall ? "Open app to sync" : "Sign in to continue")
                .font(.system(size: 11))
                .foregroundColor(Color(hex: colorScheme == .dark ? "#8888AA" : "#666688"))
        }
        .frame(maxWidth: .infinity, maxHeight: .infinity)
    }
}

struct ProgressBar: View {
    var progress: Double
    var color: Color
    var height: CGFloat = 6
    @Environment(\.colorScheme) var colorScheme

    var body: some View {
        GeometryReader { geo in
            ZStack(alignment: .leading) {
                RoundedRectangle(cornerRadius: height / 2)
                    .fill(colorScheme == .dark ? Color.white.opacity(0.12) : Color.black.opacity(0.08))
                    .frame(height: height)
                RoundedRectangle(cornerRadius: height / 2)
                    .fill(LinearGradient(
                        colors: [color, color.opacity(0.5)],
                        startPoint: .leading, endPoint: .trailing
                    ))
                    .frame(width: geo.size.width * min(1, max(0, progress)), height: height)
            }
        }
        .frame(height: height)
    }
}

func formatFocusTime(_ seconds: Double) -> String {
    let s = Int(seconds)
    let h = s / 3600
    let m = (s % 3600) / 60
    let sec = s % 60
    if h > 0 { return String(format: "%02d:%02d:%02d", h, m, sec) }
    return String(format: "%02d:%02d", m, sec)
}

func priorityColor(_ priority: String) -> Color {
    switch priority {
    case "high":   return Color(hex: "#FF4B4B")
    case "medium": return Color(hex: "#FFB347")
    default:       return Color.secondary
    }
}

func moodEmoji(_ mood: Int) -> String {
    switch mood {
    case 1: return "😔"; case 2: return "😕"
    case 3: return "😐"; case 4: return "🙂"
    case 5: return "😄"; default: return "—"
    }
}

func moodLabel(_ mood: Int) -> String {
    switch mood {
    case 1: return "Tough day"; case 2: return "Not great"
    case 3: return "Neutral";   case 4: return "Feeling good"
    case 5: return "Amazing!";  default: return "Not logged"
    }
}

func moodBarColor(_ mood: Int) -> Color {
    switch mood {
    case 1: return Color(hex: "#FF4B4B"); case 2: return Color(hex: "#FF8B4B")
    case 3: return Color(hex: "#FFB347"); case 4: return Color(hex: "#7EC8E3")
    case 5: return Color(hex: "#10B981"); default: return Color.white.opacity(0.1)
    }
}

// MARK: - Focus Timer Widget

struct FocusTimerSmallView: View {
    let entry: LifeOSEntry
    @Environment(\.colorScheme) var colorScheme
    var body: some View {
        let d = entry.data
        let accent = Color(hex: d.accentColor)
        let progress = d.focus.goalSeconds > 0 ? d.focus.totalSecondsToday / d.focus.goalSeconds : 0
        let percent = Int(min(100, progress * 100))
        VStack(alignment: .leading, spacing: 0) {
            HStack {
                Text("🔥 FOCUS").font(.system(size: 10, weight: .black)).foregroundColor(Color(hex: "#8888AA"))
                Spacer()
                if d.focus.isActive {
                    Text("LIVE").font(.system(size: 9, weight: .bold))
                        .foregroundColor(Color(hex: "#FF4B4B"))
                        .padding(.horizontal, 6).padding(.vertical, 2)
                        .background(Color(hex: "#FF4B4B").opacity(0.18))
                        .clipShape(Capsule())
                }
            }
            Spacer()
            Text(formatFocusTime(d.focus.totalSecondsToday))
                .font(.system(size: 26, weight: .bold, design: .monospaced))
                .foregroundColor(colorScheme == .dark ? .white : .black)
                .shadow(color: accent.opacity(colorScheme == .dark ? 0.5 : 0.2), radius: 8)
            Spacer()
            ProgressBar(progress: progress, color: accent)
            Text("\(percent)% of goal")
                .font(.system(size: 10)).foregroundColor(Color(hex: "#8888AA")).padding(.top, 4)
        }
        .padding(14)
    }
}

struct FocusTimerMediumView: View {
    let entry: LifeOSEntry
    @Environment(\.colorScheme) var colorScheme
    var body: some View {
        let d = entry.data
        let accent = Color(hex: d.accentColor)
        let progress = d.focus.goalSeconds > 0 ? d.focus.totalSecondsToday / d.focus.goalSeconds : 0
        let percent = Int(min(100, progress * 100))
        let goalH = Int(d.focus.goalSeconds / 3600)
        VStack(alignment: .leading, spacing: 0) {
            HStack {
                Text("🔥  FOCUS TIMER")
                    .font(.system(size: 11, weight: .black))
                    .foregroundColor(Color(hex: "#8888AA"))
                    .kerning(0.5)
                Spacer()
                if d.focus.isActive {
                    HStack(spacing: 4) {
                        Circle().fill(Color(hex: "#FF4B4B")).frame(width: 7, height: 7)
                        Text("LIVE").font(.system(size: 10, weight: .bold)).foregroundColor(Color(hex: "#FF4B4B"))
                    }
                    .padding(.horizontal, 8).padding(.vertical, 3)
                    .background(Color(hex: "#FF4B4B").opacity(0.15))
                    .overlay(RoundedRectangle(cornerRadius: 8).stroke(Color(hex: "#FF4B4B").opacity(0.4), lineWidth: 1))
                    .clipShape(RoundedRectangle(cornerRadius: 8))
                } else {
                    Text("TODAY").font(.system(size: 10, weight: .bold)).foregroundColor(Color(hex: "#8888AA"))
                        .padding(.horizontal, 8).padding(.vertical, 3)
                        .background(colorScheme == .dark ? Color.white.opacity(0.06) : Color.black.opacity(0.04))
                        .clipShape(RoundedRectangle(cornerRadius: 8))
                }
            }
            Spacer()
            Text(formatFocusTime(d.focus.totalSecondsToday))
                .font(.system(size: 38, weight: .bold, design: .monospaced))
                .foregroundColor(colorScheme == .dark ? .white : .black)
                .shadow(color: accent.opacity(colorScheme == .dark ? 0.4 : 0.15), radius: 12)
            Spacer()
            VStack(spacing: 6) {
                ProgressBar(progress: progress, color: accent, height: 6)
                HStack {
                    Text("\(percent)% of daily goal")
                        .font(.system(size: 11)).foregroundColor(Color(hex: "#8888AA"))
                    Spacer()
                    Text("Goal: \(goalH)h")
                        .font(.system(size: 11)).foregroundColor(Color(hex: "#8888AA"))
                }
            }
        }
        .padding(16)
    }
}

struct FocusTimerLargeView: View {
    let entry: LifeOSEntry
    @Environment(\.colorScheme) var colorScheme
    var body: some View {
        let d = entry.data
        let accent = Color(hex: d.accentColor)
        let progress = d.focus.goalSeconds > 0 ? d.focus.totalSecondsToday / d.focus.goalSeconds : 0
        let percent = Int(min(100, progress * 100))
        
        VStack(alignment: .leading, spacing: 0) {
            HStack {
                Text("🔥  FOCUS & PRODUCTIVITY")
                    .font(.system(size: 12, weight: .black)).foregroundColor(Color(hex: "#8888AA")).kerning(0.5)
                Spacer()
                if d.focus.isActive {
                    Text("LIVE SESSION").font(.system(size: 10, weight: .bold)).foregroundColor(Color(hex: "#FF4B4B"))
                        .padding(.horizontal, 8).padding(.vertical, 3)
                        .background(Color(hex: "#FF4B4B").opacity(0.15))
                        .clipShape(Capsule())
                }
            }
            
            HStack(alignment: .firstTextBaseline) {
                Text(formatFocusTime(d.focus.totalSecondsToday))
                    .font(.system(size: 44, weight: .bold, design: .monospaced))
                    .foregroundColor(colorScheme == .dark ? .white : .black)
                Text("today")
                    .font(.system(size: 16, weight: .medium))
                    .foregroundColor(Color(hex: "#8888AA"))
            }
            .padding(.top, 12)
            
            ProgressBar(progress: progress, color: accent, height: 8).padding(.top, 16)
            
            HStack {
                Text("\(percent)% of daily goal completed")
                    .font(.system(size: 13, weight: .medium)).foregroundColor(colorScheme == .dark ? .white : .black)
                Spacer()
                Text("\(Int(d.focus.goalSeconds/3600))h goal")
                    .font(.system(size: 12)).foregroundColor(Color(hex: "#8888AA"))
            }
            .padding(.top, 8)
            
            Spacer()
            
            // Mood / Focus Context
            Text("MOOD TREND")
                .font(.system(size: 10, weight: .black)).foregroundColor(Color(hex: "#8888AA")).padding(.bottom, 12)
            
            HStack(alignment: .bottom, spacing: 12) {
                ForEach(d.mood.last5Days.indices, id: \.self) { i in
                    let m = d.mood.last5Days[i]
                    let h: CGFloat = m > 0 ? max(8, CGFloat(m) / 5 * 60) : 8
                    VStack {
                        RoundedRectangle(cornerRadius: 4)
                            .fill(moodBarColor(m))
                            .frame(height: h)
                        Text(["M", "T", "W", "T", "F"][i])
                            .font(.system(size: 10, weight: .bold))
                            .foregroundColor(Color(hex: "#8888AA"))
                    }
                }
            }
            .frame(height: 80)
        }
        .padding(20)
    }
}

// MARK: - Habits Widget

struct HabitsSmallView: View {
    let entry: LifeOSEntry
    @Environment(\.colorScheme) var colorScheme
    var body: some View {
        let d = entry.data
        let accent = Color(hex: d.accentColor)
        let done = d.habitProgress.completed
        let total = d.habitProgress.total
        VStack(alignment: .leading, spacing: 0) {
            Text("✅ HABITS").font(.system(size: 10, weight: .black)).foregroundColor(Color(hex: "#8888AA"))
            Spacer()
            Text("\(d.stats.streak)").font(.system(size: 28, weight: .bold, design: .rounded))
                .foregroundColor(colorScheme == .dark ? .white : .black)
                .shadow(color: accent.opacity(colorScheme == .dark ? 0.5 : 0.2), radius: 8)
            Text("🔥 day streak").font(.system(size: 11)).foregroundColor(accent)
            Spacer()
            HStack(spacing: 4) {
                Text("\(done)/\(total)").font(.system(size: 13, weight: .bold)).foregroundColor(done == total && total > 0 ? accent : (colorScheme == .dark ? .white : .black))
                Text("done").font(.system(size: 11)).foregroundColor(Color(hex: "#8888AA"))
            }
        }
        .padding(14)
    }
}

struct HabitsMediumView: View {
    let entry: LifeOSEntry
    @Environment(\.colorScheme) var colorScheme
    var body: some View {
        let d = entry.data
        let accent = Color(hex: d.accentColor)
        let done = d.habitProgress.completed
        let total = d.habitProgress.total
        let allDone = total > 0 && done == total
        VStack(alignment: .leading, spacing: 0) {
            HStack {
                Text("✅  HABITS TODAY")
                    .font(.system(size: 11, weight: .black)).foregroundColor(Color(hex: "#8888AA")).kerning(0.5)
                Spacer()
                Text("🔥 \(d.stats.streak)d streak").font(.system(size: 11, weight: .bold)).foregroundColor(accent)
            }
            // Completion pill
            HStack {
                Text(total == 0 ? "No habits today" : "\(done) / \(total) completed")
                    .font(.system(size: 13, weight: .bold))
                    .foregroundColor(allDone ? accent : (colorScheme == .dark ? .white : .black))
                Spacer()
                if allDone { Text("🎉").font(.system(size: 14)) }
            }
            .padding(.horizontal, 12).padding(.vertical, 7)
            .background(allDone ? accent.opacity(0.15) : (colorScheme == .dark ? Color.white.opacity(0.05) : Color.black.opacity(0.03)))
            .overlay(RoundedRectangle(cornerRadius: 10).stroke(allDone ? accent.opacity(0.4) : Color.gray.opacity(0.2), lineWidth: 1))
            .clipShape(RoundedRectangle(cornerRadius: 10))
            .padding(.top, 8)
            // Habit rows
            VStack(alignment: .leading, spacing: 6) {
                ForEach(d.habits.prefix(3)) { h in
                    HStack {
                        Text("\(h.icon)  \(h.title)")
                            .font(.system(size: 12, weight: h.isDoneToday ? .regular : .medium))
                            .foregroundColor(h.isDoneToday ? Color(hex: "#8888AA") : (colorScheme == .dark ? .white : .black))
                            .lineLimit(1)
                        Spacer()
                        Text(h.isDoneToday ? "✅" : "○")
                            .font(.system(size: 13))
                            .foregroundColor(h.isDoneToday ? accent : Color.gray.opacity(0.4))
                    }
                }
                if d.habits.count == 0 {
                    Text("Add habits in the app").font(.system(size: 12)).foregroundColor(Color(hex: "#8888AA"))
                }
            }
            .padding(.top, 8)
            Spacer()
        }
        .padding(16)
    }
}

struct HabitsLargeView: View {
    let entry: LifeOSEntry
    @Environment(\.colorScheme) var colorScheme
    var body: some View {
        let d = entry.data
        let accent = Color(hex: d.accentColor)
        let done = d.habitProgress.completed
        let total = d.habitProgress.total
        
        VStack(alignment: .leading, spacing: 0) {
            HStack {
                VStack(alignment: .leading, spacing: 4) {
                    Text("✅  HABITS").font(.system(size: 12, weight: .black)).foregroundColor(Color(hex: "#8888AA"))
                    Text("\(done) of \(total) done")
                        .font(.system(size: 20, weight: .bold, design: .rounded))
                        .foregroundColor(colorScheme == .dark ? .white : .black)
                }
                Spacer()
                VStack(alignment: .trailing, spacing: 4) {
                    Text("STREAK").font(.system(size: 10, weight: .bold)).foregroundColor(Color(hex: "#8888AA"))
                    Text("🔥 \(d.stats.streak) days")
                        .font(.system(size: 18, weight: .bold))
                        .foregroundColor(accent)
                }
            }
            
            ProgressBar(progress: total > 0 ? Double(done)/Double(total) : 0, color: accent, height: 8).padding(.top, 16)
            
            Divider().padding(.vertical, 16).opacity(0.1)
            
            VStack(spacing: 12) {
                ForEach(d.habits.prefix(6)) { h in
                    HStack {
                        ZStack {
                            Circle().fill(h.isDoneToday ? accent.opacity(0.15) : Color.gray.opacity(0.08)).frame(width: 32, height: 32)
                            Text(h.icon).font(.system(size: 16))
                        }
                        Text(h.title)
                            .font(.system(size: 14, weight: .medium))
                            .foregroundColor(h.isDoneToday ? Color(hex: "#8888AA") : (colorScheme == .dark ? .white : .black))
                            .strikethrough(h.isDoneToday)
                        Spacer()
                        if h.isDoneToday {
                            Image(systemName: "checkmark.circle.fill").foregroundColor(accent).font(.system(size: 20))
                        } else {
                            Circle().stroke(Color.gray.opacity(0.3), lineWidth: 2).frame(width: 20, height: 20)
                        }
                    }
                }
                if d.habits.isEmpty {
                    Text("No habits scheduled for today").font(.system(size: 14)).foregroundColor(Color(hex: "#8888AA")).padding(.top, 20)
                }
            }
            
            Spacer()
        }
        .padding(20)
    }
}

// MARK: - Tasks Widget

struct TasksSmallView: View {
    let entry: LifeOSEntry
    @Environment(\.colorScheme) var colorScheme
    var body: some View {
        let d = entry.data
        let accent = Color(hex: d.accentColor)
        let pending = d.tasks.filter { !$0.completed }.prefix(2)
        VStack(alignment: .leading, spacing: 0) {
            Text("📋 TASKS").font(.system(size: 10, weight: .black)).foregroundColor(Color(hex: "#8888AA"))
            Spacer()
            if d.tasks.isEmpty {
                Text("All clear! 🎉").font(.system(size: 13, weight: .bold)).foregroundColor(Color(hex: "#10B981"))
            } else {
                VStack(alignment: .leading, spacing: 5) {
                    ForEach(Array(pending), id: \.id) { t in
                        HStack(spacing: 5) {
                            Circle().fill(priorityColor(t.priority)).frame(width: 6, height: 6)
                            Text(t.text).font(.system(size: 11))
                                .foregroundColor(colorScheme == .dark ? .white.opacity(0.9) : .black.opacity(0.8))
                                .lineLimit(1)
                        }
                    }
                }
            }
            Spacer()
            HStack(spacing: 3) {
                let done = d.tasks.filter { $0.completed }.count
                Text("\(done)/\(d.tasks.count)").font(.system(size: 13, weight: .bold)).foregroundColor(accent)
                Text("done").font(.system(size: 11)).foregroundColor(Color(hex: "#8888AA"))
            }
        }
        .padding(14)
    }
}

struct TasksMediumView: View {
    let entry: LifeOSEntry
    @Environment(\.colorScheme) var colorScheme
    var body: some View {
        let d = entry.data
        let accent = Color(hex: d.accentColor)
        let done = d.tasks.filter { $0.completed }.count
        let total = d.tasks.count
        let progress = total > 0 ? Double(done) / Double(total) : 0
        let pending = d.tasks.filter { !$0.completed }
        let allDone = total > 0 && done == total
        VStack(alignment: .leading, spacing: 0) {
            HStack {
                Text("📋  TODAY'S TASKS")
                    .font(.system(size: 11, weight: .black)).foregroundColor(Color(hex: "#8888AA")).kerning(0.5)
                Spacer()
                Text(total == 0 ? "—" : "\(done) / \(total)")
                    .font(.system(size: 11, weight: .bold)).foregroundColor(accent)
            }
            if total > 0 {
                ProgressBar(progress: progress, color: accent, height: 4).padding(.top, 8)
            }
            VStack(alignment: .leading, spacing: 7) {
                if allDone {
                    Text("🎉  All tasks done!").font(.system(size: 13, weight: .bold)).foregroundColor(Color(hex: "#10B981"))
                } else if pending.isEmpty && total == 0 {
                    Text("No tasks for today").font(.system(size: 12)).foregroundColor(Color(hex: "#8888AA"))
                } else {
                    ForEach(Array(pending.prefix(3)), id: \.id) { t in
                        HStack(spacing: 8) {
                            Circle().fill(priorityColor(t.priority)).frame(width: 7, height: 7)
                            Text(t.text)
                                .font(.system(size: 12))
                                .foregroundColor(colorScheme == .dark ? Color(hex: "#DDDDEE") : .black)
                                .lineLimit(1)
                        }
                    }
                    if pending.count > 3 {
                        Text("+\(pending.count - 3) more")
                            .font(.system(size: 11)).foregroundColor(Color(hex: "#8888AA"))
                    }
                }
            }
            .padding(.top, 10)
            Spacer()
        }
        .padding(16)
    }
}

struct TasksLargeView: View {
    let entry: LifeOSEntry
    @Environment(\.colorScheme) var colorScheme
    var body: some View {
        let d = entry.data
        let accent = Color(hex: d.accentColor)
        let done = d.tasks.filter { $0.completed }.count
        let total = d.tasks.count
        let pending = d.tasks.filter { !$0.completed }
        
        VStack(alignment: .leading, spacing: 0) {
            HStack {
                VStack(alignment: .leading, spacing: 4) {
                    Text("📋  TASKS").font(.system(size: 12, weight: .black)).foregroundColor(Color(hex: "#8888AA"))
                    Text("\(done) of \(total) completed")
                        .font(.system(size: 20, weight: .bold, design: .rounded))
                        .foregroundColor(colorScheme == .dark ? .white : .black)
                }
                Spacer()
                ZStack {
                    Circle().stroke(Color.gray.opacity(0.2), lineWidth: 4).frame(width: 44, height: 44)
                    Circle()
                        .trim(from: 0, to: total > 0 ? Double(done)/Double(total) : 0)
                        .stroke(accent, style: StrokeStyle(lineWidth: 4, lineCap: .round))
                        .frame(width: 44, height: 44)
                        .rotationEffect(.degrees(-90))
                    Text("\(total > 0 ? Int(Double(done)/Double(total)*100) : 0)%")
                        .font(.system(size: 10, weight: .bold))
                        .foregroundColor(colorScheme == .dark ? .white : .black)
                }
            }
            
            Divider().padding(.vertical, 16).opacity(0.1)
            
            VStack(alignment: .leading, spacing: 12) {
                if total == 0 {
                    Text("No tasks scheduled for today.").font(.system(size: 14)).foregroundColor(Color(hex: "#8888AA")).padding(.top, 10)
                } else if pending.isEmpty {
                    VStack(alignment: .leading, spacing: 8) {
                        Text("All caught up! 🎊").font(.system(size: 18, weight: .bold)).foregroundColor(Color(hex: "#10B981"))
                        Text("You've completed all tasks for today.").font(.system(size: 14)).foregroundColor(Color(hex: "#8888AA"))
                    }
                    .padding(.top, 10)
                } else {
                    ForEach(Array(pending.prefix(7)), id: \.id) { t in
                        HStack(spacing: 12) {
                            Circle().fill(priorityColor(t.priority)).frame(width: 8, height: 8)
                            Text(t.text)
                                .font(.system(size: 14, weight: .medium))
                                .foregroundColor(colorScheme == .dark ? .white : .black)
                                .lineLimit(1)
                            Spacer()
                        }
                    }
                    if pending.count > 7 {
                        Text("+\(pending.count - 7) more tasks...")
                            .font(.system(size: 12, weight: .bold))
                            .foregroundColor(accent)
                            .padding(.leading, 20)
                    }
                }
            }
            
            Spacer()
        }
        .padding(20)
    }
}

// MARK: - XP Level Widget

struct XPLevelSmallView: View {
    let entry: LifeOSEntry
    @Environment(\.colorScheme) var colorScheme
    var body: some View {
        let d = entry.data
        let accent = Color(hex: d.accentColor)
        let percent = Int(d.stats.xpProgress * 100)
        let primaryText = colorScheme == .dark ? Color.white : Color.black
        let secondaryText = colorScheme == .dark ? Color(hex: "#8888AA") : Color(hex: "#666688")
        VStack(alignment: .leading, spacing: 0) {
            // Level badge
            Text("Lv. \(d.stats.level)")
                .font(.system(size: 12, weight: .bold))
                .foregroundColor(.white)
                .padding(.horizontal, 8).padding(.vertical, 4)
                .background(accent)
                .clipShape(RoundedRectangle(cornerRadius: 7))
            Spacer()
            // Level name
            Text(d.stats.levelName)
                .font(.system(size: 18, weight: .bold, design: .rounded))
                .foregroundColor(primaryText)
                .shadow(color: accent.opacity(0.5), radius: 8)
            Text("⭐ \(percent)% to next")
                .font(.system(size: 10)).foregroundColor(secondaryText).padding(.top, 2)
            Spacer()
            ProgressBar(progress: d.stats.xpProgress, color: accent, height: 5)
            Text("🔥 \(d.stats.streak)-day streak")
                .font(.system(size: 11)).foregroundColor(secondaryText).padding(.top, 5)
        }
        .padding(14)
    }
}

// MARK: - Mood Widget

struct MoodSmallView: View {
    let entry: LifeOSEntry
    @Environment(\.colorScheme) var colorScheme
    var body: some View {
        let d = entry.data
        let accent = Color(hex: d.accentColor)
        let hasMood = d.mood.today > 0
        let secondaryText = colorScheme == .dark ? Color(hex: "#8888AA") : Color(hex: "#666688")
        VStack(alignment: .leading, spacing: 0) {
            Text("MOOD").font(.system(size: 10, weight: .black)).foregroundColor(secondaryText).kerning(1)
            Spacer()
            if hasMood {
                Text(moodEmoji(d.mood.today)).font(.system(size: 28))
                Text(moodLabel(d.mood.today))
                    .font(.system(size: 12, weight: .bold))
                    .foregroundColor(moodBarColor(d.mood.today))
                    .padding(.top, 2)
            } else {
                Text("+").font(.system(size: 30, weight: .bold)).foregroundColor(accent)
                Text("Log mood").font(.system(size: 12)).foregroundColor(secondaryText).padding(.top, 2)
            }
            Spacer()
            // 5-day mini bar chart
            HStack(alignment: .bottom, spacing: 3) {
                ForEach(d.mood.last5Days.indices, id: \.self) { i in
                    let m = d.mood.last5Days[i]
                    let h: CGFloat = m > 0 ? max(4, CGFloat(m) / 5 * 22) : 4
                    RoundedRectangle(cornerRadius: 2)
                        .fill(moodBarColor(m))
                        .frame(width: 9, height: h)
                }
            }
            .frame(height: 22)
        }
        .padding(14)
    }
}

// MARK: - Wrapping Views (login guard + background)

struct GuardedWidgetView<Content: View>: View {
    let entry: LifeOSEntry
    let deepLink: String
    @ViewBuilder let content: () -> Content

    var body: some View {
        ZStack {
            WidgetBackground()
            if entry.data.isLoggedIn {
                content()
            } else {
                NotLoggedInView(lastUpdated: entry.data.lastUpdated)
            }
        }
        .widgetURL(URL(string: deepLink))
        .containerBackground(for: .widget) { WidgetBackground() }
    }
}

// MARK: - Widget Definitions

// WID-002: Helper that picks view by widget family — no GeometryReader needed.
struct FocusTimerAdaptiveView: View {
    @Environment(\.widgetFamily) var family
    let entry: LifeOSEntry
    var body: some View {
        switch family {
        case .systemSmall:  FocusTimerSmallView(entry: entry)
        case .systemMedium: FocusTimerMediumView(entry: entry)
        case .systemLarge:  FocusTimerLargeView(entry: entry)
        default:            FocusTimerMediumView(entry: entry)
        }
    }
}

struct HabitsAdaptiveView: View {
    @Environment(\.widgetFamily) var family
    let entry: LifeOSEntry
    var body: some View {
        switch family {
        case .systemSmall:  HabitsSmallView(entry: entry)
        case .systemMedium: HabitsMediumView(entry: entry)
        case .systemLarge:  HabitsLargeView(entry: entry)
        default:            HabitsMediumView(entry: entry)
        }
    }
}

struct LifeOSFocusWidget: Widget {
    let kind = "LifeOSFocusWidget"
    var body: some WidgetConfiguration {
        StaticConfiguration(kind: kind, provider: LifeOSProvider()) { entry in
            GuardedWidgetView(entry: entry, deepLink: "lifeos:///focus-detail") {
                FocusTimerAdaptiveView(entry: entry)
            }
        }
        .configurationDisplayName("Focus Timer")
        .description("Track your daily focus time and goal.")
        .supportedFamilies([.systemSmall, .systemMedium, .systemLarge])
    }
}

struct LifeOSHabitsWidget: Widget {
    let kind = "LifeOSHabitsWidget"
    var body: some WidgetConfiguration {
        StaticConfiguration(kind: kind, provider: LifeOSProvider()) { entry in
            GuardedWidgetView(entry: entry, deepLink: "lifeos:///all-habits") {
                HabitsAdaptiveView(entry: entry)
            }
        }
        .configurationDisplayName("Habits Today")
        .description("Check your daily habits at a glance.")
        .supportedFamilies([.systemSmall, .systemMedium, .systemLarge])
    }
}

struct TasksAdaptiveView: View {
    @Environment(\.widgetFamily) var family
    let entry: LifeOSEntry
    var body: some View {
        switch family {
        case .systemSmall:  TasksSmallView(entry: entry)
        case .systemMedium: TasksMediumView(entry: entry)
        case .systemLarge:  TasksLargeView(entry: entry)
        default:            TasksMediumView(entry: entry)
        }
    }
}

struct LifeOSTasksWidget: Widget {
    let kind = "LifeOSTasksWidget"
    var body: some WidgetConfiguration {
        StaticConfiguration(kind: kind, provider: LifeOSProvider()) { entry in
            GuardedWidgetView(entry: entry, deepLink: "lifeos:///all-tasks") {
                TasksAdaptiveView(entry: entry)
            }
        }
        .configurationDisplayName("Today's Tasks")
        .description("See your pending tasks for today.")
        .supportedFamilies([.systemSmall, .systemMedium, .systemLarge])
    }
}

struct LifeOSXPWidget: Widget {
    let kind = "LifeOSXPWidget"
    var body: some WidgetConfiguration {
        StaticConfiguration(kind: kind, provider: LifeOSProvider()) { entry in
            GuardedWidgetView(entry: entry, deepLink: "lifeos:///") {
                XPLevelSmallView(entry: entry)
            }
        }
        .configurationDisplayName("Level & XP")
        .description("View your level, XP progress and streak.")
        .supportedFamilies([.systemSmall])
    }
}

struct LifeOSMoodWidget: Widget {
    let kind = "LifeOSMoodWidget"
    var body: some WidgetConfiguration {
        StaticConfiguration(kind: kind, provider: LifeOSProvider()) { entry in
            GuardedWidgetView(entry: entry, deepLink: "lifeos:///mood-log") {
                MoodSmallView(entry: entry)
            }
        }
        .configurationDisplayName("Mood Tracker")
        .description("Log your mood and see your 5-day history.")
        .supportedFamilies([.systemSmall])
    }
}

// MARK: - Widget Bundle

@main
struct LifeOSWidgets: WidgetBundle {
    var body: some Widget {
        LifeOSFocusWidget()
        LifeOSHabitsWidget()
        LifeOSTasksWidget()
        LifeOSXPWidget()
        LifeOSMoodWidget()
    }
}
