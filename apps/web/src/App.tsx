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
import { Invites } from './pages/Invites.js';
import { Admin } from './pages/Admin.js';
import { AdminCms } from './pages/AdminCms.js';
import { PublicPage } from './pages/PublicPage.js';
import { NotFound } from './pages/NotFound.js';
import { FEATURES } from './config/features.js';

export default function App() {
  return (
    <Layout>
      <Routes>
        <Route path="/" element={<Home />} />
        <Route path="/gallery" element={<Gallery />} />
        <Route path="/map" element={<Map />} />
        <Route path="/news" element={<News />} />
        <Route path="/events" element={<Events />} />
        {/* Battles stays in code but is unreachable while the flag is off
            (flip FEATURES.battles in src/config/features.ts to re-enable) */}
        {FEATURES.battles && <Route path="/battles" element={<Battles />} />}
        <Route path="/forum" element={<Forum />} />
        <Route path="/ranking" element={<Ranking />} />
        <Route path="/profile" element={<Profile />} />
        <Route path="/login" element={<Login />} />
        <Route path="/invite" element={<Invite />} />
        <Route path="/invites" element={<Invites />} />
        <Route path="/admin" element={<Admin />} />
        <Route path="/admin/cms" element={<AdminCms />} />
        <Route path="/pages/:slug" element={<PublicPage />} />
        <Route path="*" element={<NotFound />} />
      </Routes>
    </Layout>
  );
}
