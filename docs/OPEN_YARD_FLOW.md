# Pantry, navigation and open-yard fetch

Food bags are kennel purchases. `purchaseItem` accepts a null dog ID for pantry-only effects, requires a living dog for dog effects, validates currency and upgraded pantry capacity, and returns a result. The shop only shows success after the store accepts the purchase. Local and cloud save paths retain the transaction.

The desktop sidebar and mobile bottom navigation are no longer rendered. The workspace uses that space. The kennel interior, its accessible room shortcuts, and the existing return-to-kennel controls provide navigation. The yard adds a cottage-door sign: Go inside walks the handler to the porch approach and opens the interior. The direct Go inside the kennel button remains available. Local backup controls remain accessible.

Fetch aims across the usable fenced yard (-10 to 10 on both axes). Buildings, the bench, storage, the hurdle, and the handler's immediate position are excluded as landing points. Invalid taps explain the problem and disable Throw until a valid point is selected. The old small target rectangle and accuracy scoring are removed. A chosen landing ring, pointer input and full-range fine-tuning sliders support desktop and touch play.

Fetch and recall use collision-safe waypoint routes; ball flight clears the cottage roof on crossing throws. The full-yard camera fits the lawn into the available fetch scene. Three completed retrieves still grant the existing session reward, with no balance change or save reset.

Validation: unit tests for purchases without a dog, capacity/failure accounting, distant fetch routes and blocked landing points; `scripts/yard-flow-smoke.mjs` covers real food purchases with no selection, no navigation bars, cottage entry, invalid aim and three far-yard retrieves at desktop/mobile sizes. `scripts/yard-camera-smoke.mjs` checks the new door label alongside existing yard controls.
