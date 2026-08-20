import React from 'react';
import { Navigate } from 'react-router';
import { useAuth, roleHome } from '../contexts/AuthContext';

/**
 * Protects a route behind authentication.
 *
 * - While the auth session is being restored (loading=true), renders nothing
 *   to avoid a flash-redirect to /login on page refresh.
 * - requiredRole: matched against user.role.role_name (case-insensitive).
 *   If the user has a different role, they are redirected to their own home.
 */
export function ProtectedRoute({ children, requiredRole }) {
  const { user, isLoggedIn, loading } = useAuth();

  // Still restoring session from stored token — wait before deciding
  if (loading) return null;

  if (!isLoggedIn) return <Navigate to="/login" replace />;

  if (requiredRole) {
    const userRole = user?.role?.role_name ?? '';
    if (userRole.toLowerCase() !== requiredRole.toLowerCase()) {
      return <Navigate to={roleHome(userRole)} replace />;
    }
  }

  return <>{children}</>;
}
