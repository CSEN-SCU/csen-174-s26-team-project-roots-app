import { RootsProvider } from "@/lib/store";
import { TopBar } from "@/components/TopBar";
import { ScheduleView } from "@/components/ScheduleView";
import { CalendarView } from "@/components/CalendarView";
import { ActiveTabRouter } from "@/components/ActiveTabRouter";

export default function Home() {
  return (
    <RootsProvider>
      <TopBar />
      <ActiveTabRouter
        schedule={<ScheduleView />}
        calendar={<CalendarView />}
      />
    </RootsProvider>
  );
}
