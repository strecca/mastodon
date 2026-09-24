import { useState, useEffect, useCallback } from "react";

import { Link } from "react-router-dom";

import { Helmet } from "@unhead/react/helmet";

import BrushIcon from "@/material-icons/400-24px/brush.svg?react";
import CelebrationIcon from "@/material-icons/400-24px/celebration.svg?react";
import GroupsIcon from "@/material-icons/400-24px/groups.svg?react";
import HomeIcon from "@/material-icons/400-24px/home.svg?react";
import ManufacturingIcon from "@/material-icons/400-24px/manufacturing.svg?react";
import StarIcon from "@/material-icons/400-24px/star.svg?react";
import TagIcon from "@/material-icons/400-24px/tag.svg?react";
import TripIcon from "@/material-icons/400-24px/trip.svg?react";
import api from "flavours/glitch/api";
import { withIdentity } from "flavours/glitch/identity_context";
import { useSiteContent } from "flavours/glitch/hooks/useSiteContent";
import { useAppDispatch } from "flavours/glitch/store";

import { expandCommunityTimeline, refreshCommunityTimeline } from "../../actions/timelines";
import { TimelineWakeRefresh } from "../ui/components/timeline_wake_refresh";
import StatusListContainer from "../ui/containers/status_list_container";

// Backgrounds darkened from the Cinque Terre (Manarola) palette for WCAG AA white-text contrast
const TILE_DEFS = [
  { to: "/community_listings", Icon: TagIcon, key: "listings", bg: "#5A7A1A" },
  { to: "/community_events", Icon: CelebrationIcon, key: "events", bg: "#007A80" },
  { to: "/community_properties", Icon: HomeIcon, key: "properties", bg: "#8B2240" },
  { to: "/community_services", Icon: ManufacturingIcon, key: "services", bg: "#8B3E24" },
  { to: "/community_restaurants", Icon: StarIcon, key: "restaurants", bg: "#A8302A" },
  { to: "/community_artists", Icon: BrushIcon, key: "artists", bg: "#7A5410" },
  { to: "/community_visits", Icon: TripIcon, key: "visits", bg: "#6B1A30" },
  { to: "/member_stories", Icon: GroupsIcon, key: "stories", bg: "#2C3E7A" },
];

// Default labels/descs used until the API responds (avoids empty tiles on first paint)
const TILE_DEFAULTS = {
  listings: { label: "Community Listings", desc: "Giveaway · Trade · Sell · ISO" },
  events: { label: "Community Events", desc: "What's happening nearby" },
  properties: { label: "Community Properties", desc: "Houses · Apartments · Rentals" },
  services: { label: "Community Services", desc: "Local businesses & services" },
  restaurants: { label: "Community Restaurants", desc: "Dining · Cafés · Trattorias" },
  artists: { label: "Community Artists", desc: "Local talent & creatives" },
  visits: { label: "Community When I'm In Town", desc: "See who's visiting · Share your dates" },
  stories: { label: "Member Stories", desc: "Personal histories · Civezza connections" },
};

// Converts [text](url) markdown links and bare https:// URLs, same rendering rule as /daily.
const LINK_RE = /(\[[^\]]+\]\(https?:\/\/[^)]+\)|https?:\/\/\S+)/;
const renderParagraph = (text) => {
  const parts = text.split(LINK_RE);
  return parts.map((part, i) => {
    const mdMatch = part.match(/^\[([^\]]+)\]\((https?:\/\/[^)]+)\)$/);
    if (mdMatch) {
      const [, linkText, url] = mdMatch;
      return (
        <a key={i} href={url} className="fd-digest__link" target="_blank" rel="noopener noreferrer">
          {linkText}
        </a>
      );
    }
    if (part.match(/^https?:\/\/\S+$/)) {
      return (
        <a
          key={i}
          href={part}
          className="fd-digest__link"
          target="_blank"
          rel="noopener noreferrer"
        >
          {part}
        </a>
      );
    }
    return part;
  });
};

