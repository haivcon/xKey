import { VanityTabContent, type VanityTabProps } from './vanity/VanityTabContent';

export type { VanityTabProps };

export function VanityTab(props: VanityTabProps) {
  return <VanityTabContent {...props} />;
}