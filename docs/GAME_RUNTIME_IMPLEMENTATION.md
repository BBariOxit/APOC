# Game runtime implementation

## Đã hoạt động

- Admin cấu hình `runSetup` trong Game rules: đúng 4 nhân vật và kho đồ khởi đầu.
- Publish validation chặn character/item bị thiếu, bị disable, quantity sai, item hỏng không hợp lệ và vượt `maxStack`.
- Run luôn ghim vào một content version. Version cũ vẫn được dùng để đọc run cũ sau khi có version mới.
- Server đánh giá rule, chọn event bằng seeded RNG, resolve deterministic/weighted outcome và áp dụng effect.
- Qua ngày tiêu thụ food/water, áp dụng thiếu hụt, giảm thời hạn condition và tạo event mới.
- Achievement dạng rule và ending có requirements được đánh giá ở server.
- Mọi mutation dùng `expectedRevision` và UUID `commandId`; event log lưu state hash, random roll và applied effects.
- Client chỉ nhận DTO cần hiển thị. Weighted outcomes và effects chưa được resolve không bị gửi ra browser.
- Condition có catalog theo content version: tên/tone lấy từ DB; cảnh báo chỉ số và cooldown được derive, condition do event vẫn lưu trong run.
- Ăn/uống/chữa trị dùng cấu hình `item.care`, trừ kho và cập nhật nhân vật trong một transaction có event log.

## Gameplay API hiện tại

| Method | Route | Chức năng |
| --- | --- | --- |
| `GET` | `/api/game-runs` | Lấy active run của tài khoản hiện tại |
| `POST` | `/api/game-runs` | Tạo run từ content đang publish |
| `GET` | `/api/game-runs/:runId` | Lấy run thuộc tài khoản hiện tại |
| `POST` | `/api/game-runs/:runId/advance-day` | Qua ngày nếu không còn pending event |
| `POST` | `/api/game-runs/:runId/care` | Dùng vật phẩm đã cấu hình để chăm sóc nhân vật |
| `POST` | `/api/game-runs/:runId/events/:instanceId/resolve` | Resolve một choice/item/fallback hợp lệ |

Mutation chỉ nhận JSON cùng origin. Server kiểm tra session active, ownership, ObjectId, payload size, Zod schema, revision và idempotency key.

## Dữ liệu nền và kiểm thử

`npm run content:seed -- --admin=<username>` tạo content 1.0.0 khi database chưa có version. Script từ chối chạy nếu đã có version và không xóa dữ liệu. Database cũ chạy một lần `npm run content:backfill-care` để thêm condition catalog và cấu hình care mặc định theo cách idempotent.

- `npm test`: unit test rule/effect/RNG/daily/event engine.
- `npm run test:integration`: tạo user tạm, chạy create/resolve/advance trên MongoDB thật rồi xóa đúng dữ liệu test đó.
- `npm run check`: lint, TypeScript và production build.

## Chưa nối vào gameplay

Admin CRUD cho ambient, location và expedition content đã lưu thật, nhưng runtime expedition/location report và ambient timeline chưa có command/API/UI trong vertical slice này. Care đã nối runtime; sửa vật phẩm hỏng và thao tác vật phẩm ngoài care vẫn chưa có command riêng.
