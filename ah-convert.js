/*
 * Another Hour conversion — pure functions.
 *
 * 正本: ../another-hour-clock/spec/another-hour-clock-spec-v2.5.md (Classic Mode)
 * リファレンス実装: ../another-hour-clock/index.html (MIT)
 *
 * このアプリ固有の入力規約 (SPEC.md §3):
 *   カメラに映った時計の表示時刻を real time とみなして写像する。
 *   秒が見えない表示は分単位、HH:MM:SS は秒まで換算する。
 *
 * UMD 風: ブラウザでは window.AHConvert、node では module.exports。
 */
(function (root, factory) {
  const api = factory();
  if (typeof module !== 'undefined' && module.exports) module.exports = api;
  else root.AHConvert = api;
})(typeof self !== 'undefined' ? self : globalThis, function () {
  'use strict';

  const AH_START_MINUTES = 1380; // 23:00
  const AH_DURATION = 60;        // minutes
  const DAY_MINUTES = 1440;      // 24h
  const SCALE_FACTOR = DAY_MINUTES / AH_START_MINUTES; // ≈ 1.04348

  const pad2 = (n) => String(n).padStart(2, '0');

  /**
   * 映った表示時刻 {h, m, s} を Another Hour 表示へ換算する。
   * s は秒が見えない表示なら null。
   * 端数は正本のリファレンス実装に合わせて切り捨て（truncate）。
   * 不正な入力は null を返す。
   */
  function convert({ h, m, s = null }) {
    if (!Number.isInteger(h) || !Number.isInteger(m)) return null;
    if (h < 0 || h > 23 || m < 0 || m > 59) return null;
    if (s !== null && (!Number.isInteger(s) || s < 0 || s > 59)) return null;

    const hasSec = s !== null;
    const realMinutes = h * 60 + m + (hasSec ? s / 60 : 0);

    let scaledMinutes;
    let phase;
    if (realMinutes < AH_START_MINUTES) {
      // Compressed Period — 24 conceptual hours in 23 real hours
      scaledMinutes = realMinutes * SCALE_FACTOR;
      phase = 'compressed';
    } else {
      // Another Hour — 01:00 から 00:00 へ逆行（countdown）
      scaledMinutes = AH_DURATION - (realMinutes - AH_START_MINUTES);
      phase = 'another-hour';
    }

    const totalSec = Math.floor(scaledMinutes * 60 + 1e-6);
    const hh = Math.floor(totalSec / 3600);
    const mm = Math.floor(totalSec / 60) % 60;
    const ss = totalSec % 60;
    const text = hasSec
      ? `${pad2(hh)}:${pad2(mm)}:${pad2(ss)}`
      : `${pad2(hh)}:${pad2(mm)}`;

    return {
      text,
      phase,
      isAH: phase === 'another-hour',
      scaledMinutes,
      ahRemainingMinutes: phase === 'another-hour' ? scaledMinutes : null,
    };
  }

  /**
   * 12時間表記の曖昧さ解消（SPEC.md §3 が許す「端末時刻を補助に使う」実装）。
   * 表示時 h (1..12) について AM/PM 両解釈のうち端末時刻に近い方を選ぶ。
   * デフォルトでは使わない（?ampm=1 で有効化）。検収表の決定性を守るため。
   */
  function disambiguateHour(h, m, deviceMinutes) {
    if (h >= 13 || h === 0) return h; // 24時間表記として一意
    const candidates = h === 12 ? [0, 12] : [h, h + 12];
    const dist = (hh) => {
      const d = Math.abs(hh * 60 + m - deviceMinutes);
      return Math.min(d, DAY_MINUTES - d);
    };
    // 同距離なら映った値をそのまま採用
    candidates.sort((a, b) => dist(a) - dist(b) || (a === h ? -1 : 1));
    return candidates[0];
  }

  return { convert, disambiguateHour, AH_START_MINUTES, AH_DURATION, DAY_MINUTES, SCALE_FACTOR };
});
