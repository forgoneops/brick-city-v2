import { useEffect, useRef, useState } from 'react';
import { Link } from 'react-router-dom';
import { trpc, getToken } from '../lib/trpc.js';
import { ModulePage } from '../components/ModulePage.js';
import { useT } from '../i18n/index.js';
import { useAuth } from '../lib/session.js';

const ROOMS = ['wall', 'spots', 'battles'] as const;

interface ChatMsg {
  id: string;
  channel: string;
  userId: string;
  nick: string;
  body: string;
  createdAt: string;
}

interface Conversation {
  channel: string;
  body: string;
  createdAt: string;
  other: { id: string; nick: string };
}

function wsUrl(channel: string): string {
  const proto = location.protocol === 'https:' ? 'wss' : 'ws';
  return `${proto}://${location.host}/ws/chat?token=${encodeURIComponent(getToken() ?? '')}&channel=${encodeURIComponent(channel)}`;
}

export function Chat() {
  const { t } = useT();
  const { user } = useAuth();
  const [tab, setTab] = useState<'rooms' | 'dms'>('rooms');
  const [channel, setChannel] = useState<string>('wall');
  const [messages, setMessages] = useState<ChatMsg[]>([]);
  const [online, setOnline] = useState<{ id: string; nick: string }[]>([]);
  const [conversations, setConversations] = useState<Conversation[]>([]);
  const [input, setInput] = useState('');
  const [connected, setConnected] = useState(false);
  const wsRef = useRef<WebSocket | null>(null);
  const bottomRef = useRef<HTMLDivElement | null>(null);

  // History on channel switch; live stream via the socket below.
  useEffect(() => {
    if (!user) return;
    trpc.chat.history.query({ channel }).then((res) => setMessages(res.items as ChatMsg[]));
  }, [user, channel]);

  useEffect(() => {
    if (!user) return;
    const ws = new WebSocket(wsUrl(channel));
    wsRef.current = ws;
    ws.onopen = () => setConnected(true);
    ws.onclose = () => setConnected(false);
    ws.onmessage = (ev) => {
      try {
        const data = JSON.parse(ev.data);
        if (data.type === 'msg' && data.channel === channel) {
          setMessages((prev) => [...prev.slice(-199), data as ChatMsg]);
        } else if (data.type === 'presence') {
          setOnline(data.online);
        }
      } catch {
        /* malformed frame — ignore */
      }
    };
    return () => ws.close();
  }, [user, channel]);

  useEffect(() => {
    if (!user) return;
    trpc.chat.conversations.query().then((res) => setConversations(res.items as Conversation[]));
  }, [user, messages.length]);

  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages.length]);

  if (!user) {
    return <ModulePage title={t('chat_title')} icon="drip-dot" tag="CHAT / WRITERS ONLY" />;
  }

  function send() {
    const body = input.trim();
    if (!body || !wsRef.current || wsRef.current.readyState !== WebSocket.OPEN) return;
    wsRef.current.send(JSON.stringify({ body }));
    setInput('');
  }

  function openDm(otherId: string) {
    trpc.chat.openDm.mutate({ userId: otherId }).then((res) => {
      if (res.channel) {
        setTab('dms');
        setChannel(res.channel);
      }
    });
  }

  const isDm = channel.startsWith('dm:');
  const dmPeer = isDm ? conversations.find((c) => c.channel === channel)?.other.nick : null;

  return (
    <ModulePage title={t('chat_title')} icon="drip-dot" tag={`CHAT / ${connected ? t('chat_online') : t('chat_offline')}`}>
      <div className="grid gap-4 md:grid-cols-[1fr_200px]">
        <div className="border border-fog">
          {/* Rooms / DMs tabs */}
          <div className="flex border-b border-fog">
            <button
              className={`label-mono flex-1 px-3 py-2 ${tab === 'rooms' ? 'text-signal' : 'text-smoke'}`}
              onClick={() => {
                setTab('rooms');
                if (isDm) setChannel('wall');
              }}
            >
              {t('chat_rooms')}
            </button>
            <button
              className={`label-mono flex-1 px-3 py-2 ${tab === 'dms' ? 'text-signal' : 'text-smoke'}`}
              onClick={() => setTab('dms')}
            >
              {t('chat_dms')}
            </button>
          </div>

          {/* Room picker or DM list */}
          {tab === 'rooms' ? (
            <div className="flex gap-1 border-b border-fog px-2 py-2">
              {ROOMS.map((r) => (
                <button
                  key={r}
                  className={`label-mono border px-3 py-1 ${
                    channel === r ? 'border-signal text-signal' : 'border-fog text-smoke hover:text-bone'
                  }`}
                  onClick={() => setChannel(r)}
                >
                  {t(`chat_room_${r}`)}
                </button>
              ))}
            </div>
          ) : (
            <div className="max-h-24 overflow-y-auto border-b border-fog">
              {conversations.length === 0 ? (
                <p className="label-mono px-3 py-2 text-smoke">{t('chat_no_dms')}</p>
              ) : (
                conversations.map((c) => (
                  <button
                    key={c.channel}
                    className={`label-mono block w-full px-3 py-1 text-left ${
                      channel === c.channel ? 'text-signal' : 'text-bone hover:text-signal'
                    }`}
                    onClick={() => setChannel(c.channel)}
                  >
                    {c.other.nick} <span className="text-smoke">/ {c.body.slice(0, 30)}</span>
                  </button>
                ))
              )}
            </div>
          )}

          {isDm && dmPeer && (
            <p className="label-mono border-b border-fog px-3 py-1 text-smoke">DM / {dmPeer}</p>
          )}

          {/* Messages */}
          <div className="h-80 space-y-2 overflow-y-auto px-3 py-3">
            {messages.length === 0 ? (
              <p className="label-mono text-smoke">{t('chat_empty')}</p>
            ) : (
              messages.map((m) => (
                <p key={m.id} className="text-sm">
                  <span className={`label-mono mr-2 ${m.userId === user.id ? 'text-signal' : 'text-bone'}`}>
                    {m.nick}
                  </span>
                  <span className="text-bone">{m.body}</span>
                </p>
              ))
            )}
            <div ref={bottomRef} />
          </div>

          {/* Input */}
          <div className="flex border-t border-fog">
            <input
              className="flex-1 bg-ink px-3 py-2 text-sm text-bone outline-none"
              placeholder={t('chat_placeholder')}
              value={input}
              maxLength={500}
              onChange={(e) => setInput(e.target.value)}
              onKeyDown={(e) => e.key === 'Enter' && send()}
            />
            <button className="btn btn-primary" onClick={send}>
              {t('chat_send')}
            </button>
          </div>
        </div>

        {/* Who's online */}
        <aside className="border border-fog">
          <h2 className="label-mono border-b border-fog px-3 py-2">
            {t('chat_who_online')} ({online.length})
          </h2>
          <ul className="divide-y divide-fog">
            {online.map((o) => (
              <li key={o.id} className="label-mono flex items-center justify-between px-3 py-2">
                <span className="text-bone">
                  <span className="mr-2 inline-block h-2 w-2 rounded-full bg-signal" />
                  <Link to={`/u/${encodeURIComponent(o.nick)}`} className="hover:text-signal">
                    {o.nick}
                  </Link>
                </span>
                {o.id !== user.id && (
                  <button className="text-smoke hover:text-signal" onClick={() => openDm(o.id)} aria-label="DM">
                    DM
                  </button>
                )}
              </li>
            ))}
          </ul>
        </aside>
      </div>
    </ModulePage>
  );
}
