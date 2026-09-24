import { useEffect, useMemo, useState } from "react";
import api from "../services/api";
import { useAuth } from "../context/AuthContext";
import WardenProfile from "../components/WardenProfile";
import StaffRequestTable from "../components/StaffRequestTable";
import RequestDetailModal from "../components/RequestDetailModal";
import RoleOutpassHistory from "../components/RoleOutpassHistory";
import AlertBanner from "../components/AlertBanner";
import LoadingState from "../components/LoadingState";
import ErrorState from "../components/ErrorState";
import NotificationBell from "../components/NotificationBell";
import StaffLiveMovements from "../components/StaffLiveMovements";
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
} from "../components/WardenIcons";
import "../styles/warden-dashboard.css";
import "../styles/sister-dashboard.css";
import "../styles/staff-requests.css";

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
  const [detailId, setDetailId] = useState("");
  const [profileOpen, setProfileOpen] = useState(false);
  const [drawerOpen, setDrawerOpen] = useState(false);

  const detailItem = items.find((item) => item._id === detailId) || null;

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

  const review = async (id, action, reasonOverride) => {
    setError("");
    setSuccess("");
    setLoadingId(id);
    try {
      await api.patch(`/outpasses/${id}/sister`, {
        action,
        rejectionReason: reasonById[id] || reasonOverride || "",
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
          <img src="/st-joseph-logo.png" alt="St. Joseph University" />
          <div>
            <strong>St. Joseph University</strong>
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
              alt="St. Joseph University"
            />
            <div className="wd-topbar-brand">
<strong>St. Joseph University</strong>
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
              <h1>Hello, {firstName}<picture>
  <source srcset="https://fonts.gstatic.com/s/e/notoemoji/latest/1f44b/512.webp" type="image/webp"/>
  <img src="https://fonts.gstatic.com/s/e/notoemoji/latest/1f44b/512.gif" alt="👋" width="32" height="32"/>
</picture></h1>
              <p>
                Welcome back.Have a great day!<picture>
  <source srcset="https://fonts.gstatic.com/s/e/notoemoji/latest/1f525/512.webp" type="image/webp"/>
  <img src="https://fonts.gstatic.com/s/e/notoemoji/latest/1f525/512.gif" alt="🔥" width="32" height="32"/>
</picture></p>
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
           <StaffLiveMovements />

          <section className="wd-panel" id="sister-pending">
            <div>
              <p className="wd-greet-eyebrow">Pending reviewreview<picture>
  <source srcset="https://fonts.gstatic.com/s/e/notoemoji/latest/231b/512.webp" type="image/webp"/>
  <img src="https://fonts.gstatic.com/s/e/notoemoji/latest/231b/512.gif" alt="⌛" width="32" height="32"/>
</picture></p>
              <h2 className="wd-panel-title">Outpass Requests <picture>
  <source srcset="https://fonts.gstatic.com/s/e/notoemoji/latest/1f195/512.webp" type="image/webp"/>
  <img src="https://fonts.gstatic.com/s/e/notoemoji/latest/1f195/512.gif" alt="🆕" width="27" height="27"/>
</picture> </h2>
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
              <StaffRequestTable
                items={items}
                onView={(item) => setDetailId(item._id)}
                emptyMessage="No pending outpass requests for your review."
              />
            ) : (
              <div className="wd-empty">
                No pending Outpass requests for your review.
              </div>
            )}
          </section>
          {detailItem ? (
            <RequestDetailModal
              request={detailItem}
              role="sister"
              busy={loadingId === detailItem._id}
              onApprove={(id) => review(id, "approve")}
              onReject={(id, reason) => review(id, "reject", reason)}
              onClose={() => setDetailId("")}
            />
          ) : null}
          <RoleOutpassHistory
            id="sister-history"
            endpoint="/outpasses/history/sister"
          />
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
