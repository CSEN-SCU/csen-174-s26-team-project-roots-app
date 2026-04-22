---
config:
  layout: elk
title: Roots Data Flow
---
flowchart TB
    U["User"] --> R["Roots"]
    R <--> APIs["APIs"]
    U -- provides link --> R
    R -- returns consumable data --> U

     U:::indigo
     R:::teal
     APIs:::violet
    classDef indigo stroke:#818cf8,fill:#eef2ff
    classDef teal stroke:#2dd4bf,fill:#f0fdfa
    classDef violet stroke:#a78bfa,fill:#f5f3ff


---
config:
  layout: elk
---
flowchart TB
    User["User"] -- uses --> WebApp["WebApp"]
    WebApp -- gets input --> User
    WebApp -- feeds & takes --> Database[("Database")]
    WebApp -- calls --> YoutubeAPI["YOUTUBE_API"] & MetaAPI["META_API"] & ClaudeAPI["CLAUDE_API"]
    YoutubeAPI -- metadata --> ClaudeAPI
    MetaAPI -- metadata --> ClaudeAPI
    ClaudeAPI -- synthesised data --> WebApp
    WebApp -- feeds information --> User

     User:::userNode
     WebApp:::appNode
     Database:::dbNode
     YoutubeAPI:::apiNode
     MetaAPI:::apiNode
     ClaudeAPI:::apiNode
    classDef userNode stroke:#fb7185,fill:#fff1f2,color:#1e1b4b
    classDef appNode stroke:#38bdf8,fill:#f0f9ff,color:#1e1b4b
    classDef dbNode stroke:#a3e635,fill:#f7fee7,color:#1e1b4b
    classDef apiNode stroke:#a78bfa,fill:#f5f3ff,color:#1e1b4b
