# APOC — Tổng quan game và database

> Trạng thái: bản thiết kế nền tảng 1.1
>
> Phạm vi: gameplay, content system, database, tài khoản và admin CMS
>
> Nguyên tắc cập nhật: mọi thay đổi làm khác gameplay invariant, cấu trúc collection hoặc rule/effect contract phải cập nhật tài liệu này trong cùng commit.

## 1. Tầm nhìn sản phẩm

APOC là game sinh tồn theo lượt/ngày, tập trung vào ba trải nghiệm:

1. Quản lý bốn nhân vật với tài nguyên hữu hạn và trạng thái liên tục xấu đi.
2. Đưa ra lựa chọn trong các sự kiện có hậu quả ngắn hạn lẫn dài hạn.
3. Chơi lại để khám phá event ẩn, vật phẩm, achievement và nhiều ending.

Game lấy cảm hứng từ vòng lặp của *60 Seconds!* nhưng hệ thống nội dung được thiết kế data-driven: admin có thể tạo event, điều kiện, hiệu ứng, achievement và ending mà không phải thêm `if/else` riêng cho từng nội dung.

### 1.1. Trụ cột thiết kế

- **Quyết định có giá trị:** lựa chọn phải tạo trade-off, không chỉ có một đáp án luôn đúng.
- **Ngẫu nhiên có kiểm soát:** random tăng khả năng chơi lại nhưng phải debug và tái hiện được.
- **Hậu quả có tính liên tục:** event hôm nay có thể đặt cờ, lên lịch hoặc khóa/mở nhánh nhiều ngày sau.
- **Thông tin không hoàn toàn:** event, item và achievement ẩn tạo động lực khám phá.
- **Save đáng tin cậy:** refresh, mở nhiều tab hoặc cập nhật content không được làm nhân đôi phần thưởng hay phá ván đang chơi.

## 2. Phạm vi gameplay

### 2.1. Vòng lặp chính

```text
Bắt đầu/tiếp tục ván
        ↓
Xem trạng thái nhóm và kho đồ
        ↓
Phân phối tài nguyên / chuẩn bị hành động
        ↓
Server xử lý hao hụt và trạng thái theo ngày
        ↓
Xếp event đã lên lịch và event random hợp lệ vào hàng chờ
        ↓
Người chơi đưa ra lựa chọn
        ↓
Server áp dụng effect, ghi log, kiểm tra achievement và ending
        ↓
Sang ngày mới hoặc kết thúc ván
```

### 2.2. Nhân vật

Game khởi đầu với bốn nhân vật. Mỗi nhân vật có:

- Chỉ số: `health`, `hunger`, `thirst`, `sanity`.
- Trạng thái chính: `shelter`, `expedition`, `missing`, `dead`, `insane`.
- Tình trạng có thời hạn hoặc mức độ: bệnh, bị thương, nhiễm độc, kiệt sức...
- Trait từ định nghĩa nhân vật: người lớn, trẻ em, khỏe, thông minh...

`state` là trạng thái loại trừ nhau. `conditions` là các tình trạng có thể tồn tại đồng thời. Không biểu diễn mọi thứ bằng một mảng string vì có thể tạo state bất hợp lệ, ví dụ vừa chết vừa đi thám hiểm.

### 2.3. Vật phẩm và tài nguyên

- Vật phẩm có định nghĩa bất biến theo content version.
- Trong một ván, vật phẩm có hai condition tối thiểu: `intact` và `broken`.
- Vật phẩm có thể stack hoặc tồn tại theo instance nếu sau này có durability riêng.
- Item ẩn là nội dung chưa lộ thông tin; item khóa là nội dung người chơi chưa đủ điều kiện sử dụng/xuất hiện.
- Food và water có thể là resource counter. Các đồ có hành vi riêng nên là item.

### 2.4. Event

Event gồm bốn phần độc lập:

1. **Trigger:** khi nào event được xét.
2. **Requirements:** ván/tài khoản phải thỏa điều kiện gì.
3. **Choices:** người chơi được chọn gì và choice nào đang khả dụng.
4. **Effects:** thay đổi được server áp dụng sau lựa chọn.

Với choice dùng item, ba ý nghĩa phải tách riêng:

- **Item requirement:** item chỉ là điều kiện để choice khả dụng; không tự động mất item.
- **Item presentation:** UI biết choice này đại diện cho item nào để render item card, condition và số lượng cần.
- **Item effect:** `remove_item`, `break_item` hoặc effect khác mới quyết định item có bị tiêu hao/hỏng hay không.

Vì vậy “dùng radio để nghe tín hiệu và nhận bản đồ” có thể giữ nguyên radio rồi `add_item` bản đồ; “đưa một chai nước” dùng `remove_item`; còn “dùng rìu phá cửa” chạy đúng branch của rìu mà admin đã setup. Branch là deterministic mặc định. Chỉ branch khai báo `resolution.mode: "weighted"` mới dùng RNG, ví dụ 50% rìu bị mất và 50% rìu được giữ. Server luôn revalidate requirement tại lúc submit, không tin trạng thái item mà client hiển thị.

Mọi event đã được đưa vào hàng chờ đều phải được resolve trước khi sang ngày; domain và UI không chia event thành “bắt buộc” hay “tùy chọn”. “Bỏ qua”, “Giữ im lặng” hoặc “Không dùng vật phẩm” là một choice hợp lệ có outcome riêng, không phải bỏ qua việc xử lý event.

Mỗi ngày tạo từ một đến ba event và không bao giờ đưa event thứ tư vào hàng chờ. Phân bố khởi điểm đề xuất là 65% ngày có một event, 30% có hai event và 5% có ba event; difficulty hoặc phase của ván có thể thay đổi phân bố này. Event cố định/chained/đã lên lịch được xếp trước, sau đó event random mới lấp các slot còn lại. Nếu chained event làm vượt giới hạn, engine hoãn nó sang ngày kế tiếp hoặc loại một event random chưa công bố; UI không tự cắt một event đã tồn tại trong runtime state.

Mỗi event phải có đường thoát hợp lệ. Interaction `choices` dùng một choice `fallbackOnly` hoặc một choice không requirement như “Bỏ qua”. Interaction `item_selection` luôn có `noItemBranch` như “Không dùng vật phẩm” hoặc “Không thể làm gì”. Nhánh này vẫn resolve event và áp dụng hậu quả/queue nhánh tiếp theo; không để `currentEvent` khóa ván vô hạn chỉ vì người chơi không có item.

UI contract cho item choice:

- Choice dùng item đã biết nên hiện item, condition, số lượng cần và trạng thái khả dụng; item/content ẩn chưa discover thì không được spoil bằng choice disabled.
- Choice không đủ item có thể disabled kèm lý do “Cần 1 rìu còn tốt”; fallback chỉ hiện theo rule của engine.
- Trước khi resolve, UI chỉ hiện hành động người chơi có thể thực hiện cùng item và số lượng cần để choice khả dụng. Không hiện item sẽ bị giữ, tiêu hao hay hỏng.
- Mô tả choice phải trung tính và chỉ mô tả hành động trực tiếp; không gợi ý phần thưởng, tổn thất, xác suất hoặc diễn biến tiếp theo.
- UI dùng confirmation chung cho lựa chọn. Server vẫn revalidate requirement sau confirmation vì state có thể đã đổi ở tab khác.
- Chỉ hiển thị outcome và effects sau khi server đã resolve. Không preview cả kết quả deterministic lẫn weighted result/nhánh ẩn.

Các mode trigger ban đầu:

| Mode | Ý nghĩa |
| --- | --- |
| `fixed_day` | Luôn được xét ở một ngày cố định |
| `scheduled` | Đã được event/gameplay trước đưa vào hàng đợi |
| `chained` | Chỉ xuất hiện sau một nhánh hoặc event cụ thể |
| `random` | Được chọn từ pool hợp lệ theo trọng số |
| `location_pool` | Chỉ được event pool của một địa điểm chọn |
| `manual` | Chỉ hệ thống/admin gọi trực tiếp |

