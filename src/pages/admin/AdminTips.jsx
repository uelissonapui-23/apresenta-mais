import React from 'react';
import AdminCrud from './AdminCrud';

export default function AdminTips() {
  return <AdminCrud entityName="AppTip" title="Dicas" displayField="title" fields={[
    { key: 'title', label: 'Título', type: 'text' },
    { key: 'message', label: 'Mensagem', type: 'textarea' },
    { key: 'trigger_type', label: 'Tipo de gatilho', type: 'text' },
    { key: 'rule_json', label: 'Regra (JSON)', type: 'textarea' },
    { key: 'active', label: 'Ativo', type: 'boolean', default: true },
  ]} />;
}