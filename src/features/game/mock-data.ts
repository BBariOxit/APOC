import type {
  CurrentEvent,
  DailyUpdate,
  GameCharacter,
  InventoryItem,
  ReturnJourneyReport,
} from "@/features/game/types";

export const mockCharacters: GameCharacter[] = [
  {
    id: "minh",
    name: "Minh",
    initials: "MI",
    role: "Trụ cột",
    baseLoadoutSlots: 4,
    state: "shelter",
    stats: { health: 78, satiety: 61, hydration: 34, sanity: 72 },
    conditions: [{ key: "thirsty", label: "Đang khát", tone: "warning" }],
  },
  {
    id: "lan",
    name: "Lan",
    initials: "LA",
    role: "Y tế",
    baseLoadoutSlots: 3,
    state: "shelter",
    stats: { health: 48, satiety: 53, hydration: 67, sanity: 58 },
    conditions: [
      { key: "wounded", label: "Bị thương", tone: "danger" },
      { key: "resting", label: "Cần nghỉ ngơi", tone: "neutral" },
    ],
  },
  {
    id: "hung",
    name: "Hùng",
    initials: "HU",
    role: "Thám hiểm",
    baseLoadoutSlots: 3,
    state: "shelter",
    stats: { health: 71, satiety: 38, hydration: 24, sanity: 63 },
    conditions: [
      { key: "resting", label: "Vừa trở về", tone: "neutral" },
      { key: "dehydrated", label: "Mất nước", tone: "danger" },
    ],
  },
  {
    id: "an",
    name: "An",
    initials: "AN",
    role: "Kỹ thuật",
    baseLoadoutSlots: 3,
    state: "shelter",
    stats: { health: 69, satiety: 42, hydration: 55, sanity: 39 },
    conditions: [{ key: "distressed", label: "Lo âu", tone: "warning" }],
  },
];

export const mockInventory: InventoryItem[] = [
  {
    id: "canned-food-intact",
    key: "canned_food",
    name: "Đồ hộp",
    shortName: "Đồ hộp",
    shortDescription: "Một khẩu phần được bảo quản kỹ, đủ cho một lần ăn.",
    description: "Một khẩu phần được bảo quản kỹ. Không ngon, nhưng đủ sống.",
    category: "food",
    condition: "intact",
    quantity: 6,
    icon: "can",
    usable: true,
    careAction: "feed",
  },
  {
    id: "water-intact",
    key: "water",
    name: "Nước sạch",
    shortName: "Nước",
    shortDescription: "Bổ sung nước cho một nhân vật.",
    description: "Nước uống còn sạch, mỗi đơn vị đủ cho một lần sử dụng.",
    category: "water",
    condition: "intact",
    quantity: 4,
    icon: "water",
    usable: true,
    careAction: "hydrate",
  },
  {
    id: "medicine-intact",
    key: "medicine",
    name: "Thuốc",
    shortName: "Thuốc",
    shortDescription: "Chữa bệnh và nhiễm trùng nhẹ.",
    description: "Thuốc tổng hợp dùng để điều trị bệnh và nhiễm trùng nhẹ.",
    category: "medical",
    condition: "intact",
    quantity: 1,
    icon: "medicine",
    usable: true,
    careAction: "heal",
  },
  {
    id: "bandage-intact",
    key: "bandage",
    name: "Băng cứu thương",
    shortName: "Băng gạc",
    shortDescription: "Sơ cứu vết thương và ngăn sức khỏe giảm thêm.",
    description: "Dùng để sơ cứu vết thương và ngăn tình trạng xấu đi.",
    category: "medical",
    condition: "intact",
    quantity: 2,
    icon: "bandage",
    usable: true,
    careAction: "heal",
  },
  {
    id: "radio-intact",
    key: "radio",
    name: "Radio",
    shortName: "Radio",
    shortDescription: "Bắt tín hiệu từ bên ngoài khi có điều kiện phù hợp.",
    description: "Có thể bắt tín hiệu yếu từ bên ngoài nếu thời tiết thuận lợi.",
    category: "tool",
    condition: "intact",
    quantity: 1,
    icon: "radio",
    usable: false,
  },
  {
    id: "flashlight-intact",
    key: "flashlight",
    name: "Đèn pin",
    shortName: "Đèn pin",
    shortDescription: "Tăng độ an toàn khi thám hiểm khu vực tối.",
    description: "Nguồn sáng đáng tin cậy cho những chuyến đi xa.",
    category: "tool",
    condition: "intact",
    quantity: 1,
    icon: "flashlight",
    usable: false,
  },
  {
    id: "axe-broken",
    key: "axe",
    name: "Rìu bị hỏng",
    shortName: "Rìu",
    shortDescription: "Không thể sử dụng trước khi được sửa chữa.",
    description: "Lưỡi rìu đã lỏng. Cần sửa trước khi có thể sử dụng an toàn.",
    category: "tool",
    condition: "broken",
    quantity: 1,
    icon: "axe",
    usable: false,
  },
  {
    id: "map-intact",
    key: "old_map",
    name: "Bản đồ cũ",
    shortName: "Bản đồ",
    shortDescription: "Đánh dấu một vài địa điểm đáng chú ý bên ngoài.",
    description:
      "Tấm bản đồ đã ố vàng và mất một góc. Một vài địa điểm bên ngoài được khoanh bằng mực đỏ, trong đó có trạm tiếp tế cũ và một đường hầm chưa rõ điểm đến.",
    category: "quest",
    condition: "intact",
    quantity: 1,
    icon: "map",
    usable: false,
  },
];

