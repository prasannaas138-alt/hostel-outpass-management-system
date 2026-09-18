import { useEffect, useMemo, useState } from "react";
import api from "../services/api";
import { useAuth } from "../context/AuthContext";
import WardenProfile from "../components/WardenProfile";
import RequestReviewCard from "../components/RequestReviewCard";
import AlertBanner from "../components/AlertBanner";
import LoadingState from "../components/LoadingState";
import ErrorState from "../components/ErrorState";
import NotificationBell from "../components/NotificationBell";
import {
  IconHome,
  IconClock,
  IconCheck,
  IconUsers,
  IconAlert,
  IconMenu,
  IconClose,
  IconHistory,
  IconUser,
  IconLogout,
  IconSearch,
} from "../components/WardenIcons";
import "../styles/warden-dashboard.css";
import "../styles/sister-dashboard.css";

const statusClass = (status) => {
  const value = String(status || "Pending").toLowerCase();
  if (value.includes("approved")) return "wd-pill--approved";
  if (value.includes("reject")) return "wd-pill--rejected";
  if (value.includes("expired")) return "wd-pill--expired";
  return "wd-pill--pending";
};

export default function SisterDashboard() {
  const { user, logout } = useAuth();
  const [items, setItems] = useState([]);
  const [history, setHistory] = useState([]);
  const [stats, setStats] = useState({
    totalStudents: 0,
    pendingApprovals: 0,
    approvedToday: 0,
    expiredOutpasses: 0,
  });
  const [error, setError] = useState("");
  const [success, setSuccess] = useState("");
  const [loading, setLoading] = useState(true);
  const [loadError, setLoadError] = useState("");
  const [loadingId, setLoadingId] = useState("");
  const [activeRejectId, setActiveRejectId] = useState("");
  const [reasonById, setReasonById] = useState({});
  const [profileOpen, setProfileOpen] = useState(false);
  const [drawerOpen, setDrawerOpen] = useState(false);
  const [search, setSearch] = useState("");

  const firstName = useMemo(
    () => (user?.name || "Sister").split(" ")[0],
    [user],
  );
  const initial = firstName.charAt(0).toUpperCase();
  const today = useMemo(
    () =>
      new Date().toLocaleDateString(undefined, {
        weekday: "short",
        day: "numeric",
        month: "short",
        year: "numeric",
      }),
    [],
  );
  const visibleHistory = useMemo(() => {
    const term = search.trim().toLowerCase();
    return term
      ? history.filter((item) =>
          String(item.studentName || "")
            .toLowerCase()
            .includes(term),
        )
      : history;
  }, [history, search]);

  const loadItems = async () => {
    setLoading(true);
    setLoadError("");
    try {
      const { data } = await api.get("/outpasses/pending/sister");
      setItems(data);
    } catch (err) {
      setLoadError(err.response?.data?.message || "Failed to load requests");
    } finally {
      setLoading(false);
    }
  };

  const loadHistory = async () => {
    try {
      const { data } = await api.get("/outpasses/history/sister");
      setHistory(data);
    } catch {
      setHistory([]);
    }
  };

  const loadStats = async () => {
    try {
      const { data } = await api.get("/outpasses/sister/stats");
      setStats(data);
    } catch {
      setStats({
        totalStudents: 0,
        pendingApprovals: 0,
        approvedToday: 0,
        expiredOutpasses: 0,
      });
    }
  };

  useEffect(() => {
    loadItems();
    loadHistory();
    loadStats();
  }, []);

  const review = async (id, action) => {
    setError("");
    setSuccess("");
    setLoadingId(id);
    try {
      await api.patch(`/outpasses/${id}/sister`, {
        action,
        rejectionReason: reasonById[id] || "",
      });
      setReasonById((current) => ({ ...current, [id]: "" }));
      setActiveRejectId("");
      setSuccess(
        action === "approve"
          ? "Request moved to Warden review."
          : "Request rejected.",
      );
      await Promise.all([loadItems(), loadHistory(), loadStats()]);
    } catch (err) {
      setError(err.response?.data?.message || "Failed to review request");
    } finally {
      setLoadingId("");
    }
  };

  const goTo = (id) => {
    setDrawerOpen(false);
    document.getElementById(id)?.scrollIntoView({ behavior: "smooth" });
  };

  const cards = [
    {
      label: "Total Students",
      value: stats.totalStudents,
      sub: "In Hostel",
      icon: IconUsers,
      tone: "wd-card-icon--green",
    },
    {
      label: "Pending Approvals",
      value: stats.pendingApprovals,
      sub: "Need your attention",
      icon: IconClock,
      tone: "wd-card-icon--amber",
    },
    {
      label: "Approved Today",
      value: stats.approvedToday,
      sub: "Outpasses issued",
      icon: IconCheck,
      tone: "wd-card-icon--green",
    },
    {
      label: "Expired Outpasses",
      value: stats.expiredOutpasses,
      sub: "Not returned yet",
      icon: IconAlert,
      tone: "wd-card-icon--red",
    },
  ];

  return (
    <div className="wd-shell ss-shell">
      {drawerOpen && (
        <button
          className="wd-scrim"
          type="button"
          aria-label="Close navigation"
          onClick={() => setDrawerOpen(false)}
        />
      )}
      <aside
        className={drawerOpen ? "wd-sidebar wd-sidebar--open" : "wd-sidebar"}
        aria-label="Sister navigation"
      >
        <div className="wd-side-brand">
          <img src="/st-joseph-logo.png" alt="St. Joseph's University" />
          <div>
            <strong>St. Joseph's University</strong>
            <span>Hostel Office · H.O.M.S</span>
          </div>
        </div>
        <div className="wd-side-user">
          <span className="wd-avatar">{initial}</span>
          <div className="wd-user-meta">
            <strong>{user?.name || "Sister"}</strong>
            <span>Sister</span>
          </div>
        </div>
        <nav className="wd-nav" aria-label="Sister sections">
          <button
            type="button"
            className="wd-nav-item wd-nav-item--active"
            onClick={() => goTo("sister-dashboard")}
          >
            <IconHome size={18} />
            Dashboard
          </button>
          <button
            type="button"
            className="wd-nav-item"
            onClick={() => goTo("sister-history")}
          >
            <IconHistory size={18} />
            Outpass History
          </button>
          <button
            type="button"
            className="wd-nav-item"
            onClick={() => {
              setDrawerOpen(false);
              setProfileOpen(true);
            }}
          >
            <IconUser size={18} />
            Profile
          </button>
        </nav>
        <button className="wd-side-logout" type="button" onClick={logout}>
          <IconLogout size={18} />
          Logout
        </button>
      </aside>

      <div className="wd-body">
        <header className="wd-topbar">
          <div className="wd-topbar-main">
            <img
              className="wd-topbar-logo"
              src="/st-joseph-logo.png"
              alt="St. Joseph's University"
            />
            <div className="wd-topbar-brand">
              <strong>St. Joseph's University</strong>
              <span>Hostel Office · H.O.M.S</span>
            </div>
            <button
              className="wd-burger"
              type="button"
              aria-label={drawerOpen ? "Close menu" : "Open menu"}
              aria-expanded={drawerOpen}
              onClick={() => setDrawerOpen((open) => !open)}
            >
              {drawerOpen ? <IconClose size={20} /> : <IconMenu size={20} />}
            </button>
          </div>
          <div className="wd-topbar-user">
            <span className="wd-avatar">{initial}</span>
            <div className="wd-user-meta">
              <strong>{user?.name || "Sister"}</strong>
              <span>Sister</span>
            </div>
            <NotificationBell />
          </div>
        </header>

        <main className="wd-main" id="sister-dashboard">
          <section className="wd-greet ss-welcome">
            <div>
              <p className="wd-greet-eyebrow">Sister Dashboard</p>
              <h1>Hello, {firstName}</h1>
              <p>
                Review HOD-approved Home Outpass requests and track their
                status.
              </p>
            </div>
            <span className="wd-date-chip">{today}</span>
          </section>
          <div className="wd-cards">
            {cards.map(({ label, value, sub, icon: Icon, tone }) => (
              <article className="wd-card" key={label}>
                <span className={`wd-card-icon ${tone}`}>
                  <Icon size={20} />
                </span>
                <p className="wd-card-label">{label}</p>
                <p className="wd-card-value">{value ?? "—"}</p>
                <p className="wd-card-sub">{sub}</p>
              </article>
            ))}
          </div>
          <section className="wd-panel" id="sister-pending">
            <div>
              <p className="wd-greet-eyebrow">Pending review</p>
              <h2 className="wd-panel-title">HOME Outpass Requests</h2>
              <p className="wd-panel-sub">
                Requests waiting for Sister review.
              </p>
            </div>
            <AlertBanner type="error" message={error} />
            <AlertBanner type="success" message={success} />
            {loading ? (
              <LoadingState label="Loading HOD-approved Home requests..." />
            ) : loadError ? (
              <ErrorState
                message={loadError}
                onRetry={loadItems}
                retryLabel="Reload queue"
              />
            ) : items.length ? (
              <div className="ss-request-grid">
                {items.map((item) => (
                  <RequestReviewCard
                    key={item._id}
                    item={item}
                    variant="slip"
                    activeRejectId={activeRejectId}
                    setActiveRejectId={setActiveRejectId}
                    reasonById={reasonById}
                    setReasonById={setReasonById}
                    loadingId={loadingId}
                    onApprove={(id) => review(id, "approve")}
                    onReject={(id) => review(id, "reject")}
                  />
                ))}
              </div>
            ) : (
              <div className="wd-empty">
                No pending HOD-approved Home requests for Sister review.
              </div>
            )}
          </section>
          <section className="wd-panel" id="sister-history">
            <div className="wd-panel-head">
              <div>
                <p className="wd-greet-eyebrow">History</p>
                <h2 className="wd-panel-title">Outpass History</h2>
                <p className="wd-panel-sub">
                  Home Outpass requests reviewed by Sister.
                </p>
              </div>
              <label className="wd-search">
                <IconSearch size={17} />
                <input
                  type="search"
                  placeholder="Search by student name..."
                  value={search}
                  onChange={(event) => setSearch(event.target.value)}
                  aria-label="Search by student name"
                />
              </label>
            </div>
            {visibleHistory.length ? (
              <div className="ss-history-list">
                {visibleHistory.map((item) => (
                  <article className="ss-history-row" key={item._id}>
                    <div>
                      <strong>{item.studentName || "—"}</strong>
                      <span>
                        {item.registerNumber || "—"} · Room{" "}
                        {item.roomNumber || "—"}
                      </span>
                    </div>
                    <div>
                      <span>{item.reason || "No reason provided"}</span>
                      <span>
                        {item.date
                          ? new Date(item.date).toLocaleDateString()
                          : "—"}{" "}
                        · {item.outTime || "—"}–{item.returnTime || "—"}
                      </span>
                    </div>
                    <span className={`wd-pill ${statusClass(item.status)}`}>
                      {item.status || "Pending"}
                    </span>
                  </article>
                ))}
              </div>
            ) : (
              <div className="wd-empty">
                No Home Outpass history matches this search.
              </div>
            )}
          </section>
        </main>
        <nav className="wd-bottomnav" aria-label="Sister mobile navigation">
          <button
            type="button"
            className="wd-bottomnav-item wd-bottomnav-item--active"
            onClick={() => goTo("sister-dashboard")}
          >
            <IconHome size={20} />
            <span>Dashboard</span>
          </button>
          <button
            type="button"
            className="wd-bottomnav-item"
            onClick={() => goTo("sister-history")}
          >
            <IconClock size={20} />
            <span>History</span>
          </button>
          <button
            type="button"
            className="wd-bottomnav-item"
            onClick={() => setProfileOpen(true)}
          >
            <IconUser size={20} />
            <span>Profile</span>
          </button>
        </nav>
      </div>
      {profileOpen && (
        <div
          className="wd-overlay"
          role="dialog"
          aria-modal="true"
          aria-label="Sister profile"
        >
          <div className="wd-modal">
            <button
              className="ss-profile-close"
              type="button"
              onClick={() => setProfileOpen(false)}
              aria-label="Close profile"
            >
              <IconClose size={18} />
            </button>
            <WardenProfile />
          </div>
        </div>
      )}
    </div>
  );
}