Độ hiếm gồm bốn cấp `common` (Thường), `uncommon` (Ít gặp), `rare` (Hiếm) và `ultra_rare` (Cực hiếm). Rarity là nhãn về tần suất xuất hiện, không cam kết phần thưởng hoặc mức nguy hiểm. Xác suất thực tế vẫn dùng `weight` sau khi engine đã lọc requirements, cooldown, giới hạn số lần và nhóm loại trừ.

UI luôn hiện tên rarity bằng text, không chỉ dựa vào màu. Queue card dùng badge nhỏ; event đang mở đặt rarity cạnh category. Layout và choice card không đổi theo rarity, chỉ event shell, badge, icon và accent thay đổi có kiểm soát: xám cho Thường, xanh sky cho Ít gặp, tím violet cho Hiếm và vàng amber cho Cực hiếm. Hiếm/Cực hiếm có thể có glow hoặc entrance motion nhẹ nhưng không dùng animation lặp gây nhiễu, và màu rarity không được áp lên từng choice vì có thể ám chỉ outcome.

### 2.5. Thám hiểm, địa điểm và nhật ký hành trình

Thám hiểm là subsystem nhiều ngày được server tự resolve trong khi nhân vật ở bên ngoài. Người chơi chỉ phái một nhân vật đi và chuẩn bị hành trang; không chọn trước địa điểm. Route, địa điểm và location event được server xác định trong lúc chuyến đi diễn ra. Người chơi được xem lại người đi và hành trang ban đầu nhưng không nhận chỉ số hiện tại, vị trí hiện tại, carried inventory còn lại hay event theo thời gian thực. Toàn bộ diễn biến chỉ được công bố khi nhân vật trở về hoặc khi một event khác xác nhận số phận của họ.

Cần phân biệt ba khái niệm:

- **Location definition:** nội dung địa điểm bất biến theo content version, ví dụ khu dân cư phía đông hoặc kho hàng số 4.
- **Run discovery:** địa điểm đã được nghe nói tới, mở khóa hoặc ghé thăm trong một ván cụ thể.
- **Expedition journal:** chuỗi event thực tế một nhân vật đã gặp trong một chuyến đi cụ thể.

Mỗi địa điểm có một pool tham chiếu đến nhiều location event; không tạo thêm content type “expedition event”. Pool có thể weighted-random event nào xảy ra, nhưng event đã được chọn sẽ chạy kịch bản deterministic do admin setup. Random bên trong event chỉ xảy ra ở đúng item branch/result đã khai báo `weighted`.

Với event xảy ra khi nhân vật đang ở ngoài, server match carried item vào `itemBranches` theo `priority` do admin cấu hình; không random chọn một item để dùng. Nếu không có item branch nào match thì chạy `noItemBranch`. Nhật ký phải ghi event key, item branch đã match, resolution/result thực tế và effect diff để giải thích mọi thay đổi.

Hành trang là một quyết định chiến lược trước chuyến đi, không phải danh sách gợi ý đồ “đúng”. Việc sở hữu đúng vật phẩm trong một location event có thể mở cách xử lý an toàn hơn, ngăn hoặc giảm tổn thất, bảo toàn nhân vật/vật phẩm, mở thêm loot hoặc giúp thoát khỏi một tình huống nguy hiểm. Mang vật phẩm không tự động tiêu hao vật phẩm đó; chỉ effect của item branch đã resolve mới được giữ nguyên, tiêu hao, làm hỏng hoặc làm mất nó.

Contract khi chuẩn bị chuyến đi:

- Người chơi chọn một nhân vật ở `shelter` và số lượng vật phẩm cụ thể cho hành trang. UI không yêu cầu hoặc ngầm cho phép chọn địa điểm, vì đích đến là thông tin được resolve ngẫu nhiên trong chuyến đi.
- Toàn bộ số lượng đã chọn được chuyển atomically khỏi shelter inventory sang `carriedInventory`. UI phải phân biệt rõ “mang 1” với “có 4 trong kho”; checkbox theo item id không được ngầm hiểu là mang cả stack.
- Mỗi đơn vị vật phẩm chiếm một slot. Nhân vật người bố có `baseLoadoutSlots = 4`; người mẹ, con trai và con gái có `baseLoadoutSlots = 3`. Capacity hiệu lực lúc xuất phát được tính bằng `max(0, baseLoadoutSlots - floor((100 - health) / 25))`, với `health` được clamp trong khoảng 0–100. Ví dụ người bố có 78 sức khỏe vẫn mang được 4 món, xuống 75 còn 3; nhân vật base 3 ở 75 sức khỏe còn 2 slot.
- Capacity được snapshot khi server chấp nhận lệnh xuất phát. Sức khỏe tụt trong lúc đang ở ngoài không tự làm rơi vật phẩm hoặc giảm hồi tố số slot của chuyến đang chạy; chỉ event effect cụ thể mới có thể làm mất/hỏng đồ. Capacity mới được tính lại cho chuyến kế tiếp.
- Trước khi xuất phát, UI không liệt kê địa điểm có thể roll, event, item branch, kết quả, tỷ lệ hay cam kết loot. UI chỉ được hiện công dụng khái quát của vật phẩm, số lượng đang mang/còn trong kho, slot capacity và hậu quả chắc chắn là vật phẩm tạm rời kho.
- Không đánh dấu vật phẩm là “khuyên dùng” bằng logic biết trước event sắp roll. Người chơi tự suy luận từ lịch sử các chuyến trước và mô tả công dụng. Nếu sau này có hệ thống scout/intel, chỉ dữ liệu đã được gameplay mở khóa mới được dùng làm gợi ý.
- Confirmation cuối phải tóm tắt người đi, tình trạng hiện tại, hành trang và dung lượng đã dùng. Server revalidate character, inventory quantity và capacity trong cùng mutation trước khi tạo expedition.

UI contract cho tab Thám hiểm:

- Thứ tự quyết định là **Người đi → Hành trang → Xác nhận**. Có thể cùng nằm trên một màn hình; không gắn “Bước 1/2” nếu giao diện không khóa tuyến tính và người chơi có thể đổi qua lại.
- Row nhân vật không dùng một điểm “Thể trạng” trung bình vì có thể che mất một chỉ số đang nguy cấp. Hiện bốn chỉ số ở dạng số compact cùng condition hiện tại; chỉ số dưới ngưỡng cảnh báo dùng đỏ. Role/trait chỉ xuất hiện nếu thật sự tác động tới event hoặc khả năng mang đồ và có mô tả cơ chế đọc được.
- Khu hành trang render đúng số slot hiệu lực của nhân vật đã chọn. Slot trống là button “Chọn vật phẩm”; khi bấm mở popover/menu gồm icon, tên, công dụng khái quát và số còn khả dụng trong kho. Một lần chọn gán đúng một đơn vị vào slot; cùng item được phép xuất hiện ở nhiều slot nếu quantity còn đủ. Slot đã có đồ cho phép thay hoặc bỏ món.
- Header hành trang luôn hiện `đã dùng / capacity`. Nếu sức khỏe làm giảm capacity, UI giải thích ngắn ngay tại đây, ví dụ `3/4 ô · -1 do sức khỏe`, thay vì buộc người chơi tự nhớ công thức.
- Khi đổi sang nhân vật có capacity thấp hơn số đồ đang chọn, không âm thầm xóa đồ. Giữ các lựa chọn ở trạng thái overflow và yêu cầu người chơi bỏ bớt trước khi xuất phát.
- Thanh xác nhận nên bám cuối viewport khi danh sách dài và chỉ giữ summary ngắn cùng CTA. CTA disabled phải có lý do đọc được, ví dụ “Chọn người đi” hoặc “Bỏ bớt hành trang”, thay vì chỉ đổi màu xám.
- Khi đã có active expedition, card trạng thái được tách khỏi form chuẩn bị. Nó được phép nhắc lại kế hoạch ban đầu nhưng không hiển thị dữ liệu runtime ẩn; nếu game chỉ cho một chuyến active thì thay form bằng trạng thái và điều kiện có thể cử chuyến tiếp theo.

