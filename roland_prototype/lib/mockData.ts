import type {
  ChatMessage,
  GroupMember,
  GroupProposal,
  Reel,
} from "./types";

export const mockReels: Reel[] = [
  {
    id: "reel-uvas",
    platform: "instagram",
    url: "https://instagram.com/reel/uvas-canyon-hike",
    creator: "@bayareatrails",
    thumbnailHue: "moss-400",
    caption:
      "Chasing waterfalls before the heat ☀️ Uvas Canyon at sunrise is unmatched. Park opens 8am, $6 entry, bring layers!",
    extracted: {
      transcript:
        "We pulled into Uvas Canyon County Park around eight, paid the six dollar day-use fee, and hit the Waterfall Loop. It's about a 4 mile loop with five waterfalls...",
      visualTags: ["waterfall", "redwoods", "trail markers", "kiosk fee box"],
      locationGuess: "Uvas Canyon County Park, Morgan Hill, CA",
      detectedHours: "Open daily 8:00 AM – sunset",
      instructions: [
        "Arrive by 8:00 AM to secure parking",
        "Bring $6 cash for day-use fee",
        "Wear layers — canyon is 15°F cooler than valley",
      ],
    },
    roadmap: {
      id: "rm-uvas",
      kind: "route",
      title: "Waterfall Loop Day Trip",
      summary:
        "A weather-checked sunrise hike with a coffee stop on the way and brunch on the return.",
      durationLabel: "Saturday · 7:00 AM – 1:30 PM",
      scheduledFor: "2026-04-25T07:00:00",
      weather: {
        tempF: 64,
        condition: "Partly cloudy",
        emoji: "⛅️",
        precipChance: 10,
      },
      stops: [
        {
          id: "s1",
          name: "Devout Coffee",
          category: "Coffee",
          address: "37323 Niles Blvd, Fremont",
          lat: 37.553,
          lng: -121.99,
          hours: "6:30 AM – 4:00 PM",
          travelMode: "drive",
          note: "Order ahead — 7 min ETA when leaving SJ",
        },
        {
          id: "s2",
          name: "Uvas Canyon County Park",
          category: "Trailhead",
          address: "8515 Croy Rd, Morgan Hill",
          lat: 37.0825,
          lng: -121.7977,
          hours: "8:00 AM – sunset",
          travelMinutesFromPrev: 58,
          travelMode: "drive",
          note: "$6 day-use fee · cash only",
        },
        {
          id: "s3",
          name: "Maggiano's Brunch",
          category: "Brunch",
          address: "3055 Olin Ave, San Jose",
          lat: 37.3239,
          lng: -121.9472,
          hours: "10:00 AM – 9:00 PM",
          travelMinutesFromPrev: 42,
          travelMode: "drive",
        },
      ],
    },
    createdAt: "2026-04-19T22:14:00",
  },
  {
    id: "reel-vintage",
    platform: "tiktok",
    url: "https://tiktok.com/@thriftedfits/video/9923",
    creator: "@thriftedfits",
    thumbnailHue: "clay-300",
    caption:
      "The PERFECT Oakland thrift route 🛍️ four stops, all walkable, all under $40 finds.",
    extracted: {
      transcript:
        "Start at Mercy Vintage on Piedmont, then walk down to Crossroads, then hit Mars Mercantile…",
      visualTags: ["clothing rack", "neon sign", "Oakland storefront", "BART"],
      locationGuess: "Piedmont Ave / Telegraph, Oakland CA",
      detectedHours: "Most stores 11 AM – 7 PM",
      instructions: [
        "Take BART to MacArthur",
        "Bring tote — no plastic bags in Oakland",
        "Cash for vendor at last stop",
      ],
    },
    roadmap: {
      id: "rm-vintage",
      kind: "route",
      title: "Oakland Thrift Crawl",
      summary:
        "Four vintage stops in a walkable mile, anchored by a coffee shop and ending at a record store.",
      durationLabel: "Sunday · 11:00 AM – 4:30 PM",
      scheduledFor: "2026-04-26T11:00:00",
      weather: {
        tempF: 71,
        condition: "Sunny",
        emoji: "☀️",
        precipChance: 0,
      },
      stops: [
        {
          id: "v1",
          name: "Highwire Coffee",
          category: "Coffee",
          address: "Piedmont Ave, Oakland",
          lat: 37.8267,
          lng: -122.2512,
          hours: "7:00 AM – 6:00 PM",
          travelMode: "walk",
        },
        {
          id: "v2",
          name: "Mercy Vintage",
          category: "Vintage",
          address: "4188 Piedmont Ave",
          lat: 37.831,
          lng: -122.249,
          hours: "11:00 AM – 7:00 PM",
          travelMinutesFromPrev: 6,
          travelMode: "walk",
        },
        {
          id: "v3",
          name: "Crossroads Trading",
          category: "Vintage",
          address: "5636 College Ave",
          lat: 37.8421,
          lng: -122.2516,
          hours: "11:00 AM – 8:00 PM",
          travelMinutesFromPrev: 12,
          travelMode: "walk",
        },
        {
          id: "v4",
          name: "Mars Mercantile",
          category: "Thrift",
          address: "2398 Telegraph Ave",
          lat: 37.8662,
          lng: -122.2585,
          hours: "11:00 AM – 7:00 PM",
          travelMinutesFromPrev: 9,
          travelMode: "transit",
        },
      ],
    },
    createdAt: "2026-04-18T19:02:00",
  },
  {
    id: "reel-ceramics",
    platform: "youtube",
    url: "https://youtube.com/shorts/handbuilt-mug",
    creator: "@studiofolk",
    thumbnailHue: "clay-400",
    caption:
      "Handbuild a coil mug in an afternoon — no wheel needed. Beginner friendly!",
    extracted: {
      transcript:
        "Wedge your clay, roll a slab for the base, then roll coils about pencil thickness…",
      visualTags: ["clay slab", "coil technique", "burnishing", "kiln"],
      locationGuess: "(skill — no location)",
      instructions: [
        "Wedge 1.5 lb of stoneware",
        "Score and slip every joint",
        "Dry slowly under plastic for 48 hours",
      ],
    },
    roadmap: {
      id: "rm-ceramics",
      kind: "project",
      title: "Build Your First Coil Mug",
      summary:
        "A weekend craft with materials list, drying schedule, and a kiln drop-off reminder.",
      durationLabel: "2 sessions · ~3.5 hours hands-on",
      scheduledFor: "2026-05-02T13:00:00",
      steps: [
        {
          id: "p1",
          title: "Gather materials",
          detail:
            "Stoneware clay, scoring tool, slip, rolling pin, plastic bag, banding wheel (optional).",
          durationMin: 20,
          materials: ["1.5 lb stoneware", "Scoring tool", "Slip", "Rolling pin"],
        },
        {
          id: "p2",
          title: "Wedge & roll the base slab",
          detail:
            "Wedge clay to remove air. Roll a 1/4 inch slab and cut a 4 inch circle for the base.",
          durationMin: 25,
        },
        {
          id: "p3",
          title: "Build the walls with coils",
          detail:
            "Roll pencil-thick coils. Score and slip each joint. Stack 6–8 coils, smoothing as you go.",
          durationMin: 60,
        },
        {
          id: "p4",
          title: "Attach the handle & burnish",
          detail:
            "Form a handle from a thicker coil. Score, slip, attach, then burnish exterior with a rib.",
          durationMin: 40,
        },
        {
          id: "p5",
          title: "Dry & deliver to kiln",
          detail:
            "Dry slowly under plastic for 48 hours, then bone dry for 5 days. Drop off at Higher Fire Clayspace for bisque.",
          durationMin: 30,
        },
      ],
    },
    createdAt: "2026-04-17T15:30:00",
  },
];

