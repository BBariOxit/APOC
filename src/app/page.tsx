import { ArrowRight, Database, Dices, ShieldCheck } from "lucide-react";

import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import {
  Card,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";

const foundations = [
  {
    title: "Quản lý sinh tồn",
    description: "Bốn nhân vật, tài nguyên hữu hạn và trạng thái thay đổi mỗi ngày.",
    icon: ShieldCheck,
  },
  {
    title: "Sự kiện phân nhánh",
    description: "Rule và effect data-driven tạo hậu quả ngắn hạn lẫn dài hạn.",
    icon: Dices,
  },
  {
    title: "Save có phiên bản",
    description: "Seeded RNG và content version giữ mỗi ván ổn định, tái hiện được.",
    icon: Database,
  },
];

export default function Home() {
  return (
    <main className="mx-auto flex min-h-screen w-full max-w-6xl flex-col justify-center gap-12 px-6 py-16 lg:px-8">
      <section className="max-w-3xl space-y-6">
        <Badge variant="secondary">Project foundation</Badge>
        <div className="space-y-4">
          <h1 className="text-5xl font-semibold tracking-tight sm:text-7xl">
            APOC
          </h1>
          <p className="max-w-2xl text-lg leading-8 text-muted-foreground sm:text-xl">
            Game sinh tồn quản lý tài nguyên, nơi mỗi lựa chọn có thể mở một
            nhánh truyện mới, cứu một người hoặc kết thúc cả ván chơi.
          </p>
        </div>
        <Button disabled>
          Gameplay đang được xây dựng
          <ArrowRight data-icon="inline-end" />
        </Button>
      </section>

      <section className="grid gap-4 md:grid-cols-3">
        {foundations.map(({ title, description, icon: Icon }) => (
          <Card key={title}>
            <CardHeader>
              <Icon className="size-5 text-muted-foreground" />
              <CardTitle>{title}</CardTitle>
              <CardDescription>{description}</CardDescription>
            </CardHeader>
          </Card>
        ))}
      </section>
    </main>
  );
}
