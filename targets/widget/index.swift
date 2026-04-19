import WidgetKit
import SwiftUI

struct StreakEntry: TimelineEntry {
    let date: Date
    let streak: Int
}

struct Provider: TimelineProvider {
    func placeholder(in context: Context) -> StreakEntry {
        StreakEntry(date: Date(), streak: 0)
    }

    func getSnapshot(in context: Context, completion: @escaping (StreakEntry) -> Void) {
        let entry = StreakEntry(date: Date(), streak: getStreakFromSharedStorage())
        completion(entry)
    }

    func getTimeline(in context: Context, completion: @escaping (Timeline<StreakEntry>) -> Void) {
        let entry = StreakEntry(date: Date(), streak: getStreakFromSharedStorage())
        let timeline = Timeline(entries: [entry], policy: .atEnd)
        completion(timeline)
    }

    private func getStreakFromSharedStorage() -> Int {
        let defaults = UserDefaults(suiteName: "group.com.lifeos.prime")
        return defaults?.integer(forKey: "globalStreak") ?? 0
    }
}

struct StreakWidgetEntryView : View {
    var entry: Provider.Entry

    var body: some View {
        VStack {
            Text("🔥")
                .font(.system(size: 32))
            Text("\(entry.streak) Day Streak")
                .font(.headline)
                .foregroundColor(.white)
            Text("LifeOS")
                .font(.caption)
                .foregroundColor(.gray)
        }
        .containerBackground(for: .widget) {
            Color.black
        }
    }
}

@main
struct StreakWidget: Widget {
    let kind: String = "LifeOSStreakWidget"

    var body: some WidgetConfiguration {
        StaticConfiguration(kind: kind, provider: Provider()) { entry in
            StreakWidgetEntryView(entry: entry)
        }
        .configurationDisplayName("LifeOS Streak")
        .description("Keep track of your global streak.")
        .supportedFamilies([.systemSmall])
    }
}
