// ============================================================
// utils.js — 共有ヘルパー（循環import回避のため独立モジュール）
// ============================================================
import { MSG, MSG_WORDS, MSG_TRTMJ } from './data.js';
import { gs } from './game.js';

export function msg(key)  { return MSG[gs.lang]?.[key] || ''; }
export function words()   { return MSG_WORDS[gs.lang] || {}; }
export function trtmj(i)  { return MSG_TRTMJ[gs.lang]?.[i] || ''; }