Khi nhân vật trở về:

1. Server áp dụng loot, tổn thất, location discovery và trạng thái nhân vật trước khi trả snapshot mới.
2. Tab Hành trình chỉ là read model để kể lại kết quả; việc đọc tab không kích hoạt effect.
3. Báo cáo tồn tại trong ngày trở về, sau đó được archive vào lịch sử thám hiểm.
4. Chỉ log đã được công bố mới được gửi cho client; active expedition không được làm lộ journal entries.

### 2.6. Ending

Ending có loại `good`, `bad`, `neutral`, `secret` hoặc `joke`. Ending có thể:

- Được effect `trigger_ending` gọi trực tiếp.
- Được ending engine phát hiện khi state thỏa rules.

Nếu nhiều ending cùng hợp lệ, ending có `priority` cao nhất thắng. Một ván chỉ được chốt một ending và không được xử lý choice tiếp sau khi đã hoàn thành.

### 2.7. Achievement và meta progression

Achievement có ba độ khó: `easy`, `medium`, `hard`; có thể ẩn và có progress counter. Reward có thể mở item, event hoặc nội dung tài khoản.

Cần phân biệt:

- **Run unlock:** chỉ tồn tại trong ván hiện tại.
- **Account unlock:** tồn tại qua mọi ván của người chơi.
- **Discovery:** người chơi đã nhìn thấy nội dung, không đồng nghĩa với đã unlock để sử dụng.

Với location, `game_runs.locations` quyết định nơi nào khả dụng trong ván hiện tại; `player_profiles.discoveredLocationKeys` chỉ phục vụ codex/thống kê “đã từng thấy”, không tự động mở location đó ở ván mới.

Tỷ lệ đạt achievement dùng số người đã bắt đầu ít nhất một ván làm mẫu số. Không đếm trực tiếp toàn bộ collection mỗi lần render; dùng số liệu tổng hợp cập nhật nền.

## 3. Kiến trúc kỹ thuật

### 3.1. Stack

| Lớp | Công nghệ | Vai trò |
| --- | --- | --- |
| Web | Next.js App Router, React, TypeScript | Routing, Server Components, API và UI |
| UI | Tailwind CSS, shadcn/ui, Lucide React | Design system và component nền |
| Animation | Motion | Transition và phản hồi gameplay |
| Client state | Zustand | UI state tạm thời; không phải nguồn sự thật gameplay |
| Database | MongoDB, Mongoose | Content, account, run snapshot và log |
| Validation | Zod | Validate request và contract rule/effect |
| Form | React Hook Form | Form gameplay và admin CMS |
| Auth | Auth.js, bcryptjs | Session, đăng nhập credentials và phân quyền |
| Random | seedrandom | RNG tất định theo seed của ván |

### 3.2. Server authoritative

Database/server là nguồn sự thật duy nhất. Client chỉ gửi intent như `chooseChoice`, `advanceDay` hoặc `assignResource`. Client không được gửi state kết quả kiểu “cộng 5 nước” hay “nhân vật mất 20 máu”.

Zustand chỉ lưu state trình bày: panel đang mở, animation queue, selection chưa submit và optimistic UI có thể hủy. Sau mutation, client đồng bộ lại snapshot từ server.

### 3.3. Ranh giới module đề xuất

```text
src/
├── app/                 # route, layout, route handler
├── components/
│   ├── ui/              # shadcn primitives
│   ├── game/            # character, inventory, event UI
│   └── admin/           # CMS UI
├── features/
│   ├── auth/
│   ├── game/
│   ├── achievements/
│   └── content/
├── lib/
│   ├── db/              # connection, model registration
│   ├── game-engine/     # rules, effects, RNG, ending checks
│   ├── validation/      # Zod schemas
│   └── auth/
└── types/               # contract dùng chung thật sự
```

Logic game engine phải là hàm thuần khi có thể: nhận snapshot + command + RNG state, trả về snapshot mới + domain events. Việc ghi MongoDB nằm ở application/service layer, không nằm trong rule evaluator.

## 4. Mô hình dữ liệu tổng thể

Database chia thành bốn nhóm:

```text
CONTENT (versioned)       ACCOUNT / META
content_versions          users
character_definitions     player_profiles
item_definitions          user_achievements
location_definitions      global_stats
event_definitions
ending_definitions
achievement_definitions
          \                 /
           \               /
            GAME RUNTIME
            game_runs
            run_expeditions
            run_event_logs
            admin_audit_logs
```

Quy tắc embed/reference:

- Embed dữ liệu nhỏ, có vòng đời cùng document và luôn đọc cùng nhau: bốn character states, inventory snapshot, flags, queue ngắn.
- Reference dữ liệu có vòng đời riêng, tăng không giới hạn hoặc cần truy vấn độc lập: content definitions, event logs, achievements.
- Mọi reference từ runtime đến content dùng `key` ổn định kết hợp `contentVersionId`. `_id` chỉ là identity lưu trữ.

## 5. Content versioning

### 5.1. `content_versions`

```ts
interface ContentVersion {
  _id: ObjectId;
  version: string; // SemVer, ví dụ 1.0.0
  status: "draft" | "published" | "archived";
  changelog: string;
  createdBy: ObjectId;
  createdAt: Date;
  publishedAt?: Date;
}
```

Invariant:

- Chỉ có một version `published` đang được dùng để tạo ván mới.
- Content đã publish là immutable.
- Admin sửa nội dung bằng cách tạo/cloning draft mới.
- `game_runs.contentVersionId` không đổi trong suốt ván.
- Không hard-delete content đã từng publish; chỉ archive/disable.

## 6. Account collections

### 6.1. `users`

```ts
interface User {
  _id: ObjectId;
  email: string;
  username: string;
  passwordHash?: string;
  role: "player" | "admin";
  status: "active" | "banned";
  emailVerifiedAt?: Date;
  lastLoginAt?: Date;
  createdAt: Date;
  updatedAt: Date;
}
```

Indexes:

```ts
{ email: 1 }    // unique, normalized lowercase
{ username: 1 } // unique, normalized key riêng nếu cần giữ display name
```

Không đưa `passwordHash`, role mutation hoặc thông tin nhạy cảm vào client payload. Admin authorization phải được kiểm tra trong server action/route handler, không chỉ ẩn nút ở UI.

### 6.2. `player_profiles`

```ts
interface PlayerProfile {
  _id: ObjectId;
  userId: ObjectId;
  activeRunId?: ObjectId;
  unlockedItemKeys: string[];
  unlockedEventKeys: string[];
  discoveredItemKeys: string[];
  discoveredEventKeys: string[];
  discoveredLocationKeys: string[];
  discoveredEndingKeys: string[];
  statistics: {
    totalRuns: number;
    completedRuns: number;
    maxSurvivedDays: number;
    totalSurvivedDays: number;
    characterDeaths: number;
    eventsEncountered: number;
  };
  createdAt: Date;
  updatedAt: Date;
}
```

`userId` là unique. Các mảng meta nhỏ có thể embed; nếu catalog tăng đến hàng chục nghìn mục thì tách collection unlock riêng.

### 6.3. `user_achievements`

```ts
interface UserAchievement {
  _id: ObjectId;
  userId: ObjectId;
  achievementKey: string;
  progress: number;
  completed: boolean;
  unlockedAt?: Date;
  sourceRunId?: ObjectId;
  updatedAt: Date;
}
```

