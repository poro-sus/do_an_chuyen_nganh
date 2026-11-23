import { clsx, type ClassValue } from 'clsx'
import { twMerge } from 'tailwind-merge'
export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs))
}
export const money = (v: number | string = 0) => Number(v).toLocaleString('vi-VN') + ' ₫'
export const date = (v?: string) =>
  v ? new Date(v).toLocaleDateString('vi-VN', { timeZone: 'Asia/Ho_Chi_Minh' }) : '—'
export const statusLabel: Record<string, string> = {
  requested: 'Chờ duyệt',
  approved: 'Chờ nhận sách',
  active: 'Đang mượn',
  returned: 'Đã trả',
  rejected: 'Từ chối',
  cancelled: 'Đã hủy',
  waiting: 'Đang chờ',
  ready: 'Sẵn sàng nhận',
  fulfilled: 'Đã nhận',
  expired: 'Hết hạn',
  available: 'Khả dụng',
  borrowed: 'Đang mượn',
  held: 'Đang giữ',
  maintenance: 'Bảo trì',
  lost: 'Đã mất',
  good: 'Tốt',
  worn: 'Đã sử dụng',
  damaged: 'Hư hỏng',
}
