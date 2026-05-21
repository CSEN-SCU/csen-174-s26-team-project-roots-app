# Part 3: Sprint 2 retrospective

## What went well in Sprint 2?
Implemented numerous working features to not only our application but our development workflow:
* CI pipeline and test automation
* User login service
* Database for users allowing for saving schedules / plans

## What could be improved?
* A key missing features is the ability to edit and modify existing plans
  * Edit names and pictures for saved tasks
* Implement interface for interacting with plans

## Which improvements will the team commit to in Sprint 3?
* A key missing features is the ability to edit and modify existing plans
  * Edit names and pictures for saved tasks
* Implement interface for interacting with plans

## Celebrate
Name specific people and specific contributions, same as Sprint 1.

**Cole:**
* Kanban Board
* Security Additions
* Finalized UI Design
* Built Login Page

**Frank:**
* Updating markdown files
* Implementation of CI/CD pipeline
* Added rate limiting

**Roland:**
* Mapping Integration
* YouTube Extraction prompt
* Login Database

## Red team response
One paragraph on what the team did with the peer red team report you received in W7. Which findings did you act on, which did you defer, which did you reject, and why? Link to the W7 remediation PRs.

The primary security risk that was found in our application was centered around vulnerabilities to prompt injection. Our application did not sanitize user inputs properly when they input a url for a piece of media. This could be used by attackers to abuse and overuse API calls, burning through our tokens or by asking for instructions for malicious acts. The primary fix was to implement rate limiting to ensure that our API calls would not be overused in any case, and to sanitize user inputs by making sure their inputs were valid URLs.

## Sprint 3 commitments
One or two improvements the team will act on, each translated into a specific Kanban card on the team's Sprint 3 board. Sprint 3 is the last sprint, so commitments need to land by W9 or get dropped. Link each card from the retro write-up.

The primary features we want to focus on in this sprint is implementing functionality to edit and modify existing plans a user has, and creating an interface from which users can use to make these edits themselves.

**Frank:**
* card 1
* card 2

**Cole:**
* card 3
* card 4

**Roland:**
* card 5
* card 6