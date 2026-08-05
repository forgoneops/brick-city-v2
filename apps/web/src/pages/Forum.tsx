import { useEffect, useState } from 'react';
import { useSearchParams } from 'react-router-dom';
import { trpc } from '../lib/trpc.js';
import { ModulePage } from '../components/ModulePage.js';
import { EmptyState } from '../components/EmptyState.js';
import { useT } from '../i18n/index.js';
import { useAuth } from '../lib/session.js';

interface Category {
  id: string;
  slug: string;
  name: string;
  order: number;
}

interface ThreadRow {
  id: string;
  categoryId: string;
  title: string;
  authorNick: string;
  createdAt: string;
  lastActivityAt: string;
  isPinned: boolean;
  isLocked: boolean;
  replyCount: number;
}

interface Reply {
  id: string;
  body: string;
  authorId: string;
  authorNick: string;
  createdAt: string;
  propsCount: number;
}

interface ThreadDetail {
  id: string;
  categoryId: string;
  title: string;
  authorNick: string;
  createdAt: string;
  isPinned: boolean;
  isLocked: boolean;
  replies: Reply[];
}

function isModerator(role?: string): boolean {
  return role === 'admin' || role === 'moderator';
}

export function Forum() {
  const { t } = useT();
  const { user } = useAuth();
  const [params, setParams] = useSearchParams();
  const categoryId = params.get('category');
  const threadId = params.get('thread');

  const [categories, setCategories] = useState<Category[]>([]);
  const [threads, setThreads] = useState<ThreadRow[]>([]);
  const [thread, setThread] = useState<ThreadDetail | null>(null);
  const [loading, setLoading] = useState(true);
  const [showNewThread, setShowNewThread] = useState(false);
  const [newTitle, setNewTitle] = useState('');
  const [newBody, setNewBody] = useState('');
  const [replyBody, setReplyBody] = useState('');

  useEffect(() => {
    trpc.forum.categories.query().then(setCategories);
  }, []);

  useEffect(() => {
    if (threadId) {
      setLoading(true);
      trpc.forum.thread
        .query({ id: threadId })
        .then(setThread)
        .finally(() => setLoading(false));
      return;
    }
    if (categoryId) {
      setLoading(true);
      trpc.forum.threads
        .query({ categoryId })
        .then((res) => setThreads(res.items))
        .finally(() => setLoading(false));
      return;
    }
    setLoading(false);
  }, [categoryId, threadId]);

  function goCategory(id: string) {
    setParams({ category: id });
    setShowNewThread(false);
  }

  function goThread(id: string) {
    setParams({ category: categoryId ?? '', thread: id });
  }

  function backToCategories() {
    setParams({});
  }

  function backToThreads() {
    if (categoryId) setParams({ category: categoryId });
    else setParams({});
  }

  function refreshThread() {
    if (threadId) {
      trpc.forum.thread.query({ id: threadId }).then(setThread);
    }
  }

  function handleCreateThread() {
    if (!categoryId || !newTitle.trim() || !newBody.trim()) return;
    trpc.forum.createThread
      .mutate({ categoryId, title: newTitle.trim(), body: newBody.trim() })
      .then((res) => {
        setNewTitle('');
        setNewBody('');
        setShowNewThread(false);
        goThread(res.id);
      });
  }

  function handleReply() {
    if (!threadId || !replyBody.trim()) return;
    trpc.forum.reply.mutate({ threadId, body: replyBody.trim() }).then(() => {
      setReplyBody('');
      refreshThread();
    });
  }

  function handleReplyProps(replyId: string) {
    trpc.forum.props.toggle.mutate({ replyId }).then(refreshThread);
  }

  function handlePin(id: string, pinned: boolean) {
    trpc.forum.moderation.setPinned.mutate({ id, pinned }).then(refreshThread);
  }

  function handleLock(id: string, locked: boolean) {
    trpc.forum.moderation.setLocked.mutate({ id, locked }).then(refreshThread);
  }

  function handleDelete(id: string) {
    trpc.forum.moderation.delete.mutate({ id }).then(backToThreads);
  }

  // Thread detail view
  if (threadId) {
    return (
      <ModulePage title={thread?.title ?? '...'} icon="thread" tag="FORUM / THREAD">
        <button type="button" onClick={backToThreads} className="label-mono mb-4 text-smoke hover:text-bone">
          &larr; {t('forum_back_threads')}
        </button>

        {loading || !thread ? (
          <p className="label-mono text-smoke">LOADING...</p>
        ) : (
          <div className="space-y-4">
            <div className="flex flex-wrap items-center gap-2 border-b border-fog pb-3">
              {thread.isPinned && <span className="label-mono text-signal">{t('forum_pinned')}</span>}
              {thread.isLocked && <span className="label-mono text-blood">{t('forum_locked')}</span>}
              {isModerator(user?.role) && (
                <div className="ml-auto flex gap-2">
                  <button className="btn" onClick={() => handlePin(thread.id, !thread.isPinned)}>
                    {thread.isPinned ? t('forum_unpin') : t('forum_pin')}
                  </button>
                  <button className="btn" onClick={() => handleLock(thread.id, !thread.isLocked)}>
                    {thread.isLocked ? t('forum_unlock') : t('forum_lock')}
                  </button>
                  <button className="btn" onClick={() => handleDelete(thread.id)}>
                    {t('forum_delete')}
                  </button>
                </div>
              )}
            </div>

            <ul className="divide-y divide-fog border border-fog">
              {thread.replies.map((r, i) => (
                <li key={r.id} className="px-3 py-3">
                  <div className="label-mono flex items-center justify-between text-smoke">
                    <span className="text-bone">{r.authorNick}</span>
                    <span>{new Date(r.createdAt).toLocaleDateString('en-GB')}</span>
                  </div>
                  <p className="mt-2 text-bone">{r.body}</p>
                  {i > 0 && (
                    <button
                      type="button"
                      onClick={() => handleReplyProps(r.id)}
                      className="label-mono mt-2 flex items-center gap-2 text-smoke transition-colors hover:text-signal"
                    >
                      PROPS <span className={r.propsCount > 0 ? 'text-signal' : ''}>{r.propsCount}</span>
                    </button>
                  )}
                </li>
              ))}
            </ul>

            {user && !thread.isLocked && (
              <div className="border border-fog p-3">
                <textarea
                  className="input min-h-20"
                  placeholder={t('forum_reply_body')}
                  value={replyBody}
                  onChange={(e) => setReplyBody(e.target.value)}
                />
                <button className="btn btn-primary mt-2" onClick={handleReply}>
                  {t('forum_reply_submit')}
                </button>
              </div>
            )}
          </div>
        )}
      </ModulePage>
    );
  }

  // Thread list view
  if (categoryId) {
    const category = categories.find((c) => c.id === categoryId);
    return (
      <ModulePage
        title={category?.name ?? t('nav_forum')}
        icon="thread"
        tag={`FORUM / ${category?.slug.toUpperCase() ?? ''}`}
      >
        <button
          type="button"
          onClick={backToCategories}
          className="label-mono mb-4 text-smoke hover:text-bone"
        >
          &larr; {t('forum_back_categories')}
        </button>

        {user && (
          <div className="mb-4 border-b border-fog pb-4">
            {showNewThread ? (
              <div className="border border-fog p-3">
                <input
                  className="input mb-2"
                  placeholder={t('forum_thread_title')}
                  value={newTitle}
                  onChange={(e) => setNewTitle(e.target.value)}
                />
                <textarea
                  className="input min-h-20"
                  placeholder={t('forum_thread_body')}
                  value={newBody}
                  onChange={(e) => setNewBody(e.target.value)}
                />
                <div className="mt-2 flex gap-2">
                  <button className="btn btn-primary" onClick={handleCreateThread}>
                    {t('action_submit')}
                  </button>
                  <button className="btn" onClick={() => setShowNewThread(false)}>
                    {t('action_cancel')}
                  </button>
                </div>
              </div>
            ) : (
              <button className="btn" onClick={() => setShowNewThread(true)}>
                {t('forum_thread_new')}
              </button>
            )}
          </div>
        )}

        {loading ? (
          <p className="label-mono text-smoke">LOADING...</p>
        ) : threads.length === 0 ? (
          <EmptyState note={t('forum_empty_threads')} />
        ) : (
          <ul className="divide-y divide-fog border border-fog">
            {threads.map((th) => (
              <li key={th.id}>
                <button
                  type="button"
                  onClick={() => goThread(th.id)}
                  className="flex w-full items-center justify-between gap-3 px-3 py-3 text-left transition-colors hover:bg-concrete"
                >
                  <div>
                    <span className="font-display uppercase tracking-tight text-bone">{th.title}</span>
                    {th.isPinned && <span className="label-mono ml-2 text-signal">{t('forum_pinned')}</span>}
                    {th.isLocked && <span className="label-mono ml-2 text-blood">{t('forum_locked')}</span>}
                    <div className="label-mono mt-1 text-smoke">{th.authorNick}</div>
                  </div>
                  <span className="label-mono text-smoke">{th.replyCount}</span>
                </button>
              </li>
            ))}
          </ul>
        )}
      </ModulePage>
    );
  }

  // Category list view
  return (
    <ModulePage title={t('nav_forum')} icon="thread" tag="FORUM / CATEGORIES">
      {categories.length === 0 ? (
        <EmptyState />
      ) : (
        <ul className="divide-y divide-fog border border-fog">
          {categories.map((cat) => (
            <li key={cat.id}>
              <button
                type="button"
                onClick={() => goCategory(cat.id)}
                className="flex w-full items-center justify-between px-3 py-3 text-left transition-colors hover:bg-concrete"
              >
                <span className="font-display uppercase tracking-tight text-bone">{cat.name}</span>
                <span className="label-mono text-smoke">{cat.slug}</span>
              </button>
            </li>
          ))}
        </ul>
      )}
    </ModulePage>
  );
}
