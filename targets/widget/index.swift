import WidgetKit
import SwiftUI

// --- Models (STRICT) ---
struct WidgetTask: Decodable, Identifiable {
    let id: String
    let text: String
    let completed: Bool
    let priority: String
}

struct WidgetHabitProgress: Decodable {
    let completed: Int
    let total: Int
}

struct WidgetFocus: Decodable {
    let isActive: Bool
    let totalSecondsToday: Int
    let goalSeconds: Int
    let lastStartTime: Double?
}

struct WidgetStats: Decodable {
    let level: Int
    let totalXP: Int
    let streak: Int
}

struct WidgetData: Decodable {
    let tasks: [WidgetTask]
    let habitProgress: WidgetHabitProgress
    let focus: WidgetFocus
    let stats: WidgetStats
    let lastUpdated: Double
}

struct LifeOSEntry: TimelineEntry {
    let date: Date
    let data: WidgetData
}

// --- Provider ---
struct LifeOSProvider: TimelineProvider {
    
    func placeholder(in context: Context) -> LifeOSEntry {
        LifeOSEntry(date: Date(), data: getFallbackData())
    }

    func getSnapshot(in context: Context, completion: @escaping (LifeOSEntry) -> Void) {
        completion(LifeOSEntry(date: Date(), data: getSafeData()))
    }

    func getTimeline(in context: Context, completion: @escaping (Timeline<LifeOSEntry>) -> Void) {
        let entry = LifeOSEntry(date: Date(), data: getSafeData())
        let timeline = Timeline(entries: [entry], policy: .atEnd)
        completion(timeline)
    }

    private func getSafeData() -> WidgetData {
        return getDataFromSharedStorage() ?? getFallbackData()
    }

    private func getDataFromSharedStorage() -> WidgetData? {
        // App Groups are strictly defined in app.json and entitlements
        let defaults = UserDefaults(suiteName: "group.com.lifeos.prime")
        
        guard let jsonString = defaults?.string(forKey: "widgetData"),
              let jsonData = jsonString.data(using: .utf8),
              !jsonString.isEmpty else {
            return nil
        }

        do {
            return try JSONDecoder().decode(WidgetData.self, from: jsonData)
        } catch {
            print("[LifeOS] Decode Failure: \(error)")
            return nil
        }
    }

    private func getFallbackData() -> WidgetData {
        return WidgetData(
            tasks: [],
            habitProgress: WidgetHabitProgress(completed: 0, total: 0),
            focus: WidgetFocus(isActive: false, totalSecondsToday: 0, goalSeconds: 28800, lastStartTime: nil),
            stats: WidgetStats(level: 1, totalXP: 0, streak: 0),
            lastUpdated: Date().timeIntervalSince1970
        )
    }
}

// --- Views (STABILITY FOCUSED) ---

struct StatsWidgetView: View {
    var entry: LifeOSEntry
    
    var body: some View {
        VStack(alignment: .leading, spacing: 12) {
            HStack {
                Text("🔥")
                Text("\(entry.data.stats.streak)")
                    .font(.system(.title2, design: .rounded))
                    .bold()
                Spacer()
            }
            Spacer()
            VStack(alignment: .leading, spacing: 2) {
                Text("Level \(entry.data.stats.level)")
                    .font(.system(size: 11, weight: .bold))
                Text("\(entry.data.stats.totalXP) XP")
                    .font(.system(size: 10))
                    .foregroundColor(.gray)
            }
        }
        .padding()
        .containerBackground(for: .widget) {
            Color.black // Solid black is the most stable background for X86 Simulators
        }
    }
}

struct TasksWidgetView: View {
    var entry: LifeOSEntry
    
    var body: some View {
        VStack(alignment: .leading, spacing: 8) {
            Text("NEXT UP")
                .font(.system(size: 10, weight: .black))
                .foregroundColor(.purple)
            
            if !entry.data.tasks.isEmpty {
                VStack(alignment: .leading, spacing: 6) {
                    ForEach(entry.data.tasks.prefix(3)) { task in
                        Text("• \(task.text)")
                            .font(.system(size: 11))
                            .lineLimit(1)
                    }
                }
            } else {
                Text("No tasks left!")
                    .font(.caption2)
                    .foregroundColor(.gray)
                    .padding(.top, 4)
            }
            Spacer()
        }
        .padding()
        .containerBackground(for: .widget) {
            Color.black
        }
    }
}

struct FocusWidgetView: View {
    var entry: LifeOSEntry
    
    var body: some View {
        VStack(spacing: 12) {
            Text("FOCUS")
                .font(.system(size: 10, weight: .black))
                .foregroundColor(.gray)
            
            if entry.data.focus.isActive {
                Text("🧘 Active")
                    .font(.system(.subheadline, design: .rounded))
                    .bold()
                    .foregroundColor(.purple)
            } else {
                Text("Inactive")
                    .font(.system(.subheadline, design: .rounded))
                    .foregroundColor(.gray.opacity(0.5))
            }
        }
        .padding()
        .containerBackground(for: .widget) {
            Color.black
        }
    }
}

// --- Widget Definitions ---

struct LifeOSStatsWidget: Widget {
    let kind: String = "LifeOSStatsWidget"

    var body: some WidgetConfiguration {
        StaticConfiguration(kind: kind, provider: LifeOSProvider()) { entry in
            StatsWidgetView(entry: entry)
        }
        .configurationDisplayName("Your Level")
        .description("Track your global steak and XP progress.")
        .supportedFamilies([.systemSmall])
    }
}

struct LifeOSTasksWidget: Widget {
    let kind: String = "LifeOSTasksWidget"

    var body: some WidgetConfiguration {
        StaticConfiguration(kind: kind, provider: LifeOSProvider()) { entry in
            TasksWidgetView(entry: entry)
        }
        .configurationDisplayName("Quick Tasks")
        .description("Keep an eye on your next 3 priorities.")
        .supportedFamilies([.systemSmall]) // Standardized for Simulator Stability
    }
}

struct LifeOSFocusWidget: Widget {
    let kind: String = "LifeOSFocusWidget"

    var body: some WidgetConfiguration {
        StaticConfiguration(kind: kind, provider: LifeOSProvider()) { entry in
            FocusWidgetView(entry: entry)
        }
        .configurationDisplayName("Focus State")
        .description("Check if you are currently in Monk Mode.")
        .supportedFamilies([.systemSmall])
    }
}

@main
struct LifeOSWidgets: WidgetBundle {
    var body: some Widget {
        LifeOSStatsWidget()
        LifeOSTasksWidget()
        LifeOSFocusWidget()
    }
}