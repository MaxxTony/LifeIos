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
        let entry = LifeOSEntry(date: Date(), data: readData() ?? fallbackData())
        let next = Calendar.current.date(byAdding: .minute, value: 30, to: Date()) ?? Date()
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
    var body: some View {
        LinearGradient(
            colors: [Color(hex: "#0D0D1A"), Color(hex: "#141428")],
            startPoint: .top, endPoint: .bottom
        )
    }
}

struct NotLoggedInView: View {
    var body: some View {
        VStack(spacing: 8) {
            Image(systemName: "lock.fill")
                .font(.system(size: 22, weight: .semibold))
                .foregroundColor(.white.opacity(0.4))
            Text("LifeOS")
                .font(.system(size: 14, weight: .bold, design: .rounded))
                .foregroundColor(.white)
            Text("Open app to login")
                .font(.system(size: 11))
                .foregroundColor(Color(hex: "#8888AA"))
        }
        .frame(maxWidth: .infinity, maxHeight: .infinity)
    }
}

struct ProgressBar: View {
    var progress: Double
    var color: Color
    var height: CGFloat = 6

    var body: some View {
        GeometryReader { geo in
            ZStack(alignment: .leading) {
                RoundedRectangle(cornerRadius: height / 2)
                    .fill(Color.white.opacity(0.08))
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
    default:       return Color.white.opacity(0.35)
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
                .foregroundColor(.white)
                .shadow(color: accent.opacity(0.5), radius: 8)
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
                        .background(Color.white.opacity(0.06))
                        .clipShape(RoundedRectangle(cornerRadius: 8))
                }
            }
            Spacer()
            Text(formatFocusTime(d.focus.totalSecondsToday))
                .font(.system(size: 38, weight: .bold, design: .monospaced))
                .foregroundColor(.white)
                .shadow(color: accent.opacity(0.4), radius: 12)
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

// MARK: - Habits Widget

struct HabitsSmallView: View {
    let entry: LifeOSEntry
    var body: some View {
        let d = entry.data
        let accent = Color(hex: d.accentColor)
        let done = d.habitProgress.completed
        let total = d.habitProgress.total
        VStack(alignment: .leading, spacing: 0) {
            Text("✅ HABITS").font(.system(size: 10, weight: .black)).foregroundColor(Color(hex: "#8888AA"))
            Spacer()
            Text("\(d.stats.streak)").font(.system(size: 28, weight: .bold, design: .rounded)).foregroundColor(.white)
                .shadow(color: accent.opacity(0.5), radius: 8)
            Text("🔥 day streak").font(.system(size: 11)).foregroundColor(accent)
            Spacer()
            HStack(spacing: 4) {
                Text("\(done)/\(total)").font(.system(size: 13, weight: .bold)).foregroundColor(done == total && total > 0 ? accent : .white)
                Text("done").font(.system(size: 11)).foregroundColor(Color(hex: "#8888AA"))
            }
        }
        .padding(14)
    }
}

struct HabitsMediumView: View {
    let entry: LifeOSEntry
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
                    .foregroundColor(allDone ? accent : .white)
                Spacer()
                if allDone { Text("🎉").font(.system(size: 14)) }
            }
            .padding(.horizontal, 12).padding(.vertical, 7)
            .background(allDone ? accent.opacity(0.15) : Color.white.opacity(0.05))
            .overlay(RoundedRectangle(cornerRadius: 10).stroke(allDone ? accent.opacity(0.4) : Color.white.opacity(0.08), lineWidth: 1))
            .clipShape(RoundedRectangle(cornerRadius: 10))
            .padding(.top, 8)
            // Habit rows
            VStack(alignment: .leading, spacing: 6) {
                ForEach(d.habits.prefix(3)) { h in
                    HStack {
                        Text("\(h.icon)  \(h.title)")
                            .font(.system(size: 12, weight: h.isDoneToday ? .regular : .medium))
                            .foregroundColor(h.isDoneToday ? Color(hex: "#555570") : Color(hex: "#DDDDEE"))
                            .lineLimit(1)
                        Spacer()
                        Text(h.isDoneToday ? "✅" : "○")
                            .font(.system(size: 13))
                            .foregroundColor(h.isDoneToday ? accent : Color(hex: "#333352"))
                    }
                }
                if d.habits.count == 0 {
                    Text("Add habits in the app").font(.system(size: 12)).foregroundColor(Color(hex: "#444460"))
                }
            }
            .padding(.top, 8)
            Spacer()
        }
        .padding(16)
    }
}

// MARK: - Tasks Widget