export const mockDailyUpdates: DailyUpdate[] = [
  {
    id: "reinforced-side-door",
    kind: "outcome",
    label: "Hệ quả hôm qua",
    title: "Cửa phụ đã được gia cố",
    description:
      "Minh và An đã dùng những tấm kim loại còn lại để đóng kín cửa phụ. Minh bị thương nhẹ trong lúc làm việc.",
    effects: [
      { label: "An toàn hầm +1", tone: "positive" },
      { label: "Minh · Sức khỏe −8", tone: "negative" },
    ],
  },
  {
    id: "hung-returned",
    kind: "return",
    label: "Đã trở về",
    title: "Hùng đã quay lại hầm",
    description: "Sau bốn ngày mất liên lạc, Hùng cuối cùng đã trở về.",
    effects: [
      { label: "+2 Đồ hộp", tone: "positive" },
      { label: "+1 Nước sạch", tone: "positive" },
      { label: "Rìu đã hỏng", tone: "warning" },
    ],
    actionLabel: "Đọc hành trình",
    destination: "journey",
  },
  {
    id: "night-noise",
    kind: "ambient",
    title: "Có tiếng động ngoài cửa hầm",
    description: "Tiếng kim loại va vào nhau xuất hiện nhiều lần trong đêm.",
  },
];

export const mockPreviousDayInventoryChanges: DailyUpdate[] = [
  {
    id: "day-11-supplies-gained",
    kind: "outcome",
    label: "Vật tư nhận được",
    title: "Đã bổ sung vật tư vào kho",
    description:
      "Vật tư Hùng mang về đã được kiểm kê và chuyển vào kho của hầm.",
    effects: [
      { label: "Đồ hộp +2", tone: "positive" },
      { label: "Nước sạch +1", tone: "positive" },
      { label: "Bản đồ cũ +1", tone: "positive" },
    ],
  },
  {
    id: "day-11-consumption",
    kind: "outcome",
    label: "Tiêu hao hằng ngày",
    title: "Đã dùng khẩu phần cho 4 người",
    description:
      "Bốn người trong hầm đã nhận khẩu phần thức ăn và nước cho ngày hôm qua.",
    effects: [
      { label: "Đồ hộp −4", tone: "negative" },
      { label: "Nước sạch −4", tone: "negative" },
    ],
  },
];