Unique index `{ userId: 1, achievementKey: 1 }` đảm bảo một achievement không được cấp hai lần. Update progress dùng atomic update hoặc transaction khi đồng thời cấp reward.

## 7. Content definition collections

Mọi definition có các field chung:

```ts
interface VersionedDefinition {
  _id: ObjectId;
  contentVersionId: ObjectId;
  key: string;        // machine key ổn định, lowercase snake_case
  enabled: boolean;
  createdBy: ObjectId;
  createdAt: Date;
  updatedAt: Date;
}
```

Unique index chung: `{ contentVersionId: 1, key: 1 }`.

### 7.1. `character_definitions`

```ts
interface CharacterDefinition extends VersionedDefinition {
  name: string;
  description: string;
  avatarUrl: string;
  baseStats: {
    health: number;
    hunger: number;
    thirst: number;
    sanity: number;
  };
  traits: string[];
}
```

Definition không chứa trạng thái thay đổi trong ván.

### 7.2. `item_definitions`

```ts
interface ItemDefinition extends VersionedDefinition {
  name: string;
  description: string;
  iconUrl: string;
  category: "food" | "water" | "tool" | "medical" | "weapon" | "quest";
  stackable: boolean;
  maxStack?: number;
  canBreak: boolean;
  hidden: boolean;
  tags: string[];
  accountUnlockRule?: Rule;
}
```

Không dùng `name` để liên kết. Tên có thể dịch hoặc đổi; `key` phải ổn định.

### 7.3. `location_definitions`

Location là content definition, không phải trạng thái người chơi đã khám phá. Một location chỉ giữ reference đến event pool; không embed bản sao đầy đủ của event.

```text
location_definitions.eventPool[].eventKey ──→ event_definitions.key
game_runs.locations[].locationKey          ──→ location_definitions.key
run_expeditions.journalEntries[]           ──→ locationKey + eventKey + itemBranchKey + resultKey
```

```ts
interface LocationDefinition extends VersionedDefinition {
  name: string;
  description: string;
  iconUrl?: string;
  mapPosition?: { x: number; y: number };
  hidden: boolean;
  dangerLevel: "low" | "medium" | "high" | "extreme";
  travelDays: { min: number; max: number };
  tags: string[];
  discoveryRequirements?: Rule;
  eventPool: Array<{
    eventKey: string;
    weight: number;
    requirements?: Rule;
    maxOccurrencesPerExpedition?: number;
  }>;
}
```

Indexes ngoài unique index chung:

```ts
{ contentVersionId: 1, enabled: 1, hidden: 1 }
{ contentVersionId: 1, tags: 1 }
```

Invariant:

- `eventPool.eventKey` phải trỏ đến event `category: "location"` trong cùng content version.
- Một event có thể được nhiều location tham chiếu; `weight` nằm tại pool vì cùng event có thể hiếm ở nơi này nhưng phổ biến ở nơi khác.
- Với trigger `location_pool`, `eventPool[].weight` là trọng số hiệu lực; `event_definitions.weight` chỉ dùng cho pool random toàn cục ngoài location.
- Location chưa được discover không được chọn làm đích đến trực tiếp, trừ effect/event có chủ ý đưa nhân vật tới đó.
- Location definition không lưu `visited`, `discoveredAt` hoặc loot đã lấy; đó là runtime state của từng ván.

### 7.4. `event_definitions`

```ts
interface EventDefinition extends VersionedDefinition {
  name: string;
  description: string;
  imageUrl?: string;
  category: "story" | "daily" | "location" | "special";
  rarity: "common" | "uncommon" | "rare" | "ultra_rare";
  weight: number;
  hidden: boolean;
  tags: string[];
  trigger: EventTrigger;
  requirements?: Rule;
  exclusionEventKeys: string[];
  mutexGroup?: string;
  interaction: EventInteraction;
}

interface EventTrigger {
  mode: "random" | "fixed_day" | "scheduled" | "chained" | "location_pool" | "manual";
  fixedDay?: number;
  minDay?: number;
  maxDay?: number;
  maxOccurrences?: number;
  cooldownDays?: number;
}

type EventInteraction =
  | {
      mode: "choices";
      choices: EventChoice[];
    }
  | {
      mode: "item_selection";
      source: "player" | "carried_inventory";
      itemBranches: ItemEventBranch[];
      noItemBranch: {
        label: string;
        description?: string;
        availability: "fallback_only" | "always";
        resolution: EventResolution;
      };
    }
  | {
      mode: "scripted";
      resolution: EventResolution;
    };

interface EventChoice {
  key: string;
  label: string;
  description?: string;
  requirements?: Rule;
  fallbackOnly?: boolean;
  resolution: EventResolution;
}

interface ItemEventBranch {
  key: string;
  itemKey: string;
  condition?: ItemCondition;
  quantity: number;
  priority?: number;
  requirements?: Rule;
  resolution: EventResolution;
}

type EventResolution =
  | {
      mode: "deterministic";
      title: string;
      description: string;
      effects: Effect[];
    }
  | {
      mode: "weighted";
      outcomes: WeightedResult[];
    };

interface WeightedResult {
  key: string;
  weight: number;
  title: string;
  description: string;
  requirements?: Rule;
  effects: Effect[];
}
```

Quy ước độ hiếm chỉ gồm bốn mức: `common`, `uncommon`, `rare` và `ultra_rare`. `hidden` là thuộc tính độc lập, không phải một mức rarity: một event ẩn vẫn có thể có bất kỳ độ hiếm nào. Khi event đã được đưa vào hàng chờ, UI hiện rarity để tạo cảm giác khám phá nhưng không preview outcome; rarity cũng phục vụ admin, cân bằng nội dung và analytics.

`deterministic` là mặc định và chạy đúng effects admin đã setup. `weighted` là opt-in cục bộ; chỉ resolution đó mới dùng RNG. Không có bước random outcome toàn cục sau mọi choice.

Với `item_selection`, item được chọn phải có `itemKey` trong `itemBranches`. `source: "player"` nhận lựa chọn trực tiếp từ UI; `source: "carried_inventory"` dùng cho location event và chọn branch hợp lệ có `priority` cao nhất. Nếu không branch nào match, engine dùng `noItemBranch`; `availability: "always"` cho phép người chơi chủ động không dùng item, còn `fallback_only` chỉ xuất hiện khi không item nào hợp lệ.

`ItemEventBranch` không tự tiêu hao item. `has_item`/branch fields kiểm tra item và giúp UI trình bày; `remove_item` hoặc `break_item` trong resolution mới thay đổi inventory. Một branch deterministic có thể giữ nguyên item và cấp item khác. Một branch weighted có thể cấu hình 50/50, trong đó chỉ một result chứa `remove_item`.

Quy trình resolve player choice:

1. Server đọc `interaction` và lọc choice/item branch theo visibility, requirements, condition và quantity trên revision hiện tại.
2. Nếu không branch nào hợp lệ, server trả fallback/no-item branch; content ẩn không được biến thành thông tin spoil.
3. Khi client gửi `choiceKey` hoặc `selectedItemKey`, server kiểm tra key có đúng trong definition hiện tại rồi revalidate toàn bộ state.
4. Nếu resolution là `deterministic`, áp dụng đúng effects đã setup. Chỉ khi mode là `weighted`, lọc result hợp lệ rồi seeded-random đúng một result.
5. Append log gồm choice/item branch, resolution mode, result nếu có, before/after và commandId trong cùng transaction.
6. Resolve current event, queue nhánh sau nếu có và trả snapshot/revision mới.

Ví dụ rút gọn cho kho hàng số 4:

