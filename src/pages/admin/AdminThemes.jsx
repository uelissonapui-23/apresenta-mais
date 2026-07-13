import React from 'react';
import AdminCrud from './AdminCrud';

export default function AdminThemes() {
  return <AdminCrud entityName="PresentationTheme" title="Temas Visuais" fields={[
    { key: 'name', label: 'Nome', type: 'text' },
    { key: 'description', label: 'Descrição', type: 'textarea' },
    { key: 'background_color', label: 'Cor de fundo', type: 'text', default: '#FFFFFF' },
    { key: 'text_color', label: 'Cor do texto', type: 'text', default: '#1A1A1A' },
    { key: 'title_color', label: 'Cor do título', type: 'text', default: '#111111' },
    { key: 'accent_color', label: 'Cor de destaque', type: 'text', default: '#3B82F6' },
    { key: 'title_font', label: 'Fonte do título', type: 'text', default: 'Inter' },
    { key: 'body_font', label: 'Fonte do corpo', type: 'text', default: 'Inter' },
    { key: 'default_title_size', label: 'Tamanho do título', type: 'number', default: 32 },
    { key: 'default_body_size', label: 'Tamanho do corpo', type: 'number', default: 18 },
    { key: 'is_official', label: 'Oficial', type: 'boolean', default: false },
    { key: 'is_premium', label: 'Premium', type: 'boolean', default: false },
    { key: 'active', label: 'Ativo', type: 'boolean', default: true },
  ]} />;
}