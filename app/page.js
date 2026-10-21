'use client';
import dynamic from 'next/dynamic';

const HostApp = dynamic(() => import('../components/HostApp'), { ssr: false, loading: () => <div className="boot">Cargando Fried Chicken…</div> });

export default function Page() {
  return <HostApp />;
}
