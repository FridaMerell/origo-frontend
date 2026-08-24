import { Button } from "@/app/components/ui/Button";
import { Card } from "@/app/components/ui/Card";
import { Icon } from "@/app/components/ui/Icon";

const WEEKDAYS = ["Mon", "Tue", "Wed", "Thu", "Fri", "Sat", "Sun"];

type Stay = {
  who: string;
  color: string;
  start: Date;
  end: Date;
};

function getStays(year: number, month: number): Stay[] {
  return [
    { who: "Erik & family", color: "var(--accent)", start: new Date(year, month, 3), end: new Date(year, month, 7) },
    { who: "Lina", color: "var(--secondary)", start: new Date(year, month, 12), end: new Date(year, month, 15) },
    { who: "The Berg siblings", color: "var(--danger)", start: new Date(year, month, 22), end: new Date(year, month, 27) },
  ];
}

function isSameDay(a: Date, b: Date) {
  return a.getFullYear() === b.getFullYear() && a.getMonth() === b.getMonth() && a.getDate() === b.getDate();
}

export default function BesokPage() {
  const today = new Date();
  const year = today.getFullYear();
  const month = today.getMonth();

  const daysInMonth = new Date(year, month + 1, 0).getDate();
  const firstWeekday = (new Date(year, month, 1).getDay() + 6) % 7; // Mon = 0

  const cells: (Date | null)[] = [
    ...Array.from({ length: firstWeekday }, () => null),
    ...Array.from({ length: daysInMonth }, (_, i) => new Date(year, month, i + 1)),
  ];

  const stays = getStays(year, month);
  const monthLabel = today.toLocaleDateString("en-US", { month: "long", year: "numeric" });

  return (
    <div className="flex flex-1 flex-col gap-5 p-7">
      <div className="flex items-baseline justify-between">
        <h1 className="m-0 font-display text-2xl font-semibold text-text">{monthLabel}</h1>
        <Button variant="primary" size="sm">
          <Icon name="plus" size={14} className="text-accent-contrast" />
          Book a visit
        </Button>
      </div>

      <Card className="overflow-hidden p-0">
        <div className="grid grid-cols-7 border-b border-border">
          {WEEKDAYS.map((d) => (
            <div key={d} className="px-3 py-2.5 text-xs font-semibold text-text-muted">
              {d}
            </div>
          ))}
        </div>
        <div className="grid grid-cols-7">
          {cells.map((date, i) => {
            const stay = date && stays.find((s) => date >= s.start && date < s.end);
            const isStart = date && stay && isSameDay(date, stay.start);
            return (
              <div
                key={i}
                className="relative box-border min-h-[74px] border-r border-b border-border p-1.5 last:border-r-0"
              >
                {date && <span className="text-xs text-text-faint">{date.getDate()}</span>}
                {isStart && stay && (
                  <div
                    className="mt-1.5 rounded px-1.5 py-1 font-body text-[11px] text-white"
                    style={{ background: stay.color }}
                  >
                    {stay.who}
                  </div>
                )}
              </div>
            );
          })}
        </div>
      </Card>

      <div className="flex gap-5">
        {stays.map((s) => (
          <div key={s.who} className="flex items-center gap-2 font-body text-sm text-text-muted">
            <span className="size-2.5 rounded-[3px]" style={{ background: s.color }} />
            {s.who}
          </div>
        ))}
      </div>
    </div>
  );
}