```json
{
  "locationKey": "warehouse_04",
  "eventPool": [
    { "eventKey": "search_abandoned_crates", "weight": 60 },
    { "eventKey": "meet_injured_survivor", "weight": 25 },
    { "eventKey": "mutant_ambush", "weight": 3 },
    { "eventKey": "fatal_floor_collapse", "weight": 1 }
  ]
}
```

```json
{
  "eventKey": "fatal_floor_collapse",
  "category": "location",
  "trigger": { "mode": "location_pool" },
  "interaction": {
    "mode": "scripted",
    "resolution": {
      "mode": "deterministic",
      "title": "Sàn kho đổ sập",
      "description": "Nhân vật không thể thoát khỏi tầng hầm bị sập.",
      "effects": [
        { "type": "kill_character", "target": "journey_character", "cause": "warehouse_floor_collapse" }
      ]
    }
  }
}
```

Các weight trong location pool là trọng số tương đối sau khi lọc requirements, không phải phần trăm cố định. Event chết hiếm vì chính event đó có weight rất thấp; khi đã được chọn, kịch bản chết chạy deterministic. Chỉ dùng random result bên trong event nếu admin chủ động đặt resolution `weighted`.

#### Ví dụ choice rẽ nhánh theo item

Ví dụ rút gọn dưới đây minh họa bốn trường hợp trong cùng một event:

```json
{
  "key": "sealed_supply_room",
  "interaction": {
    "mode": "item_selection",
    "source": "player",
    "itemBranches": [
      {
        "key": "trade_water",
        "itemKey": "water",
        "condition": "intact",
        "quantity": 1,
        "resolution": {
          "mode": "deterministic",
          "title": "Cuộc trao đổi hoàn tất",
          "description": "Một chai nước được đổi lấy thuốc.",
          "effects": [
            { "type": "remove_item", "target": { "scope": "shelter" }, "itemKey": "water", "condition": "intact", "quantity": 1 },
            { "type": "add_item", "target": { "scope": "shelter" }, "itemKey": "medicine", "condition": "intact", "quantity": 1 }
          ]
        }
      },
      {
        "key": "use_radio",
        "itemKey": "radio",
        "condition": "intact",
        "quantity": 1,
        "resolution": {
          "mode": "deterministic",
          "title": "Mã khóa được giải",
          "description": "Radio vẫn nguyên vẹn và nhóm tìm thấy một bản đồ.",
          "effects": [
            { "type": "add_item", "target": { "scope": "shelter" }, "itemKey": "old_map", "condition": "intact", "quantity": 1 }
          ]
        }
      },
      {
        "key": "force_with_axe",
        "itemKey": "axe",
        "condition": "intact",
        "quantity": 1,
        "resolution": {
          "mode": "weighted",
          "outcomes": [
            {
              "key": "axe_kept",
              "weight": 50,
              "title": "Mở khóa thành công",
              "description": "Chiếc rìu vẫn còn nguyên.",
              "effects": [
                { "type": "add_item", "target": { "scope": "shelter" }, "itemKey": "canned_food", "condition": "intact", "quantity": 2 }
              ]
            },
            {
              "key": "axe_lost",
              "weight": 50,
              "title": "Chiếc rìu mắc kẹt",
              "description": "Nhóm mở được cửa nhưng không thể lấy chiếc rìu ra.",
              "effects": [
                { "type": "remove_item", "target": { "scope": "shelter" }, "itemKey": "axe", "condition": "intact", "quantity": 1 },
                { "type": "add_item", "target": { "scope": "shelter" }, "itemKey": "canned_food", "condition": "intact", "quantity": 2 }
              ]
            }
          ]
        }
      }
    ],
    "noItemBranch": {
      "label": "Không dùng vật phẩm",
      "availability": "fallback_only",
      "resolution": {
        "mode": "deterministic",
        "title": "Căn phòng vẫn bị khóa",
        "description": "Nhóm đánh dấu lại cánh cửa để thử lần khác.",
        "effects": [
          { "type": "queue_event", "eventKey": "supply_room_second_chance", "delayDays": 2 }
        ]
      }
    }
  }
}
```

Ý nghĩa:

- `itemBranches` chính là allowlist item của event; item id không có trong mảng bị server từ chối.
- `trade_water` deterministic: luôn mất một nước và nhận một thuốc.
- `use_radio` deterministic: luôn giữ radio và nhận bản đồ vì script không có `remove_item`/`break_item`.
- Chỉ `force_with_axe` dùng random 50/50 vì riêng branch đó khai báo `weighted`; một result giữ rìu, result còn lại mất rìu.
- `noItemBranch` chạy deterministic khi không item nào match, resolve event rồi queue cơ hội khác thay vì khóa ngày.
- Nếu muốn người chơi luôn có quyền “Không dùng item” dù đang sở hữu item, đặt `noItemBranch.availability: "always"`.

### 7.5. `ending_definitions`

```ts
interface EndingDefinition extends VersionedDefinition {
  name: string;
  description: string;
  imageUrl?: string;
  type: "good" | "bad" | "neutral" | "secret" | "joke";
  priority: number;
  hidden: boolean;
  requirements?: Rule;
}
```

### 7.6. `achievement_definitions`

```ts
interface AchievementDefinition extends VersionedDefinition {
  name: string;
  description: string;
  iconUrl?: string;
  difficulty: "easy" | "medium" | "hard";
  hidden: boolean;
  progressType: "binary" | "counter" | "best_value";
  target: number;
  requirements: Rule;
  rewards: Effect[];
}
```

## 8. Rule DSL

Rule được lưu dưới dạng dữ liệu, không lưu hoặc thực thi JavaScript từ database.

```ts
type Rule =
  | { all: Rule[] }
  | { any: Rule[] }
  | { not: Rule }
  | { type: "day_gte"; value: number }
  | { type: "day_lte"; value: number }
  | { type: "has_item"; itemKey: string; condition?: ItemCondition; quantity: number; scope?: "shelter" | "carried_inventory" }
  | { type: "flag_equals"; key: string; value: boolean | number | string }
  | { type: "counter_gte"; key: string; value: number }
  | { type: "event_completed"; eventKey: string }
  | { type: "event_choice_made"; eventKey: string; choiceKey: string }
  | { type: "achievement_unlocked"; achievementKey: string }
  | { type: "location_discovered"; locationKey: string }
  | { type: "location_visited"; locationKey: string; minVisits?: number }
  | { type: "current_location"; locationKey: string }
  | { type: "expedition_day_gte"; value: number }
  | { type: "character_state"; characterKey: string; state: CharacterState }
  | { type: "alive_count_gte"; value: number };
```

Ví dụ:

```json
{
  "all": [
    { "type": "day_gte", "value": 10 },
    { "type": "has_item", "itemKey": "radio", "condition": "intact", "quantity": 1 },
    {
      "any": [
        { "type": "character_state", "characterKey": "father", "state": "shelter" },
        { "type": "character_state", "characterKey": "daughter", "state": "shelter" }
      ]
    }
  ]
}
```

Rule được validate bằng discriminated union Zod ở biên admin API và một lần nữa khi publish content version.

## 9. Effect DSL

