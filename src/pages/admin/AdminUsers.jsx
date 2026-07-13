import React from 'react';
import AdminCrud from './AdminCrud';

export default function AdminUsers() {
  return (
    <AdminCrud
      entityName="UserProfile"
      title="Usuários"
      displayField="name"
      fields={[
        { key: 'name', label: 'Nome', type: 'text' },
        { key: 'phone', label: 'Telefone', type: 'text' },
        { key: 'role', label: 'Função (user/admin)', type: 'text', default: 'user' },
        { key: 'active', label: 'Ativo', type: 'boolean', default: true },
        { key: 'onboarding_completed', label: 'Onboarding completo', type: 'boolean', default: false },
      ]}
    />
  );
}