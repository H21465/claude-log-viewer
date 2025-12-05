# テスト設計: Server Control (サーバー起動・停止機能)

## テスト対象
- `services/server_manager.py`: ServerManager クラス
- `cli.py`: キーボード入力処理、UI状態表示

---

## 1. ServerManager クラス テストケース

### 1.1 初期化テスト

| ID | テストケース | 入力 | 期待結果 |
|----|-------------|------|----------|
| SM-001 | 初期状態確認 | `ServerManager()` | `backend_process=None`, `frontend_process=None` |
| SM-002 | 初期状態でis_running | `manager.is_backend_running()` | `False` |
| SM-003 | 初期状態でget_status | `manager.get_status()` | `{"backend": False, "frontend": False}` |

### 1.2 Backend 起動テスト

| ID | テストケース | 入力 | 期待結果 |
|----|-------------|------|----------|
| SM-010 | Backend正常起動 | `start_backend()` | `True`, プロセス起動 |
| SM-011 | Backend起動後の状態確認 | `is_backend_running()` | `True` |
| SM-012 | Backend二重起動 | 起動中に`start_backend()` | `True`（既存プロセス維持） |
| SM-013 | Backend起動失敗(ポート使用中) | ポート8000使用中で起動 | `False`, エラーログ出力 |

### 1.3 Backend 停止テスト

| ID | テストケース | 入力 | 期待結果 |
|----|-------------|------|----------|
| SM-020 | Backend正常停止 | `stop_backend()` | `True`, プロセス終了 |
| SM-021 | Backend停止後の状態確認 | `is_backend_running()` | `False` |
| SM-022 | 未起動のBackend停止 | 停止状態で`stop_backend()` | `True`（何もしない） |
| SM-023 | Backend強制停止 | 応答しないプロセスに`stop_backend(force=True)` | `True`, SIGKILL送信 |

### 1.4 Frontend 起動・停止テスト

| ID | テストケース | 入力 | 期待結果 |
|----|-------------|------|----------|
| SM-030 | Frontend正常起動 | `start_frontend()` | `True`, プロセス起動 |
| SM-031 | Frontend起動後の状態確認 | `is_frontend_running()` | `True` |
| SM-032 | Frontend正常停止 | `stop_frontend()` | `True`, プロセス終了 |
| SM-033 | Frontend二重起動 | 起動中に`start_frontend()` | `True`（既存プロセス維持） |

### 1.5 一括操作テスト

| ID | テストケース | 入力 | 期待結果 |
|----|-------------|------|----------|
| SM-040 | 全サーバー起動 | `start_all()` | `(True, True)`, 両方起動 |
| SM-041 | 全サーバー停止 | `stop_all()` | `(True, True)`, 両方停止 |
| SM-042 | 全サーバー再起動 | `restart_all()` | `(True, True)`, 停止→起動 |
| SM-043 | 部分起動状態で一括停止 | Backend起動中に`stop_all()` | `(True, True)` |

### 1.6 外部操作検出テスト

| ID | テストケース | 入力 | 期待結果 |
|----|-------------|------|----------|
| SM-050 | 外部からBackend停止検出 | 外部でkillした後`is_backend_running()` | `False` |
| SM-051 | 外部からBackend起動検出 | 外部で起動した後`is_backend_running()` | `True` |
| SM-052 | PIDファイルとの整合性 | プロセス異常終了後の状態確認 | 正しい状態を返す |

### 1.7 エッジケース

| ID | テストケース | 入力 | 期待結果 |
|----|-------------|------|----------|
| SM-060 | 空のコマンドパス | `ServerManager(backend_cmd="")` | `ValueError` |
| SM-061 | 存在しないコマンド | `start_backend()` with invalid cmd | `False` |
| SM-062 | タイムアウト起動待機 | 起動に10秒以上かかるプロセス | タイムアウトエラー |
| SM-063 | シグナル受信中の操作 | SIGINT受信中に`stop_all()` | 正常にクリーンアップ |

---

## 2. キーボード入力処理 テストケース

### 2.1 キー入力認識

