/** Clean device frame that displays the real app screenshot (public/tela.png). */
export function PhoneMockup({ className = '' }: { className?: string }) {
  return (
    <div className={`relative w-[280px] sm:w-[320px] ${className}`}>
      <div className="rounded-[2.6rem] bg-zinc-900 p-2.5 shadow-lg ring-1 ring-black/5">
        <div className="aspect-[352/759] overflow-hidden rounded-[2.05rem] bg-white">
          <img
            src="/tela.png"
            alt="The AUTONOMOUS app"
            className="h-full w-full object-cover"
            draggable={false}
          />
        </div>
      </div>
    </div>
  );
}
