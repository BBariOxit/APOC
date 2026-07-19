# APOC — Kế hoạch API và collection

> Cập nhật: 2026-07-19
>
> Phạm vi: kết nối MongoDB, bề mặt API và cách 17 Mongoose model nghiệp vụ hiện tại tham gia vào từng use case. Auth còn dùng collection nội bộ `auth_rate_limits` để chống brute force.

## 1. Trạng thái kết nối hiện tại

- `MONGODB_URI` đã được Next.js đọc từ file `.env` ở root.
- Kết nối thật đã được kiểm tra bằng `ping`/`listCollections` và thành công.
- URI hiện chọn database tên `test`.
- Database đang có `0` collection vật lý và `0` document. MongoDB chỉ tạo collection khi có lần ghi đầu tiên; 17 model dưới đây hiện mới là schema logic trong code.
- `GET /api/health/database` là readiness endpoint của app. Endpoint chỉ trả trạng thái và latency, không trả URI, credential hay tên database.

Nếu `test` không phải database dự định dùng, cần thêm tên database vào URI, ví dụ đường dẫn `/apoc` như `.env.example`. Không nên seed dữ liệu trước khi chốt database đích.

## 2. Nguyên tắc API

1. Client gọi use case, không CRUD trực tiếp collection runtime. Ví dụ client gọi `choices`, `advance-day`, `care`; không được PATCH thẳng `game_runs` hay POST thẳng `run_event_logs`.
2. Server lấy `userId` và role từ session. Không tin `userId`, effect, reward, RNG weight hoặc quantity do client gửi.
3. Mọi command thay đổi một run phải có `commandId` để chống retry trùng và `revision` để phát hiện nhiều tab/double submit.
4. Các mutation liên quan nhiều document phải chạy trong MongoDB transaction. Môi trường MongoDB vì vậy cần Atlas hoặc replica set.
5. Input được validate bằng Zod, output dùng DTO allowlist. Không serialize thẳng Mongoose document, nhất là expedition đang active và content ẩn.
6. API người chơi chỉ đọc published content gắn với `contentVersionId` của run. Draft content chỉ đi qua admin API.
7. List API dùng cursor pagination; không dùng offset cho event log/audit log lớn.

Response lỗi tối thiểu:

```json
{
  "error": {
    "code": "REVISION_CONFLICT",
    "message": "Run state has changed",
    "details": {}
  }
}
```

Các mã chính: `400 VALIDATION_ERROR`, `401 UNAUTHENTICATED`, `403 FORBIDDEN`, `404 NOT_FOUND`, `409 REVISION_CONFLICT` hoặc `COMMAND_ALREADY_APPLIED`, `422 DOMAIN_RULE_VIOLATION`, `429 RATE_LIMITED`, `503 DATABASE_UNAVAILABLE`.

## 3. Bản đồ 17 collection

| Collection logic | Vai trò | Quan hệ chính | API sử dụng |
| --- | --- | --- | --- |
| `users` | Danh tính, password hash, role, trạng thái tài khoản | Gốc của profile, run, achievement và audit | register/login/session; admin quản lý user |
| `player_profiles` | Meta progression và cache active run | `userId` unique; `activeRunId` trỏ `game_runs` | profile; create/finish/abandon run |
| `content_versions` | Version draft/published/archived | Cha của toàn bộ content definition và run | chọn published version khi tạo run; admin version lifecycle |
| `game_rule_definitions` | Bộ luật game cho một version | `contentVersionId` unique | create/advance run; admin rules singleton |
| `character_definitions` | Catalog nhân vật | unique `(contentVersionId, key)` | compose run snapshot; admin CRUD |
| `item_definitions` | Catalog item/resource | unique `(contentVersionId, key)` | snapshot, care, event, expedition; admin CRUD |
| `location_definitions` | Catalog location và event pool | tham chiếu event key trong cùng version | location read model, expedition engine; admin CRUD |
| `event_definitions` | Trigger, choice/item branch, resolution | tham chiếu item/location/event/achievement key | advance-day và resolve choice; admin CRUD |
| `ambient_definitions` | Diễn biến tự động đầu ngày | tham chiếu content key trong resolution | advance-day/daily snapshot; admin CRUD |
| `ending_definitions` | Điều kiện và ưu tiên ending | đọc state của run theo rules DSL | sau command/advance-day; admin CRUD |
| `achievement_definitions` | Catalog, progress rule, reward | ghép `user_achievements` và `global_stats` | achievements read model; admin CRUD |
| `game_runs` | Snapshot authoritative của một ván | thuộc user + content version; embed character/inventory/queue | toàn bộ game command và snapshot |
| `run_expeditions` | State và journal riêng của chuyến đi | thuộc run, user, content version | create/list/detail/read expedition |
| `run_event_logs` | Log append-only, idempotency và lịch sử | thuộc run; unique command/sequence | history, daily read model, debug; ghi nội bộ bởi command |
| `user_achievements` | Progress/unlock theo tài khoản | unique `(userId, achievementKey)` | achievements; cập nhật nội bộ sau command |
| `global_stats` | Thống kê achievement đã tổng hợp | unique `(type, key)` | tỷ lệ unlock; job reconcile nội bộ |
| `admin_audit_logs` | Audit append-only cho CMS | thuộc admin và có thể thuộc content version | admin audit list; chỉ DAL nội bộ được ghi |
| `auth_rate_limits` | Counter TTL đã HMAC cho login identifier/IP | collection hạ tầng, không chứa email/IP thô | chỉ Auth.js credentials flow |

