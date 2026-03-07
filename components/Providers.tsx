'use client';

import { ThemeProvider } from '@/components/ThemeProvider';
import TopLoadingBar from '@/components/TopLoadingBar';

export default function Providers(props: { children: React.ReactNode }) {
  return (
    <ThemeProvider>
      <TopLoadingBar />
      {props.children}
    </ThemeProvider>
  );
}
