import {
  BrowserRouter as Router,
  Routes,
  Route,
  Navigate,
} from 'react-router-dom';
import TextEditor from './components/TextEditor';
import Header from './components/Header';
import Register from './pages/Register';
import Dashboard from './pages/Dashboard';
import Landing from './pages/Landing';

function ProtectedLayout({ children }) {
  const token = typeof window !== 'undefined' ? localStorage.getItem('token') : null;
  if (!token) {
    return <Navigate to="/register" replace />;
  }
  return (
    <div>
      <Header />
      <div style={{ paddingTop: 72 }}>{children}</div>
    </div>
  );
}

function App() {
  return (
    <Router>
      <Routes>
        <Route path="/register" element={<Register />} />
        <Route path="/dashboard" element={<ProtectedLayout><Dashboard /></ProtectedLayout>} />
        <Route path="/documents/:id" element={<ProtectedLayout><TextEditor /></ProtectedLayout>} />
        <Route path="/" element={<Landing />} />
      </Routes>
    </Router>
  );
}

export default App;
