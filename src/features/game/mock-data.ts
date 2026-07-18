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
    state: "shelter",
    stats: { health: 78, satiety: 61, hydration: 34, sanity: 72 },
    conditions: [{ label: "Đang khát", tone: "warning" }],
  },
  {
    id: "lan",
    name: "Lan",
    initials: "LA",
    role: "Y tế",
    state: "shelter",
    stats: { health: 48, satiety: 53, hydration: 67, sanity: 58 },
    conditions: [
      { label: "Bị thương", tone: "danger" },
      { label: "Cần nghỉ ngơi", tone: "neutral" },
    ],
  },
  {
    id: "hung",
    name: "Hùng",
    initials: "HU",
    role: "Thám hiểm",
    state: "shelter",
    stats: { health: 71, satiety: 38, hydration: 24, sanity: 63 },
    conditions: [
      { label: "Vừa trở về", tone: "neutral" },
      { label: "Mất nước", tone: "danger" },
    ],
  },
  {
    id: "an",
    name: "An",
    initials: "AN",
    role: "Kỹ thuật",
    state: "shelter",
    stats: { health: 69, satiety: 42, hydration: 55, sanity: 39 },
    conditions: [{ label: "Lo âu", tone: "warning" }],
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
    time: "Cuối ngày 11",
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
    time: "Rạng sáng",
    actionLabel: "Đọc hành trình",
    destination: "journey",
  },
  {
    id: "night-noise",
    kind: "ambient",
    title: "Có tiếng động ngoài cửa hầm",
    description: "Tiếng kim loại va vào nhau xuất hiện nhiều lần trong đêm.",
    time: "Đêm qua",
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
  condition: "Kiệt sức · Mất nước",
  summary:
    "Hùng mang về một số vật tư và phát hiện tuyến đường mới. Anh đang mất nước và cần được chăm sóc.",
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
    { label: "Tuyến đường phía đông", tone: "neutral" },
  ],
  entries: [
    {
      id: "journey-day-1",
      day: 1,
      kind: "search",
      title: "Những căn nhà im lặng",
      location: "Khu dân cư phía đông",
      description:
        "Hùng lục soát ba căn nhà bỏ hoang trước khi trời tối. Một căn bếp vẫn còn hai hộp thức ăn chưa bị lấy đi.",
      effects: [{ label: "+2 Đồ hộp", tone: "positive" }],
    },
    {
      id: "journey-day-2",
      day: 2,
      kind: "encounter",
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
      kind: "discovery",
      title: "Trạm tiếp tế",
      location: "Kho hàng số 4",
      description:
        "Bên trong kho chỉ còn một chai nước nguyên vẹn. Tiếng động ở tầng dưới buộc Hùng phải rời đi trước khi kịp tìm kiếm thêm.",
      effects: [{ label: "+1 Nước sạch", tone: "positive" }],
    },
    {
      id: "journey-day-4",
      day: 4,
      kind: "danger",
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
    id: "mysterious-knock",
    title: "Tiếng gõ cửa",
    description:
      "Ba tiếng gõ ngắn vang lên từ phía bên kia cánh cửa. Một giọng nói khàn đặc xin đổi thông tin về khu cứu trợ lấy một chai nước sạch.",
    category: "Gặp gỡ",
    rarity: "rare",
    urgency: "required",
    day: 12,
    location: "Cửa hầm phía Bắc",
    choices: [
      {
        id: "trade-water",
        label: "Đổi một chai nước",
        description: "Đưa nước cho người lạ để đổi lấy thông tin về khu cứu trợ.",
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
        description:
          "Không tiêu hao tài nguyên, nhưng người lạ có thể không quay lại.",
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
    urgency: "optional",
    day: 12,
    location: "Góc liên lạc",
    expiresAtDay: 12,
    choices: [
      {
        id: "scan-radio",
        label: "Dò tín hiệu bằng radio",
        description:
          "Radio chỉ được dùng để dò tần số và sẽ không bị tiêu hao.",
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
        description: "Không sử dụng vật phẩm và để tín hiệu tự biến mất.",
        result: {
          title: "Tín hiệu đã tắt",
          description:
            "Âm thanh yếu dần rồi biến mất. Nhóm quay lại những công việc còn dang dở.",
          effects: [],
        },
      },
    ],
  },
];
