export type OSStatus = 'Pendente' | 'Em Andamento' | 'Concluída' | 'Cancelada';

export interface UserProfile {
  id: string;
  name: string;
  re: string;
  username: string;
  password?: string;
  shiftStart: string; // "HH:mm"
  shiftEnd: string;   // "HH:mm"
}

export interface OSField {
  id: string;
  label: string;
  type: 'text' | 'textarea' | 'number';
  required: boolean;
  isDefault?: boolean;
}

export interface ServiceOrder {
  id: string;
  technician: string;
  technicianRE: string;
  status: OSStatus;
  createdAt: Date;
  updatedAt: Date;
  data: Record<string, string>; // Maps Field ID to Value
}
