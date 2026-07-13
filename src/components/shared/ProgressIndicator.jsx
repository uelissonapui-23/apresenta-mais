import React from 'react';
import { Check, Circle, SkipForward, RotateCcw, Play } from 'lucide-react';

const statusConfig = {
  pending: { icon: Circle, color: 'text-gray-400', bg: 'bg-gray-100', label: 'Pendente' },
  current: { icon: Play, color: 'text-blue-600', bg: 'bg-blue-100', label: 'Atual' },
  completed: { icon: Check, color: 'text-green-600', bg: 'bg-green-100', label: 'Concluído' },
  skipped: { icon: SkipForward, color: 'text-gray-400', bg: 'bg-gray-50', label: 'Pulado' },
  revisit: { icon: RotateCcw, color: 'text-yellow-600', bg: 'bg-yellow-100', label: 'Revisitar' },
};

export default function ProgressIndicator({ status = 'pending', label, compact = false }) {
  const config = statusConfig[status] || statusConfig.pending;
  const Icon = config.icon;

  if (compact) {
    return (
      <div className={`flex items-center justify-center w-6 h-6 rounded-full ${config.bg}`}>
        <Icon className={`w-3.5 h-3.5 ${config.color}`} />
      </div>
    );
  }

  return (
    <div className={`flex items-center gap-2 px-2 py-1 rounded-md ${config.bg}`}>
      <Icon className={`w-4 h-4 ${config.color}`} />
      <span className={`text-xs font-medium ${config.color}`}>
        {label || config.label}
      </span>
    </div>
  );
}