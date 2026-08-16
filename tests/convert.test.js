/*
 * 換算関数の検証。実行: node tests/convert.test.js
 * 期待値は正本 spec v2.5（表示は切り捨て）に従う。
 *
 * 注: SPEC.md の検収表にある「22:59 → 23:59」は、正本 v2.5 の検算表
 * 「22:59:59 → 23:59」から秒を落として書かれたとみられる。
 * 分のみの表示 22:59 (= real 1379分) は 1379 × 24/23 = 1438.957 分 → 23:58。
 * 秒まで見える 22:59:59 なら 23:59 になる。両方をテストで固定している。
 */
'use strict';
const { convert, disambiguateHour } = require('../ah-convert.js');

let failures = 0;
function eq(label, actual, expected) {
  const ok = actual === expected;
  if (!ok) failures++;
  console.log(`${ok ? 'ok  ' : 'FAIL'} ${label}: ${actual}${ok ? '' : ` (expected ${expected})`}`);
}

// SPEC.md §3 検収表（22:59 の行のみ上記の注参照）
eq('12:00', convert({ h: 12, m: 0 }).text, '12:31');
eq('23:00', convert({ h: 23, m: 0 }).text, '01:00');
eq('23:30', convert({ h: 23, m: 30 }).text, '00:30');
eq('06:00', convert({ h: 6, m: 0 }).text, '06:15');
eq('22:59 (分のみ・切り捨て)', convert({ h: 22, m: 59 }).text, '23:58');
// 1439.9826分 = 23:59:58.96 → 切り捨てで :58（分表示なら 23:59 で v2.5 の検算表と一致）
eq('22:59:59 (秒あり)', convert({ h: 22, m: 59, s: 59 }).text, '23:59:58');

// 正本 v2.5 検算表・テストケース
eq('00:00', convert({ h: 0, m: 0 }).text, '00:00');
eq('TC-C-RD-01 23:00 は AH', convert({ h: 23, m: 0 }).phase, 'another-hour');
eq('TC-C-RD-02 23:30 scaled', convert({ h: 23, m: 30 }).scaledMinutes, 30);
eq('TC-C-RD-03 23:59:59', convert({ h: 23, m: 59, s: 59 }).text, '00:00:01');
eq('22:59 は compressed', convert({ h: 22, m: 59 }).phase, 'compressed');
eq('AH 残り分数 23:30', convert({ h: 23, m: 30 }).ahRemainingMinutes, 30);

// 秒あり compressed
eq('12:00:00', convert({ h: 12, m: 0, s: 0 }).text, '12:31:18');

// 不正入力
eq('24:00 は不正', convert({ h: 24, m: 0 }), null);
eq('12:60 は不正', convert({ h: 12, m: 60 }), null);

// 12時間表記の曖昧さ解消（?ampm=1 のときのみ使用）
eq('9:15 / 端末 21:20 → 21', disambiguateHour(9, 15, 21 * 60 + 20), 21);
eq('9:15 / 端末 09:20 → 9', disambiguateHour(9, 15, 9 * 60 + 20), 9);
eq('12:30 / 端末 00:10 → 0', disambiguateHour(12, 30, 10), 0);
eq('12:30 / 端末 12:40 → 12', disambiguateHour(12, 30, 12 * 60 + 40), 12);
eq('23:05 は一意', disambiguateHour(23, 5, 0), 23);

if (failures) {
  console.error(`\n${failures} failure(s)`);
  process.exit(1);
}
console.log('\nall passed');
