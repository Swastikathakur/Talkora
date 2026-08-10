import React from 'react';
import { Routes, Route, Navigate } from 'react-router-dom';
import { SocketProvider } from './context/SocketContext';
import { ProtectedRoute } from './components/ProtectedRoute';
import { AuthPage } from './pages/AuthPage';
import { ChatPage } from './pages/ChatPage';

export default function App() {
  return (
    <SocketProvider>
      <Routes>
        <Route path="/login/*" element={<AuthPage mode="login" />} />
        <Route path="/signup/*" element={<AuthPage mode="signup" />} />
        <Route
          path="/"
          element={
            <ProtectedRoute>
              <ChatPage />
            </ProtectedRoute>
          }
        />
        <Route path="*" element={<Navigate to="/" replace />} />
      </Routes>
    </SocketProvider>
  );
}