```ts
type Effect =
  | { type: "add_item"; target: InventoryTarget; itemKey: string; condition: ItemCondition; quantity: number }
  | { type: "remove_item"; target: InventoryTarget; itemKey: string; condition: ItemCondition; quantity: number }
  | { type: "break_item"; target: InventoryTarget; itemKey: string; quantity: number }
  | { type: "repair_item"; target: InventoryTarget; itemKey: string; quantity: number }
  | { type: "modify_character_stat"; target: CharacterTarget; stat: CharacterStat; amount: number }
  | { type: "add_condition"; target: CharacterTarget; condition: string; severity?: number; days?: number }
  | { type: "remove_condition"; target: CharacterTarget; condition: string }
  | { type: "change_character_state"; target: CharacterTarget; state: CharacterState }
  | { type: "kill_character"; target: CharacterTarget; cause: string }
  | { type: "set_flag"; key: string; value: boolean | number | string }
  | { type: "increment_counter"; key: string; amount: number }
  | { type: "queue_event"; eventKey: string; delayDays: number }
  | { type: "cancel_queued_event"; eventKey: string }
  | { type: "unlock_event_in_run"; eventKey: string }
  | { type: "unlock_event_for_account"; eventKey: string }
  | { type: "unlock_item_for_account"; itemKey: string }
  | { type: "discover_location"; locationKey: string }
  | { type: "mark_location_depleted"; locationKey: string; days?: number }
  | { type: "force_expedition_return"; reason: string }
  | { type: "grant_achievement"; achievementKey: string }
  | { type: "trigger_ending"; endingKey: string };

type InventoryTarget =
  | { scope: "shelter" }
  | { scope: "carried_inventory" };
```

Location event effect tác động vào `carried_inventory` của chuyến đi, không cộng thẳng vào kho hầm. Chỉ khi nhân vật trở về, server mới chuyển item còn lại sang shelter inventory trong cùng transaction. Journal entry được engine tạo từ scripted resolution + applied effects; content không có effect tùy ý để tự ghi log giả.

Mỗi effect handler phải:

- Validate target và precondition trên snapshot server.
- Trả về thay đổi cụ thể để ghi audit log.
- Không tạo side effect ngoài transaction một cách âm thầm.
- Có test cho happy path, invalid state và boundary value.

## 10. Runtime collections

### 10.1. `game_runs`

`game_runs` giữ snapshot hiện tại để load game bằng một lần đọc chính.

```ts
type CharacterState = "shelter" | "expedition" | "missing" | "dead" | "insane";
type ItemCondition = "intact" | "broken";

interface GameRun {
  _id: ObjectId;
  userId: ObjectId;
  contentVersionId: ObjectId;
  status: "active" | "completed" | "abandoned";
  mode: "normal" | "daily_challenge";
  day: number;
  revision: number;
  random: {
    seed: string;
    cursor: number;
  };
  characters: Array<{
    characterKey: string;
    stats: {
      health: number;
      hunger: number;
      thirst: number;
      sanity: number;
    };
    state: CharacterState;
    conditions: Array<{
      type: string;
      severity?: number;
      remainingDays?: number;
      sourceEventKey?: string;
    }>;
    expedition?: {
      expeditionId: string;
      expectedReturnDay?: number;
    };
    death?: {
      day: number;
      cause: string;
      expeditionId?: string;
      locationKey?: string;
      eventKey?: string;
      itemBranchKey?: string;
      resultKey?: string;
    };
  }>;
  inventory: Array<{
    itemKey: string;
    intactQuantity: number;
    brokenQuantity: number;
    discovered: boolean;
  }>;
  resources: {
    food: number;
    water: number;
  };
  locations: Array<{
    locationKey: string;
    status: "rumored" | "discovered" | "visited" | "depleted";
    discoveredDay: number;
    discoveredByCharacterKey?: string;
    sourceExpeditionId?: string;
    visitedCount: number;
    lastVisitedDay?: number;
    depletedUntilDay?: number;
  }>;
  expeditionState: {
    activeExpeditionIds: string[];
    unreadReturnReportIds: string[];
  };
  flags: Record<string, boolean | number | string>;
  counters: Record<string, number>;
  unlockedEventKeys: string[];
  discoveredItemKeys: string[];
  eventState: {
    occurredCounts: Record<string, number>;
    lastOccurredDay: Record<string, number>;
    completedEventKeys: string[];
    blockedEventKeys: string[];
    queuedEvents: Array<{
      eventKey: string;
      scheduledDay: number;
      sourceEventKey?: string;
    }>;
    currentEvent?: {
      eventKey: string;
      generatedAt: Date;
    };
  };
  ending?: {
    endingKey: string;
    triggeredAtDay: number;
  };
  startedAt: Date;
  lastPlayedAt: Date;
  completedAt?: Date;
}
```

Indexes:

```ts
{ userId: 1, status: 1 }
{ userId: 1, lastPlayedAt: -1 }
{ status: 1, lastPlayedAt: 1 } // cleanup/analytics nếu cần
```

`revision` dùng optimistic concurrency. Mutation chỉ update khi revision client gửi trùng revision hiện tại, sau đó tăng revision. Request lặp hoặc tab thứ hai sẽ nhận conflict thay vì áp dụng effect hai lần.

`locations` chỉ chứa state nhỏ, có giới hạn theo catalog và cần đọc cùng snapshot. Không embed event pool hoặc toàn bộ journal vào `game_runs`. `rumored` nghĩa là biết tên/vị trí nhưng chưa thể chắc chắn khai thác; `discovered` đã mở làm đích đến; `visited` đã ghé ít nhất một lần; `depleted` tạm thời hoặc vĩnh viễn không còn pool loot bình thường.

### 10.2. `run_expeditions`

Mỗi chuyến thám hiểm có document riêng để active state không làm `game_runs` phình và báo cáo cũ có thể phân trang. Journal entry là player-facing snapshot của những gì đã thực sự xảy ra; content definition sau này đổi tên cũng không làm lịch sử cũ thay đổi.

```ts
interface RunExpedition {
  _id: ObjectId;
  runId: ObjectId;
  userId: ObjectId;
  contentVersionId: ObjectId;
  expeditionId: string;
  characterKey: string;
  loadoutSlotCapacity: number;
  status: "active" | "returned" | "missing" | "dead";
  departedDay: number;
  returnedDay?: number;
  currentExpeditionDay: number;
  currentLocationKey?: string;
  initialLoadout: ExpeditionInventoryEntry[];
  carriedInventory: ExpeditionInventoryEntry[];
  journalEntries: Array<{
    sequence: number;
    expeditionDay: number;
    runDay: number;
    locationKey: string;
    eventKey: string;
    itemBranchKey?: string;
    resolutionMode: "deterministic" | "weighted";
    resultKey?: string;
    title: string;
    text: string;
    reason?: string;
    appliedEffects: Array<{
      type: string;
      target?: string;
      before?: unknown;
      after?: unknown;
    }>;
  }>;
  summary?: {
    returnedItemDeltas: Array<{
      itemKey: string;
      condition: ItemCondition;
      quantity: number;
    }>;
    characterStatDeltas: Partial<Record<CharacterStat, number>>;
    brokenItemKeys: string[];
    discoveredLocationKeys: string[];
  };
  report: {
    visibility: "hidden" | "available" | "read" | "archived";
    availableAt?: Date;
    readAt?: Date;
    archivedAt?: Date;
  };
  createdAt: Date;
  updatedAt: Date;
}

interface ExpeditionInventoryEntry {
  itemKey: string;
  intactQuantity: number;
  brokenQuantity: number;
}
```

Indexes:

```ts
{ runId: 1, expeditionId: 1 } // unique
{ runId: 1, status: 1 }
{ runId: 1, "report.visibility": 1, returnedDay: -1 }
```

Invariant:

