import { useEffect, useRef, useState } from 'react';
import { Room, RoomEvent, Track, type RemoteTrack } from 'livekit-client';
import { Loader2, Mic, MicOff, PhoneOff, PhoneCall, AlertTriangle } from 'lucide-react';
import { useAuth } from '../../auth/AuthContext';
import { navigate } from '../../router';
import { type Broadcast, type BroadcastPerson, getBroadcast } from '../../lib/broadcasts';
import { getCallToken, callErrorMessage, notifyCallEvent } from '../../lib/call';

type Phase = 'connecting' | 'connected' | 'error';

export function CallPage({ id }: { id: string }) {
  const { user } = useAuth();
  const [phase, setPhase] = useState<Phase>('connecting');
  const [errorMsg, setErrorMsg] = useState('');
  const [remoteJoined, setRemoteJoined] = useState(false);
  const [muted, setMuted] = useState(false);
  const [micError, setMicError] = useState(false);
  const [elapsed, setElapsed] = useState(0);
  const [other, setOther] = useState<BroadcastPerson | null>(null);

  const roomRef = useRef<Room | null>(null);
  const audioBox = useRef<HTMLDivElement | null>(null);
  const hangingUp = useRef(false);

  useEffect(() => {
    let cancelled = false;
    const room = new Room({ adaptiveStream: false, dynacast: false });
    roomRef.current = room;

    room.on(RoomEvent.TrackSubscribed, (track: RemoteTrack) => {
      if (track.kind === Track.Kind.Audio) {
        const el = track.attach();
        el.autoplay = true;
        audioBox.current?.appendChild(el);
        setRemoteJoined(true);
      }
    });
    room.on(RoomEvent.ParticipantConnected, () => setRemoteJoined(true));
    room.on(RoomEvent.ParticipantDisconnected, () => {
      // O outro desligou → termina também deste lado e volta ao chat.
      if (room.remoteParticipants.size === 0) {
        hangingUp.current = true;
        void room.disconnect();
        if (!cancelled) navigate(`/conta/chat/${id}`);
      }
    });
    room.on(RoomEvent.Disconnected, () => {
      if (cancelled || hangingUp.current) return; // limpeza/StrictMode ou o próprio user desligou
      setErrorMsg('A chamada terminou ou não foi possível estabelecer a ligação.');
      setPhase('error');
    });

    (async () => {
      try {
        const b: Broadcast | null = await getBroadcast(id);
        if (b) setOther(user?.id === b.client_id ? b.provider ?? null : b.client ?? null);
        const { url, token } = await getCallToken(id);
        await room.connect(url, token);
        try {
          await room.localParticipant.setMicrophoneEnabled(true);
        } catch {
          setMicError(true);
        }
        if (cancelled) { await room.disconnect(); return; }
        setRemoteJoined(room.remoteParticipants.size > 0);
        setPhase('connected');
      } catch (e) {
        if (cancelled) return;
        setErrorMsg(callErrorMessage(e instanceof Error ? e.message : 'call_failed'));
        setPhase('error');
      }
    })();

    return () => { cancelled = true; void room.disconnect(); };
  }, [id, user?.id]);

  useEffect(() => {
    if (phase !== 'connected' || !remoteJoined) return;
    const t = setInterval(() => setElapsed((s) => s + 1), 1000);
    return () => clearInterval(t);
  }, [phase, remoteJoined]);

  const toggleMute = async () => {
    const room = roomRef.current;
    if (!room) return;
    const next = !muted;
    await room.localParticipant.setMicrophoneEnabled(!next);
    setMuted(next);
  };
  const hangUp = () => {
    hangingUp.current = true;
    if (other?.id) void notifyCallEvent(other.id, 'cancel', { broadcastId: id });
    void roomRef.current?.disconnect();
    navigate(`/conta/chat/${id}`);
  };

  const name = other?.name || 'Chamada';
  const initials = (other?.name || '?').trim().split(/\s+/).slice(0, 2).map((p) => p[0]).join('').toUpperCase();

  return (
    <section className="min-h-[100dvh] bg-brand-dark text-white">
      <div className="mx-auto flex min-h-[100dvh] max-w-md flex-col items-center justify-between px-6 py-16">
        <div className="flex flex-1 flex-col items-center justify-center">
          <div className="relative mb-6">
            {phase === 'connected' && !remoteJoined && <span className="absolute inset-0 animate-ping rounded-full bg-brand-cyan/30" />}
            <div className="relative flex h-28 w-28 items-center justify-center overflow-hidden rounded-full bg-white/10 text-3xl font-bold">
              {other?.avatar_url ? <img src={other.avatar_url} alt="" className="h-full w-full object-cover" /> : initials}
            </div>
          </div>
          <h1 className="font-display text-2xl font-extrabold">{name}</h1>

          {phase === 'connecting' && (
            <p className="mt-2 flex items-center gap-2 text-white/70"><Loader2 size={16} className="animate-spin" /> A ligar…</p>
          )}
          {phase === 'connected' && (
            <>
              <p className="mt-2 text-white/70">
                {remoteJoined ? formatTime(elapsed) : 'A tocar… à espera que atenda'}
              </p>
              {micError && <p className="mt-1 text-xs text-amber-300">Microfone bloqueado — só consegue ouvir.</p>}
            </>
          )}
          {phase === 'error' && (
            <div className="mt-4 flex max-w-xs flex-col items-center text-center">
              <AlertTriangle className="mb-2 size-7 text-amber-300" />
              <p className="text-white/80">{errorMsg}</p>
            </div>
          )}
        </div>

        <div className="flex items-center gap-5">
          {phase === 'connected' && (
            <button onClick={toggleMute}
              className={`flex h-14 w-14 items-center justify-center rounded-full transition-colors ${muted ? 'bg-white text-brand-dark' : 'bg-white/15 text-white hover:bg-white/25'}`}>
              {muted ? <MicOff size={22} /> : <Mic size={22} />}
            </button>
          )}
          {phase === 'error' ? (
            <button onClick={() => navigate(`/conta/chat/${id}`)}
              className="flex items-center gap-2 rounded-full bg-white/15 px-6 py-3.5 font-semibold text-white transition-colors hover:bg-white/25">
              Voltar ao chat
            </button>
          ) : (
            <button onClick={hangUp}
              className="flex h-16 w-16 items-center justify-center rounded-full bg-red-500 text-white shadow-lg transition-transform hover:scale-105 active:scale-95">
              <PhoneOff size={26} />
            </button>
          )}
          {phase === 'connecting' && (
            <span className="flex h-14 w-14 items-center justify-center rounded-full bg-white/10 text-white/60"><PhoneCall size={22} /></span>
          )}
        </div>
      </div>
      <div ref={audioBox} className="hidden" />
    </section>
  );
}

function formatTime(s: number) {
  const m = Math.floor(s / 60);
  const ss = s % 60;
  return `${m}:${ss.toString().padStart(2, '0')}`;
}
