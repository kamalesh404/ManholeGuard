import { useStore } from './state/store';
import { Header } from './components/Header';
import { DemoBar } from './components/DemoBar';
import { LiveMonitor } from './pages/LiveMonitor';
import { Manholes } from './pages/Manholes';
import { ManholeDetail } from './pages/ManholeDetail';
import { AlertsPage } from './pages/Alerts';
import { Devices } from './pages/Devices';
import { Settings } from './pages/Settings';

export function App() {
  const { route, status } = useStore();

  return (
    <div className="app" data-status={status}>
      <div className="ambient" aria-hidden />
      <Header />
      <main className="page">
        {route.page === 'live' && <LiveMonitor />}
        {route.page === 'manholes' && <Manholes />}
        {route.page === 'detail' && <ManholeDetail />}
        {route.page === 'alerts' && <AlertsPage />}
        {route.page === 'devices' && <Devices />}
        {route.page === 'settings' && <Settings />}
      </main>
      <DemoBar />
    </div>
  );
}
