# APOC

APOC là game sinh tồn quản lý tài nguyên theo ngày, lấy cảm hứng từ cấu trúc chơi lại của *60 Seconds!*. Người chơi quản lý bốn nhân vật, vật phẩm và các lựa chọn sự kiện để mở khóa nhiều nhánh truyện, ending và achievement.

## Công nghệ

- Next.js 16, React 19 và TypeScript
- Tailwind CSS 4 và shadcn/ui
- Motion, Lucide React và Zustand
- MongoDB qua Mongoose
- Auth.js và bcryptjs
- Zod, React Hook Form và seeded RNG

## Chạy local

Yêu cầu Node.js 20.9 trở lên.

```bash
npm install
npm run dev
```

Kiểm tra trước khi commit:

```bash
npm run check
```

## Tài liệu dự án

Đọc [Tổng quan game và database](docs/GAME_AND_DATABASE_OVERVIEW.md) trước khi thay đổi gameplay, schema hoặc CMS admin. Đây là tài liệu kiến trúc gốc của dự án và cần được cập nhật cùng code khi quyết định thiết kế thay đổi.
