// src/store/tableLayoutStore.js
//
// Each user's table layouts (which columns show, in what order), kept in
// this browser's localStorage so a refresh keeps them:
// `table-layout:<userId>:<tableKey>` = { hidden: [ids], order: [ids] }.
// Read through hooks/useTableColumns. `version` only tells subscribers a
// layout changed; the parsed layouts sit in a module cache so a read
// returns the same object until it is set again.

import { create } from 'zustand'

const cache = new Map()

export const tableLayoutKey = (userId, tableKey) => `table-layout:${userId ?? 'guest'}:${tableKey}`

export const readTableLayout = (key) => {
  if (!cache.has(key)) {
    let value
    try {
      value = JSON.parse(localStorage.getItem(key))
    } catch {
      value = null
    }
    cache.set(key, value && typeof value === 'object' ? value : null)
  }
  return cache.get(key)
}

const useTableLayoutStore = create((set) => ({

  // ── State ──────────────────────────────────────────
  version: 0,

  // ── Actions ────────────────────────────────────────
  setLayout: (key, layout) => {
    cache.set(key, layout)
    try {
      localStorage.setItem(key, JSON.stringify(layout))
    } catch {
      // storage full / blocked: kept for this visit only
    }
    set((state) => ({ version: state.version + 1 }))
  },

  resetLayout: (key) => {
    cache.set(key, null)
    try {
      localStorage.removeItem(key)
    } catch {
      // ignore
    }
    set((state) => ({ version: state.version + 1 }))
  },

}))

export default useTableLayoutStore
