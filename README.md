# Claude Log Viewer

Claude Codeとの会話履歴をプロジェクト単位で閲覧・検索できるローカルWebアプリケーションです。

## 特徴

- **プロジェクト単位の管理**: 複数プロジェクトの会話履歴を一元管理
- **全文検索**: キーワードで会話内容を横断検索
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

### 起動

```bash
make start
```

起動後、以下のURLにアクセス:
- Frontend: http://localhost:5173
- Backend API: http://localhost:8000

### 停止

```bash
make stop
```

### ステータス確認

```bash
make status
```

### コマンド一覧

```bash
make help
```

## 技術スタック

### Backend
- Python 3.11+
- FastAPI
- SQLAlchemy + SQLite
- uvicorn

### Frontend
- React 19
- TypeScript
- Tailwind CSS
- Vite
- Zustand (状態管理)
- React Query

## プロジェクト構成

```
claude-log-viewer/
├── backend/          # FastAPI バックエンド
│   ├── main.py       # エントリーポイント
│   ├── models.py     # SQLAlchemyモデル
│   ├── schemas.py    # Pydanticスキーマ
│   ├── routers/      # APIルーター
│   └── services/     # ビジネスロジック
├── frontend/         # React フロントエンド
│   └── src/
└── Makefile          # 起動・停止コマンド
```

## 謝辞

このプロジェクトは [ccraw](https://github.com/hiragram/ccraw) を参考にして作成しました。

## License

MIT
