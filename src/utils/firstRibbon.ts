import type { TutorialProgress } from '../types';
export const RIBBON_STEPS = [
    { id: 'yard', title: 'Meet your companion at home', why: 'Your rescue is the beginning of your kennel. Start with a little space to explore together.', how: 'Open the yard. Your chosen dog appears on the path; the bowls and resting mat are near the cottage.', target: 'demo3d', button: 'Meet your dog in the yard' },
    { id: 'move', title: 'Find your feet together', why: 'You are the handler. Your dog responds to your direction as you explore together.', how: 'Tap an open patch of lawn to walk your handler. Your dog follows when you move away. Use Call back to bring them beside you.', target: 'demo3d', button: 'Go to the yard' },
    { id: 'water', title: 'Check hydration', why: 'The water percentage shows how hydrated your dog is. Low hydration means care comes before strenuous training.', how: 'Choose Fill water bowl. Your handler walks over to prepare it. Your dog drinks from a ready bowl at 65% water or below; the lesson completes after they drink.', target: 'demo3d', button: 'Find the water bowl' },
    { id: 'supplies', title: 'Stock the pantry before feeding', why: 'Your kennel starts with an empty pantry. Buying a food bag adds supplies; serving a meal uses those supplies.', how: 'Buy your first $40 food bag here. It adds 10 units to the pantry; serving a meal is the next step.', target: 'shop', button: 'Buy a food bag - $40' },
    { id: 'feed', title: 'Serve a meal when it is needed', why: 'Meals use your food supplies. Watch the Food percentage rise and your pantry decrease. A full dog does not need another meal.', how: 'Choose Put out a meal. Your handler reserves one portion from the pantry. Your dog eats at 65% food or below; the lesson completes after they finish.', target: 'demo3d', button: 'Find the food bowl' },
    { id: 'fetch', title: 'Build trust through play', why: 'A rescue reveals more of its potential as your bond grows. Fetch builds happiness and trust, but uses energy.', how: 'Choose Play fetch in the yard. Choose any open landing spot in the yard, throw, wait for pickup, then call your dog home. Finish all three retrieves and save the session.', target: 'demo3d', button: 'Go play fetch' },
    { id: 'rest', title: 'Learn when to stop', why: 'Play uses energy. Rest is part of preparing well, rather than pushing through every activity.', how: 'Look at Energy, then choose Settle down to walk over and invite your dog to the outdoor mat. Training needs at least 30% energy.', target: 'demo3d', button: 'Find the resting mat' },
    { id: 'obedience', title: 'Teach a patient recall', why: 'Training uses training points and energy. Completed sessions build learned ability; inherited potential and learned skill are different.', how: 'Choose Practice sit, stay & recall. Ask for a sit, wait for the recall cue, then call your dog. Complete three repetitions and select Finish session.', target: 'demo3d', button: 'Practice recall in the yard' },
    { id: 'agility', title: 'Learn the course together', why: 'This is practice, not a race to be perfect. Missed gates can be retried. Your session report explains the progress you earned.', how: 'Choose Enter agility training to head to the gate. Follow the golden marker in order. Jump with Space or Jump; stay on the ground through the tunnel and weave poles.', target: 'demo3d', button: 'Find the agility gate' },
    { id: 'meet', title: 'Your first welcome meet', why: 'Put your practice together in a free, unranked introduction. Finishing earns a participation ribbon for your yard; it is not a championship title.', how: 'Complete the course, including every gate and the finish line. Faults are okay. Exit and retry whenever you need; the ribbon can only be earned once.', target: 'demo3d', button: 'Return to the yard' },
] as const;
export type RibbonStep = typeof RIBBON_STEPS[number]['id'];
export type RibbonJourney = NonNullable<TutorialProgress['firstRibbon']>;
export function nextRibbonStep(journey?: RibbonJourney) { return journey && RIBBON_STEPS.find(step => !journey.completed.includes(step.id)); }
export function recordRibbonStep(progress: TutorialProgress, dogId: string, step: RibbonStep): TutorialProgress {
    const journey = progress.firstRibbon;
    if (!journey || journey.status !== 'active' || journey.dogId !== dogId || journey.completed.includes(step))
        return progress;
    // The welcome meet is unlocked only after all teaching steps are complete.
    if (step === 'meet' && nextRibbonStep(journey)?.id !== 'meet')
        return progress;
    return { ...progress, firstRibbon: { ...journey, completed: [...journey.completed, step] } };
}

export function apprenticeshipComplete(progress: TutorialProgress): boolean {
    if (progress.fieldClub?.completedAt) return true;
    const journey = progress.firstRibbon;
    return !!journey && journey.status === 'complete' && !nextRibbonStep(journey);
}
export function lessonViewUnlocked(progress: TutorialProgress, view: string): boolean {
    if (apprenticeshipComplete(progress)) return true;
    if (['fieldClub','hub','office','kennel','dogDetail','demo3d','shop','vet'].includes(view)) return true;
    const completed = progress.firstRibbon?.completed ?? [];
    return view === 'training' && completed.includes('rest');
}
export const STARTING_CASH = 120;
