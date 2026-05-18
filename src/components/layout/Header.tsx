export function Header({ title, subtitle }: { title: string; subtitle?: string }) {
  return (
    <header className="border-b border-border bg-white px-6 py-4">
      <h1 className="text-xl font-semibold text-neutral-900">{title}</h1>
      {subtitle && <p className="text-sm text-neutral-500 mt-0.5">{subtitle}</p>}
    </header>
  );
}
