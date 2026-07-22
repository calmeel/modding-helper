# スプレッド表示の効果音（ドン/カツ）

スプレッド表示の「効果音」で使う音源を置く場所です。**exe 専用**（web ツールは合成音を使うため、この音源は読みません）。
**セットごとにサブフォルダを作る**と、設定画面（⚙設定 → 譜面読み込み設定）の
「効果音の種類」ラジオボタンで切り替えられます。**フォルダ名がそのままラベル**になります。

```
electron/sounds/
  Taiko/        ← セット1（ラベル「Taiko」）
    taiko-normal-hitnormal.wav
    taiko-normal-hitclap.wav
    taiko-normal-hitfinish.wav
    taiko-normal-hitwhistle.wav
  Soft/         ← セット2（ラベル「Soft」）
    ...
  Custom/       ← セット3（ラベル「Custom」）
    ...
```

- サブフォルダが無い場合は、`electron/sounds/` 直下のファイルを単一セット（Default）として使います。
- どのセットも音源が無ければ合成音にフォールバックします。

## 各セット内のファイル名（拡張子は `.wav` / `.ogg` / `.mp3`）

| 用途                    | 簡易名     | osu!taiko スキン名（自動認識）      | 必須 |
|-------------------------|-----------|-------------------------------------|------|
| ドン（面）              | `don`     | `taiko-normal-hitnormal`            | ○    |
| カツ（縁）              | `kat`     | `taiko-normal-hitclap`              | ○    |
| 大ドン（finish 付き面） | `don-big` | `taiko-normal-hitfinish`            | 任意 |
| 大カツ（finish 付き縁） | `kat-big` | `taiko-normal-hitwhistle`           | 任意 |

- `don-big` / `kat-big` が無ければ、大音符は `don` / `kat` を大きめの音量で鳴らします。
- 短く（〜0.1〜0.3 秒）先頭無音の無いファイルほど発音が正確です。

## 注意
- 音源はアプリ起動時に読み込むため、**ファイル追加後はアプリを再起動**してください。
- 効果音が鳴るのは **modding-helper 側でスペースキー再生している間だけ**です
  （osu! 追従中は osu! 自身のヒット音が鳴るため対象外）。
