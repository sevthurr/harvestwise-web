import React from 'react';
import { Navigate } from 'react-router';
import { useAuth, roleHome } from '../contexts/AuthContext';

/**
 * Protects a route behind authentication.
 *
 * - While the auth session is being restored (loading=true), renders nothing
 *   to avoid a flash-redirect to /login on page refresh.
 * - requiredRole: a single role string or an array of allowed roles, matched
 *   against user.role.role_name (case-insensitive). If the user's role is not
 *   in the allowed set, they are redirected to their own home.
 */
export function ProtectedRoute({ children, requiredRole }) {
  const { user, isLoggedIn, loading } = useAuth();

  // Still restoring session from stored token — wait before deciding
  if (loading) return null;

  if (!isLoggedIn) return <Navigate to="/login" replace />;

  if (requiredRole) {
    const allowedRoles = Array.isArray(requiredRole)
      ? requiredRole
      : [requiredRole];
    const userRole = user?.role?.role_name ?? '';
    const normalized = userRole.toLowerCase();
    const allowed = allowedRoles.map((r) => r.toLowerCase());
    if (!allowed.includes(normalized)) {
      return <Navigate to={roleHome(userRole)} replace />;
    }
  }

  return <>{children}</>;
}
