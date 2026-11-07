"use client";

const rules: [string, string][] = [
  ["Blackjack", "3:2"],
  ["Dealer", "Soft 17"],
  ["Double", "Any two"],
  ["Split", "Up to 8 hands"],
  ["Insurance", "2:1"],
  ["Shoe", "6 decks"],
];

export function RulesCard() {
  return (
    <section className="surface p-5">
      <p className="text-[9px] font-semibold uppercase tracking-[0.2em] text-muted/55">House rules</p>
      <div className="mt-4 space-y-2.5">
        {rules.map(([label, value]) => (
          <div key={label} className="flex items-center justify-between text-[10px]">
            <span className="text-muted/65">{label}</span>
            <span className="font-medium text-ink/85">{value}</span>
          </div>
        ))}
      </div>
    </section>
  );
}
