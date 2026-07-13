import React from 'react';
import AdminCrud from './AdminCrud';

export default function AdminStyles() {
  return <AdminCrud entityName="CommunicationStyle" title="Estilos de Comunicação" fields={[
    { key: 'name', label: 'Nome', type: 'text' },
    { key: 'description', label: 'Descrição', type: 'textarea' },
    { key: 'order_index', label: 'Ordem', type: 'number', default: 0 },
    { key: 'active', label: 'Ativo', type: 'boolean', default: true },
  ]} />;
}