import React from 'react';
import { NavLink } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import { 
  PlusCircle, 
  Inbox, 
  ListFilter, 
  BarChart3, 
  Users 
} from 'lucide-react';

export default function Sidebar() {
  const { user } = useAuth();
  const role = user?.role;

  const ticketsLabel = role === 'admin' ? 'Todos os Tickets' : 'Meus Tickets';

  return (
    <aside className="app-sidebar">
      <nav className="sidebar-nav">
        {/* 1. Cadastro de ticket: Todos os perfis */}
        <NavLink
          to="/tickets/new"
          className={({ isActive }) => `nav-item ${isActive ? 'active' : ''}`}
        >
          <PlusCircle size={18} />
          <span>Cadastrar Ticket</span>
        </NavLink>

        {/* 2. Novos tickets: Admin e Técnico */}
        {(role === 'admin' || role === 'tecnico') && (
          <NavLink
            to="/tickets/unassigned"
            className={({ isActive }) => `nav-item ${isActive ? 'active' : ''}`}
          >
            <Inbox size={18} />
            <span>Novos Tickets</span>
          </NavLink>
        )}

        {/* 3. Meus tickets: Usuário vê os seus; Técnico vê os dele; Admin vê todos */}
        <NavLink
          to="/tickets"
          end
          className={({ isActive }) => `nav-item ${isActive ? 'active' : ''}`}
        >
          <ListFilter size={18} />
          <span>{ticketsLabel}</span>
        </NavLink>

        {/* 4. Relatório de acompanhamento: Somente Admin */}
        {role === 'admin' && (
          <NavLink
            to="/reports"
            className={({ isActive }) => `nav-item ${isActive ? 'active' : ''}`}
          >
            <BarChart3 size={18} />
            <span>Relatórios</span>
          </NavLink>
        )}

        {/* 5. Gestão de usuários: Somente Admin */}
        {role === 'admin' && (
          <NavLink
            to="/users"
            className={({ isActive }) => `nav-item ${isActive ? 'active' : ''}`}
          >
            <Users size={18} />
            <span>Gestão de Usuários</span>
          </NavLink>
        )}
      </nav>
    </aside>
  );
}
