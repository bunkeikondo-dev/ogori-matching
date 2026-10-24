import { getEnabledSites } from '@/server/site-config';
import MenuScreen from '@/components/MenuScreen';

export default async function HomePage() {
  const enabledSites = getEnabledSites();
  return <MenuScreen enabledSites={enabledSites} />;
}
