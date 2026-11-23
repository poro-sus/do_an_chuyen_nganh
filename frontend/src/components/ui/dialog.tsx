import * as D from '@radix-ui/react-dialog'
import { AnimatePresence, motion } from 'motion/react'
import { X } from 'lucide-react'
import type { ReactNode } from 'react'
export function Modal({
  open,
  onClose,
  title,
  description,
  children,
  wide = false,
}: {
  open: boolean
  onClose: () => void
  title: string
  description?: string
  children: ReactNode
  wide?: boolean
}) {
  return (
    <D.Root open={open} onOpenChange={(v) => !v && onClose()}>
      <AnimatePresence>
        {open && (
          <D.Portal forceMount>
            <D.Overlay asChild>
              <motion.div
                className="modal-overlay"
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                exit={{ opacity: 0 }}
              />
            </D.Overlay>
            <D.Content asChild aria-describedby={description ? 'modal-desc' : undefined}>
              <motion.div
                className={'modal ' + (wide ? 'modal-wide' : '')}
                initial={{ opacity: 0, scale: 0.96, y: 12 }}
                animate={{ opacity: 1, scale: 1, y: 0 }}
                exit={{ opacity: 0, scale: 0.96 }}
                transition={{ duration: 0.18 }}
              >
                <D.Title className="modal-title">{title}</D.Title>
                {description && <D.Description id="modal-desc">{description}</D.Description>}
                <D.Close className="modal-close" aria-label="Đóng">
                  <X size={20} />
                </D.Close>
                {children}
              </motion.div>
            </D.Content>
          </D.Portal>
        )}
      </AnimatePresence>
    </D.Root>
  )
}
