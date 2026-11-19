import { RouterProvider } from 'react-router';
import { router } from './routes';
import { ComplaintsProvider } from './components/ComplaintsContext';
import { LocationProvider } from './components/LocationContext';
import '../styles/fonts.css';
import '../styles/leaflet-overrides.css';

export default function App() {
  return (
    <LocationProvider>
      <ComplaintsProvider>
        <RouterProvider router={router} />
      </ComplaintsProvider>
    </LocationProvider>
  );
}