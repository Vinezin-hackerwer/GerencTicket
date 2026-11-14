import React from 'react';
import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom';
import { AuthProvider, useAuth } from './context/AuthContext';
import { NotificationProvider } from './context/NotificationContext';

import Layout from './components/Layout';
import ProtectedRoute from './components/ProtectedRoute';

import Login from './pages/Login';
import ForcePasswordChange from './pages/ForcePasswordChange';
import TicketCreate from './pages/TicketCreate';
import TicketsUnassigned from './pages/TicketsUnassigned';
import TicketsMy from './pages/TicketsMy';
import TicketDetail from './pages/TicketDetail';
import Reports from './pages/Reports';
import UserManagement from './pages/UserManagement';

function HomeRedirect() {
  const { user } = useAuth();
  if (user?.role === 'admin' || user?.role === 'tecnico') {
    return <Navigate to="/tickets/unassigned" replace />;
  }
  return <Navigate to="/tickets" replace />;
}

export default function App() {
  return (
    <BrowserRouter>
      <AuthProvider>
        <NotificationProvider>
          <Routes>
            {/* Public route */}
            <Route path="/login" element={<Login />} />

            {/* Mandatory password change screen */}
            <Route path="/force-password-change" element={<ForcePasswordChange />} />

            {/* Authenticated routes inside Layout */}
            <Route path="/" element={<Layout />}>
              <Route index element={<HomeRedirect />} />

              {/* 1. Cadastro de ticket: todos os perfis */}
              <Route path="tickets/new" element={<TicketCreate />} />

              {/* 2. Novos tickets: Admin e Técnico */}
              <Route
                path="tickets/unassigned"
                element={
                  <ProtectedRoute allowedRoles={['admin', 'tecnico']}>
                    <TicketsUnassigned />
                  </ProtectedRoute>
                }
              />

              {/* 3. Meus tickets: todos os perfis */}
              <Route path="tickets" element={<TicketsMy />} />
              <Route path="tickets/:id" element={<TicketDetail />} />

              {/* 4. Relatório de acompanhamento: somente Admin */}
              <Route
                path="reports"
                element={
                  <ProtectedRoute allowedRoles={['admin']}>
                    <Reports />
                  </ProtectedRoute>
                }
              />

              {/* 5. Gestão de usuários: somente Admin */}
              <Route
                path="users"
                element={
                  <ProtectedRoute allowedRoles={['admin']}>
                    <UserManagement />
                  </ProtectedRoute>
                }
              />
            </Route>

            {/* Fallback */}
            <Route path="*" element={<Navigate to="/" replace />} />
          </Routes>
        </NotificationProvider>
      </AuthProvider>
    </BrowserRouter>
  );
}