struct TasksSmallView: View {
    let entry: LifeOSEntry
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
                            Text(t.text).font(.system(size: 11)).foregroundColor(.white.opacity(0.9)).lineLimit(1)
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
                    Text("No tasks for today").font(.system(size: 12)).foregroundColor(Color(hex: "#444460"))
                } else {
                    ForEach(Array(pending.prefix(3)), id: \.id) { t in
                        HStack(spacing: 8) {
                            Circle().fill(priorityColor(t.priority)).frame(width: 7, height: 7)
                            Text(t.text)
                                .font(.system(size: 12)).foregroundColor(Color(hex: "#DDDDEE")).lineLimit(1)
                        }
                    }
                    if pending.count > 3 {
                        Text("+\(pending.count - 3) more")
                            .font(.system(size: 11)).foregroundColor(Color(hex: "#555570"))
                    }
                }
            }
            .padding(.top, 10)
            Spacer()
        }
        .padding(16)
    }
}

// MARK: - XP Level Widget

struct XPLevelSmallView: View {
    let entry: LifeOSEntry
    var body: some View {
        let d = entry.data
        let accent = Color(hex: d.accentColor)
        let percent = Int(d.stats.xpProgress * 100)
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
                .foregroundColor(.white)
                .shadow(color: accent.opacity(0.5), radius: 8)
            Text("⭐ \(percent)% to next")
                .font(.system(size: 10)).foregroundColor(Color(hex: "#8888AA")).padding(.top, 2)
            Spacer()
            ProgressBar(progress: d.stats.xpProgress, color: accent, height: 5)
            Text("🔥 \(d.stats.streak)-day streak")
                .font(.system(size: 11)).foregroundColor(Color(hex: "#8888AA")).padding(.top, 5)
        }
        .padding(14)
    }
}

// MARK: - Mood Widget

struct MoodSmallView: View {
    let entry: LifeOSEntry
    var body: some View {
        let d = entry.data
        let accent = Color(hex: d.accentColor)
        let hasMood = d.mood.today > 0
        VStack(alignment: .leading, spacing: 0) {
            Text("MOOD").font(.system(size: 10, weight: .black)).foregroundColor(Color(hex: "#8888AA")).kerning(1)
            Spacer()
            if hasMood {
                Text(moodEmoji(d.mood.today)).font(.system(size: 28))
                Text(moodLabel(d.mood.today))
                    .font(.system(size: 12, weight: .bold))
                    .foregroundColor(moodBarColor(d.mood.today))
                    .padding(.top, 2)
            } else {
                Text("+").font(.system(size: 30, weight: .bold)).foregroundColor(accent)
                Text("Log mood").font(.system(size: 12)).foregroundColor(Color(hex: "#8888AA")).padding(.top, 2)
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
                NotLoggedInView()
            }
        }
        .widgetURL(URL(string: deepLink))
        .containerBackground(for: .widget) { WidgetBackground() }
    }
}

// MARK: - Widget Definitions

struct LifeOSFocusWidget: Widget {
    let kind = "LifeOSFocusWidget"
    var body: some WidgetConfiguration {
        StaticConfiguration(kind: kind, provider: LifeOSProvider()) { entry in
            GuardedWidgetView(entry: entry, deepLink: "lifeos:///focus-detail") {
                GeometryReader { geo in
                    if geo.size.width > 160 {
                        FocusTimerMediumView(entry: entry)
                    } else {
                        FocusTimerSmallView(entry: entry)
                    }
                }
            }
        }
        .configurationDisplayName("Focus Timer")
        .description("Track your daily focus time and goal.")
        .supportedFamilies([.systemSmall, .systemMedium])
    }
}

struct LifeOSHabitsWidget: Widget {
    let kind = "LifeOSHabitsWidget"
    var body: some WidgetConfiguration {
        StaticConfiguration(kind: kind, provider: LifeOSProvider()) { entry in
            GuardedWidgetView(entry: entry, deepLink: "lifeos:///all-habits") {
                GeometryReader { geo in
                    if geo.size.width > 160 {
                        HabitsMediumView(entry: entry)
                    } else {
                        HabitsSmallView(entry: entry)
                    }
                }
            }
        }
        .configurationDisplayName("Habits Today")
        .description("Check your daily habits at a glance.")
        .supportedFamilies([.systemSmall, .systemMedium])
    }
}

struct LifeOSTasksWidget: Widget {
    let kind = "LifeOSTasksWidget"
    var body: some WidgetConfiguration {
        StaticConfiguration(kind: kind, provider: LifeOSProvider()) { entry in
            GuardedWidgetView(entry: entry, deepLink: "lifeos:///all-tasks") {
                GeometryReader { geo in
                    if geo.size.width > 160 {
                        TasksMediumView(entry: entry)
                    } else {
                        TasksSmallView(entry: entry)
                    }
                }
            }
        }
        .configurationDisplayName("Today's Tasks")
        .description("See your pending tasks for today.")
        .supportedFamilies([.systemSmall, .systemMedium])
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
