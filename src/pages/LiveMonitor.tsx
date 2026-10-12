import { StatusHero } from '../components/StatusHero';
import { GasMonitors } from '../components/GasMonitors';
import { WaterCard } from '../components/WaterCard';
import { CurrentRisk } from '../components/CurrentRisk';
import { DeviceHealth } from '../components/DeviceHealth';
import { CoverVibration } from '../components/CoverVibration';
import { FleetPanel } from '../components/FleetPanel';
import { LatestAlerts } from '../components/AlertsPanel';
import { SystemOverview } from '../components/SystemOverview';
import { LocationMap } from '../components/LocationMap';
import { ManholeCutaway } from '../components/ManholeCutaway';

/**
 * Primary screen — answers, in order:
 * is it safe → what gases → water → why → device → cover/tamper →
 * other manholes → alerts → fleet totals → system visual.
 * DOM order doubles as the mobile reading order.
 */
export function LiveMonitor() {
  return (
    <div className="live-grid">
      <StatusHero />
      <GasMonitors />
      <WaterCard />
      <CurrentRisk />
      <DeviceHealth />
      <CoverVibration />
      <FleetPanel />
      <LatestAlerts />
      <SystemOverview />
      <ManholeCutaway />
      <LocationMap />
    </div>
  );
}
