'use client';

import { ThemeProvider } from '@/components/ThemeProvider';

export default function Providers(props: { children: React.ReactNode }) {
  return <ThemeProvider>{props.children}</ThemeProvider>;
}
