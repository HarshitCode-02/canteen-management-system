import { Navigate } from "react-router-dom";
import { useAuth } from "../context/AuthContext";

// <ProtectedRoute> = must be logged in
// <ProtectedRoute roles={["canteen","admin"]}> = must also have one of these roles
export default function ProtectedRoute({ roles, children }) {
  const { user, loading, sessionError, restoreSession } = useAuth();

  if (loading) return <p className="center">Loading...</p>;
  if (sessionError) {
    return (
      <div className="center" role="alert">
        <p>{sessionError}</p>
        <button onClick={restoreSession}>Retry</button>
      </div>
    );
  }
  if (!user) return <Navigate to="/login" replace />;
  if (roles && !roles.includes(user.role)) return <Navigate to="/" replace />;

  return children;
}