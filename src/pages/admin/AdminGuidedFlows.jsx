import React from 'react';
import AdminCrud from './AdminCrud';

export default function AdminGuidedFlows() {
  return <AdminCrud entityName="GuidedFlow" title="Fluxos Guiados" fields={[
    { key: 'name', label: 'Nome', type: 'text' },
    { key: 'description', label: 'Descrição', type: 'textarea' },
    { key: 'version', label: 'Versão', type: 'number', default: 1 },
    { key: 'active', label: 'Ativo', type: 'boolean', default: true },
  ]} />;
}