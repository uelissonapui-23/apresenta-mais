import React from 'react';
import AdminCrud from './AdminCrud';

export default function AdminQuestions() {
  return <AdminCrud entityName="GuidedQuestion" title="Perguntas Guiadas" displayField="question_text" fields={[
    { key: 'question_text', label: 'Pergunta', type: 'textarea' },
    { key: 'help_text', label: 'Texto de ajuda', type: 'textarea' },
    { key: 'field_type', label: 'Tipo (text/textarea/select/number/boolean)', type: 'text', default: 'textarea' },
    { key: 'options_json', label: 'Opções (JSON)', type: 'textarea' },
    { key: 'required', label: 'Obrigatório', type: 'boolean', default: false },
    { key: 'order_index', label: 'Ordem', type: 'number', default: 0 },
    { key: 'destination_field', label: 'Campo destino', type: 'text' },
    { key: 'block_type_to_generate', label: 'Tipo de bloco a gerar', type: 'text' },
    { key: 'active', label: 'Ativo', type: 'boolean', default: true },
  ]} />;
}