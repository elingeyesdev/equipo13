import React from 'react';
import {
  CheckCircle2,
  XCircle,
  AlertTriangle,
  Info,
  X,
} from 'lucide-react';
import { AlertType } from '../types';

interface AlertBannerProps {
  type: AlertType;
  title: string;
  message: string;
  onClose?: () => void;
}

const config: Record<
  AlertType,
  { bg: string; border: string; titleColor: string; msgColor: string; Icon: React.FC<{ size?: number; className?: string }> }
> = {
  success: {
    bg: 'bg-green-50',
    border: 'border-green-200',
    titleColor: 'text-green-900',
    msgColor: 'text-green-700',
    Icon: CheckCircle2,
  },
  error: {
    bg: 'bg-red-50',
    border: 'border-red-200',
    titleColor: 'text-red-900',
    msgColor: 'text-red-700',
    Icon: XCircle,
  },
  warning: {
    bg: 'bg-amber-50',
    border: 'border-amber-200',
    titleColor: 'text-amber-900',
    msgColor: 'text-amber-700',
    Icon: AlertTriangle,
  },
  info: {
    bg: 'bg-blue-50',
    border: 'border-blue-200',
    titleColor: 'text-blue-900',
    msgColor: 'text-blue-700',
    Icon: Info,
  },
};

export const AlertBanner: React.FC<AlertBannerProps> = ({
  type,
  title,
  message,
  onClose,
}) => {
  const { bg, border, titleColor, msgColor, Icon } = config[type];

  return (
    <div
      className={`flex items-start gap-3 p-4 rounded-xl border ${bg} ${border} animate-in fade-in slide-in-from-top-2 duration-300`}
      role="alert"
    >
      <Icon size={20} className={`${titleColor} shrink-0 mt-0.5`} />
      <div className="flex-1 min-w-0">
        <p className={`text-sm font-bold ${titleColor}`}>{title}</p>
        <p className={`text-sm mt-0.5 ${msgColor}`}>{message}</p>
      </div>
      {onClose && (
        <button
          onClick={onClose}
          className={`p-1 rounded-md ${titleColor} opacity-60 hover:opacity-100 transition-opacity shrink-0`}
          aria-label="Cerrar alerta"
        >
          <X size={16} />
        </button>
      )}
    </div>
  );
};
