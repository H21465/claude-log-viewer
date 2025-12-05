# Claude Log Viewer

Claude Codeとの会話履歴をプロジェクト単位で閲覧・検索できるローカルWebアプリケーションです。

## 特徴

- **プロジェクト単位の管理**: 複数プロジェクトの会話履歴を一元管理
- **全文検索**: キーワードで会話内容を横断検索
- **タイムライン表示**: 会話履歴を時系列で表示
- **トークン使用量ダッシュボード**: 日別・月別・モデル別のトークン使用量とコストを可視化
- **5時間ウィンドウ追跡**: Claude Codeのレート制限に対応した5時間ローリングウィンドウの使用量表示
- **リアルタイム更新**: WebSocketによる自動更新
- **ローカル完結**: 外部サービスへのアップロード不要、安全に管理
- **コードハイライト**: シンタックスハイライト付きでコードブロックを表示

## 必要環境

- Python 3.11+
- Node.js 18+
- [uv](https://docs.astral.sh/uv/) (Python パッケージマネージャー)

## セットアップ

```bash
# リポジトリをクローン
git clone <repository-url>
cd claude-log-viewer

# 依存関係のインストール
make setup
```

## 使い方

```bash
make cli
```

CLIダッシュボードが起動し、トークン使用量をリアルタイムで確認できます。

### キーボードショートカット

| キー | 動作 |
|------|------|
| **s** | Webサーバー起動 → http://localhost:5173 で会話履歴を閲覧 |
| **x** | Webサーバー停止 |
| **r** | Webサーバー再起動 |
| **q** | 終了 |

## 機能詳細

### Usage Dashboard

トークン使用量を様々な視点から分析できます：

- **期間フィルター**: 1日 / 1週間 / 全期間で切り替え
- **サマリーカード**: 期間内のトークン数、コスト、日数、使用モデル数
- **5時間ウィンドウ**: Claude Codeのレート制限に対応したリアルタイム使用量表示
  - 現在の使用トークン数
  - 残りトークン数
  - リセットまでの時間
- **モデル別使用量**: 各モデルの使用回数とコストの内訳
- **日別/月別テーブル**: 詳細な使用履歴（ソート・展開可能）
- **トークン内訳**: 入力/出力/キャッシュ作成/キャッシュ読み取りの詳細

### 会話ビューア

- プロジェクト一覧からセッションを選択
- メッセージをタイムライン形式で表示
- コードブロックのシンタックスハイライト
- ツール使用履歴の表示

## 技術スタック

### Backend
- Python 3.11+
- FastAPI
- SQLAlchemy + SQLite
- uvicorn
- WebSocket (リアルタイム更新)

### Frontend
- React 19
- TypeScript
- Tailwind CSS
- Vite
- Zustand (状態管理)
- React Query (データフェッチング)

## プロジェクト構成

```
claude-log-viewer/
├── backend/                    # Python バックエンド
│   ├── cli.py                  # CLIダッシュボード（メイン）
│   ├── main.py                 # FastAPI エントリーポイント
│   ├── database.py             # DB接続
│   ├── models.py               # SQLAlchemyモデル
│   ├── schemas.py              # Pydanticスキーマ
│   ├── routers/                # APIルーター
│   │   ├── projects.py         # プロジェクトAPI
│   │   ├── conversations.py    # 会話API
│   │   ├── messages.py         # メッセージAPI
│   │   ├── usage.py            # 使用量API
│   │   ├── search.py           # 検索API
│   │   ├── subagents.py        # サブエージェントAPI
│   │   ├── sync.py             # 同期API
│   │   └── websocket.py        # WebSocket
│   └── services/               # ビジネスロジック
│       ├── log_parser.py       # JONSLパーサー
│       ├── subagent_parser.py  # サブエージェントパーサー
│       ├── sync_service.py     # ログ同期
│       ├── server_manager.py   # サーバー管理
│       ├── file_watcher.py     # ファイル監視
│       ├── websocket_manager.py
│       └── usage/              # 使用量集計
│           ├── reader.py       # ログ読み込み
│           ├── aggregator.py   # 集計処理
│           ├── pricing.py      # 料金計算
│           └── ...
├── frontend/                   # React フロントエンド
│   └── src/
│       ├── api/                # APIクライアント
│       ├── components/
│       │   ├── chat/           # チャット表示
│       │   ├── timeline/       # タイムライン表示
│       │   └── usage/          # Usage Dashboard
│       ├── hooks/              # カスタムフック
│       ├── store/              # Zustand状態管理
│       ├── types/              # TypeScript型定義
│       └── utils/              # ユーティリティ
└── Makefile
```

## API エンドポイント

### Projects
- `GET /api/projects/` - プロジェクト一覧

### Conversations
- `GET /api/projects/{id}/conversations` - 会話一覧
- `GET /api/conversations/{id}/messages` - メッセージ一覧

### Usage
- `GET /api/usage/summary` - 使用量サマリー
- `GET /api/usage/daily` - 日別使用量
- `GET /api/usage/monthly` - 月別使用量
- `GET /api/usage/models` - モデル別使用量
- `GET /api/usage/reset-time` - 5時間ウィンドウのリセット時間

### WebSocket
- `ws://localhost:8000/ws/{project_id}` - リアルタイム更新

## 謝辞

このプロジェクトは以下のプロジェクトを参考にして作成しました：
- [ccraw](https://github.com/hiragram/ccraw)
- [Claude-Code-Usage-Monitor](https://github.com/Maciek-roboblog/Claude-Code-Usage-Monitor.git)

## License

MIT
