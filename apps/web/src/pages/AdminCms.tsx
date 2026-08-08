import { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import type { CmsConfig, GalleryCategoryEntry, NavItemConfig } from '@bcv2/shared';
import { trpc } from '../lib/trpc.js';
import { useCms } from '../lib/cms.js';
import { ModulePage } from '../components/ModulePage.js';
import { Stamp } from '../components/Stamp.js';
import { Switch } from '../components/Switch.js';
import { useT } from '../i18n/index.js';
import { Home } from './Home.js';
import en from '../i18n/locales/en.json';
import pl from '../i18n/locales/pl.json';
import de from '../i18n/locales/de.json';

const DICTIONARIES: Record<string, Record<string, string>> = { en, pl, de };

// Flashes a Stamp for ~1.4s after a successful save — shared by every tab.
function useSaveStamp() {
  const [saved, setSaved] = useState(false);
  function flash() {
    setSaved(true);
    setTimeout(() => setSaved(false), 1400);
  }
  return { saved, flash };
}

interface TabProps {
  config: CmsConfig;
  refetch: () => Promise<void>;
}

type ContentSection = 'hero' | 'announcement' | 'nav' | 'registration';
type CategoriesSection = 'categories' | 'flags' | 'themes';
type DirtyReporter = (key: string, dirty: boolean) => void;

function ContentTab({
  config,
  refetch,
  activeSection,
  onDirtyChange,
}: TabProps & { activeSection?: ContentSection; onDirtyChange: DirtyReporter }) {
  const { t } = useT();
  const [hero, setHero] = useState(config.hero);
  const [announcement, setAnnouncement] = useState(config.announcement);
  const [nav, setNav] = useState<NavItemConfig[]>(config.nav.items);
  const [registration, setRegistration] = useState(config.registration);
  const heroStamp = useSaveStamp();
  const announcementStamp = useSaveStamp();
  const navStamp = useSaveStamp();
  const registrationStamp = useSaveStamp();

  useEffect(() => {
    setHero(config.hero);
    setAnnouncement(config.announcement);
    setNav(config.nav.items);
    setRegistration(config.registration);
  }, [config]);

  useEffect(() => {
    onDirtyChange('hero', JSON.stringify(hero) !== JSON.stringify(config.hero));
  }, [hero, config.hero]);
  useEffect(() => {
    onDirtyChange('announcement', JSON.stringify(announcement) !== JSON.stringify(config.announcement));
  }, [announcement, config.announcement]);
  useEffect(() => {
    onDirtyChange('nav', JSON.stringify(nav) !== JSON.stringify(config.nav.items));
  }, [nav, config.nav.items]);
  useEffect(() => {
    onDirtyChange('registration', JSON.stringify(registration) !== JSON.stringify(config.registration));
  }, [registration, config.registration]);

  const showHero = !activeSection || activeSection === 'hero';
  const showAnnouncement = !activeSection || activeSection === 'announcement';
  const showNav = !activeSection || activeSection === 'nav';
  const showRegistration = !activeSection || activeSection === 'registration';

  async function saveHero() {
    await trpc.cms.setConfig.mutate({
      key: 'hero',
      value: { title: hero.title, subtitle: hero.subtitle, cta: hero.cta },
      expectedUpdatedAt: config.hero.updatedAt,
    });
    await refetch();
    heroStamp.flash();
  }

  async function saveAnnouncement() {
    await trpc.cms.setConfig.mutate({
      key: 'announcement',
      value: { text: announcement.text, enabled: announcement.enabled, showAsPopup: announcement.showAsPopup },
      expectedUpdatedAt: config.announcement.updatedAt,
    });
    await refetch();
    announcementStamp.flash();
  }

  function moveNav(index: number, dir: -1 | 1) {
    const next = [...nav];
    const target = index + dir;
    if (target < 0 || target >= next.length) return;
    [next[index], next[target]] = [next[target], next[index]];
    setNav(next);
  }

  function toggleNavVisible(index: number) {
    setNav(nav.map((item, i) => (i === index ? { ...item, visible: !item.visible } : item)));
  }

  async function saveNav() {
    await trpc.cms.setConfig.mutate({ key: 'nav', value: { items: nav }, expectedUpdatedAt: config.nav.updatedAt });
    await refetch();
    navStamp.flash();
  }

  async function saveRegistration() {
    await trpc.cms.setConfig.mutate({
      key: 'registration',
      value: { inviteOnly: registration.inviteOnly },
      expectedUpdatedAt: config.registration.updatedAt,
    });
    await refetch();
    registrationStamp.flash();
  }

  return (
    <div className="space-y-8">
      {showHero && (
        <div className="grid gap-6 lg:grid-cols-2">
          <section>
            <h3 className="label-mono mb-3">{t('admin_cms_tab_content').toUpperCase()}</h3>
            <label className="label-mono mb-1 block text-smoke">{t('admin_cms_hero_title')}</label>
            <textarea
              className="input mb-3 min-h-16"
              value={hero.title}
              onChange={(e) => setHero({ ...hero, title: e.target.value })}
            />
            <label className="label-mono mb-1 block text-smoke">{t('admin_cms_hero_subtitle')}</label>
            <input
              className="input mb-3"
              value={hero.subtitle}
              onChange={(e) => setHero({ ...hero, subtitle: e.target.value })}
            />
            <label className="label-mono mb-1 block text-smoke">{t('admin_cms_hero_cta')}</label>
            <input className="input mb-3" value={hero.cta} onChange={(e) => setHero({ ...hero, cta: e.target.value })} />
            <div className="flex items-center gap-3">
              <button className="btn btn-primary" onClick={saveHero}>
                {t('admin_cms_save')}
              </button>
              {heroStamp.saved && <Stamp label={t('admin_cms_saved')} />}
            </div>
          </section>

          <section>
            <h3 className="label-mono mb-3">{t('admin_cms_preview')}</h3>
            <div className="relative h-64 overflow-hidden border border-fog bg-ink">
              <div
                className="absolute left-0 top-0 origin-top-left"
                style={{ transform: 'scale(0.28)', width: '357%', height: '357%' }}
              >
                <Home heroOverride={hero} />
              </div>
            </div>
          </section>
        </div>
      )}

      {showAnnouncement && (
        <section className={showHero ? 'border-t border-fog pt-6' : ''}>
          <h3 className="label-mono mb-3">{t('admin_cms_announcement_text')}</h3>
          <input
            className="input mb-3"
            value={announcement.text}
            onChange={(e) => setAnnouncement({ ...announcement, text: e.target.value })}
          />
          <div className="mb-3">
            <Switch
              checked={announcement.enabled}
              onChange={(checked) => setAnnouncement({ ...announcement, enabled: checked })}
              label={t('admin_cms_announcement_enabled')}
            />
          </div>
          <div className="mb-3">
            <Switch
              checked={announcement.showAsPopup}
              onChange={(checked) => setAnnouncement({ ...announcement, showAsPopup: checked })}
              label={t('admin_cms_announcement_popup')}
            />
          </div>
          <div className="flex items-center gap-3">
            <button className="btn btn-primary" onClick={saveAnnouncement}>
              {t('admin_cms_save')}
            </button>
            {announcementStamp.saved && <Stamp label={t('admin_cms_saved')} />}
          </div>
        </section>
      )}

      {showNav && (
        <section className={showHero || showAnnouncement ? 'border-t border-fog pt-6' : ''}>
          <h3 className="label-mono mb-3">{t('admin_cms_nav_order')}</h3>
          <ul className="divide-y divide-fog border border-fog">
            {nav.map((item, i) => (
              <li key={item.key} className="flex items-center justify-between gap-3 px-3 py-2">
                <Switch checked={item.visible} onChange={() => toggleNavVisible(i)} label={t(item.key)} />
                <div className="flex gap-1">
                  <button className="btn" disabled={i === 0} onClick={() => moveNav(i, -1)}>
                    UP
                  </button>
                  <button className="btn" disabled={i === nav.length - 1} onClick={() => moveNav(i, 1)}>
                    DOWN
                  </button>
                </div>
              </li>
            ))}
          </ul>
          <div className="mt-3 flex items-center gap-3">
            <button className="btn btn-primary" onClick={saveNav}>
              {t('admin_cms_save')}
            </button>
            {navStamp.saved && <Stamp label={t('admin_cms_saved')} />}
          </div>
        </section>
      )}

      {showRegistration && (
        <section className={showHero || showAnnouncement || showNav ? 'border-t border-fog pt-6' : ''}>
          <h3 className="label-mono mb-3">{t('admin_cms_registration_title')}</h3>
          <div className="mb-3">
            <Switch
              checked={registration.inviteOnly}
              onChange={(checked) => setRegistration({ ...registration, inviteOnly: checked })}
              label={t('admin_cms_registration_invite_only')}
            />
          </div>
          <div className="flex items-center gap-3">
            <button className="btn btn-primary" onClick={saveRegistration}>
              {t('admin_cms_save')}
            </button>
            {registrationStamp.saved && <Stamp label={t('admin_cms_saved')} />}
          </div>
        </section>
      )}
    </div>
  );
}

interface PageRow {
  slug: string;
  title: string;
  body: string;
  published: boolean;
  updatedAt: string;
  createdAt: string;
}

function PagesTab({ onDirtyChange }: { onDirtyChange: DirtyReporter }) {
  const { t } = useT();
  const [pages, setPages] = useState<PageRow[]>([]);
  const [form, setForm] = useState<{ slug: string; title: string; body: string; published: boolean; originalUpdatedAt: string | null } | null>(null);
  const stamp = useSaveStamp();

  function load() {
    trpc.cms.pages.list.query().then(setPages);
  }
  useEffect(() => {
    load();
  }, []);

  useEffect(() => {
    onDirtyChange('pages', form !== null);
  }, [form]);

  function startNew() {
    setForm({ slug: '', title: '', body: '', published: false, originalUpdatedAt: null });
  }
  function startEdit(p: PageRow) {
    setForm({ slug: p.slug, title: p.title, body: p.body, published: p.published, originalUpdatedAt: p.updatedAt });
  }

  async function save() {
    if (!form) return;
    await trpc.cms.pages.upsert.mutate({
      slug: form.slug,
      title: form.title,
      body: form.body,
      published: form.published,
      expectedUpdatedAt: form.originalUpdatedAt,
    });
    setForm(null);
    stamp.flash();
    load();
  }

  async function remove(slug: string) {
    await trpc.cms.pages.delete.mutate({ slug });
    load();
  }

  return (
    <div className="space-y-6">
      {form ? (
        <section className="border border-fog p-4">
          <label className="label-mono mb-1 block text-smoke">{t('admin_cms_page_slug')}</label>
          <input
            className="input mb-3"
            placeholder="rules"
            value={form.slug}
            disabled={form.originalUpdatedAt !== null}
            onChange={(e) => setForm({ ...form, slug: e.target.value.toLowerCase() })}
          />
          <label className="label-mono mb-1 block text-smoke">{t('admin_cms_page_title')}</label>
          <input className="input mb-3" value={form.title} onChange={(e) => setForm({ ...form, title: e.target.value })} />
          <label className="label-mono mb-1 block text-smoke">{t('admin_cms_page_body')}</label>
          <textarea
            className="input mb-3 min-h-32"
            value={form.body}
            onChange={(e) => setForm({ ...form, body: e.target.value })}
          />
          <div className="mb-3">
            <Switch
              checked={form.published}
              onChange={(checked) => setForm({ ...form, published: checked })}
              label={t('admin_cms_page_published')}
            />
          </div>
          <div className="flex items-center gap-3">
            <button className="btn btn-primary" onClick={save}>
              {t('admin_cms_save')}
            </button>
            <button className="btn" onClick={() => setForm(null)}>
              {t('action_cancel')}
            </button>
            {stamp.saved && <Stamp label={t('admin_cms_saved')} />}
          </div>
        </section>
      ) : (
        <button className="btn btn-primary" onClick={startNew}>
          {t('admin_cms_pages_new')}
        </button>
      )}

      {pages.length === 0 ? (
        <p className="label-mono text-smoke">{t('admin_cms_pages_empty')}</p>
      ) : (
        <ul className="divide-y divide-fog border border-fog">
          {pages.map((p) => (
            <li key={p.slug} className="flex items-center justify-between gap-3 px-3 py-3">
              <div>
                <span className="label-mono text-bone">/pages/{p.slug}</span>
                <span className="label-mono ml-3 text-smoke">{p.title}</span>
                <span className={`label-mono ml-3 ${p.published ? 'text-signal' : 'text-fog'}`}>
                  {p.published ? t('admin_cms_page_published').toUpperCase() : 'DRAFT'}
                </span>
              </div>
              <div className="flex gap-2">
                <button className="btn" onClick={() => startEdit(p)}>
                  EDIT
                </button>
                <button className="btn" onClick={() => remove(p.slug)}>
                  {t('forum_delete')}
                </button>
              </div>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}

function CategoriesFlagsTab({
  config,
  refetch,
  activeSection,
  onDirtyChange,
}: TabProps & { activeSection?: CategoriesSection; onDirtyChange: DirtyReporter }) {
  const { t } = useT();
  const [categories, setCategories] = useState<GalleryCategoryEntry[]>(config.galleryCategories.items);
  const [flags, setFlags] = useState(config.featureFlags.flags);
  const [themes, setThemes] = useState(config.battleThemes.items);
  const [newTheme, setNewTheme] = useState('');
  const catStamp = useSaveStamp();
  const flagStamp = useSaveStamp();
  const themeStamp = useSaveStamp();

  useEffect(() => {
    setCategories(config.galleryCategories.items);
    setFlags(config.featureFlags.flags);
    setThemes(config.battleThemes.items);
  }, [config]);

  useEffect(() => {
    onDirtyChange('categories', JSON.stringify(categories) !== JSON.stringify(config.galleryCategories.items));
  }, [categories, config.galleryCategories.items]);
  useEffect(() => {
    onDirtyChange('flags', JSON.stringify(flags) !== JSON.stringify(config.featureFlags.flags));
  }, [flags, config.featureFlags.flags]);
  useEffect(() => {
    onDirtyChange('themes', JSON.stringify(themes) !== JSON.stringify(config.battleThemes.items));
  }, [themes, config.battleThemes.items]);

  const showCategories = !activeSection || activeSection === 'categories';
  const showFlags = !activeSection || activeSection === 'flags';
  const showThemes = !activeSection || activeSection === 'themes';

  function moveCategory(index: number, dir: -1 | 1) {
    const next = [...categories];
    const target = index + dir;
    if (target < 0 || target >= next.length) return;
    [next[index], next[target]] = [next[target], next[index]];
    setCategories(next);
  }
  function toggleCategoryVisible(index: number) {
    setCategories(categories.map((c, i) => (i === index ? { ...c, visible: !c.visible } : c)));
  }
  async function saveCategories() {
    await trpc.cms.setConfig.mutate({
      key: 'galleryCategories',
      value: { items: categories },
      expectedUpdatedAt: config.galleryCategories.updatedAt,
    });
    await refetch();
    catStamp.flash();
  }

  function toggleFlag(key: string) {
    setFlags({ ...flags, [key]: !flags[key] });
  }
  async function saveFlags() {
    await trpc.cms.setConfig.mutate({ key: 'featureFlags', value: { flags }, expectedUpdatedAt: config.featureFlags.updatedAt });
    await refetch();
    flagStamp.flash();
  }

  function addTheme() {
    if (!newTheme.trim()) return;
    setThemes([...themes, newTheme.trim()]);
    setNewTheme('');
  }
  function removeTheme(index: number) {
    setThemes(themes.filter((_, i) => i !== index));
  }
  async function saveThemes() {
    await trpc.cms.setConfig.mutate({ key: 'battleThemes', value: { items: themes }, expectedUpdatedAt: config.battleThemes.updatedAt });
    await refetch();
    themeStamp.flash();
  }

  return (
    <div className="space-y-8">
      {showCategories && (
        <section>
          <h3 className="label-mono mb-3">{t('admin_cms_categories')}</h3>
          <ul className="divide-y divide-fog border border-fog">
            {categories.map((c, i) => (
              <li key={c.category} className="flex items-center justify-between gap-3 px-3 py-2">
                <Switch checked={c.visible} onChange={() => toggleCategoryVisible(i)} label={c.category} />
                <div className="flex gap-1">
                  <button className="btn" disabled={i === 0} onClick={() => moveCategory(i, -1)}>
                    UP
                  </button>
                  <button className="btn" disabled={i === categories.length - 1} onClick={() => moveCategory(i, 1)}>
                    DOWN
                  </button>
                </div>
              </li>
            ))}
          </ul>
          <div className="mt-3 flex items-center gap-3">
            <button className="btn btn-primary" onClick={saveCategories}>
              {t('admin_cms_save')}
            </button>
            {catStamp.saved && <Stamp label={t('admin_cms_saved')} />}
          </div>
        </section>
      )}

      {showFlags && (
        <section className={showCategories ? 'border-t border-fog pt-6' : ''}>
          <h3 className="label-mono mb-3">{t('admin_cms_flags')}</h3>
          <ul className="divide-y divide-fog border border-fog">
            {Object.entries(flags).map(([key, value]) => (
              <li key={key} className="label-mono flex items-center justify-between px-3 py-2">
                <span className="text-bone">{key.toUpperCase()}</span>
                <button
                  className={`border px-3 py-1 ${value ? 'border-signal text-signal' : 'border-fog text-smoke'}`}
                  onClick={() => toggleFlag(key)}
                >
                  {value ? 'ENABLED' : 'DISABLED'}
                </button>
              </li>
            ))}
          </ul>
          <div className="mt-3 flex items-center gap-3">
            <button className="btn btn-primary" onClick={saveFlags}>
              {t('admin_cms_save')}
            </button>
            {flagStamp.saved && <Stamp label={t('admin_cms_saved')} />}
          </div>
        </section>
      )}

      {showThemes && (
        <section className={showCategories || showFlags ? 'border-t border-fog pt-6' : ''}>
          <h3 className="label-mono mb-3">{t('admin_cms_battle_themes')}</h3>
          <ul className="divide-y divide-fog border border-fog">
            {themes.map((theme, i) => (
              <li key={`${theme}-${i}`} className="label-mono flex items-center justify-between px-3 py-2">
                <span className="text-bone">{theme}</span>
                <button className="btn" onClick={() => removeTheme(i)}>
                  {t('forum_delete')}
                </button>
              </li>
            ))}
          </ul>
          <div className="mt-3 flex gap-2">
            <input className="input" value={newTheme} onChange={(e) => setNewTheme(e.target.value)} />
            <button className="btn" onClick={addTheme}>
              {t('admin_cms_battle_themes_add')}
            </button>
          </div>
          <div className="mt-3 flex items-center gap-3">
            <button className="btn btn-primary" onClick={saveThemes}>
              {t('admin_cms_save')}
            </button>
            {themeStamp.saved && <Stamp label={t('admin_cms_saved')} />}
          </div>
        </section>
      )}
    </div>
  );
}

function PricingTab({ config, refetch, onDirtyChange }: TabProps & { onDirtyChange: DirtyReporter }) {
  const { t } = useT();
  const [price, setPrice] = useState(config.pricing.pricePln);
  const [enabled, setEnabled] = useState(config.pricing.paywallEnabled);
  const stamp = useSaveStamp();

  useEffect(() => {
    setPrice(config.pricing.pricePln);
    setEnabled(config.pricing.paywallEnabled);
  }, [config]);

  useEffect(() => {
    onDirtyChange('pricing', price !== config.pricing.pricePln || enabled !== config.pricing.paywallEnabled);
  }, [price, enabled, config.pricing.pricePln, config.pricing.paywallEnabled]);

  async function save() {
    await trpc.cms.setConfig.mutate({
      key: 'pricing',
      value: { pricePln: price, paywallEnabled: enabled },
      expectedUpdatedAt: config.pricing.updatedAt,
    });
    await refetch();
    stamp.flash();
  }

  return (
    <div className="space-y-4">
      <label className="label-mono mb-1 block text-smoke">{t('admin_cms_pricing_price')}</label>
      <input
        type="number"
        min={20}
        max={30}
        className="input mb-3 max-w-xs"
        value={price}
        onChange={(e) => setPrice(Number(e.target.value))}
      />
      <div className="mb-3">
        <Switch checked={enabled} onChange={setEnabled} label={t('admin_cms_pricing_paywall')} />
      </div>
      <div className="flex items-center gap-3">
        <button className="btn btn-primary" onClick={save}>
          {t('admin_cms_save')}
        </button>
        {stamp.saved && <Stamp label={t('admin_cms_saved')} />}
      </div>
      <p className="label-mono mt-4">
        <Link to="/admin" className="text-signal hover:underline">
          {t('admin_cms_pricing_providers_link')}
        </Link>
      </p>
    </div>
  );
}

const LOCALE_CHOICES = ['en', 'pl', 'de'] as const;

function LocalesTab({ config, refetch, onDirtyChange }: TabProps & { onDirtyChange: DirtyReporter }) {
  const { t } = useT();
  const [locale, setLocale] = useState<(typeof LOCALE_CHOICES)[number]>('en');
  const [search, setSearch] = useState('');
  const [drafts, setDrafts] = useState<Record<string, string>>({});
  const stamp = useSaveStamp();

  useEffect(() => {
    onDirtyChange('locales', Object.keys(drafts).length > 0);
  }, [drafts]);

  const bundled = DICTIONARIES[locale];
  const overrides = config.localeOverrides.values[locale] ?? {};
  const keys = Object.keys(bundled).filter((k) => k.toLowerCase().includes(search.toLowerCase()));

  function switchLocale(next: (typeof LOCALE_CHOICES)[number]) {
    setLocale(next);
    setDrafts({});
  }

  async function saveAll() {
    const nextForLocale: Record<string, string> = { ...overrides };
    for (const [key, value] of Object.entries(drafts)) {
      if (value.trim()) nextForLocale[key] = value;
      else delete nextForLocale[key];
    }
    const values = { ...config.localeOverrides.values, [locale]: nextForLocale };
    await trpc.cms.setConfig.mutate({
      key: 'localeOverrides',
      value: { values },
      expectedUpdatedAt: config.localeOverrides.updatedAt,
    });
    setDrafts({});
    await refetch();
    stamp.flash();
  }

  return (
    <div className="space-y-4">
      <div className="flex flex-wrap items-center gap-4">
        <div className="flex gap-2">
          {LOCALE_CHOICES.map((loc) => (
            <button
              key={loc}
              className={`label-mono border px-3 py-1 ${locale === loc ? 'border-signal text-signal' : 'border-fog text-smoke'}`}
              onClick={() => switchLocale(loc)}
            >
              {loc.toUpperCase()}
            </button>
          ))}
        </div>
        <input
          className="input max-w-xs"
          placeholder={t('admin_cms_locales_search')}
          value={search}
          onChange={(e) => setSearch(e.target.value)}
        />
      </div>

      <div className="max-h-[50vh] overflow-y-auto border border-fog">
        <table className="w-full">
          <thead className="sticky top-0 bg-asphalt">
            <tr className="label-mono border-b border-fog text-smoke">
              <th className="px-3 py-2 text-left">KEY</th>
              <th className="px-3 py-2 text-left">{t('admin_cms_locales_default')}</th>
              <th className="px-3 py-2 text-left">{t('admin_cms_locales_override')}</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-fog">
            {keys.map((key) => (
              <tr key={key}>
                <td className="label-mono px-3 py-2 align-top text-smoke">{key}</td>
                <td className="px-3 py-2 align-top text-bone/70">{bundled[key]}</td>
                <td className="px-3 py-2">
                  <input
                    className="input"
                    value={drafts[key] ?? overrides[key] ?? ''}
                    onChange={(e) => setDrafts({ ...drafts, [key]: e.target.value })}
                  />
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      <div className="flex items-center gap-3">
        <button className="btn btn-primary" onClick={saveAll}>
          {t('admin_cms_save')}
        </button>
        {stamp.saved && <Stamp label={t('admin_cms_saved')} />}
      </div>
    </div>
  );
}

const LEGAL_LOCALES = ['pl', 'en', 'de'] as const;

function LegalTab({ config, refetch, onDirtyChange }: TabProps & { onDirtyChange: DirtyReporter }) {
  const { t } = useT();
  const [pl, setPl] = useState(config.legal.pl);
  const [en, setEn] = useState(config.legal.en);
  const [de, setDe] = useState(config.legal.de);
  const [version, setVersion] = useState(config.legal.version);
  const stamp = useSaveStamp();

  const fields: Record<(typeof LEGAL_LOCALES)[number], [string, (v: string) => void]> = {
    pl: [pl, setPl],
    en: [en, setEn],
    de: [de, setDe],
  };

  useEffect(() => {
    setPl(config.legal.pl);
    setEn(config.legal.en);
    setDe(config.legal.de);
    setVersion(config.legal.version);
  }, [config]);

  useEffect(() => {
    onDirtyChange(
      'legal',
      pl !== config.legal.pl || en !== config.legal.en || de !== config.legal.de || version !== config.legal.version
    );
  }, [pl, en, de, version, config.legal.pl, config.legal.en, config.legal.de, config.legal.version]);

  async function save() {
    await trpc.cms.setConfig.mutate({
      key: 'legal',
      value: { pl, en, de, version },
      expectedUpdatedAt: config.legal.updatedAt,
    });
    await refetch();
    stamp.flash();
  }

  return (
    <div className="space-y-4">
      <p className="label-mono text-blood">{t('admin_cms_legal_placeholder_warning')}</p>
      {LEGAL_LOCALES.map((loc) => {
        const [value, setValue] = fields[loc];
        return (
          <div key={loc}>
            <label className="label-mono mb-1 block text-smoke">
              {t('admin_cms_legal_text')} — {loc.toUpperCase()}
            </label>
            <textarea className="input mb-3 min-h-64" value={value} onChange={(e) => setValue(e.target.value)} />
          </div>
        );
      })}
      <label className="label-mono mb-1 block text-smoke">{t('admin_cms_legal_version')}</label>
      <input
        type="number"
        min={1}
        className="input mb-3 max-w-xs"
        value={version}
        onChange={(e) => setVersion(Math.max(1, Number(e.target.value)))}
      />
      <p className="label-mono mb-3 text-smoke">{t('admin_cms_legal_version_hint')}</p>
      <div className="flex items-center gap-3">
        <button className="btn btn-primary" onClick={save}>
          {t('admin_cms_save')}
        </button>
        {stamp.saved && <Stamp label={t('admin_cms_saved')} />}
      </div>
    </div>
  );
}

const TABS = [
  { key: 'content', labelKey: 'admin_cms_tab_content' },
  { key: 'pages', labelKey: 'admin_cms_tab_pages' },
  { key: 'categories', labelKey: 'admin_cms_tab_categories' },
  { key: 'pricing', labelKey: 'admin_cms_tab_pricing' },
  { key: 'locales', labelKey: 'admin_cms_tab_locales' },
  { key: 'legal', labelKey: 'admin_cms_tab_legal' },
] as const;

type TabKey = (typeof TABS)[number]['key'];

// Fine-grained sidebar list for the desktop shell — several of these live
// inside the same TABS group above (e.g. hero/announcement/nav/registration
// are all part of the 'content' tab) but get their own sidebar entry so a
// desktop admin can jump straight to one without scrolling past the rest.
const SECTIONS = [
  { key: 'hero', tabKey: 'content', labelKey: 'admin_cms_tab_content' },
  { key: 'announcement', tabKey: 'content', labelKey: 'admin_cms_announcement_text' },
  { key: 'nav', tabKey: 'content', labelKey: 'admin_cms_nav_order' },
  { key: 'registration', tabKey: 'content', labelKey: 'admin_cms_registration_title' },
  { key: 'pages', tabKey: 'pages', labelKey: 'admin_cms_tab_pages' },
  { key: 'categories', tabKey: 'categories', labelKey: 'admin_cms_categories' },
  { key: 'flags', tabKey: 'categories', labelKey: 'admin_cms_flags' },
  { key: 'themes', tabKey: 'categories', labelKey: 'admin_cms_battle_themes' },
  { key: 'pricing', tabKey: 'pricing', labelKey: 'admin_cms_tab_pricing' },
  { key: 'locales', tabKey: 'locales', labelKey: 'admin_cms_tab_locales' },
  { key: 'legal', tabKey: 'legal', labelKey: 'admin_cms_tab_legal' },
] as const;

type SectionKey = (typeof SECTIONS)[number]['key'];

const FIRST_SECTION_OF_TAB: Record<TabKey, SectionKey> = {
  content: 'hero',
  pages: 'pages',
  categories: 'categories',
  pricing: 'pricing',
  locales: 'locales',
  legal: 'legal',
};

// md: breakpoint (768px) — matches Layout.tsx's own desktop/mobile split.
function useIsDesktop() {
  const [isDesktop, setIsDesktop] = useState(() => window.matchMedia('(min-width: 768px)').matches);
  useEffect(() => {
    const mql = window.matchMedia('(min-width: 768px)');
    const handler = (e: MediaQueryListEvent) => setIsDesktop(e.matches);
    mql.addEventListener('change', handler);
    return () => mql.removeEventListener('change', handler);
  }, []);
  return isDesktop;
}

export function AdminCms() {
  const { t } = useT();
  const { config, loading, refetch } = useCms();
  const isDesktop = useIsDesktop();
  const [tab, setTab] = useState<TabKey>('content');
  const [section, setSection] = useState<SectionKey>('hero');
  const [dirty, setDirty] = useState<Partial<Record<SectionKey, boolean>>>({});

  function markDirty(key: string, value: boolean) {
    setDirty((prev) => (prev[key as SectionKey] === value ? prev : { ...prev, [key]: value }));
  }

  function selectTab(key: TabKey) {
    setTab(key);
    setSection(FIRST_SECTION_OF_TAB[key]);
  }

  function selectSection(key: SectionKey, tabKey: TabKey) {
    setTab(tabKey);
    setSection(key);
  }

  const tabIsDirty = (key: TabKey) => SECTIONS.some((s) => s.tabKey === key && dirty[s.key]);

  return (
    <ModulePage title={t('admin_cms_title')} icon="gate" tag="ADMIN / SITE CMS">
      {/* Mobile: unchanged horizontal tab strip, each tab renders its full stacked content. */}
      <div className="mb-6 flex flex-wrap gap-2 border-b border-fog pb-4 md:hidden">
        {TABS.map((tb) => (
          <button
            key={tb.key}
            className={`label-mono flex items-center gap-2 border px-3 py-1 transition-colors ${
              tab === tb.key ? 'border-signal text-signal' : 'border-fog text-smoke hover:text-bone'
            }`}
            onClick={() => selectTab(tb.key)}
          >
            {t(tb.labelKey)}
            {tabIsDirty(tb.key) && <span className="h-1.5 w-1.5 shrink-0 rounded-full bg-blood" title="Unsaved changes" />}
          </button>
        ))}
      </div>

      <div className="md:flex md:items-start md:gap-8">
        {/* Desktop: persistent sidebar, one section at a time, sticky on scroll. */}
        <aside className="hidden md:block md:w-52 md:shrink-0">
          <nav className="sticky top-6 flex flex-col gap-1">
            {SECTIONS.map((s) => (
              <button
                key={s.key}
                onClick={() => selectSection(s.key, s.tabKey)}
                className={`flex items-center justify-between gap-2 border-l-2 px-3 py-2 text-left font-mono text-[11px] uppercase tracking-[0.18em] transition-colors ${
                  section === s.key ? 'border-signal text-signal' : 'border-transparent text-smoke hover:text-bone'
                }`}
              >
                <span>{t(s.labelKey)}</span>
                {dirty[s.key] && <span className="h-1.5 w-1.5 shrink-0 rounded-full bg-blood" title="Unsaved changes" />}
              </button>
            ))}
          </nav>
        </aside>

        <div className="min-w-0 flex-1">
          {loading || !config ? (
            <p className="label-mono text-smoke">LOADING...</p>
          ) : (
            <>
              {tab === 'content' && (
                <ContentTab
                  config={config}
                  refetch={refetch}
                  activeSection={isDesktop ? (section as ContentSection) : undefined}
                  onDirtyChange={markDirty}
                />
              )}
              {tab === 'pages' && <PagesTab onDirtyChange={markDirty} />}
              {tab === 'categories' && (
                <CategoriesFlagsTab
                  config={config}
                  refetch={refetch}
                  activeSection={isDesktop ? (section as CategoriesSection) : undefined}
                  onDirtyChange={markDirty}
                />
              )}
              {tab === 'pricing' && <PricingTab config={config} refetch={refetch} onDirtyChange={markDirty} />}
              {tab === 'locales' && <LocalesTab config={config} refetch={refetch} onDirtyChange={markDirty} />}
              {tab === 'legal' && <LegalTab config={config} refetch={refetch} onDirtyChange={markDirty} />}
            </>
          )}
        </div>
      </div>
    </ModulePage>
  );
}