- Client load active expedition được nhận `characterKey`, `departedDay`, `loadoutSlotCapacity` và `initialLoadout` vì đây là kế hoạch người chơi đã biết; API phải project bỏ `currentLocationKey`, `carriedInventory`, `journalEntries` và mọi scripted result chưa công bố.
- Khi khởi hành, server phải kiểm tra nhân vật đang ở shelter, từng quantity còn trong kho và tổng loadout không vượt capacity tính từ health hiện tại; sau đó snapshot `loadoutSlotCapacity`, chuyển inventory và tạo expedition atomically.
- Vật phẩm chỉ rời `carriedInventory` khi một effect đã resolve làm tiêu hao, làm hỏng, đánh mất hoặc chuyển nó; việc match `itemBranch` tự nó không đồng nghĩa consumption.
- `summary` là read model được tính từ initial state + applied effects, không phải nguồn sự thật để áp dụng reward lần nữa.
- Khi trở về, chuyển carried inventory, update character/location state, append audit log và đổi report sang `available` trong cùng transaction.
- Nếu nhân vật chết bên ngoài, `status: "dead"` là state nội bộ; người trong hầm có thể vẫn thấy `missing` cho tới khi một event xác nhận và report được công bố.
- `journalEntries.sequence` tăng đơn điệu và unique trong một expedition.
- Game config phải đặt trần số ngày và số journal entry mỗi expedition; nếu thiết kế sau này cho hành trình không giới hạn thì tách entry sang collection riêng trước khi chạm giới hạn document MongoDB.

### 10.3. `run_event_logs`

History tăng không giới hạn nên không embed toàn bộ vào `game_runs`.

```ts
interface RunEventLog {
  _id: ObjectId;
  runId: ObjectId;
  userId: ObjectId;
  commandId?: string;
  sequence: number;
  day: number;
  action: "advance_day" | "event_choice" | "expedition" | "location_event" | "system";
  expeditionId?: string;
  locationKey?: string;
  eventKey?: string;
  choiceKey?: string;
  selectedItemKey?: string;
  itemBranchKey?: string;
  fallbackUsed?: boolean;
  resolutionMode?: "deterministic" | "weighted";
  resultKey?: string;
  randomRolls: Array<{
    purpose: string;
    value: number;
    result: string | number;
  }>;
  appliedEffects: Array<{
    type: string;
    target?: string;
    before?: unknown;
    after?: unknown;
  }>;
  stateHash: string;
  createdAt: Date;
}
```

Indexes:

```ts
{ runId: 1, sequence: 1 } // unique
{ runId: 1, commandId: 1 } // unique partial index khi commandId tồn tại
{ runId: 1, day: 1 }
{ runId: 1, expeditionId: 1, sequence: 1 }
```

`run_event_logs` là audit/domain log để replay và debug; `run_expeditions.journalEntries` là read model có narrative dành cho người chơi. Hai collection liên kết bằng `expeditionId`, `eventKey`, `itemBranchKey` và `resultKey`, nhưng không dùng journal text để tái áp dụng effect. Log hỗ trợ lịch sử UI, tái hiện bug, chống gian lận và analytics. Không lưu secret hoặc PII trong log.

## 11. Random engine

Không dùng `Math.random()` trong gameplay. Mỗi ván có `seed` và `cursor`.

Quy trình chọn random event:

1. Nạp content đúng `contentVersionId`.
2. Ưu tiên event queue đến hạn và fixed event chưa xử lý.
3. Lọc event random theo enabled, ngày, requirements, account unlock, cooldown, max occurrences và mutex.
4. Sắp xếp candidate theo `key` trước khi random để kết quả không phụ thuộc thứ tự MongoDB trả về.
5. Chọn weighted random bằng RNG của ván.
6. Ghi roll, candidate result và cursor mới vào transaction/log.

Quy trình resolve event tại một địa điểm trong chuyến đi:

1. Xác định location hiện tại/tiếp theo từ route và location state của ván.
2. Nạp `location.eventPool`, lọc event theo requirements, giới hạn số lần và carried inventory.
3. Sắp xếp candidate theo `eventKey`, weighted-random một location event bằng seed của ván.
4. Với `scripted`, chạy resolution đã setup. Với `item_selection`, match carried item branch theo priority; không có item thì chạy `noItemBranch`.
5. Resolution `deterministic` áp dụng thẳng effects. Chỉ resolution `weighted` mới random một `WeightedResult`.
6. Áp dụng effect vào journey snapshot/character/location state, sau đó tạo journal entry từ narrative snapshot và effect diff.
7. Chỉ ghi RNG roll với purpose `location_event` hoặc `weighted_result` khi bước tương ứng thực sự random.
8. Kiểm tra return, missing hoặc death nhưng không công bố dữ liệu cho client khi report còn `hidden`.

Pool phải có fallback “không có biến cố đáng kể” hoặc engine cho phép một ngày yên tĩnh. Không ép một event nguy hiểm xảy ra chỉ vì tất cả event thường đã hết lượt.

Seed cho phép debug, replay và daily challenge. Nó không phải cơ chế bảo mật; mọi roll vẫn chỉ thực hiện ở server.

## 12. Transaction và tính nhất quán

Các thao tác sau phải nằm trong MongoDB transaction khi cùng xảy ra:

- Update run snapshot.
- Update active expedition, carried inventory và location discovery.
- Append event log.
- Cấp achievement và account unlock.
- Cập nhật `activeRunId` khi tạo/kết thúc ván.

Command mutation nên nhận `commandId` duy nhất. Lưu commandId gần log hoặc trong collection idempotency nếu client có thể retry do mất mạng. Unique index ngăn cùng command chạy hai lần.

Các invariant bắt buộc:

- Quantity và resource không âm.
- Stat nằm trong khoảng chuẩn hóa, dự kiến `0..100`.
- Character chết không thể nhận action sống thông thường.
- Chỉ một `currentEvent` chưa giải quyết tại một thời điểm.
- Choice chỉ được chọn nếu thuộc current event và requirements đang còn hợp lệ.
- Item requirement được kiểm tra và item effect được áp dụng trong cùng transaction; không có khoảng trống để hai request cùng tiêu một item.
- `fallbackOnly` chỉ hợp lệ khi không còn normal choice nào thỏa requirements tại revision hiện tại.
- `selectedItemKey` phải khớp một entry trong `interaction.itemBranches`; client không được thay bằng item key tùy ý.
- Deterministic resolution phải chạy đúng một lần và không gọi RNG; weighted resolution chỉ chọn một result rồi áp dụng atomically.
- Bất kỳ effect nào trong scripted resolution thất bại phải rollback toàn bộ event mutation.
- Run `completed` không nhận gameplay mutation.
- Event vượt `maxOccurrences` không trở lại pool.
- Một nhân vật chỉ có tối đa một expedition `active`.
- `carriedInventory` và shelter inventory không được cùng sở hữu một item instance.
- Location runtime key phải tồn tại trong đúng `contentVersionId` của ván.
- Expedition report `hidden` không được xuất hiện trong client payload hoặc history API.
- Result gây chết phải đi qua `kill_character` và lưu cause/event/item branch/result cụ thể; không chỉ set health âm rồi bỏ qua log.

## 13. Achievement analytics

### `global_stats`

```ts
interface AchievementGlobalStat {
  _id: ObjectId;
  type: "achievement";
  key: string;
  eligiblePlayers: number;
  unlockedPlayers: number;
  unlockRate: number;
  updatedAt: Date;
}
```

`unlockRate` là số liệu denormalized để đọc nhanh. Source of truth vẫn là `user_achievements` và tập player đủ điều kiện. Job định kỳ reconcile counter để sửa sai lệch do retry hoặc lỗi tạm thời.

## 14. Admin CMS và audit

Admin cần CRUD cho draft content, preview rule/effect, validate graph và publish version. Content đã publish không sửa trực tiếp.

Trước khi publish phải kiểm tra:

