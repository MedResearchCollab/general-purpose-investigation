import React from 'react';
import { BrowserRouter as Router, Routes, Route, Navigate } from 'react-router-dom';
import { ThemeProvider, createTheme } from '@mui/material/styles';
import CssBaseline from '@mui/material/CssBaseline';
import { AuthProvider, useAuth } from './context/AuthContext';
import Navbar from './components/Layout/Navbar';
import Sidebar from './components/Layout/Sidebar';
import Login from './pages/Login';
import Dashboard from './pages/Dashboard';
import StudiesPage from './pages/StudiesPage';
import FormsPage from './pages/FormsPage';
import SubmissionsPage from './pages/SubmissionsPage';
import UsersPage from './pages/UsersPage';
import HospitalsPage from './pages/HospitalsPage';
import ExportPage from './pages/ExportPage';
import { Box } from '@mui/material';

const theme = createTheme({
  palette: {
    primary: {
      main: '#1976d2',
    },
    secondary: {
      main: '#dc004e',
    },
  },
});

const PrivateRoute: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const { isAuthenticated, loading } = useAuth();

  if (loading) {
    return <div>Loading...</div>;
  }

  return isAuthenticated ? <>{children}</> : <Navigate to="/login" />;
};

const AppContent: React.FC = () => {
  const { isAuthenticated } = useAuth();

  return (
    <Routes>
      <Route path="/login" element={!isAuthenticated ? <Login /> : <Navigate to="/" />} />
      <Route
        path="/"
        element={
          <PrivateRoute>
            <>
              <Navbar />
              <Box sx={{ display: 'flex' }}>
                <Sidebar />
                <Box component="main" sx={{ flexGrow: 1, p: 3 }}>
                  <Dashboard />
                </Box>
              </Box>
            </>
          </PrivateRoute>
        }
      />
      <Route
        path="/studies"
        element={
          <PrivateRoute>
            <>
              <Navbar />
              <Box sx={{ display: 'flex' }}>
                <Sidebar />
                <Box component="main" sx={{ flexGrow: 1, p: 3 }}>
                  <StudiesPage />
                </Box>
              </Box>
            </>
          </PrivateRoute>
        }
      />
      <Route
        path="/forms"
        element={
          <PrivateRoute>
            <>
              <Navbar />
              <Box sx={{ display: 'flex' }}>
                <Sidebar />
                <Box component="main" sx={{ flexGrow: 1, p: 3 }}>
                  <FormsPage />
                </Box>
              </Box>
            </>
          </PrivateRoute>
        }
      />
      <Route
        path="/submissions"
        element={
          <PrivateRoute>
            <>
              <Navbar />
              <Box sx={{ display: 'flex' }}>
                <Sidebar />
                <Box component="main" sx={{ flexGrow: 1, p: 3 }}>
                  <SubmissionsPage />
                </Box>
              </Box>
            </>
          </PrivateRoute>
        }
      />
      <Route
        path="/users"
        element={
          <PrivateRoute>
            <>
              <Navbar />
              <Box sx={{ display: 'flex' }}>
                <Sidebar />
                <Box component="main" sx={{ flexGrow: 1, p: 3 }}>
                  <UsersPage />
                </Box>
              </Box>
            </>
          </PrivateRoute>
        }
      />
      <Route
        path="/hospitals"
        element={
          <PrivateRoute>
            <>
              <Navbar />
              <Box sx={{ display: 'flex' }}>
                <Sidebar />
                <Box component="main" sx={{ flexGrow: 1, p: 3 }}>
                  <HospitalsPage />
                </Box>
              </Box>
            </>
          </PrivateRoute>
        }
      />
      <Route
        path="/export"
        element={
          <PrivateRoute>
            <>
              <Navbar />
              <Box sx={{ display: 'flex' }}>
                <Sidebar />
                <Box component="main" sx={{ flexGrow: 1, p: 3 }}>
                  <ExportPage />
                </Box>
              </Box>
            </>
          </PrivateRoute>
        }
      />
    </Routes>
  );
};

const App: React.FC = () => {
  return (
    <ThemeProvider theme={theme}>
      <CssBaseline />
      <Router>
        <AuthProvider>
          <AppContent />
        </AuthProvider>
      </Router>
    </ThemeProvider>
  );
};

export default App;

