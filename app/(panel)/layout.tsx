import PanelShell from '@/components/PanelShell';
import ErrorBoundary from '@/components/ErrorBoundary';

export default function PanelLayout(props: { children: React.ReactNode }) {
  return (
    <ErrorBoundary>
      <PanelShell>{props.children}</PanelShell>
    </ErrorBoundary>
  );
}
