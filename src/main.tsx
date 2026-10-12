import { StrictMode } from 'react';
import { createRoot } from 'react-dom/client';
import { App } from './App';
import { StoreProvider } from './state/store';
import { SerialConnectButton } from './components/SerialConnectButton';
import './styles.css';

createRoot(document.getElementById('root')!).render(
  <StrictMode>
    <StoreProvider>
      <App />
      <SerialConnectButton />
    </StoreProvider>
  </StrictMode>,
);
