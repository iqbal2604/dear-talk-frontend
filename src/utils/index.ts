import { format, isToday, isYesterday, parseISO, differenceInMinutes } from 'date-fns';
import { id as localeId } from 'date-fns/locale';
import type { Room, User } from '../types';

export function formatMessageTime(dateStr: string): string {
  try {
    const date = parseISO(dateStr);
    if (isToday(date)) return format(date, 'HH:mm');
    if (isYesterday(date)) return 'Kemarin';
    return format(date, 'dd/MM/yyyy');
  } catch {
    return '';
  }
}

export function formatFullTime(dateStr: string): string {
  try {
    return format(parseISO(dateStr), 'dd MMM yyyy, HH:mm', { locale: localeId });
  } catch {
    return '';
  }
}

export function formatRelativeTime(dateStr: string): string {
  try {
    const date = parseISO(dateStr);
    const mins = differenceInMinutes(new Date(), date);
    if (mins < 1) return 'Baru saja';
    if (mins < 60) return `${mins} menit lalu`;
    if (isToday(date)) return format(date, 'HH:mm');
    if (isYesterday(date)) return 'Kemarin ' + format(date, 'HH:mm');
    return format(date, 'dd MMM', { locale: localeId });
  } catch {
    return '';
  }
}

export function getRoomName(room: Room, currentUser: User | null): string {
  if (room.type === 'group') return room.name;
  if (!currentUser) return room.name;
  // Number() cast — antisipasi JSON parse yang bisa return string
  const other = room.members?.find((m) => Number(m.user_id) !== Number(currentUser.id));
  return other?.user?.username || room.name;
}

export function getRoomAvatar(room: Room, currentUser: User | null): string {
  if (room.type === 'group') return '';
  if (!currentUser) return '';
  const other = room.members?.find((m) => Number(m.user_id) !== Number(currentUser.id));
  return other?.user?.avatar || '';
}

export function getAvatarInitials(name: string): string {
  return name
    .split(' ')
    .slice(0, 2)
    .map((n) => n[0]?.toUpperCase() || '')
    .join('');
}

export function getAvatarColor(name: string): string {
  const colors = [
    '#FF6B6B', '#4ECDC4', '#45B7D1', '#96CEB4', '#FFEAA7',
    '#DDA0DD', '#98D8C8', '#F7DC6F', '#BB8FCE', '#85C1E9',
  ];
  let hash = 0;
  for (let i = 0; i < name.length; i++) {
    hash = name.charCodeAt(i) + ((hash << 5) - hash);
  }
  return colors[Math.abs(hash) % colors.length];
}

export function cn(...classes: (string | boolean | undefined | null)[]): string {
  return classes.filter(Boolean).join(' ');
}

export function sortRoomsByActivity(rooms: Room[]): Room[] {
  return [...rooms].sort((a, b) => {
    const aTime = a.lastMessage?.createdAt || a.createdAt;
    const bTime = b.lastMessage?.createdAt || b.createdAt;
    return new Date(bTime).getTime() - new Date(aTime).getTime();
  });
}

export function truncate(str: string, maxLen = 40): string {
  if (!str) return '';
  return str.length > maxLen ? str.slice(0, maxLen) + '…' : str;
}
