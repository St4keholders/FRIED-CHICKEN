// app/mando/page.js - Controller Phone Screen
'use client';

import dynamic from 'next/dynamic';

const ControllerApp = dynamic(() => import('../../components/ControllerApp.jsx'), {
  ssr: false,
  loading: () => (
    <div className="w-screen h-screen flex flex-col items-center justify-center bg-slate-950 text-amber-400 font-bold">
      <div className="text-4xl animate-bounce mb-3">📱</div>
      <p className="text-sm">Conectando mando...</p>
    </div>
  ),
});

export default function MandoPage() {
  return <ControllerApp />;
}
