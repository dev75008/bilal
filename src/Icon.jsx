import React from 'react';

const paths={
  plus:'M12 5v14M5 12h14',
  home:'m3 10 9-7 9 7v10H3V10Zm6 10v-7h6v7',
  upload:'M12 16V3m-5 5 5-5 5 5M4 15v5h16v-5',
  download:'M12 3v13m-5-5 5 5 5-5M4 17v4h16v-4',
  save:'M19 21H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h12l4 4v12a2 2 0 0 1-2 2ZM7 3v6h10V3M7 21v-8h10v8',
  undo:'M9 5 4 10l5 5M4 10h9a7 7 0 0 1 7 7v2',
  redo:'m15 5 5 5-5 5M20 10h-9a7 7 0 0 0-7 7v2',
  cube:'m12 3 9 5v9l-9 5-9-5V8l9-5ZM3 8l9 5 9-5M12 13v9m-5-17 10 6',
  walk:'m9 21 2-6m5 6-3-8 1-5m-7 5 3-5h4l3 4h3M13 3a1.5 1.5 0 1 0 0 .01',
  expand:'M8 3H3v5m13-5h5v5M3 16v5h5m13-5v5h-5',
  grid:'M3 3h7v7H3V3Zm11 0h7v7h-7V3ZM3 14h7v7H3v-7Zm11 0h7v7h-7v-7Z',
  search:'m21 21-5-5M18 10a8 8 0 1 1-16 0 8 8 0 0 1 16 0',
  folder:'M3 7V5a2 2 0 0 1 2-2h5l3 4h6a2 2 0 0 1 2 2v10a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2V7Z',
  help:'M9 9a3 3 0 1 1 5 2c-1 .7-2 1-2 3m0 3h.01M22 12A10 10 0 1 1 2 12a10 10 0 0 1 20 0',
  check:'m5 12 4 4L19 6',
  close:'m6 6 12 12M18 6 6 18',
  arrow:'M4 12h16m-6-6 6 6-6 6',
  more:'M5 12h.01M12 12h.01M19 12h.01',
  ruler:'m4 16 12-12 5 5L9 21l-5-5Zm4-4 2 2m2-6 2 2m2-6 2 2',
  shield:'m12 3 8 3v6c0 5-8 9-8 9s-8-4-8-9V6l8-3Zm-4 9 3 3 5-6',
  trash:'M3 6h18M9 6V3h6v3M5 6l1 15h12l1-15M10 10v7m4-7v7',
  info:'M12 11v6m0-10h.01M22 12A10 10 0 1 1 2 12a10 10 0 0 1 20 0',
};

export function Icon({name,size=18,...props}) {
  return <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.7" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true" focusable="false" {...props}><path d={paths[name]||paths.cube}/></svg>;
}
