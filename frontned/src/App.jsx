import { BrowserRouter, Navigate, Route, Routes } from 'react-router-dom'
import Login from './commonPages/Login'
import Register from './commonPages/Register'
import PrivateRoute from './commonPages/PrivateRoute'
import TopbarLayout from './commonPages/TopbarLayout'
import Dashboard from './Components/Dashboard'
import Subjects from './Components/Subjects'
import Topics from './Components/Topics'
import { Documents } from './Components/Documents'


function App() {
  return (
    <BrowserRouter>
      <Routes>
        <Route path="/" element={<Navigate to="/login" replace />} />
        <Route path="/login" element={<Login />} />
        <Route path="/register" element={<Register />} />

        <Route element={<PrivateRoute />}>
          <Route element={<TopbarLayout />}>
            <Route path="/dashboard" element={<Dashboard />} />
            <Route path="/subjects" element={<Subjects />} />
            <Route path='subjects/topics' element={<Topics />} />
            <Route path='subjects/topics/documents' element={<Documents />} />
          </Route>
        </Route>
      </Routes>
    </BrowserRouter>
  )
}

export default App
