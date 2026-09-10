# Daily Target

Next.js 任務看板，使用獨立 Express API 與 MySQL 儲存資料。

瀏覽器 → `apps/web`（3000）→ `apps/api`（4000）→ MySQL（3306）。
前端只透過 HTTP 呼叫 API；資料庫帳密僅放在後端。

## 本機啟動

需要 Node.js 20.9+、npm，以及已啟動的 Docker / Docker Compose。
取得專案後，於專案根目錄執行（若有舊服務正在執行，先用 Ctrl+C 停止）：

```bash
git clone git@github.com:nonohuang0819/daily-target.git
cd daily-target
npm install
cp apps/api/.env.example apps/api/.env
cp apps/web/.env.example apps/web/.env.local
npm run db:up
npm run db:import
npm run dev
```

已有本機專案時略過 `git clone` 與 `cd`；已有環境設定時保留原本 `.env`，不用重新複製。

- 前端：http://localhost:3000
- API：http://localhost:4000/issues
- 健康檢查：http://localhost:4000/health（會檢查資料庫）

`db:up` 啟動 MySQL 8.4 並等待就緒。API 啟動時自動建立 issues 表。
`db:import` 匯入原本 `apps/api/data/issues.json`；沒有該檔案時匯入三筆範例。
匯入使用 transaction，重複 ID 不覆寫 MySQL 內的資料，原始 JSON 保留。
不需要範例或舊資料時可略過匯入，從空白看板開始。

## 分別啟動前後端

```bash
# 終端機一
npm run dev:api
```

```bash
# 終端機二
npm run dev:web
```

也可以在 `apps/api`、`apps/web` 各自執行 `npm run dev`。
前端 API 位址由 `apps/web/.env.local` 的 `NEXT_PUBLIC_API_BASE_URL` 指定。
後端 `apps/api/.env` 的 `CORS_ORIGIN` 必須與瀏覽器前端網址一致。
部署時先設定前端 API 位址再建置；公開環境請替換 Compose 中的本機開發密碼。

## 使用既有 MySQL

不用 Docker 時，先在自己的 MySQL 建立 `daily_target` 資料庫（utf8mb4），
提供可建立表與讀寫資料的帳號，然後修改 `apps/api/.env` 的
`DB_HOST`、`DB_PORT`、`DB_USER`、`DB_PASSWORD`、`DB_NAME`。
略過 `npm run db:up`，其餘步驟相同。資料庫無法連線時 API 會明確報錯並停止啟動。

## 停止與正式模式

Ctrl+C 停止前後端，`npm run db:down` 停止 MySQL。
資料存放於 Docker named volume，停止或重建容器後仍保留；
`docker compose down -v` 會刪除資料，請勿用於一般停止。

```bash
npm run build
npm start
```

正式模式也可在兩個 apps 目錄分別執行 `npm start`（前端須先 build）。

## 驗證

`npm run test:api` 使用實際 MySQL 測試新增、更新、查詢、並行 ID 與輸入驗證。
請先啟動 MySQL；測試會清除自己建立的資料，不會清空現有任務。

## 專案結構

```text
apps/
  web/
    app/             Next.js 頁面與樣式
    lib/api.js       前端 HTTP API client
    .env.example     前端環境設定範本
  api/
    server.js        API 啟動與關閉
    src/app.js       路由、輸入驗證、錯誤處理
    src/db.js        MySQL 連線池與建表
    src/seed.js      範例任務
    scripts/import.js 舊 JSON / 範例資料匯入
    test/            MySQL 整合測試
    .env.example     後端環境設定範本
compose.yaml         本機 MySQL 與持久化 volume
```

## 環境變數

| 位置 | 變數 | 預設值 / 用途 |
| --- | --- | --- |
| 前端 | `NEXT_PUBLIC_API_BASE_URL` | `http://localhost:4000`，瀏覽器呼叫的 API 網址 |
| 後端 | `PORT` | `4000` |
| 後端 | `CORS_ORIGIN` | `http://localhost:3000`，允許的前端來源 |
| 後端 | `DB_HOST` | `127.0.0.1` |
| 後端 | `DB_PORT` | `3306` |
| 後端 | `DB_USER` | `daily_target` |
| 後端 | `DB_PASSWORD` | `daily_target_dev`，本機開發密碼 |
| 後端 | `DB_NAME` | `daily_target` |

`.env` 與 `.env.local` 已被 Git 忽略。修改設定後請重新啟動服務。

## API

| 方法 | 路徑 | 功能 |
| --- | --- | --- |
| GET | `/health` | 資料庫可用時回傳 200，不可用時回傳 503 |
| GET | `/issues` | 依更新時間由新到舊列出任務 |
| POST | `/issues` | 新增任務，成功回傳 201，初始狀態為 `todo` |
| PATCH | `/issues/:id` | 更新任務欄位，找不到任務回傳 404 |

新增需提供非空白 `title`，可選填 `description`、`priority`、`assignee`。
更新支援上述欄位以及 `status`。狀態為 `todo`、`in-progress`、`done`；
優先度為 `low`、`medium`、`high`。任務 ID 格式為 `ISSUE-101`。

```bash
curl -X POST http://localhost:4000/issues \
  -H 'Content-Type: application/json' \
  -d '{"title":"整理本週任務","priority":"high","assignee":"我"}'
```

## 常見問題

- **MySQL 無法啟動**：確認 Docker 已啟動，用 `docker compose logs mysql` 查看原因。
- **3306 被占用**：修改 `compose.yaml` 的主機連接埠，例如 `127.0.0.1:3307:3306`，並把後端 `DB_PORT` 改為 `3307`。
- **API 連線失敗**：確認 MySQL 已就緒，以及後端 `.env` 與資料庫帳密一致。
- **前端讀不到任務**：確認 API 正在執行、`NEXT_PUBLIC_API_BASE_URL` 可從瀏覽器存取，且 `CORS_ORIGIN` 與前端網址一致。
- **修改 Compose 密碼沒有生效**：MySQL 初始化環境變數只在空白資料目錄生效；既有資料庫需另外修改帳號密碼，再同步更新後端設定。
