import { useNavigate } from '../router';

export function Logo({ className = '' }: { light?: boolean; className?: string }) {
  const navigate = useNavigate();
  return (
    <button
      onClick={() => navigate('/')}
      className={`group flex items-center ${className}`}
      aria-label="AUTONOMOUS — início"
    >
      <img
        src="/icon-app-2.svg"
        alt="AUTONOMOUS"
        className="h-9 w-44 rounded-xl object-cover object-center shadow-soft transition-transform duration-300 group-hover:scale-[1.03]"
      />
    </button>
  );
}
