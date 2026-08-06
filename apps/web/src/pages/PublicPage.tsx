import { useEffect, useState } from 'react';
import { useParams } from 'react-router-dom';
import { trpc } from '../lib/trpc.js';
import { ModulePage } from '../components/ModulePage.js';
import { NotFound } from './NotFound.js';

interface Page {
  slug: string;
  title: string;
  body: string;
}

// Renders a published CMS info page by slug (/pages/:slug — e.g. /pages/rules).
// Unpublished or missing slugs render the same 404 as any other dead route.
export function PublicPage() {
  const { slug } = useParams<{ slug: string }>();
  const [page, setPage] = useState<Page | null>(null);
  const [notFound, setNotFound] = useState(false);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!slug) {
      setNotFound(true);
      setLoading(false);
      return;
    }
    setLoading(true);
    setNotFound(false);
    trpc.cms.pages.bySlug
      .query({ slug })
      .then(setPage)
      .catch(() => setNotFound(true))
      .finally(() => setLoading(false));
  }, [slug]);

  if (loading) return null;
  if (notFound || !page) return <NotFound />;

  return (
    <ModulePage title={page.title} icon="zine-page" tag={`PAGE / ${page.slug.toUpperCase()}`}>
      <div className="whitespace-pre-line text-bone/80">{page.body}</div>
    </ModulePage>
  );
}
