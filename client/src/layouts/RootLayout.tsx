import { Outlet } from 'react-router-dom';
import { Navbar } from '../components/layout/Navbar';
import { Footer } from '../components/layout/Footer';

export function RootLayout() {
  return (
    <div className="min-h-screen flex flex-col bg-arcade-radial text-arcade-text selection:bg-arcade-magenta selection:text-white">
      <Navbar />
      <main className="flex-1 flex flex-col relative w-full overflow-x-clip">
        <Outlet />
      </main>
      <Footer />
    </div>
  );
}
