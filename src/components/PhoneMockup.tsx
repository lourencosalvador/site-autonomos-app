/** Phone mockup that displays the real app screenshot (public/tela.png) on the screen. */
export function PhoneMockup({ className = '' }: { className?: string }) {
  return (
    <div className={`relative w-[300px] select-none ${className}`}>
      {/* Phone frame */}
      <div className="relative rounded-[2.9rem] bg-gradient-to-b from-[#1a3640] to-[#02151d] p-[3px] shadow-phone">
        <div className="rounded-[2.75rem] bg-[#0b2530] p-2.5">
          {/* Screen — matches the screenshot's native 352x759 aspect ratio */}
          <div className="relative aspect-[352/759] w-full overflow-hidden rounded-[2.2rem] bg-white">
            <img
              src="/tela.png"
              alt="App AUTONOMOUS"
              className="h-full w-full object-cover animate-fadeIn"
              draggable={false}
            />
          </div>
        </div>
      </div>
    </div>
  );
}
