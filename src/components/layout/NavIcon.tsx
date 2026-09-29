const paths: Record<string, string> = {
 hub: 'M3 11 12 3l9 8M5 10v11h5v-7h4v7h5V10',
 demo3d: 'M3 21V9l5-6 5 6v12M3 11h10M7 21v-6h3v6m3-8h8m-5-4v12m5-12v12',
 office: 'M3 11 12 3l9 8M5 10v11h5v-7h4v7h5V10',
 kennel: 'M8 13c-4 0-6 7-2 8 2 1 4-1 6-1s4 2 6 1c4-1 2-8-2-8-2-2-6-2-8 0M5 8v1m5-5v2m5-2v2m4 2v1',
 training: 'M3 20V6m18 14V6M3 10h18M3 15h18M8 3v3m8-3v3',
 competition: 'M8 3h8v7a4 4 0 0 1-8 0V3Zm8 2h5v3a5 5 0 0 1-5 5M8 5H3v3a5 5 0 0 0 5 5m4 1v7m-4 0h8',
 breeding: 'M12 21S2 15 2 8a5 5 0 0 1 10-1A5 5 0 0 1 22 8c0 7-10 13-10 13Z',
 vet: 'M9 3h6v6h6v6h-6v6H9v-6H3V9h6V3Z',
 jobs: 'M3 7h18v14H3V7Zm5 0V3h8v4M3 12h18m-11 0v3h4v-3',
 shop: 'M4 7h16l2 5H2l2-5Zm0 5v9h16v-9M9 21v-6h6v6',
 arrow: 'M4 12h16m-6-6 6 6-6 6',
 story: 'M12 5v16M12 5C8 2 4 3 2 4v15c4-2 7-1 10 2 3-3 6-4 10-2V4c-4-2-7-1-10 1',
};
export default function NavIcon({ name, size = 22 }: { name: string; size?: number }) {
 return <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.65" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true"><path d={paths[name] || paths.kennel} /></svg>;
}