| ID | テストケース | 入力 | 期待結果 |
|----|-------------|------|----------|
| KB-001 | 's'キーで起動 | `s` 押下 | `start_all()` 呼び出し |
| KB-002 | 'x'キーで停止 | `x` 押下 | `stop_all()` 呼び出し |
| KB-003 | 'r'キーで再起動 | `r` 押下 | `restart_all()` 呼び出し |
| KB-004 | 'q'キーで終了 | `q` 押下 | `running=False`, クリーンアップ |
| KB-005 | 無効なキー | `z` 押下 | 何も起きない |
| KB-006 | 大文字キー | `S` 押下 | `start_all()` 呼び出し（大文字小文字無視） |

### 2.2 連続入力

| ID | テストケース | 入力 | 期待結果 |
|----|-------------|------|----------|
| KB-010 | 高速連続入力 | `sss` 連続押下 | 1回のみ起動処理 |
| KB-011 | 起動中に停止 | `s` 後すぐ `x` | 起動後に停止 |

---

## 3. UI状態表示 テストケース

### 3.1 サーバー状態インジケータ

| ID | テストケース | 入力状態 | 期待表示 |
|----|-------------|---------|----------|
| UI-001 | 両方停止 | Backend停止, Frontend停止 | 赤丸 + "Stopped" x 2 |
| UI-002 | 両方起動 | Backend起動, Frontend起動 | 緑丸 + "Running" x 2 |
| UI-003 | Backend のみ起動 | Backend起動, Frontend停止 | Backend緑, Frontend赤 |
| UI-004 | 起動中表示 | 起動処理中 | 黄丸 + "Starting..." |
| UI-005 | 停止中表示 | 停止処理中 | 黄丸 + "Stopping..." |

### 3.2 フッターヘルプ表示

| ID | テストケース | 入力 | 期待結果 |
|----|-------------|------|----------|
| UI-010 | ショートカット表示 | 初期表示 | `[s]Start [x]Stop [r]Restart [q]Quit` 表示 |
| UI-011 | 状態に応じた表示 | 起動中 | 停止コマンドのみハイライト |

---

## 4. 統合テスト

### 4.1 ライフサイクルテスト

| ID | テストケース | シナリオ | 期待結果 |
|----|-------------|---------|----------|
| INT-001 | 起動→停止→終了 | CLI起動→s→x→q | 正常終了、プロセスなし |
| INT-002 | 再起動サイクル | CLI起動→s→r→r→x→q | 各段階で正常動作 |
| INT-003 | CLI終了時クリーンアップ | サーバー起動中にCLI終了 | サーバーも停止 |

### 4.2 エラー回復テスト

| ID | テストケース | シナリオ | 期待結果 |
|----|-------------|---------|----------|
| INT-010 | 起動失敗後の再試行 | ポート占有→解放→再起動 | 再起動成功 |
| INT-011 | プロセスクラッシュ回復 | Backend異常終了→再起動 | 正常に再起動 |

---

## 5. モック戦略

### 5.1 subprocess.Popen モック
```python
@pytest.fixture
def mock_popen():
    with patch('subprocess.Popen') as mock:
        mock_process = MagicMock()
        mock_process.poll.return_value = None  # Running
        mock_process.pid = 12345
        mock.return_value = mock_process
        yield mock
```

### 5.2 psutil モック
```python
@pytest.fixture
def mock_psutil():
    with patch('psutil.process_iter') as mock:
        yield mock
```

### 5.3 キーボード入力モック
```python
@pytest.fixture
def mock_stdin():
    with patch('sys.stdin') as mock:
        yield mock
```

---

## 6. 必要なテストファイル

| ファイル | 内容 |
|---------|------|
| `tests/test_server_manager.py` | ServerManager ユニットテスト |
| `tests/test_cli_keyboard.py` | キーボード入力テスト |
| `tests/test_cli_ui.py` | UI表示テスト |
| `tests/test_integration.py` | 統合テスト |

---

## 7. 実行コマンド

```bash
# 全テスト実行
pytest tests/ -v

# ServerManager のみ
pytest tests/test_server_manager.py -v

# カバレッジ付き
pytest tests/ --cov=services/server_manager --cov=cli
```
