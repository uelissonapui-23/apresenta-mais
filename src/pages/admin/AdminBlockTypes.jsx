import React from 'react';
import AdminCrud from './AdminCrud';

export default function AdminBlockTypes() {
  return <AdminCrud entityName="BlockType" title="Tipos de Bloco" fields={[
    { key: 'name', label: 'Nome', type: 'text' },
    { key: 'code', label: 'Código', type: 'text' },
    { key: 'description', label: 'Descrição', type: 'textarea' },
    { key: 'icon', label: 'Ícone', type: 'text' },
    { key: 'supports_title', label: 'Suporta título', type: 'boolean', default: true },
    { key: 'supports_summary', label: 'Suporta resumo', type: 'boolean', default: true },
    { key: 'supports_content', label: 'Suporta conteúdo', type: 'boolean', default: true },
    { key: 'supports_notes', label: 'Suporta notas', type: 'boolean', default: true },
    { key: 'supports_attachment', label: 'Suporta anexo', type: 'boolean', default: false },
    { key: 'order_index', label: 'Ordem', type: 'number', default: 0 },
    { key: 'active', label: 'Ativo', type: 'boolean', default: true },
  ]} />;
}