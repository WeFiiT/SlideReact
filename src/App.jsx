import { Routes, Route } from 'react-router-dom'
import Bibliotheque from './pages/Bibliotheque'
import Editeur from './pages/Editeur'
import Preview from './pages/Preview'

export default function App() {
  return (
    <Routes>
      <Route path="/" element={<Bibliotheque />} />
      <Route path="/editeur" element={<Editeur />} />
      <Route path="/editeur/:id" element={<Editeur />} />
      <Route path="/preview/:id" element={<Preview />} />
    </Routes>
  )
}
