import { Routes, Route } from 'react-router-dom';
import { Layout } from './components/Layout.js';
import { Home } from './pages/Home.js';
import { Gallery } from './pages/Gallery.js';
import { Map } from './pages/Map.js';
import { News } from './pages/News.js';
import { Events } from './pages/Events.js';
import { Battles } from './pages/Battles.js';
import { Forum } from './pages/Forum.js';
import { Ranking } from './pages/Ranking.js';
import { Profile } from './pages/Profile.js';
import { Login } from './pages/Login.js';
import { Invite } from './pages/Invite.js';
import { Admin } from './pages/Admin.js';

export default function App() {
  return (
    <Layout>
      <Routes>
        <Route path="/" element={<Home />} />
        <Route path="/gallery" element={<Gallery />} />
        <Route path="/map" element={<Map />} />
        <Route path="/news" element={<News />} />
        <Route path="/events" element={<Events />} />
        <Route path="/battles" element={<Battles />} />
        <Route path="/forum" element={<Forum />} />
        <Route path="/ranking" element={<Ranking />} />
        <Route path="/profile" element={<Profile />} />
        <Route path="/login" element={<Login />} />
        <Route path="/invite" element={<Invite />} />
        <Route path="/admin" element={<Admin />} />
      </Routes>
    </Layout>
  );
}
