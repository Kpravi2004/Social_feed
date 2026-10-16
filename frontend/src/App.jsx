import { Routes, Route } from "react-router-dom";
import { AuthProvider, useAuth } from "./context/AuthContext";
import { useNotifications } from "./hooks/useNotifications";
import ProtectedRoute from "./components/ProtectedRoute";
import NavBar from "./components/NavBar";
import Login from "./pages/Login";
import Register from "./pages/Register";
import Feed from "./pages/Feed";
import Profile from "./pages/Profile";
import People from "./pages/People";

function AuthedLayout({ children }) {
  const { user } = useAuth();
  const { connected, notifications, dismiss } = useNotifications({ enabled: Boolean(user) });

  return (
    <>
      <NavBar connected={connected} notifications={notifications} dismiss={dismiss} />
      {children}
    </>
  );
}

export default function App() {
  return (
    <AuthProvider>
      <Routes>
        <Route path="/login" element={<Login />} />
        <Route path="/register" element={<Register />} />
        <Route
          path="/"
          element={
            <ProtectedRoute>
              <AuthedLayout>
                <Feed />
              </AuthedLayout>
            </ProtectedRoute>
          }
        />
        <Route
          path="/people"
          element={
            <ProtectedRoute>
              <AuthedLayout>
                <People />
              </AuthedLayout>
            </ProtectedRoute>
          }
        />
        <Route
          path="/u/:id"
          element={
            <ProtectedRoute>
              <AuthedLayout>
                <Profile />
              </AuthedLayout>
            </ProtectedRoute>
          }
        />
      </Routes>
    </AuthProvider>
  );
}
