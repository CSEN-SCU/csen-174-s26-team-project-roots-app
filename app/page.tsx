import { RootsProvider } from "@/lib/store";
import { TopBar } from "@/components/TopBar";
import { TodayView } from "@/components/TodayView";
import { CalendarView } from "@/components/CalendarView";
import { GroupView } from "@/components/GroupView";
import { RoadmapsView } from "@/components/RoadmapsView";
import { ActiveTabRouter } from "@/components/ActiveTabRouter";

export default function Home() {
  return (
    <RootsProvider>
      <TopBar />
      <ActiveTabRouter
        today={<TodayView />}
        calendar={<CalendarView />}
        group={<GroupView />}
        roadmaps={<RoadmapsView />}
      />
    </RootsProvider>
  );
}
