import { Navigate, Routes, Route } from 'react-router-dom'
import Bibliotheque from './pages/Bibliotheque'
import Editeur from './pages/Editeur'
import Preview from './pages/Preview'
import Share from './pages/Share'
import Login, { getUser } from './pages/Login'

function Guard({ children }) {
  return getUser() ? children : <Navigate to="/login" replace />
}

export default function App() {
  return (
    <Routes>
      <Route path="/login"         element={<Login />} />
      <Route path="/share/:token"  element={<Share />} />
      <Route path="/"              element={<Guard><Bibliotheque /></Guard>} />
      <Route path="/editeur"       element={<Guard><Editeur /></Guard>} />
      <Route path="/editeur/:id"   element={<Guard><Editeur /></Guard>} />
      <Route path="/preview/:id"   element={<Guard><Preview /></Guard>} />
    </Routes>
  )
}
