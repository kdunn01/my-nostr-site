import React, { useEffect, useMemo, useRef, useState } from "react";
import { SimplePool, getEventHash, nip19, verifyEvent } from "nostr-tools";

/** ──────────────────────────────────────────────────────────────────────────
 *  CONFIG — set this to YOUR npub so the Admin face only unlocks for you
 *  Example: "npub1abc...xyz"
 *  ────────────────────────────────────────────────────────────────────────── */
const OWNER_NPUB = "npub1u7nlv2y4uswu2cde227cmzz8ytkhvq3w4pg6wyku0345vulzge6q85tzwm";

/** Default relays (editable in Settings) */
const DEFAULT_RELAYS = [
  "wss://relay.damus.io",
  "wss://relay.snort.social",
  "wss://relay.nostr.band",
  "wss://nos.lol",
  "wss://eden.nostr.land",
];

/** Minimal hash router (no extra deps) */
function useRoute() {
  const [hash, setHash] = useState(() => window.location.hash || "#/");
  useEffect(() => {
    const onHash = () => setHash(window.location.hash || "#/");
    window.addEventListener("hashchange", onHash);
    return () => window.removeEventListener("hashchange", onHash);
  }, []);
  const path = hash.replace(/^#/, "");
  return path || "/";
}

/** Simple UI primitives */
const Card = ({ title, right, children }) => (
  <section
    style={{
      border: "1px solid #e5e7eb",
      borderRadius: 14,
      padding: 16,
      background: "#fff",
      boxShadow: "0 1px 2px rgba(0,0,0,0.03)",
    }}
  >
    {(title || right) && (
      <div
        style={{
          display: "flex",
          justifyContent: "space-between",
          alignItems: "baseline",
          gap: 12,
          marginBottom: 8,
        }}
      >
        {title ? (
          <h3 style={{ margin: 0, fontSize: 16, fontWeight: 700 }}>{title}</h3>
        ) : (
          <div />
        )}
        {right}
      </div>
    )}
    {children}
  </section>
);

const Label = ({ children }) => (
  <div style={{ fontSize: 12, color: "#6b7280", marginBottom: 6 }}>{children}</div>
);

const Input = (props) => (
  <input
    {...props}
    style={{
      width: "100%",
      padding: 10,
      border: "1px solid #d1d5db",
      borderRadius: 10,
      outline: "none",
    }}
  />
);

const TextArea = (props) => (
  <textarea
    {...props}
    style={{
      width: "100%",
      padding: 10,
      border: "1px solid #d1d5db",
      borderRadius: 10,
      minHeight: 120,
      outline: "none",
      resize: "vertical",
    }}
  />
);

const Button = ({ variant = "primary", ...props }) => {
  const styles =
    variant === "primary"
      ? {
          background: "#111827",
          color: "#fff",
          border: "1px solid #111827",
        }
      : {
          background: "#fff",
          color: "#111827",
          border: "1px solid #d1d5db",
        };
  return (
    <button
      {...props}
      style={{
        padding: "10px 14px",
        borderRadius: 10,
        fontWeight: 600,
        ...styles,
      }}
    />
  );
};

function Pill({ children }) {
  return (
    <span
      style={{
        display: "inline-flex",
        alignItems: "center",
        gap: 6,
        padding: "2px 8px",
        borderRadius: 999,
        border: "1px solid #e5e7eb",
        fontSize: 12,
        color: "#374151",
        background: "#fff",
      }}
    >
      {children}
    </span>
  );
}

function MediaPreview({ url }) {
  if (!url) return null;
  const isVideo = /\.(mp4|webm|ogg)$/i.test(url);
  const isImage = /\.(png|jpe?g|gif|webp|avif|svg)$/i.test(url);
  return (
    <div
      style={{
        marginTop: 12,
        border: "1px solid #e5e7eb",
        borderRadius: 12,
        overflow: "hidden",
        background: "#fafafa",
      }}
    >
      {isVideo ? (
        <video controls style={{ width: "100%" }}>
          <source src={url} />
        </video>
      ) : isImage ? (
        <img src={url} alt="media" style={{ width: "100%", height: "auto" }} />
      ) : (
        <a
          href={url}
          target="_blank"
          rel="noreferrer"
          style={{ display: "block", padding: 12, color: "#2563eb" }}
        >
          Open media
        </a>
      )}
    </div>
  );
}

/** Public sections */
function PublicHome({ events }) {
  const notes = events.filter((e) => e.kind === 1);
  const blogs = events.filter((e) => e.kind === 30023);
  const media = events.filter((e) => e.tags.some((t) => t[0] === "r"));

  return (
    <div style={{ display: "grid", gap: 16 }}>
      <Card title="Latest Blog Posts">
        {blogs.length === 0 ? (
          <EmptyState text="No blog posts yet." />
        ) : (
          <div style={{ display: "grid", gap: 12 }}>
            {blogs.slice(0, 6).map((ev) => (
              <article key={ev.id} style={{ display: "grid", gap: 6 }}>
                <div style={{ display: "flex", gap: 8, alignItems: "center" }}>
                  <Pill>Blog</Pill>
                  <span style={{ fontSize: 12, color: "#6b7280" }}>
                    {new Date(ev.created_at * 1000).toLocaleString()}
                  </span>
                </div>
                <a
                  href={`#/post/${ev.id}`}
                  style={{ fontWeight: 700, fontSize: 18, color: "#111827", textDecoration: "none" }}
                >
                  {ev.tags.find((t) => t[0] === "title")?.[1] || "Untitled"}
                </a>
                <div style={{ color: "#374151", whiteSpace: "pre-wrap" }}>
                  {ev.content.length > 200 ? ev.content.slice(0, 200) + "…" : ev.content}
                </div>
              </article>
            ))}
          </div>
        )}
      </Card>

      <Card title="Recent Notes">
        {notes.length === 0 ? (
          <EmptyState text="No notes yet." />
        ) : (
          <div style={{ display: "grid", gap: 12 }}>
            {notes.slice(0, 10).map((ev) => (
              <article key={ev.id} style={{ display: "grid", gap: 6 }}>
                <div style={{ display: "flex", gap: 8, alignItems: "center" }}>
                  <Pill>Note</Pill>
                  <span style={{ fontSize: 12, color: "#6b7280" }}>
                    {new Date(ev.created_at * 1000).toLocaleString()}
                  </span>
                  <a
                    href={`https://njump.me/${ev.id}`}
                    target="_blank"
                    rel="noreferrer"
                    style={{ marginLeft: "auto", fontSize: 12, color: "#2563eb" }}
                  >
                    view on relay
                  </a>
                </div>
                <div style={{ color: "#374151", whiteSpace: "pre-wrap" }}>{ev.content}</div>
              </article>
            ))}
          </div>
        )}
      </Card>

      <Card title="Media">
        {media.length === 0 ? (
          <EmptyState text="No media yet." />
        ) : (
          <div
            style={{
              display: "grid",
              gap: 12,
              gridTemplateColumns: "repeat(auto-fill, minmax(240px, 1fr))",
            }}
          >
            {media.slice(0, 12).map((ev, idx) => {
              const urls = ev.tags.filter((t) => t[0] === "r").map((t) => t[1]);
              return urls.map((u, i) => (
                <div key={ev.id + ":" + i} style={{ display: "grid" }}>
                  <MediaPreview url={u} />
                  <div style={{ fontSize: 12, color: "#6b7280", marginTop: 6 }}>
                    {new Date(ev.created_at * 1000).toLocaleDateString()}
                  </div>
                </div>
              ));
            })}
          </div>
        )}
      </Card>
    </div>
  );
}

function BlogPostPage({ events, id }) {
  const ev = events.find((e) => e.id === id);
  if (!ev) return <EmptyState text="Post not found." />;
  const title = ev.tags.find((t) => t[0] === "title")?.[1] || "Untitled";
  return (
    <div style={{ display: "grid", gap: 16 }}>
      <Card
        title={title}
        right={
          <a href={`https://njump.me/${ev.id}`} target="_blank" rel="noreferrer" style={{ fontSize: 12 }}>
            view on relay
          </a>
        }
      >
        <div style={{ fontSize: 12, color: "#6b7280" }}>
          {new Date(ev.created_at * 1000).toLocaleString()}
        </div>
        <div style={{ marginTop: 12, whiteSpace: "pre-wrap", lineHeight: 1.6 }}>{ev.content}</div>
        {ev.tags
          .filter((t) => t[0] === "r")
          .map((t, i) => (
            <MediaPreview key={i} url={t[1]} />
          ))}
      </Card>
      <div>
        <a href="#/" style={{ color: "#2563eb" }}>
          ← Back to home
        </a>
      </div>
    </div>
  );
}

/** Admin dashboard (compose + filters) */
function AdminDashboard({
  pubkey,
  npub,
  relays,
  setRelays,
  status,
  setStatus,
  publishNote,
  note,
  setNote,
  publishBlog,
  blogTitle,
  setBlogTitle,
  blogBody,
  setBlogBody,
  publishMedia,
  mediaUrl,
  setMediaUrl,
  mediaCaption,
  setMediaCaption,
  fetchFeed,
  since,
  setSince,
  authorFilter,
  setAuthorFilter,
}) {
  return (
    <div style={{ display: "grid", gap: 16 }}>
      <Card
        title="Compose"
        right={<span style={{ fontSize: 12, color: "#6b7280" }}>{status}</span>}
      >
        <div
          style={{
            display: "grid",
            gap: 16,
            gridTemplateColumns: "repeat(auto-fit, minmax(300px, 1fr))",
          }}
        >
          <div>
            <Label>Short Post</Label>
            <TextArea value={note} onChange={(e) => setNote(e.target.value)} placeholder="Share a thought…" />
            <div style={{ display: "flex", gap: 8, justifyContent: "flex-end", marginTop: 8 }}>
              <Button variant="secondary" onClick={() => setNote("")}>
                Clear
              </Button>
              <Button onClick={publishNote}>Publish</Button>
            </div>
          </div>

          <div>
            <Label>Blog Post</Label>
            <Input value={blogTitle} onChange={(e) => setBlogTitle(e.target.value)} placeholder="A meaningful title" />
            <div style={{ height: 8 }} />
            <TextArea value={blogBody} onChange={(e) => setBlogBody(e.target.value)} placeholder="Write here…" />
            <div style={{ display: "flex", gap: 8, justifyContent: "flex-end", marginTop: 8 }}>
              <Button variant="secondary" onClick={() => { setBlogTitle(""); setBlogBody(""); }}>
                Clear
              </Button>
              <Button onClick={publishBlog}>Publish</Button>
            </div>
          </div>

          <div>
            <Label>Photo / Video</Label>
            <Input value={mediaUrl} onChange={(e) => setMediaUrl(e.target.value)} placeholder="https://… (image or video URL)" />
            <div style={{ height: 8 }} />
            <TextArea value={mediaCaption} onChange={(e) => setMediaCaption(e.target.value)} placeholder="Say something about this media…" />
            <div style={{ display: "flex", gap: 8, justifyContent: "flex-end", marginTop: 8 }}>
              <Button variant="secondary" onClick={() => { setMediaUrl(""); setMediaCaption(""); }}>
                Clear
              </Button>
              <Button onClick={publishMedia}>Publish</Button>
            </div>
          </div>
        </div>
      </Card>

      <Card title="Feed Controls">
        <div style={{ display: "grid", gap: 12, gridTemplateColumns: "repeat(auto-fit, minmax(240px, 1fr))" }}>
          <div>
            <Label>Author (npub)</Label>
            <Input value={authorFilter} onChange={(e) => setAuthorFilter(e.target.value)} placeholder="npub1… (optional)" />
          </div>
          <div>
            <Label>Since</Label>
            <select
              onChange={(e) => setSince(parseInt(e.target.value, 10))}
              style={{ width: "100%", padding: 10, border: "1px solid #d1d5db", borderRadius: 10 }}
            >
              {[
                ["24 hours", 60 * 60 * 24],
                ["7 days", 60 * 60 * 24 * 7],
                ["30 days", 60 * 60 * 24 * 30],
                ["1 year", 60 * 60 * 24 * 365],
              ].map(([label, sec]) => {
                const val = Math.floor(Date.now() / 1000) - sec;
                return (
                  <option key={sec} value={val}>
                    {label}
                  </option>
                );
              })}
            </select>
          </div>
          <div style={{ alignSelf: "end" }}>
            <Button variant="secondary" onClick={fetchFeed}>
              Refresh Feed
            </Button>
          </div>
        </div>
      </Card>

      <Card title="Relays">
        <div style={{ display: "grid", gap: 8 }}>
          {relays.map((r, i) => (
            <div key={i} style={{ display: "flex", gap: 8 }}>
              <Input
                value={r}
                onChange={(e) => {
                  const copy = relays.slice();
                  copy[i] = e.target.value;
                  setRelays(copy);
                }}
              />
              <Button variant="secondary" onClick={() => setRelays(relays.filter((_, idx) => idx !== i))}>
                remove
              </Button>
            </div>
          ))}
          <Button variant="secondary" onClick={() => setRelays([...relays, "wss://"])}>+ add relay</Button>
        </div>
        <div style={{ marginTop: 12, fontSize: 12, color: "#6b7280" }}>
          Connected as: <span style={{ fontFamily: "monospace" }}>{npub || "not connected"}</span>
        </div>
      </Card>
    </div>
  );
}

const EmptyState = ({ text }) => (
  <div
    style={{
      border: "1px dashed #d1d5db",
      borderRadius: 12,
      padding: 16,
      color: "#6b7280",
      textAlign: "center",
      background: "#fafafa",
    }}
  >
    {text}
  </div>
);

/** Main App */
export default function App() {
  const route = useRoute(); // "/", "/post/:id", "/admin"
  const [relays, setRelays] = useState(DEFAULT_RELAYS);
  const poolRef = useRef(null);

  // identity
  const [pubkey, setPubkey] = useState("");
  const [npub, setNpub] = useState("");

  // status
  const [status, setStatus] = useState("");

  // compose state
  const [note, setNote] = useState("");
  const [blogTitle, setBlogTitle] = useState("");
  const [blogBody, setBlogBody] = useState("");
  const [mediaUrl, setMediaUrl] = useState("");
  const [mediaCaption, setMediaCaption] = useState("");

  // feed data
  const [events, setEvents] = useState([]);
  const [since, setSince] = useState(() => Math.floor(Date.now() / 1000) - 60 * 60 * 24 * 7);
  const [authorFilter, setAuthorFilter] = useState("");

  // init pool
  useEffect(() => {
    const pool = new SimplePool();
    poolRef.current = pool;
    return () => {
      try {
        pool.close(relays);
      } catch {}
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // npub
  useEffect(() => {
    if (pubkey) {
      try {
        setNpub(nip19.npubEncode(pubkey));
      } catch {}
    } else {
      setNpub("");
    }
  }, [pubkey]);

  const isOwner = useMemo(() => {
    try {
      if (!OWNER_NPUB) return false;
      const d = nip19.decode(OWNER_NPUB);
      if (d.type !== "npub") return false;
      const ownerHex = d.data;
      return !!pubkey && ownerHex === pubkey;
    } catch {
      return false;
    }
  }, [pubkey]);

  async function connect() {
    if (!window.nostr) {
      alert("Install a NIP-07 signer like Alby.");
      return;
    }
    try {
      const pk = await window.nostr.getPublicKey();
      setPubkey(pk);
    } catch (e) {
      console.error(e);
      alert("Failed to connect");
    }
  }

  /** FEED: uses subscribeMany with handlers (avoids onauth error) */
  async function fetchFeed() {
    setStatus("Loading…");
    try {
      const filters = [{ kinds: [1, 30023], since }]

// If the user explicitly set an author, use that…
if (authorFilter) {
  try {
    const d = nip19.decode(authorFilter)
    if (d.type === 'npub') filters[0].authors = [d.data]
  } catch {}
} else {
  // …otherwise default to the site owner
  const oh = ownerHex()
  if (oh) filters[0].authors = [oh]
}

      const pool = poolRef.current;
      if (!pool) throw new Error("Pool not ready");
      const out = [];

      const sub = pool.subscribeMany(relays, filters, {
        onevent: (ev) => out.push(ev),
        oneose: () => {
          try {
            sub.close();
          } catch {}
        },
        onerror: (err, relay) => {
          console.warn("relay error:", relay?.url || "(unknown)", err);
        },
        onnotice: (notice, relay) => {
          console.warn("relay notice:", relay?.url || "(unknown)", notice);
        },
      });

      await new Promise((resolve) => {
        setTimeout(() => {
          try {
            sub.close();
          } catch {}
          resolve();
        }, 8000);
      });

      out.sort((a, b) => b.created_at - a.created_at);
      setEvents(out);
      setStatus(out.length ? "" : "No posts found. Try widening filters.");
    } catch (e) {
      console.error("Feed error:", e);
      setStatus(`Failed to load: ${String(e?.message || e)}`);
    }
  }

  useEffect(() => {
    fetchFeed();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [since, authorFilter, relays.join(","), pubkey]);

  /** Publish helpers */
  async function publish(content, kind = 1, tags = []) {
    if (!window.nostr) {
      alert("No NIP-07 signer");
      return;
    }
    if (!pubkey) await connect();

    const ev = {
      kind,
      created_at: Math.floor(Date.now() / 1000),
      tags,
      content,
      pubkey: await window.nostr.getPublicKey(),
    };
    ev.id = getEventHash(ev);
    const signed = await window.nostr.signEvent(ev);
    if (!verifyEvent(signed)) {
      alert("Signature invalid");
      return;
    }

    setStatus("Publishing…");
    try {
      const pub = poolRef.current.publish(relays, signed);
      await new Promise((resolve, reject) => {
        let ok = false;
        pub.on("ok", () => {
          ok = true;
          resolve();
        });
        pub.on("failed", (r) => {
          if (!ok) reject(new Error(r));
        });
        setTimeout(() => resolve(), 2500);
      });
      setStatus("Published ✔");
      setTimeout(() => setStatus(""), 1200);
      fetchFeed();
    } catch (e) {
      console.error(e);
      setStatus("Publish failed");
    }
  }

  const publishNote = async () => {
    if (!isOwner) return alert("Not authorized.");
    if (!note.trim()) return;
    await publish(note.trim(), 1, []);
    setNote("");
  };

  const publishBlog = async () => {
    if (!isOwner) return alert("Not authorized.");
    if (!blogTitle.trim() || !blogBody.trim()) return;
    await publish(blogBody.trim(), 30023, [["title", blogTitle.trim()]]);
    setBlogTitle("");
    setBlogBody("");
  };

  const publishMedia = async () => {
    if (!isOwner) return alert("Not authorized.");
    if (!mediaUrl.trim()) return;
    const c = (mediaCaption ? mediaCaption + "\n\n" : "") + mediaUrl.trim();
    await publish(c, 1, mediaUrl ? [["r", mediaUrl.trim()]] : []);
    setMediaUrl("");
    setMediaCaption("");
  };

  /** Layout (shared) */
  function Header() {
    return (
      <header
        style={{
          position: "sticky",
          top: 0,
          zIndex: 10,
          backdropFilter: "saturate(180%) blur(6px)",
          background: "rgba(255,255,255,0.8)",
          borderBottom: "1px solid #e5e7eb",
        }}
      >
        <div
          style={{
            maxWidth: 1100,
            margin: "0 auto",
            display: "flex",
            alignItems: "center",
            gap: 12,
            justifyContent: "space-between",
            padding: "12px 16px",
          }}
        >
          <a href="#/" style={{ textDecoration: "none", color: "#111827" }}>
            <div style={{ fontWeight: 800, fontSize: 18 }}>My Nostr Site</div>
          </a>
          <nav style={{ display: "flex", gap: 10 }}>
            <a href="#/" style={linkStyle(route === "/")}>Home</a>
            <a href="#/admin" style={linkStyle(route.startsWith("/admin"))}>Admin</a>
            <a href="#/about" style={linkStyle(route === "/about")}>About</a>
          </nav>
          <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
            <Pill>{relays.length} relays</Pill>
            {pubkey ? (
              <span style={{ fontSize: 12, color: "#6b7280", maxWidth: 240, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>
                {npub}
              </span>
            ) : (
              <Button onClick={connect}>Connect Nostr</Button>
            )}
          </div>
        </div>
      </header>
    );
  }

  function Footer() {
    return (
      <footer style={{ maxWidth: 1100, margin: "28px auto 60px", fontSize: 12, color: "#6b7280", textAlign: "center" }}>
        Built on Nostr · Notes (kind 1) · Blog (kind 30023)
      </footer>
    );
  }

  const containerStyle = { maxWidth: 1100, margin: "16px auto", padding: "0 16px" };

  /** Routes */
  let content = null;
  if (route === "/") {
    content = <PublicHome events={events} />;
  } else if (route.startsWith("/post/")) {
    const id = route.replace("/post/", "");
    content = <BlogPostPage events={events} id={id} />;
  } else if (route.startsWith("/admin")) {
    content = isOwner ? (
      <AdminDashboard
        pubkey={pubkey}
        npub={npub}
        relays={relays}
        setRelays={setRelays}
        status={status}
        setStatus={setStatus}
        publishNote={publishNote}
        note={note}
        setNote={setNote}
        publishBlog={publishBlog}
        blogTitle={blogTitle}
        setBlogTitle={setBlogTitle}
        blogBody={blogBody}
        setBlogBody={setBlogBody}
        publishMedia={publishMedia}
        mediaUrl={mediaUrl}
        setMediaUrl={setMediaUrl}
        mediaCaption={mediaCaption}
        setMediaCaption={setMediaCaption}
        fetchFeed={fetchFeed}
        since={since}
        setSince={setSince}
        authorFilter={authorFilter}
        setAuthorFilter={setAuthorFilter}
      />
    ) : (
      <Card title="Admin">
        <p style={{ marginTop: 0 }}>
          This dashboard is restricted. Connect with the owner’s Nostr key to unlock.
        </p>
        <p style={{ fontSize: 12, color: "#6b7280" }}>Expected owner: {OWNER_NPUB || "(unset)"}</p>
      </Card>
    );
  } else if (route === "/about") {
    content = (
      <Card title="About">
        <p style={{ marginTop: 0 }}>
          Welcome to my Nostr-powered home on the web. Short notes, long-form posts, and media live on decentralized relays and here on my domain.
        </p>
      </Card>
    );
  } else {
    content = <EmptyState text="Page not found." />;
  }

  return (
    <div style={{ minHeight: "100vh", background: "#f3f4f6" }}>
      <Header />
      <main style={containerStyle}>{content}</main>
      <Footer />
    </div>
  );
}

function linkStyle(active) {
  return {
    fontSize: 14,
    color: active ? "#111827" : "#374151",
    textDecoration: "none",
    fontWeight: active ? 700 : 500,
    padding: "6px 8px",
    borderRadius: 8,
    background: active ? "#e5e7eb" : "transparent",
  };
}
