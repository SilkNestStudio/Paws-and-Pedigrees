import type { YardPosition } from './simulation';
const blocks = [[-9.3,-1.7,-9.3,-1.7],[-7,-3,1.1,2.9],[5.8,8.2,-4.2,-1.8],[6.1,9.5,3,3.65]];
export const handlerHome = {x:0,z:6};
export function walkable(p: YardPosition) { return Math.abs(p.x)<=10 && Math.abs(p.z)<=10 && !blocks.some(([l,r,t,b])=>p.x>=l&&p.x<=r&&p.z>=t&&p.z<=b); }
function clear(a:YardPosition,b:YardPosition) { const n=Math.ceil(Math.hypot(a.x-b.x,a.z-b.z)/.1); for(let i=0;i<=n;i++){const f=n?i/n:0;if(!walkable({x:a.x+(b.x-a.x)*f,z:a.z+(b.z-a.z)*f}))return false;}return true; }
/** Small bounded navigation grid. Never cut across occupied corners. */
export function yardPath(from:YardPosition,to:YardPosition):YardPosition[]|null {
 if(!walkable(from)||!walkable(to))return null;
 if(clear(from,to))return [{...to}];
 const nodes:YardPosition[]=[];for(let x=-10;x<=10;x+=.5)for(let z=-10;z<=10;z+=.5)if(walkable({x,z}))nodes.push({x,z});
 const key=(p:YardPosition)=>`${p.x},${p.z}`;const grid=new Map(nodes.map(p=>[key(p),p]));
 const start=nodes.filter(p=>Math.hypot(p.x-from.x,p.z-from.z)<1&&clear(from,p)).sort((a,b)=>Math.hypot(a.x-from.x,a.z-from.z)-Math.hypot(b.x-from.x,b.z-from.z))[0];
 if(!start)return null;const queue=[start],visited=new Set([key(start)]),parents=new Map<string,YardPosition>();
 for(let i=0;i<queue.length;i++){const p=queue[i];if(Math.hypot(p.x-to.x,p.z-to.z)<1&&clear(p,to)){const route=[to,p];let cursor=p;while(parents.has(key(cursor))){cursor=parents.get(key(cursor))!;route.push(cursor);}route.reverse();const smooth:YardPosition[]=[];let anchor=from;for(let j=0;j<route.length;){let end=route.length-1;while(end>j&&!clear(anchor,route[end]))end--;smooth.push(route[end]);anchor=route[end];j=end+1;}return smooth;}
 for(const [dx,dz] of [[.5,0],[-.5,0],[0,.5],[0,-.5],[.5,.5],[.5,-.5],[-.5,.5],[-.5,-.5]]){const n=grid.get(key({x:p.x+dx,z:p.z+dz}));if(n&&!visited.has(key(n))&&clear(p,n)){visited.add(key(n));parents.set(key(n),p);queue.push(n);}}}
 return null;
}
