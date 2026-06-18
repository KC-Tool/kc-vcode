import React, { createContext, useContext, useState, useCallback, useRef } from 'react'
import ConfirmDialog from '../components/ConfirmDialog'

interface ConfirmOpts {
  title?: string
  message: string
  okText?: string
  cancelText?: string
  danger?: boolean
}

interface DialogState extends Required<ConfirmOpts> {}

interface ConfirmApi {
  confirm: (opts: ConfirmOpts) => Promise<boolean>
}

const Ctx = createContext<ConfirmApi | null>(null)

export function ConfirmProvider({ children }: { children: React.ReactNode }) {
  const [state, setState] = useState<DialogState | null>(null)
  const resolver = useRef<((v: boolean) => void) | null>(null)

  const confirm = useCallback((opts: ConfirmOpts) => {
    return new Promise<boolean>((res) => {
      resolver.current = res
      setState({
        title: opts.title ?? 'Confirm',
        message: opts.message,
        okText: opts.okText ?? 'OK',
        cancelText: opts.cancelText ?? 'Cancel',
        danger: opts.danger ?? false
      })
    })
  }, [])

  const close = useCallback((v: boolean) => {
    resolver.current?.(v)
    resolver.current = null
    setState(null)
  }, [])

  return (
    <Ctx.Provider value={{ confirm }}>
      {children}
      {state && <ConfirmDialog {...state} onClose={close} />}
    </Ctx.Provider>
  )
}

export function useConfirm(): ConfirmApi {
  const c = useContext(Ctx)
  if (!c) throw new Error('useConfirm must be used within ConfirmProvider')
  return c
}