import { SecurityTabContent, type SecurityTabProps } from './security/SecurityTabContent';

export type { SecurityTabProps };

export default function SecurityTab(props: SecurityTabProps) {
  return <SecurityTabContent {...props} />;
}