Không cần tạo raw endpoint công khai kiểu `/api/run-event-logs` hoặc `/api/global-stats`. Các collection này phải nằm sau read model/use case tương ứng.

## 4. API người dùng và tài khoản

### Auth

| Method | Endpoint | Mục đích | Collection |
| --- | --- | --- | --- |
| `POST` | `/api/auth/register` | Validate email/username/password, hash password, tạo profile cùng transaction | `users`, `player_profiles` |
| `GET/POST` | `/api/auth/[...nextauth]` | Auth.js credentials, session, login/logout | `users` |

Register chỉ nhận `email`, `username`, `password`; server tự tạo `usernameKey`, `passwordHash`, role `player` và profile mặc định.

### Profile và achievement

| Method | Endpoint | Mục đích | Collection |
| --- | --- | --- | --- |
| `GET` | `/api/profile` | Profile, unlock/discovery và active run summary | `player_profiles`, `game_runs` |
| `PATCH` | `/api/profile` | Chỉ sửa các preference/profile field được allowlist | `player_profiles` |
| `GET` | `/api/achievements?cursor=&limit=` | Catalog đã lọc hidden + progress + unlock rate | `achievement_definitions`, `user_achievements`, `global_stats`, `content_versions` |

## 5. API gameplay

### Run và snapshot

| Method | Endpoint | Mục đích | Collection |
| --- | --- | --- | --- |
| `GET` | `/api/game-runs?status=&cursor=&limit=` | Danh sách run của user; thường dùng để hiện continue/history | `game_runs` |
| `POST` | `/api/game-runs` | Tạo run từ published version, rules và 4 character; đảm bảo mỗi user chỉ có một active run | `game_runs`, `player_profiles`, `content_versions`, `game_rule_definitions`, `character_definitions`, `item_definitions` |
| `GET` | `/api/game-runs/:runId` | Trả gameplay snapshot đã compose tên/icon/content; không trả field ẩn | `game_runs` + các definition theo version |
| `POST` | `/api/game-runs/:runId/abandon` | Đổi trạng thái run, giải phóng active run và ghi log | `game_runs`, `player_profiles`, `run_event_logs` |

Payload tạo run tối thiểu:

```json
{
  "commandId": "uuid",
  "mode": "normal"
}
```

### Command trong ngày

| Method | Endpoint | Mục đích | Collection |
| --- | --- | --- | --- |
| `POST` | `/api/game-runs/:runId/care` | Cho ăn/uống/chữa trị bằng item hợp lệ | `game_runs`, `item_definitions`, `run_event_logs`, achievement/ending liên quan |
| `POST` | `/api/game-runs/:runId/choices` | Resolve pending event bằng `choiceKey`, `selectedItemKey` hoặc `skipItem` | `game_runs`, `event_definitions`, `run_event_logs`, achievement/ending liên quan |
| `POST` | `/api/game-runs/:runId/advance-day` | Chặn nếu còn pending event; apply decay, expedition tick, ambient/event queue, ending | gần như toàn bộ runtime + content definition |

Payload care chỉ gửi intent:

```json
{
  "commandId": "uuid",
  "revision": 12,
  "characterKey": "lan",
  "action": "hydrate",
  "itemKey": "clean_water"
}
```

Payload resolve choice:

```json
{
  "commandId": "uuid",
  "revision": 12,
  "eventInstanceId": "event-instance-id",
  "choiceKey": "open_door"
}
```

Với `item_selection`, body dùng đúng một trong `selectedItemKey` hoặc `skipItem: true`. Client không gửi `effects`, `consumeItem`, `resultKey`, `weight` hay reward.

### Expedition, location và history

