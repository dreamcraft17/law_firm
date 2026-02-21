import PanelShell from '@/components/PanelShell';

export default function PanelLayout(props: { children: React.ReactNode }) {
  return <PanelShell>{props.children}</PanelShell>;
}
