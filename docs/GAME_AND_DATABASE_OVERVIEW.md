# APOC — Tổng quan game và database

> Trạng thái: bản thiết kế nền tảng 1.0
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
Chọn event bắt buộc, event đã lên lịch hoặc event random hợp lệ
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

Các mode trigger ban đầu:

| Mode | Ý nghĩa |
| --- | --- |
| `fixed_day` | Luôn được xét ở một ngày cố định |
| `scheduled` | Đã được event/gameplay trước đưa vào hàng đợi |
| `chained` | Chỉ xuất hiện sau một nhánh hoặc event cụ thể |
| `random` | Được chọn từ pool hợp lệ theo trọng số |
| `manual` | Chỉ hệ thống/admin gọi trực tiếp |

Độ hiếm chỉ phục vụ UI và analytics. Xác suất thực tế dùng `weight` sau khi engine đã lọc requirements, cooldown, giới hạn số lần và nhóm loại trừ.

### 2.5. Ending

Ending có loại `good`, `bad`, `neutral`, `secret` hoặc `joke`. Ending có thể:

- Được effect `trigger_ending` gọi trực tiếp.
- Được ending engine phát hiện khi state thỏa rules.

Nếu nhiều ending cùng hợp lệ, ending có `priority` cao nhất thắng. Một ván chỉ được chốt một ending và không được xử lý choice tiếp sau khi đã hoàn thành.

### 2.6. Achievement và meta progression

Achievement có ba độ khó: `easy`, `medium`, `hard`; có thể ẩn và có progress counter. Reward có thể mở item, event hoặc nội dung tài khoản.

Cần phân biệt:

- **Run unlock:** chỉ tồn tại trong ván hiện tại.
- **Account unlock:** tồn tại qua mọi ván của người chơi.
- **Discovery:** người chơi đã nhìn thấy nội dung, không đồng nghĩa với đã unlock để sử dụng.

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
event_definitions         global_stats
ending_definitions
achievement_definitions
          \                 /
           \               /
            GAME RUNTIME
            game_runs
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

### 7.3. `event_definitions`

```ts
interface EventDefinition extends VersionedDefinition {
  name: string;
  description: string;
  imageUrl?: string;
  category: "story" | "daily" | "expedition" | "special";
  rarity: "common" | "uncommon" | "rare" | "legendary" | "secret";
  weight: number;
  hidden: boolean;
  tags: string[];
  trigger: EventTrigger;
  requirements?: Rule;
  exclusionEventKeys: string[];
  mutexGroup?: string;
  choices: EventChoice[];
}

interface EventTrigger {
  mode: "random" | "fixed_day" | "scheduled" | "chained" | "manual";
  fixedDay?: number;
  minDay?: number;
  maxDay?: number;
  maxOccurrences?: number;
  cooldownDays?: number;
}

interface EventChoice {
  key: string;
  label: string;
  description?: string;
  requirements?: Rule;
  effects: Effect[];
}
```

### 7.4. `ending_definitions`

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

### 7.5. `achievement_definitions`

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
  | { type: "has_item"; itemKey: string; condition?: ItemCondition; quantity: number }
  | { type: "flag_equals"; key: string; value: boolean | number | string }
  | { type: "counter_gte"; key: string; value: number }
  | { type: "event_completed"; eventKey: string }
  | { type: "event_choice_made"; eventKey: string; choiceKey: string }
  | { type: "achievement_unlocked"; achievementKey: string }
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
  | { type: "add_item"; itemKey: string; condition: ItemCondition; quantity: number }
  | { type: "remove_item"; itemKey: string; condition: ItemCondition; quantity: number }
  | { type: "break_item"; itemKey: string; quantity: number }
  | { type: "repair_item"; itemKey: string; quantity: number }
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
  | { type: "grant_achievement"; achievementKey: string }
  | { type: "trigger_ending"; endingKey: string };
```

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
      eventKey?: string;
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

### 10.2. `run_event_logs`

History tăng không giới hạn nên không embed toàn bộ vào `game_runs`.

```ts
interface RunEventLog {
  _id: ObjectId;
  runId: ObjectId;
  userId: ObjectId;
  sequence: number;
  day: number;
  action: "advance_day" | "event_choice" | "expedition" | "system";
  eventKey?: string;
  choiceKey?: string;
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
{ runId: 1, day: 1 }
```

Log hỗ trợ lịch sử UI, tái hiện bug, chống gian lận và analytics. Không lưu secret hoặc PII trong log.

## 11. Random engine

Không dùng `Math.random()` trong gameplay. Mỗi ván có `seed` và `cursor`.

Quy trình chọn random event:

1. Nạp content đúng `contentVersionId`.
2. Ưu tiên event queue đến hạn và fixed event chưa xử lý.
3. Lọc event random theo enabled, ngày, requirements, account unlock, cooldown, max occurrences và mutex.
4. Sắp xếp candidate theo `key` trước khi random để kết quả không phụ thuộc thứ tự MongoDB trả về.
5. Chọn weighted random bằng RNG của ván.
6. Ghi roll, candidate result và cursor mới vào transaction/log.

Seed cho phép debug, replay và daily challenge. Nó không phải cơ chế bảo mật; mọi roll vẫn chỉ thực hiện ở server.

## 12. Transaction và tính nhất quán

Các thao tác sau phải nằm trong MongoDB transaction khi cùng xảy ra:

- Update run snapshot.
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
- Run `completed` không nhận gameplay mutation.
- Event vượt `maxOccurrences` không trở lại pool.

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
- Mọi item/event/ending/achievement reference đều tồn tại.
- Rule và effect đúng schema.
- Không có choice rỗng hoặc event random có weight âm.
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
POST /api/game-runs/:id/abandon         bỏ ván
GET  /api/game-runs/:id/history         lịch sử phân trang

GET  /api/profile                       meta progression
GET  /api/achievements                  catalog + progress

GET/POST/PATCH /api/admin/content/...   CRUD draft content
POST /api/admin/content/publish          validate và publish version
```

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
- Backup MongoDB và thử restore định kỳ trước khi có người chơi thật.

## 17. Chiến lược triển khai

### Milestone 1 — Vertical slice

- Tạo/load một run với bốn nhân vật.
- Resource decay theo ngày.
- Một fixed event, một random event và choice effect.
- Seeded RNG, revision và event log.

### Milestone 2 — Content engine

- Rule/effect DSL đầy đủ bản đầu.
- Item intact/broken, conditions và expedition.
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

## 19. Câu hỏi còn mở

Những quyết định này chưa cần chốt ở giai đoạn scaffold nhưng phải chốt trước khi triển khai feature liên quan:

- Chỉ số đói/khát tăng khi xấu đi hay giảm khi xấu đi?
- Bốn nhân vật cố định hay có thể unlock roster và chọn đội hình?
- Mỗi tài khoản chỉ có một active run hay nhiều save slot?
- Expedition được resolve theo event tức thời hay là subsystem nhiều ngày?
- Daily challenge có leaderboard hay chỉ dùng chung seed?
- Nội dung có cần đa ngôn ngữ từ đầu không?

Cho đến khi các câu hỏi trên được chốt, schema nên tránh hard-code giả định khiến migration về sau khó khăn.