export const mockMembers: GroupMember[] = [
  { id: "u-roland", name: "Roland", initials: "RB", color: "bg-moss-500" },
  { id: "u-frank", name: "Frank", initials: "FK", color: "bg-clay-500" },
  { id: "u-aria", name: "Aria", initials: "AR", color: "bg-sky-accent" },
  { id: "u-jules", name: "Jules", initials: "JL", color: "bg-moss-700" },
  { id: "u-mina", name: "Mina", initials: "MN", color: "bg-clay-400" },
];

export const mockProposals: GroupProposal[] = [
  {
    id: "prop-1",
    proposedBy: "u-roland",
    reelId: "reel-uvas",
    title: "Saturday: Uvas Canyon Waterfall Loop",
    blurb:
      "Sunrise hike, brunch on the way back. Weather-checked, parking confirmed.",
    status: "voting",
    votes: [
      { memberId: "u-roland", vote: "yes" },
      { memberId: "u-frank", vote: "yes" },
      { memberId: "u-aria", vote: null },
      { memberId: "u-jules", vote: null },
      { memberId: "u-mina", vote: null },
    ],
  },
];

export const mockChat: ChatMessage[] = [
  {
    id: "m1",
    author: "u-roland",
    text: "Saw this hike on Reels — thought it'd be fun this weekend.",
    kind: "text",
    timestamp: "2026-04-19T22:14:00",
  },
  {
    id: "m2",
    author: "gerardbot",
    text: "I extracted the logistics from Roland's reel. Here's the proposed plan — react to vote.",
    kind: "system",
    timestamp: "2026-04-19T22:14:30",
  },
  {
    id: "m3",
    author: "gerardbot",
    text: "",
    kind: "proposal",
    proposalId: "prop-1",
    timestamp: "2026-04-19T22:14:31",
  },
  {
    id: "m4",
    author: "u-frank",
    text: "I'm in. Can we add a coffee stop?",
    kind: "text",
    timestamp: "2026-04-19T22:18:00",
  },
  {
    id: "m5",
    author: "gerardbot",
    text: "Added Devout Coffee in Fremont — on-route, opens 6:30 AM ☕️",
    kind: "system",
    timestamp: "2026-04-19T22:18:20",
  },
];
