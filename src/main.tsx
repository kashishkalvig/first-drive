import { StrictMode } from 'react';
import { createRoot } from 'react-dom/client';
import { FirstDriveExperience } from './app/FirstDriveExperience';

createRoot(document.getElementById('root')!).render(
  <StrictMode>
    <FirstDriveExperience />
  </StrictMode>,
);
