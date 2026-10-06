import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom';
import { RootLayout } from './layouts/RootLayout';
import { HomePage } from './pages/HomePage';
import { CreateGamePage } from './pages/CreateGamePage';
import { JoinGamePage } from './pages/JoinGamePage';
import { GameRoomPage } from './pages/GameRoomPage';
import { ResultsPage } from './pages/ResultsPage';
import { SetupGamePage } from './pages/SetupGamePage';

export function App() {
  return (
    <BrowserRouter>
      <Routes>
        <Route element={<RootLayout />}>
          <Route path="/" element={<HomePage />} />
          <Route path="/create" element={<CreateGamePage />} />
          <Route path="/join" element={<JoinGamePage />} />
          <Route path="/game" element={<GameRoomPage />} />
          <Route path="/game/:roomCode" element={<GameRoomPage />} />
          <Route path="/game/setup" element={<SetupGamePage />} />
          <Route path="/results" element={<ResultsPage />} />
          <Route path="/results/:roomCode" element={<ResultsPage />} />
          <Route path="*" element={<Navigate to="/" replace />} />
        </Route>
      </Routes>
    </BrowserRouter>
  );
}

export default App;
