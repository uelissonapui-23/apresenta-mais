import React from 'react';
import AdminCrud from './AdminCrud';

export default function AdminTypes() {
  return (
    <AdminCrud
      entityName="PresentationType"
      title="Tipos de Apresentação"
      fields={[
        { key: 'name', label: 'Nome', type: 'text' },
        { key: 'description', label: 'Descrição', type: 'textarea' },
        { key: 'icon', label: 'Ícone', type: 'text' },
        { key: 'color', label: 'Cor', type: 'text' },
        { key: 'order_index', label: 'Ordem', type: 'number', default: 0 },
        { key: 'active', label: 'Ativo', type: 'boolean', default: true },
      ]}
    />
  );
}