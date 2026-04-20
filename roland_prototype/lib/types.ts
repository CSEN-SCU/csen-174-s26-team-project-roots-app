export type SourcePlatform = "instagram" | "tiktok" | "youtube" | "upload";

export type ExtractionStage =
  | "idle"
  | "fetching"
  | "transcribing"
  | "vision"
  | "geocoding"
  | "weather"
  | "done";

export interface Stop {
  id: string;
  name: string;
  category: string;
  address: string;
  lat: number;
  lng: number;
  hours: string;
  travelMinutesFromPrev?: number;
  travelMode?: "walk" | "drive" | "transit" | "bike";
  note?: string;
}

export interface Weather {
  tempF: number;
  condition: string;
  emoji: string;
  precipChance: number;
}

export interface ProjectStep {
  id: string;
  title: string;
  detail: string;
  durationMin: number;
  materials?: string[];
}

export type RoadmapKind = "route" | "project";

export interface Roadmap {
  id: string;
  kind: RoadmapKind;
  title: string;
  summary: string;
  durationLabel: string;
  stops?: Stop[];
  steps?: ProjectStep[];
  weather?: Weather;
  scheduledFor?: string; // ISO date string
}

export interface Reel {
  id: string;
  platform: SourcePlatform;
  url: string;
  creator: string;
  thumbnailHue: string; // tailwind hue token, e.g. "moss-300"
  caption: string;
  extracted: {
    transcript: string;
    visualTags: string[];
    locationGuess: string;
    detectedHours?: string;
    instructions?: string[];
  };
  roadmap: Roadmap;
  createdAt: string;
}

export interface GroupMember {
  id: string;
  name: string;
  initials: string;
  color: string;
}

export interface GroupVote {
  memberId: string;
  vote: "yes" | "no" | null;
}

export interface GroupProposal {
  id: string;
  proposedBy: string;
  reelId: string;
  title: string;
  blurb: string;
  votes: GroupVote[];
  status: "voting" | "scheduled" | "rejected";
  scheduledFor?: string;
}

export interface ChatMessage {
  id: string;
  author: "gerardbot" | string;
  text: string;
  kind: "text" | "proposal" | "system";
  proposalId?: string;
  timestamp: string;
}
