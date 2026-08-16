# Another Hour Lens

正式名: **They Live Another Hour** — 現実のデジタル時計にカメラをかざすと、表示が [Another Hour](../another-hour-clock/) の時刻に置き換わって見えるレンズアプリ。Phase 1（Web アプリ・デジタル表示対応）の実装。

仕様の出発点は `SPEC.md`。Another Hour ルールの正本は `../another-hour-clock/spec/another-hour-clock-spec-v2.5.md`。

**本番 URL**: https://kanekop.github.io/they-live-another-hour/ （GitHub Pages・main ブランチ直下から自動配信。push すれば反映）

## 構成（ビルド不要・外部依存ゼロ）

| ファイル | 役割 |
|---|---|
| `index.html` | アプリ本体。カメラ・検出・オーバーレイすべて込みの単一ページ |
| `ah-convert.js` | 換算の純関数（ブラウザ/node 共用） |
| `testclock.html` | 検収用に PC 画面へ表示する的（まと）のデジタル時計 |
| `tests/convert.test.js` | 換算のユニットテスト。`node tests/convert.test.js` |

## 使い方

1. HTTPS（または localhost）で配信して URL を開く。`getUserMedia` は secure context 必須のため、**iPhone 実機では HTTPS が必要**。手軽な順に: GitHub Pages に置く / `cloudflared tunnel --url http://localhost:8000` / Tailscale の `tailscale serve`。ローカル確認だけなら `python3 -m http.server` + `http://localhost:8000/`。
2. 「カメラを起動する」→ カメラ許可。
3. デジタル時計（`HH:MM` / `HH:MM:SS`、7セグ含む）にかざすと、元表示を覆って Another Hour 時刻が重なる。実時間 23 時台は琥珀色 + **ANOTHER HOUR** ラベルで逆行時刻（1:00→0:00）を表示。

映像は端末内でのみ処理し、外部送信は一切しない。

### URL パラメータ

- `?debug=1` — 検出ボックスの可視化と `[AHLens]` コンソールログ
- `?test=1&t=23:30` — カメラの代わりに合成7セグ時計を映像源にする（デスクトップでの E2E 確認用。`t` は `HH:MM` か `HH:MM:SS`）
- `?ampm=1` — 12時間表示（1〜12時）を端末時刻で AM/PM 補完。既定は映った数字をそのまま 0–23 時として扱う（SPEC.md §3）

### 検収手順

PC で `testclock.html?t=23:30` を全画面表示 →（固定でなく進行させるなら `&run=1`、秒表示は `&s=1`）→ iPhone でアプリを開いてかざす。検収表:

| 映った表示 | 換算表示 |
|---|---|
| 12:00 | 12:31 |
| 23:00 | 01:00（AH・琥珀色） |
| 23:30 | 00:30（AH） |
| 06:00 | 06:15 |
| 22:59 | 23:58（下記の注） |

> **注（SPEC.md の検収表との差異）**: SPEC.md は「22:59 → 23:59」とするが、これは正本 v2.5 の検算表「22:59:**59** → 23:59」から秒が落ちたものとみられる。分のみの 22:59 は 1379 × 24/23 = 1438.957 分 → 切り捨てで **23:58**（正本のリファレンス実装は表示を切り捨てで統一）。秒まで映る 22:59:59 なら 23:59:58（分表示 23:59）で一致する。→ Kaneko に要確認。

## 実装の決定事項（2026-08-16 Kaneko 確認済み）

- オーバーレイは元表示を**覆って置換**（並記しない）
- AH 区間の演出は実装者裁量 → 琥珀色 (#ffb13d) + 「ANOTHER HOUR」ラベル + 緩いパルス
- 画面上の表記は **Another Hour Lens**、正式名 They Live Another Hour はタイトル等に残す

## 検出の仕組み

外部 OCR ライブラリは使わず、全て自前・端末内:

1. 映像フレームを幅 360px に縮小しグレースケール化、平均±0.85σ で明暗**両極性**を二値化（LED/画面の明るい数字、LCD/印字の暗い数字の両対応）
2. 1px 膨張（7セグのセグメント間隙間を橋渡し）→ 連結成分ラベリング
3. 高さ・アスペクト比で数字候補を絞り、水平に並ぶものをグループ化。小成分はコロン候補
4. 各成分を7セグメント領域サンプリングで数字認識（生マスク使用・イタリック用シアー2候補・細長い成分は「1」）
5. `H:MM` / `HH:MM(:SS)` に組み立て時刻として妥当なものだけ採用。**初回ロックはコロン必須**（価格・電話番号への誤発火抑制。SPEC §5）。コロン点滅の消灯フレームはロック済み領域でのみ許容
6. 検出は 150ms 間隔の `setInterval`（rAF はタブ非表示や iOS の省電力で止まるため）、オーバーレイ追従は毎フレーム lerp

換算は `ah-convert.js`（正本 v2.5 準拠・表示は切り捨て）。

## 既知の制約（Phase 1）

- 細身のフォント（アンチエイリアスの強い小さな文字）は7セグ式認識の精度が落ちる。太めのデジタル表示・7セグが得意
- 12時間表記は既定で額面通り解釈（`?ampm=1` で端末時刻補完）
- 照明が均一で極端にコントラストが低い場面は検出しない（global threshold）
- アナログ文字盤は Phase 2、iOS ネイティブは Phase 3（`SPEC.md` §4）

## テスト

```sh
node tests/convert.test.js                       # 換算ユニットテスト
open "http://localhost:8000/index.html?test=1&t=23:30&debug=1"  # 検出〜オーバーレイの E2E（カメラ不要）
```
