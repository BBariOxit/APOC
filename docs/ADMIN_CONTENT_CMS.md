# APOC Admin Content CMS

## Khởi động lần đầu

MongoDB URI và Auth.js secret nằm trong `.env`, file này đã được gitignore.

```powershell
npm run auth:secret
npm run admin:create
npm run dev
```

`auth:secret` không in secret ra terminal và không ghi đè secret đã tồn tại. `admin:create` yêu cầu terminal tương tác, ẩn mật khẩu khi nhập và từ chối email/username trùng.

Mở `http://localhost:3000/admin`. Production phải cấu hình thêm canonical `AUTH_URL`. Chỉ đặt `AUTH_TRUST_HOST=true` nếu ứng dụng nằm sau proxy/hosting kiểm soát được forwarded host headers.

## Workflow

1. Tạo version trống hoặc clone version cũ.
2. Chỉnh rules và content trong draft.
3. Validate từng entity hoặc toàn version.
4. Sửa toàn bộ error; review warning.
5. Publish. Version published cũ được archive trong cùng transaction.

Published và archived version là immutable. Muốn sửa phải clone thành draft mới.

## Resource được quản lý

- `characters`
- `items`
- `locations`
- `events`
- `ambients`
- `endings`
- `achievements`
- singleton `rules`

List hỗ trợ search, filter, cursor pagination và bulk enable/disable. Editor hỗ trợ template hợp lệ cơ bản, format JSON, validate entity, duplicate và dependency preview.

## Security boundary

- Auth.js credentials dùng bcrypt và JWT session tối đa 8 giờ.
- Role/status admin luôn được đọc lại từ MongoDB tại DAL; JWT cũ không giữ được quyền nếu admin bị khoá/hạ role.
- Login bị rate limit theo HMAC(identifier) và HMAC(IP); TTL 15 phút, không lưu identifier/IP thô.
- Mutation chỉ nhận JSON tối đa 1 MB và từ chối Origin khác origin hiện tại.
- Client không được gửi `contentVersionId`, `createdBy`, role hoặc audit data.
- Mỗi resource dùng Zod schema và field allowlist riêng.
- Mọi mutation content chạy transaction cùng append-only audit log.
- `key` immutable. Delete draft bị chặn nếu còn reference.
- Update dùng revision để chống hai admin ghi đè nhau.
- Lỗi trả ra client được chuẩn hoá; MongoDB host/credential và stack trace không được expose.

## Route chính

```text
GET/POST       /api/admin/content/versions
GET/PATCH/DELETE /api/admin/content/versions/:versionId
POST           /api/admin/content/versions/:versionId/clone
POST           /api/admin/content/versions/:versionId/validate
POST           /api/admin/content/versions/:versionId/publish
POST           /api/admin/content/versions/:versionId/archive
GET/PUT        /api/admin/content/versions/:versionId/rules
GET            /api/admin/content/versions/:versionId/catalog
POST           /api/admin/content/versions/:versionId/validate-entity

GET/POST       /api/admin/content/versions/:versionId/:resource
GET/PATCH/DELETE /api/admin/content/versions/:versionId/:resource/:key
POST           /api/admin/content/versions/:versionId/:resource/:key/duplicate
GET            /api/admin/content/versions/:versionId/:resource/:key/dependencies
POST           /api/admin/content/versions/:versionId/:resource/bulk-action

GET            /api/admin/audit-logs
```

API không có generic model/collection parameter ngoài allowlist resource ở server.
