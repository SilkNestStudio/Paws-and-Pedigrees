import { walkable, yardPath } from './handler';
export type ActivityMode = 'fetch' | 'obedience';
export type ActivityPhase = 'aim' | 'flight' | 'chase' | 'pickup' | 'recall' | 'return' | 'sit' | 'stay' | 'cue' | 'reset' | 'complete';
export interface Point {
    x: number;
    z: number;
}
export const HOME = { x: 0, z: 6 };
export const MARK = { x: 0, z: 1 };
export const FETCH_BOUNDS = { min: -10, max: 10 };
export function validFetchAim(p:Point) { return Number.isFinite(p.x)&&Number.isFinite(p.z)&&walkable(p)&&Math.hypot(p.x-HOME.x,p.z-HOME.z)>=1.2; }
export interface ActivityState {
    mode: ActivityMode;
    phase: ActivityPhase;
    dog: Point;
    aim: Point;
    ball: Point & {
        y: number;
    };
    heading: number;
    elapsed: number;
    rounds: number;
    mistakes: number;
    route: Point[];
    aimError: string | null;
}
export function createActivity(mode: ActivityMode): ActivityState {
    return { mode, phase: mode === 'fetch' ? 'aim' : 'sit', dog: { ...(mode === 'fetch' ? HOME : MARK) }, aim: { x: 1, z: 2 }, ball: { ...HOME, y: .15 }, heading: mode === 'fetch' ? Math.PI : 0, elapsed: 0, rounds: 0, mistakes: 0, route: [], aimError: null };
}
export function aimActivity(s: ActivityState, p: Point) {
    if (s.phase !== 'aim') return false;
    if (!validFetchAim(p) || !yardPath(HOME,p)) { s.aimError='Choose open ground inside the fence, away from buildings, furniture, and the handler.'; return false; }
    s.aim = { ...p }; s.aimError = null; return true;
}
export function commandActivity(s: ActivityState, command: 'throw' | 'sit' | 'recall') {
    if (command === 'throw' && s.phase === 'aim') {
        if(s.aimError || !validFetchAim(s.aim)) return;
        const route=yardPath(s.dog,s.aim);if(!route)return;
        s.route=route;
        s.phase = 'flight';
        s.elapsed = 0;

    }
    else if (command === 'sit' && s.phase === 'sit') {
        s.phase = 'stay';
        s.elapsed = 0;
    }
    else if (command === 'recall' && (s.phase === 'recall' || s.phase === 'cue')) {
        s.route = yardPath(s.dog,HOME) ?? [];
        s.phase = 'return';
        s.elapsed = 0;
    }
    else if (command === 'recall' && s.phase === 'stay') {
        s.mistakes++;
        s.phase = 'sit';
        s.elapsed = 0;
    }
}
function approach(s: ActivityState, target: Point, dt: number, speed: number) {
    if(Math.hypot(target.x-s.dog.x,target.z-s.dog.z)<.08){s.dog={...target};s.route=[];return true;}
    if(!s.route.length)s.route=yardPath(s.dog,target)??[];
    const waypoint=s.route[0];if(!waypoint)return false;
    const dx=waypoint.x-s.dog.x,dz=waypoint.z-s.dog.z,d=Math.hypot(dx,dz);
    if(d<.001){s.route.shift();return false;}
    s.heading=Math.atan2(dx,dz);const step=Math.min(d,speed*dt);
    s.dog.x+=dx/d*step;s.dog.z+=dz/d*step;
    if(d<=step+.001)s.route.shift();
    return false;
}
// Lift the arc over the cottage when a throw crosses its roof.
function throwHeight(aim:Point){
    let height=2+Math.hypot(aim.x-HOME.x,aim.z-HOME.z)*.16;
    let enter=0,exit=1;
    for(const [start,end,min,max] of [[HOME.x,aim.x,-9.3,-1.7],[HOME.z,aim.z,-9.3,-1.7]]){
        const direction=end-start;
        if(!direction){if(start<min||start>max)return height;continue;}
        const a=(min-start)/direction,b=(max-start)/direction;
        enter=Math.max(enter,Math.min(a,b));exit=Math.min(exit,Math.max(a,b));
    }
    if(enter<exit&&enter>0&&exit<1)height=Math.max(height,4.5/Math.min(Math.sin(enter*Math.PI),Math.sin(exit*Math.PI)));
    return height;
}
export function stepActivity(s: ActivityState, delta: number) {
    const dt = Math.min(.05, Math.max(0, Number.isFinite(delta) ? delta : 0));
    s.elapsed += dt;
    if (s.phase === 'flight') {
        const t = Math.min(1, s.elapsed / 1.1);
        s.ball = { x: HOME.x + (s.aim.x - HOME.x) * t, z: HOME.z + (s.aim.z - HOME.z) * t, y: .15 + Math.sin(t * Math.PI) * throwHeight(s.aim) };
        if (t === 1) {
            s.phase = 'chase';
            s.elapsed = 0;
        }
    }
    else if (s.phase === 'chase' && approach(s, s.aim, dt, 3.8)) {
        s.phase = 'pickup';
        s.elapsed = 0;
    }
    else if (s.phase === 'pickup' && s.elapsed > .65) {
        s.phase = 'recall';
        s.ball = { x: s.dog.x + Math.sin(s.heading) * .8, z: s.dog.z + Math.cos(s.heading) * .8, y: .83 };
        s.elapsed = 0;
    }
    else if (s.phase === 'return') {
        const arrived = approach(s, HOME, dt, 3.2);
        if (s.mode === 'fetch')
            s.ball = { x: s.dog.x + Math.sin(s.heading) * .8, z: s.dog.z + Math.cos(s.heading) * .8, y: .83 };
        if (arrived) {
            s.rounds++;
            s.elapsed = 0;
            s.ball = { ...HOME, y: .15 };
            s.phase = s.rounds === 3 ? 'complete' : s.mode === 'fetch' ? 'aim' : 'reset';
        }
    }
    else if (s.phase === 'stay' && s.elapsed >= 3 + s.rounds) {
        s.phase = 'cue';
        s.elapsed = 0;
    }
    else if (s.phase === 'reset' && approach(s, MARK, dt, 2)) {
        s.phase = 'sit';
        s.heading = 0;
        s.elapsed = 0;
    }
}
export function activityPerformance(s: ActivityState) { return s.phase === 'complete' ? Math.max(.5, Math.min(1.2, 1.2 - s.mistakes * .1)) : 0; }
