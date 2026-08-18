import React from 'react';
import { Navigate } from 'react-router';
import { useAuth } from '../contexts/AuthContext';

export function ProtectedRoute({ children, requiredRole }) {
  const { user, isLoggedIn } = useAuth();
  if (!isLoggedIn) return <Navigate to="/login" replace />;
  if (requiredRole && user?.role !== requiredRole) {
    // Wrong role: redirect to their actual home
    if (user?.role === 'admin') return <Navigate to="/admin" replace />;
    if (user?.role === 'dftc') return <Navigate to="/dftc" replace />;
    return <Navigate to="/farmer" replace />;
  }
  return <>{children}</>;
}
