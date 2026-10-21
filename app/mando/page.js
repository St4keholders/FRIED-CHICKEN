'use client';
import dynamic from 'next/dynamic';

const ControllerApp = dynamic(() => import('../../components/ControllerApp'), { ssr: false, loading: () => <div className="boot">Conectando mando…</div> });

export default function Mando() {
  return <ControllerApp />;
}