- Key unique trong version.
- Mọi item/location/event/ending/achievement reference đều tồn tại.
- Mọi location event pool chỉ tham chiếu event `category: "location"` cùng version.
- Location pool không có weight âm, event key trùng hoặc reference vòng discovery không thể đạt được.
- Rule và effect đúng schema.
- `interaction.mode: "choices"` không có choices rỗng; `item_selection` phải có item branch và `noItemBranch`; `scripted` phải có resolution.
- `itemBranches` chỉ tham chiếu item hợp lệ, không trùng tổ hợp item/condition và có quantity dương; trạng thái “tiêu hao/giữ nguyên/có thể hỏng” của admin preview phải derive từ resolution effects.
- Với `source: "carried_inventory"`, priority phải xác định duy nhất branch thắng nếu nhiều item cùng match; không được fallback sang random item.
- Với `source: "carried_inventory"`, `noItemBranch.availability` bắt buộc là `fallback_only` vì không có player đang xem để chủ động chọn bỏ qua.
- Resolution `deterministic` không chứa weight/outcomes. Resolution `weighted` phải có ít nhất hai result hợp lệ và tổng weight dương.
- Event mà mọi normal choice đều có requirement phải có đúng một `fallbackOnly` hợp lệ hoặc một choice không requirement luôn khả dụng; tổng số fallback không vượt quá một.
- `fallbackOnly` không được có `requirements` và không được đồng thời là normal choice.
- `noItemBranch.availability` phải là `fallback_only` hoặc `always`; nhánh này không được tự khai một selected item.
- Cảnh báo khi choice tiêu hao item quest, item cuối cùng hoặc có effect reward nhưng không có effect tiêu hao nếu đó không phải chủ ý của admin.
- Mọi deterministic/weighted result phải tham chiếu item/location hợp lệ; result gây chết phải được gắn tag/cảnh báo để admin review trước publish.
- Chained event không tạo vòng lặp bắt buộc vô hạn.
- Fixed/scheduled event không tự queue chính nó ngoài chủ ý đã xác nhận.
- Ending priority conflict được cảnh báo.

### `admin_audit_logs`

```ts
interface AdminAuditLog {
  _id: ObjectId;
  adminUserId: ObjectId;
  action: "create" | "update" | "delete_draft" | "publish" | "archive";
  entityType: string;
  entityKey: string;
  contentVersionId?: ObjectId;
  before?: unknown;
  after?: unknown;
  createdAt: Date;
}
```

Audit log là append-only và không cho admin thường sửa/xóa.

## 15. API command dự kiến

```text
POST /api/game-runs                     tạo ván
GET  /api/game-runs/:id                 load snapshot
POST /api/game-runs/:id/advance-day     qua ngày
POST /api/game-runs/:id/choices         chọn event choice
POST /api/game-runs/:id/expeditions     cử nhân vật đi thám hiểm
GET  /api/game-runs/:id/expeditions     danh sách báo cáo được phép xem
GET  /api/game-runs/:id/expeditions/:expeditionId  đọc báo cáo đã công bố
POST /api/game-runs/:id/expeditions/:expeditionId/read  đánh dấu đã đọc
GET  /api/game-runs/:id/locations       bản đồ/location state đã được phép biết
POST /api/game-runs/:id/abandon         bỏ ván
GET  /api/game-runs/:id/history         lịch sử phân trang

GET  /api/profile                       meta progression
GET  /api/achievements                  catalog + progress

GET/POST/PATCH /api/admin/content/...   CRUD draft content
POST /api/admin/content/publish          validate và publish version
```

Payload event gửi `choiceKey` cho interaction thường hoặc `selectedItemKey` cho `item_selection`. Server chỉ chấp nhận item key có trong `itemBranches` của event hiện tại, sau đó tự lấy resolution/effects từ content version của run. Client không bao giờ gửi `consumeItem`, weight, result, reward hay quantity. Chọn `noItemBranch` dùng intent riêng `skipItem: true`; server chỉ chấp nhận nếu availability và state hiện tại cho phép.

Mọi mutation contract tối thiểu gồm `runId`, `revision`, `commandId` và payload intent. Response trả revision/snapshot mới hoặc mã conflict có thể phục hồi.

## 16. Bảo mật

- Password hash bằng bcryptjs; không log password hoặc session token.
- Session có expiry, cookie `httpOnly`, `secure` ở production và `sameSite` phù hợp.
- Rate limit login, register và mutation gameplay nhạy cảm.
- Validate toàn bộ input bằng Zod ở server.
- Chống mass assignment: map field được phép, không truyền body thẳng vào Mongoose update.
- Admin route kiểm tra session và role trên server.
- Không thực thi code lấy từ database.
- Dùng projection để không vô tình trả field nội bộ.
- Expedition endpoint dùng allowlist DTO riêng; không serialize thẳng `run_expeditions` vì journal/location/carried inventory đang active là spoiler.
- Backup MongoDB và thử restore định kỳ trước khi có người chơi thật.

## 17. Chiến lược triển khai

### Milestone 1 — Vertical slice

- Tạo/load một run với bốn nhân vật.
- Resource decay theo ngày.
- Một fixed event, một random event và choice effect.
- Seeded RNG, revision và event log.

### Milestone 2 — Content engine

- Rule/effect DSL đầy đủ bản đầu.
- Item intact/broken, conditions, location pool và expedition nhiều ngày.
- Báo cáo hành trình không spoil active expedition và được archive sau ngày trở về.
- Ending rules và achievement progress.

### Milestone 3 — Account và admin

- Auth, save/continue và meta unlock.
- Draft CMS, validation, audit và content publishing.

### Milestone 4 — Replayability và vận hành

- Event pool lớn, event graph, secret content.
- Achievement statistics, balancing analytics.
- Daily challenge và công cụ replay/debug theo seed.

## 18. Quyết định đã chốt

| Quyết định | Lý do |
| --- | --- |
| MongoDB với snapshot embed + log tách riêng | Load save nhanh nhưng lịch sử không làm document phình vô hạn |
| Content version immutable sau publish | Save cũ không hỏng khi admin cập nhật nội dung |
| Rule/effect là DSL có schema | CMS mở rộng được mà không chạy code từ database |
| Server authoritative | Chống gian lận và state lệch giữa client/server |
| Seeded RNG + candidate sorting | Random tái hiện được khi debug |
| Optimistic concurrency bằng revision | Chống double submit và nhiều tab |
| Run unlock tách account unlock/discovery | Tránh sai nghĩa progression |
| Stable key thay cho display name | Cho phép rename và localization an toàn |
| Location definition tách run discovery | Một catalog dùng chung nhưng mỗi ván có bản đồ/trạng thái khám phá riêng |
| Location giữ event reference, không embed event | Tái sử dụng event, tránh lệch version và sửa một nơi có hiệu lực nhất quán |
| `run_expeditions` chỉ là runtime journey log | Location định nghĩa nội dung; document chuyến đi chỉ lưu người đi, đồ mang theo và lịch sử thực tế của từng ván |
| Location sở hữu event pool | Không cần content type “expedition event” trùng chức năng với địa điểm |
| Event resolution deterministic mặc định | Admin kiểm soát chính xác kịch bản; RNG chỉ chạy tại resolution được đánh dấu `weighted` |
| Item requirement không đồng nghĩa item consumption | Một item có thể chỉ mở nhánh, bị tiêu hao, bị hỏng hoặc giữ nguyên tùy effect |
| `itemBranches` là allowlist có script riêng | Item id nào được chọn sẽ chạy đúng resolution của branch đó; client không tự khai effect hay reward |
| Event có fallback khi mọi choice bị khóa | Không soft-lock ván chỉ vì người chơi không sở hữu item yêu cầu |

## 19. Câu hỏi còn mở

Những quyết định này chưa cần chốt ở giai đoạn scaffold nhưng phải chốt trước khi triển khai feature liên quan:

- Chỉ số đói/khát tăng khi xấu đi hay giảm khi xấu đi?
- Bốn nhân vật cố định hay có thể unlock roster và chọn đội hình?
- Mỗi tài khoản chỉ có một active run hay nhiều save slot?
- Daily challenge có leaderboard hay chỉ dùng chung seed?
- Nội dung có cần đa ngôn ngữ từ đầu không?

Cho đến khi các câu hỏi trên được chốt, schema nên tránh hard-code giả định khiến migration về sau khó khăn.