| Method | Endpoint | Mục đích | Collection |
| --- | --- | --- | --- |
| `POST` | `/api/game-runs/:runId/expeditions` | Cử character và loadout; transaction chuyển item/state khỏi shelter | `game_runs`, `run_expeditions`, `run_event_logs`, rules/item/location definitions |
| `GET` | `/api/game-runs/:runId/expeditions?status=&cursor=&limit=` | Active expedition summary và report được phép xem | `run_expeditions` |
| `GET` | `/api/game-runs/:runId/expeditions/:expeditionId` | Full report chỉ khi report đã available/read/archived | `run_expeditions` + definition để compose display |
| `POST` | `/api/game-runs/:runId/expeditions/:expeditionId/read` | Đánh dấu report đã đọc | `run_expeditions` |
| `GET` | `/api/game-runs/:runId/locations` | Bản đồ/location state mà run đã được phép biết | `game_runs`, `location_definitions` |
| `GET` | `/api/game-runs/:runId/history?cursor=&limit=&day=` | Nhật ký phân trang từ event log | `run_event_logs` + definition display fields |

Active expedition DTO tuyệt đối không trả route hiện tại, location hiện tại, journal chưa công bố, carried inventory còn lại hoặc kết quả RNG.

## 6. API admin CMS

Tất cả route dưới `/api/admin` phải kiểm tra session `role: admin`. Mọi create/update/delete/publish/archive phải ghi `admin_audit_logs`; published content không được sửa trực tiếp.

### Version lifecycle

| Method | Endpoint | Mục đích |
| --- | --- | --- |
| `GET/POST` | `/api/admin/content/versions` | List hoặc tạo draft version |
| `GET/PATCH/DELETE` | `/api/admin/content/versions/:versionId` | Đọc/sửa/xóa draft metadata |
| `POST` | `/api/admin/content/versions/:versionId/validate` | Chạy `validateContentVersionForPublish`, trả error/warning |
| `POST` | `/api/admin/content/versions/:versionId/publish` | Validate lại và publish atomically |
| `POST` | `/api/admin/content/versions/:versionId/archive` | Archive version không còn active |

### Definition CRUD

Các resource dạng danh sách:

```text
/api/admin/content/versions/:versionId/characters
/api/admin/content/versions/:versionId/items
/api/admin/content/versions/:versionId/locations
/api/admin/content/versions/:versionId/events
/api/admin/content/versions/:versionId/ambients
/api/admin/content/versions/:versionId/endings
/api/admin/content/versions/:versionId/achievements
```

- `GET` list có filter/search/cursor.
- `POST` tạo definition trong draft.
- `GET/PATCH/DELETE .../:key` đọc, sửa hoặc xóa một draft definition.
- Server chọn model từ allowlist resource; không nhận tên collection/model tùy ý từ client.

Rules là singleton theo version nên dùng:

```text
GET /api/admin/content/versions/:versionId/rules
PUT /api/admin/content/versions/:versionId/rules
```

Audit chỉ đọc:

```text
GET /api/admin/audit-logs?versionId=&entityType=&cursor=&limit=
```

Không cung cấp update/delete API cho `admin_audit_logs`.

## 7. Job nội bộ

`global_stats` là read model, không cho client ghi. Cần scheduled job hoặc protected internal command để reconcile `eligiblePlayers`, `unlockedPlayers`, `unlockRate` từ `user_achievements` và tập user đủ điều kiện. Nếu dùng HTTP endpoint cho scheduler, route phải có secret/service authentication và không nằm trong public UI flow.

## 8. Thứ tự triển khai đề xuất

### P0 — thay mock data bằng vertical slice

1. Auth register/session và `GET /api/profile`.
2. `POST/GET /api/game-runs` và `GET /api/game-runs/:runId`.
3. `care`, `choices`, `advance-day` với transaction, revision và command id.
4. Expedition create/list/report/read.
5. DTO mapper để UI không phụ thuộc Mongoose shape.

### P1 — progression và khả năng xem lại

1. Locations và paginated history.
2. Achievement catalog/progress/global rate.
3. Abandon, completed run history và recovery khi conflict.

### P2 — CMS

1. Version lifecycle + draft CRUD.
2. Validate/publish graph.
3. Audit viewer và statistic reconcile job.

## 9. Việc chưa nên làm

- Không gọi MongoDB trực tiếp từ Client Component.
- Không tạo một generic public CRUD controller cho cả 17 collection.
- Không để client tự tính decay, RNG, item consumption, achievement hoặc ending.
- Không tạo collection trống chỉ để “thấy bảng” trong Atlas; index/collection nên được tạo qua seed/migration có chủ đích sau khi chốt database đích.
- Không trả error gốc của MongoDB ra client vì có thể chứa host/database detail.
