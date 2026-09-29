export const kennelColors = { copper: '#ac704a', navy: '#344b69', plum: '#79576f' };
const designs: Record<string,string> = {
 paw:'M8 14c-4 0-6 6-2 7 2 1 4-1 6-1s4 2 6 1c4-1 2-7-2-7-2-2-6-2-8 0M5 8v2m5-6v3m5-3v3m4 1v2',
 mountain:'m2 19 7-12 4 7 3-5 6 10H2ZM6 12l3 2 3-2M17 4h.01',
 star:'m12 3 2.8 5.7 6.2.9-4.5 4.4 1.1 6.2-5.6-3-5.6 3 1.1-6.2L3 9.6l6.2-.9L12 3Z',
 oak:'M12 22v-9m0 4-4-3m4 0 4-3M8 17C1 17 2 10 5 9 3 4 8 2 10 4c3-5 9-1 8 3 6 2 4 10-2 10',
};
export default function KennelEmblem({emblem='paw',color='copper',size=44}:{emblem?:string;color?:string;size?:number}) {
 return <svg width={size} height={size} viewBox="0 0 36 40" aria-hidden="true"><path d="M2 2h32v23c0 7-16 13-16 13S2 32 2 25Z" fill={kennelColors[color as keyof typeof kennelColors]??kennelColors.copper}/><path d={designs[emblem]??designs.paw} transform="translate(6 5)" fill="none" stroke="#fff2d8" strokeWidth="1.7" strokeLinecap="round" strokeLinejoin="round"/></svg>;
}
