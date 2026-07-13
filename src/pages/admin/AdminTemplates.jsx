import React from 'react';
import AdminCrud from './AdminCrud';

export default function AdminTemplates() {
  return <AdminCrud entityName="PresentationTemplate" title="Modelos" fields={[
    { key: 'name', label: 'Nome', type: 'text' },
    { key: 'description', label: 'Descrição', type: 'textarea' },
    { key: 'is_official', label: 'Oficial', type: 'boolean', default: false },
    { key: 'is_public', label: 'Público', type: 'boolean', default: true },
    { key: 'is_premium', label: 'Premium', type: 'boolean', default: false },
    { key: 'active', label: 'Ativo', type: 'boolean', default: true },
  ]} />;
}