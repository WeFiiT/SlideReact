import { Navigate, Routes, Route } from 'react-router-dom'
import Bibliotheque from './pages/Bibliotheque'
import Editeur from './pages/Editeur'
import Preview from './pages/Preview'
import Login, { getUser } from './pages/Login'

function Guard({ children }) {
  return getUser() ? children : <Navigate to="/login" replace />
}

export default function App() {
  return (
    <Routes>
      <Route path="/login" element={<Login />} />
      <Route path="/"              element={<Guard><Bibliotheque /></Guard>} />
      <Route path="/editeur"       element={<Guard><Editeur /></Guard>} />
      <Route path="/editeur/:id"   element={<Guard><Editeur /></Guard>} />
      <Route path="/preview/:id"   element={<Guard><Preview /></Guard>} />
    </Routes>
  )
}
