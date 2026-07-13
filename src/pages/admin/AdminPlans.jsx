import React from 'react';
import AdminCrud from './AdminCrud';

export default function AdminPlans() {
  return (
    <AdminCrud
      entityName="Plan"
      title="Planos"
      fields={[
        { key: 'name', label: 'Nome', type: 'text' },
        { key: 'description', label: 'Descrição', type: 'textarea' },
        { key: 'price', label: 'Preço', type: 'number', default: 0 },
        { key: 'billing_period', label: 'Período (monthly/yearly/lifetime/free)', type: 'text', default: 'free' },
        { key: 'max_presentations', label: 'Máximo de apresentações (-1 = ilimitado)', type: 'number', default: -1 },
        { key: 'can_export_pdf', label: 'Pode exportar PDF', type: 'boolean', default: false },
        { key: 'can_use_ai', label: 'Pode usar IA', type: 'boolean', default: false },
        { key: 'can_use_premium_templates', label: 'Modelos premium', type: 'boolean', default: false },
        { key: 'active', label: 'Ativo', type: 'boolean', default: true },
      ]}
    />
  );
}