export const mockReturnJourney: ReturnJourneyReport | null = {
  id: "hung-return-day-12",
  characterId: "hung",
  characterName: "Hùng",
  characterInitials: "HU",
  departedDay: 8,
  returnedDay: 12,
  durationDays: 4,
  gains: [
    { label: "+2 Đồ hộp", tone: "positive" },
    { label: "+1 Nước sạch", tone: "positive" },
    { label: "+1 Bản đồ cũ", tone: "positive" },
  ],
  losses: [
    { label: "Hùng · Sức khỏe −14", tone: "negative" },
    { label: "Rìu đã hỏng", tone: "warning" },
  ],
  discoveries: [
    { label: "Mở khóa: Kho hàng số 4", tone: "neutral" },
  ],
  entries: [
    {
      id: "journey-day-1",
      day: 1,
      title: "Những căn nhà im lặng",
      location: "Khu dân cư phía đông",
      description:
        "Hùng lục soát ba căn nhà bỏ hoang trước khi trời tối. Một căn bếp vẫn còn hai hộp thức ăn chưa bị lấy đi.",
      effects: [{ label: "+2 Đồ hộp", tone: "positive" }],
    },
    {
      id: "journey-day-2",
      day: 2,
      title: "Người lạ bên đường",
      location: "Đường vành đai",
      description:
        "Một người sống sót bị thương xin Hùng chia nước. Đổi lại, người đó đánh dấu một trạm tiếp tế cũ lên mảnh bản đồ nhàu nát.",
      effects: [
        { label: "−1 Nước sạch", tone: "negative" },
        { label: "+1 Bản đồ cũ", tone: "positive" },
        { label: "Mở khóa: Kho hàng số 4", tone: "neutral" },
      ],
    },
    {
      id: "journey-day-3",
      day: 3,
      title: "Trạm tiếp tế",
      location: "Kho hàng số 4",
      description:
        "Bên trong kho chỉ còn một chai nước nguyên vẹn. Tiếng động ở tầng dưới buộc Hùng phải rời đi trước khi kịp tìm kiếm thêm.",
      effects: [{ label: "+1 Nước sạch", tone: "positive" }],
    },
    {
      id: "journey-day-4",
      day: 4,
      title: "Đường về",
      location: "Lối hầm phía bắc",
      description:
        "Hùng bị một sinh vật phục kích trên đường về. Anh thoát được, nhưng chiếc rìu đã gãy và vết thương khiến quãng đường cuối kéo dài tới rạng sáng.",
      effects: [
        { label: "Hùng · Sức khỏe −14", tone: "negative" },
        { label: "Rìu đã hỏng", tone: "warning" },
      ],
    },
  ],
};

