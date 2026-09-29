export const VIEW_NAMES = {
 hub:'the kennel', kennel:'dog runs', dogDetail:'your companion', office:'our story', story:'story chapters',
 expansion:'kennel expansion', training:'training', competition:'competitions', breeding:'breeding', jobs:'work',
 shop:'supplies', vet:'the care room', demo3d:'the yard',
} as const;
export type GameView = keyof typeof VIEW_NAMES;
export type NavigationState = { current: GameView; history: GameView[] };
export const initialNavigation: NavigationState = { current:'hub', history:[] };
export function navigateTo(state:NavigationState, view:GameView):NavigationState {
 if(view===state.current)return state;
 if(view==='hub')return initialNavigation;
 const previous=state.history.lastIndexOf(view);
 if(previous>=0)return {current:view,history:state.history.slice(0,previous)};
 return {current:view,history:[...state.history,state.current]};
}
export function navigateBack(state:NavigationState):NavigationState {
 return {current:state.history[state.history.length-1]??'hub',history:state.history.slice(0,-1)};
}
