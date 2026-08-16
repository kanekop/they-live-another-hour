# They Live Another Hour — 開発エージェント向けメモ

- 画面上のアプリ名は **Another Hour Lens**。正式名 They Live Another Hour は `<title>` 等に残す。
- Another Hour ルールの正本は `../another-hour-clock/spec/another-hour-clock-spec-v2.5.md`。ルールをこのリポジトリに複製しない。換算をいじるときは必ず正本と `tests/convert.test.js` を照合する。
- 方針: 単一ページ・外部依存ゼロ・ビルド不要。映像/画像を外部に送らない（プライバシーは仕様。SPEC.md §5-4）。この方針を破る変更は Kaneko 確認必須。
- 換算の端数は**切り捨て**（正本リファレンス実装準拠）。SPEC.md 検収表の「22:59 → 23:59」は正本と不整合（README の注参照・Kaneko 未確認)。
- 検証:
  - `node tests/convert.test.js`
  - E2E（カメラ不要）: 配信して `index.html?test=1&t=23:30&debug=1` → 「カメラを起動する」→ 琥珀色の `00:30` オーバーレイが出れば OK。`?debug=1` で検出ボックスと `[AHLens]` ログ。
  - 検出ループは `setInterval` 駆動。ウィンドウが遮蔽されると rAF が止まるため、ヘッドレス的な確認では JS から状態 (`track`) を読むのが確実。
- 実機ターゲットは iPhone Safari。`getUserMedia` のため HTTPS 配信が必要。
- Kaneko の秘書エージェント（AA リポ）は開発に関与しない。判断はすべて Kaneko 経由（SPEC.md §8）。
