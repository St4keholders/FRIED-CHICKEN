// app/page.js - Host TV Screen
'use client';

import dynamic from 'next/dynamic';

const HostApp = dynamic(() => import('../components/HostApp.jsx'), {
  ssr: false,
  loading: () => (
    <div className="w-screen h-screen flex flex-col items-center justify-center bg-slate-950 text-amber-400 font-bold">
      <div className="text-5xl animate-bounce mb-4">🐔</div>
      <p className="text-lg">Cargando Plumazo...</p>
    </div>
  ),
});

export default function Page() {
  return <HostApp />;
}
