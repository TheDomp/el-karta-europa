import { EllevioMap } from './components/EllevioMap';
import { AppShell } from './components/AppShell';
import { TimeSlider } from './components/TimeSlider';
import { DataSynchronizer } from './components/DataSynchronizer';
import './App.css';

function App() {
  return (
    <>
      <DataSynchronizer />
      <AppShell>
        <EllevioMap />
        <div className="absolute bottom-10 left-1/2 -translate-x-1/2 w-[600px] z-[1000] pointer-events-auto">
          <TimeSlider />
        </div>
      </AppShell>
    </>
  );
}

export default App;
