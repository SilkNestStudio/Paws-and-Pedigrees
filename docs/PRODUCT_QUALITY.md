# Product quality review and production standard

> **Priority update - September 29, 2026:** Read [Game Vision](GAME_VISION.md) alongside these quality standards. The owner wants additional distinct playable activities and meaningful development now, with onboarding improved alongside them. The earlier instruction below to polish the first ribbon before adding any breadth is superseded; the quality and playtesting requirements still apply.

The current implementation establishes working gameplay, but it does not yet meet the intended commercial quality bar. Passing technical tests does not establish that the game looks, feels, or plays well.

## Findings in the existing game

- **Inconsistent presentation:** the navy/ivory main interface and yard coexist with older green cards, gradients, emoji icons, and generic confirmation windows in Training and Market. Establish a shared set of game panels, buttons, item cards, status indicators, dialogs, and typography, then replace these surfaces deliberately.
- **Disconnected play:** the yard opens separate full-screen activity scenes. Fetch and recall share the environment but reset the viewpoint and dog placement. Maintain camera, dog identity, spatial context, and transitions across activities.
- **Character quality:** the two dog rigs are functional body templates. Foot contact, turning, acceleration, carrying the ball, sitting and feeding still need authored animation and visual review. Breed recognition needs more than coat tint.
- **Weak feedback:** activity outcomes rely heavily on text and toasts. Add cohesive animation, sound, visual response and concise recaps. Important information must also remain understandable with sound off.
- **Onboarding assumptions:** the initial tutorial test incorrectly supplied food that a new player does not own. Start future first-session acceptance runs from the actual adoption flow, initial currency, empty pantry and default needs. Test blocked purchases, cancellation and returning after an interruption.
- **Editorial inconsistency:** American English is the product standard. Corrected practice/practiced across interface copy, guidance and related browser checks. Player-facing text should explain decisions, not internal reward safeguards or implementation details.
- **Progression is not balanced yet:** aging, care decay, training recovery, breeding, kennel capacity and competition rewards need one coherent calendar and economy. A connected tutorial is not proof that the long-term loop is engaging.
- **Reach is not scale:** local browser saves support development, not a secure shared economy. Preserve the storage boundary, but public accounts, authoritative competition/breeding/purchase validation, backup/recovery, moderation and operational monitoring require a later service-backed release phase.

## Next focused deliverable

Polish the first 15 minutes, from rescue adoption through the first earned ribbon, before adding more breadth. Keep existing progress and rules wherever they serve that experience.

1. Define and apply one art and interface direction to every screen in that journey.
2. Refine the dog animation, camera framing, controls and activity transitions together.
3. Add purposeful audio and visual feedback, with mute and reduced-motion support.
4. Run the actual new-player journey on desktop and physical phones, observing confusion and measuring load time, frame pacing and input response.
5. Fix blockers and unclear interactions before calling the journey ready for outside playtesting.

## Acceptance criteria

- Consistent American English, terminology, icons and interface components throughout the journey.
- No progression blocker from the default starting state; no dependence on a developer-stocked save.
- No claimed success for a failed action; no credit or charges for cancelled sessions.
- No detached props, obvious sliding feet, obscured targets, clipped controls or abrupt unexplained scene changes in the accepted scenes.
- Clear next actions, visible costs and useful recovery guidance when an action is unavailable.
- Confirmed persistence across reload and pause/resume, with recoverable errors.
- Measured performance against agreed target devices; desktop/mobile emulation alone is insufficient.
- A usability playtest with someone unfamiliar with the interface, followed by fixes based on what they actually struggled with.

These are release requirements, not claims that the current game already satisfies them. Large-scale audience readiness is a later engineering and operating milestone, not a label applied after visual improvements.