const CommunityLanding = ({ identity }) => {
  const dispatch = useAppDispatch();
  const signedIn = identity?.signedIn;
  const isAdmin = identity?.permissions === 1;
  const sc = useSiteContent();

  const [pane, setPane] = useState("live");

  useEffect(() => {
    dispatch(expandCommunityTimeline());
  }, [dispatch]);

  const [digest, setDigest] = useState(null);
  const [digestLoading, setDigestLoading] = useState(true);
  const [digestError, setDigestError] = useState(null);
  const [digestLocale, setDigestLocale] = useState("it");

  useEffect(() => {
    let alive = true;
    setDigestLoading(true);
    api()
      .get("/api/v1/community_daily_digests/today")
      .then((res) => {
        if (alive) setDigest(res.data);
      })
      .catch((err) => {
        if (alive) setDigestError(err?.response?.status === 404 ? "no_digest" : "error");
      })
      .finally(() => {
        if (alive) setDigestLoading(false);
      });
    return () => {
      alive = false;
    };
  }, []);

  const scrollToBoard = useCallback(() => {
    document.getElementById("fd-board")?.scrollIntoView({ behavior: "smooth", block: "start" });
  }, []);

  // "Click here to see All Community Categories" (category_banner_link.jsx)
  // links here with a #fd-board hash so the board is reachable in one
  // click from any category page, instead of landing on Live Posts first
  // and requiring a second click on the Community tab. Deferred one tick
  // so the board (below the Live Posts pane) has actually laid out before
  // scrollIntoView runs.
  useEffect(() => {
    if (window.location.hash === "#fd-board") {
      const timeout = setTimeout(scrollToBoard, 0);
      return () => clearTimeout(timeout);
    }
  }, [scrollToBoard]);

  const digestContent = digest
    ? (digestLocale === "it" ? digest.content_it : digest.content_en) ||
      digest.content_it ||
      digest.content_en
    : null;
  const digestParagraphs = digestContent
    ? digestContent.split(/\n+/).filter((p) => p.trim().length > 0)
    : [];

  return (
    <div className="fd scrollable">
      <Helmet>
        <title>{sc("landing_logo_text", "Civezza Community Directory")}</title>
        <meta
          name="description"
          content={sc("landing_hero_tagline", "Explore everything our community has to offer")}
        />
      </Helmet>

      <header className="fd__header">
        <img
          className="fd__header-logo"
          src="/miacivezza-sun-small.png"
          alt="MiaCivezza.com"
          width="600"
          height="303"
        />
        <p className="fd__header-tagline">
          {sc("landing_hero_tagline", "Explore everything our community has to offer")}
        </p>
      </header>

      <div className="fd__toggle-row">
        <div
          className="fd__toggle"
          role="tablist"
          aria-label="Show live posts, the daily digest, or the community board"
        >
          <button
            type="button"
            role="tab"
            aria-pressed={pane === "live"}
            className={pane === "live" ? "active" : ""}
            onClick={() => setPane("live")}
          >
            Live Posts
          </button>
          <button
            type="button"
            role="tab"
            aria-pressed={pane === "digest"}
            className={pane === "digest" ? "active" : ""}
            onClick={() => setPane("digest")}
          >
            Daily Digest
          </button>
          <button type="button" role="tab" aria-pressed={false} onClick={scrollToBoard}>
            Community
          </button>
        </div>
      </div>

      <section className="fd__feed">
        {pane === "live" && (
          <div className="fd__live-pane">
            <StatusListContainer
              scrollKey="front_door_live"
              timelineId="community"
              maxItems={10}
              bindToDocument
              emptyMessage="The local timeline is empty. Write something publicly to get the ball rolling!"
            />
            <TimelineWakeRefresh feedKey="front_door" refresh={() => refreshCommunityTimeline()} />
            <div className="fd__see-all">
              <Link to="/public/local">See all Live Posts →</Link>
            </div>
          </div>
        )}

        {pane === "digest" && (
          <div className="fd__digest-pane">
            <div className="fd__digest-head">
              <span className="fd__digest-title">MiaCivezza — Notiziario della Comunità</span>
              <div className="fd__digest-locale">
                <button
                  type="button"
                  className={digestLocale === "it" ? "active" : ""}
                  onClick={() => setDigestLocale("it")}
                >
                  IT
                </button>
                <button
                  type="button"
                  className={digestLocale === "en" ? "active" : ""}
                  onClick={() => setDigestLocale("en")}
                >
                  EN
                </button>
              </div>
            </div>

            {digestLoading && <div className="fd__digest-empty">Loading…</div>}

            {!digestLoading && digestError === "no_digest" && (
              <div className="fd__digest-empty">
                Today's Notiziario isn't ready yet — it's generated each morning at 7:00 Italy time.
              </div>
            )}
            {!digestLoading && digestError === "error" && (
              <div className="fd__digest-empty">
                Couldn't load today's digest right now. Please try again shortly.
              </div>
            )}

            {!digestLoading && !digestError && digestParagraphs.length > 0 && (
              <>
                {digestParagraphs.map((p, i) => (
                  <p key={i} className="fd__digest-paragraph">
                    {renderParagraph(p)}
                  </p>
                ))}
                <div className="fd__see-all">
                  <Link to="/daily">Read past editions →</Link>
                </div>
              </>
            )}
          </div>
        )}
      </section>

      {!signedIn && (
        <section className="fd__cta-band">
          <span>📌</span>
          <strong>New here?</strong>
          <span>{sc("landing_join_footer", "Registration is free. Come join us!")}</span>
          <a href="/auth/sign_up" className="fd__btn fd__btn--primary">
            {sc("landing_create_account", "Create Account")}
          </a>
          <a href="/auth/sign_in" className="fd__btn fd__btn--ghost">
            {sc("landing_login_link", "Log In")}
          </a>
        </section>
      )}

      <section className="fd__board" id="fd-board">
        <div className="fd__board-head">
          <h2>The Board</h2>
          <p>Every kind of local post in one place — tap a category to open it.</p>
        </div>
        <div className="fd__tiles">
          {TILE_DEFS.map(({ to, Icon, key, bg }) => (
            <Link key={to} to={to} className="fd__tile" style={{ "--tile-bg": bg }}>
              <span className="fd__tile-icon-wrap">
                <Icon />
              </span>
              <span className="fd__tile-label">
                {sc(`tile_${key}_label`, TILE_DEFAULTS[key].label)}
              </span>
              <span className="fd__tile-desc">
                {sc(`tile_${key}_desc`, TILE_DEFAULTS[key].desc)}
              </span>
              <span className="fd__tile-arrow">→</span>
            </Link>
          ))}
        </div>
        <div className="fd__board-foot">
          <Link to="/guide">How It Works →</Link>
          <Link to="/directory">Browse Profiles →</Link>
        </div>
      </section>

      {isAdmin && (
        <div className="fd__admin-bar">
          <a href="/admin/site_settings/edit">✏️ Edit page text &amp; translations</a>
        </div>
      )}
    </div>
  );
};

export default withIdentity(CommunityLanding);