export const mockCurrentEvents: CurrentEvent[] = [
  {
    id: "flickering-corridor",
    title: "Ánh đèn chập chờn",
    description:
      "Dãy đèn ở hành lang phía Tây chớp tắt liên tục. Từ sau tấm bảng điện vang ra tiếng rè nhỏ và mùi dây dẫn nóng dần lan vào hầm.",
    category: "Sinh hoạt",
    rarity: "common",
    day: 12,
    choices: [
      {
        id: "inspect-panel",
        label: "Kiểm tra bảng điện",
        result: {
          title: "Một đầu dây bị lỏng",
          description:
            "An tìm thấy một đầu dây đã tuột khỏi chốt và cố định nó trước khi lớp cách điện nóng chảy.",
          effects: [{ label: "An toàn hầm +1", tone: "positive" }],
        },
      },
      {
        id: "cut-corridor-power",
        label: "Ngắt điện hành lang",
        result: {
          title: "Hành lang chìm vào bóng tối",
          description:
            "Tiếng rè biến mất ngay khi cầu dao được ngắt. Khu vực này sẽ cần một nguồn sáng khác nếu có người đi qua.",
          effects: [{ label: "Điện dự trữ +1", tone: "positive" }],
        },
      },
    ],
  },
  {
    id: "mysterious-knock",
    title: "Tiếng gõ cửa",
    description:
      "Ba tiếng gõ ngắn vang lên từ phía bên kia cánh cửa. Một giọng nói khàn đặc cất lên, xin cả nhóm cho một chai nước sạch.",
    category: "Gặp gỡ",
    rarity: "rare",
    day: 12,
    choices: [
      {
        id: "trade-water",
        label: "Đưa nước cho người lạ",
        requiredItem: {
          itemKey: "water",
          quantity: 1,
          usage: "consume",
        },
        result: {
          title: "Một thỏa thuận chóng vánh",
          description:
            "Người lạ nhận chai nước rồi để lại tần số phát sóng và vị trí của một trạm cứu trợ cũ.",
          effects: [
            { label: "Nước sạch −1", tone: "negative" },
            { label: "Mở khóa: Trạm cứu trợ", tone: "neutral" },
          ],
        },
      },
      {
        id: "ignore",
        label: "Giữ im lặng",
        result: {
          title: "Tiếng bước chân xa dần",
          description:
            "Cả nhóm giữ im lặng. Sau vài phút, người bên ngoài rời khỏi cửa hầm và biến mất trong hành lang.",
          effects: [],
        },
      },
    ],
  },
  {
    id: "broken-broadcast",
    title: "Tín hiệu đứt quãng",
    description:
      "Một chuỗi âm thanh ngắt quãng phát ra từ góc liên lạc. Tín hiệu quá yếu để nghe rõ nếu không dùng radio dò lại tần số.",
    category: "Tín hiệu",
    rarity: "uncommon",
    day: 12,
    choices: [
      {
        id: "scan-radio",
        label: "Dò tín hiệu bằng radio",
        requiredItem: {
          itemKey: "radio",
          quantity: 1,
          usage: "retain",
        },
        result: {
          title: "Một tọa độ mới",
          description:
            "Nhóm bắt được một đoạn phát sóng lặp lại, trong đó có tọa độ của một trạm truyền tin bỏ hoang.",
          effects: [
            { label: "Radio được giữ nguyên", tone: "neutral" },
            { label: "Mở khóa: Trạm truyền tin", tone: "positive" },
          ],
        },
      },
      {
        id: "dismiss-signal",
        label: "Bỏ qua tín hiệu",
        result: {
          title: "Tín hiệu đã tắt",
          description:
            "Âm thanh yếu dần rồi biến mất. Nhóm quay lại những công việc còn dang dở.",
          effects: [],
        },
      },
    ],
  },
  {
    id: "impossible-frequency",
    title: "Tần số không tồn tại",
    description:
      "Chiếc radio tự bật giữa lúc cả hầm im lặng. Một chuỗi âm thanh đều đặn phát ra trên dải tần không được đánh dấu trong bất kỳ tài liệu nào.",
    category: "Dị thường",
    rarity: "ultra_rare",
    day: 12,
    choices: [
      {
        id: "record-frequency",
        label: "Ghi lại tín hiệu",
        requiredItem: {
          itemKey: "radio",
          quantity: 1,
          usage: "retain",
        },
        result: {
          title: "Một bản đồ bằng âm thanh",
          description:
            "Khi phát chậm đoạn ghi âm, cả nhóm nhận ra chuỗi tín hiệu mô tả khoảng cách và phương hướng tới một công trình nằm sâu dưới lòng đất.",
          effects: [
            { label: "Mở khóa: Trạm ngầm", tone: "neutral" },
            { label: "Tinh thần nhóm −2", tone: "negative" },
          ],
        },
      },
      {
        id: "disconnect-radio",
        label: "Ngắt nguồn radio",
        result: {
          title: "Tín hiệu vẫn tiếp tục",
          description:
            "Radio đã mất nguồn nhưng chuỗi âm thanh vẫn kéo dài thêm vài giây trước khi dừng hẳn.",
          effects: [{ label: "Tinh thần nhóm −4", tone: "negative" }],
        },
      },
    ],
  },
];
