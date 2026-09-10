import { useEffect, useRef, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import api from '../services/api';
import { useAuth } from '../context/AuthContext';

// In-app notification bell for Sister/Warden. Fetches real notifications from
// /notifications and marks a notification read when it is opened.
export default function NotificationBell() {
  const [open, setOpen] = useState(false);
  const [items, setItems] = useState([]);
  const [unreadCount, setUnreadCount] = useState(0);
  const [loading, setLoading] = useState(false);
  const wrapRef = useRef(null);
  const navigate = useNavigate();
  const { user } = useAuth();

  const load = async () => {
    setLoading(true);
    try {
      const { data } = await api.get('/notifications');
      setItems(data.notifications || []);
      setUnreadCount(data.unreadCount || 0);
    } catch {
      // Non-critical: keep the bell quiet on failure.
      setItems([]);
      setUnreadCount(0);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    load();
    const timer = setInterval(load, 60000);
    return () => clearInterval(timer);
  }, []);

  useEffect(() => {
    if (!open) return undefined;
    const onClickAway = (event) => {
      if (wrapRef.current && !wrapRef.current.contains(event.target)) {
        setOpen(false);
      }
    };
    document.addEventListener('mousedown', onClickAway);
    return () => document.removeEventListener('mousedown', onClickAway);
  }, [open]);

  const markRead = async (notification) => {
    if (!notification.read) {
      setItems((current) => current.map((item) => (item._id === notification._id ? { ...item, read: true } : item)));
      setUnreadCount((count) => Math.max(0, count - 1));
      try {
        await api.patch(`/notifications/${notification._id}/read`);
      } catch {
        // ignore; the list refresh will re-sync
      }
    }
  };

  const openNotification = async (notification) => {
    await markRead(notification);
    setOpen(false);
    // Navigate to the reviewer's own dashboard — the bell is shared by
    // Sister and Warden, and each route is role-protected.
    navigate(
      user?.role === 'Sister'
        ? '/sister-dashboard#hod-approved-requests'
        : '/warden-dashboard#warden-requests',
    );
  };

  const markAllRead = async () => {
    setItems((current) => current.map((item) => ({ ...item, read: true })));
    setUnreadCount(0);
    try {
      await api.patch('/notifications/read-all');
    } catch {
      // ignore
    }
  };

  return (
    <div className="notif-bell-wrap" ref={wrapRef}>
      <button
        className="notif-bell"
        type="button"
        aria-label={`Notifications${unreadCount ? `, ${unreadCount} unread` : ''}`}
        aria-expanded={open}
        onClick={() => {
          setOpen((value) => !value);
          if (!open) load();
        }}
      >
        <span aria-hidden="true">🔔</span>
        {unreadCount > 0 ? <span className="notif-badge">{unreadCount > 9 ? '9+' : unreadCount}</span> : null}
      </button>

      {open ? (
        <div className="notif-panel" role="dialog" aria-label="Notifications">
          <div className="notif-panel-head">
            <strong>Notifications</strong>
            {unreadCount > 0 ? (
              <button className="link-button" type="button" onClick={markAllRead}>
                Mark all read
              </button>
            ) : null}
          </div>

          <div className="notif-list">
            {loading && !items.length ? (
              <p className="muted notif-empty">Loading notifications...</p>
            ) : items.length ? (
              items.map((item) => (
                <button
                  key={item._id}
                  className={`notif-item ${item.read ? 'notif-item--read' : 'notif-item--unread'}`}
                  type="button"
                  onClick={() => openNotification(item)}
                >
                  <span className="notif-item-title">
                    {item.read ? '' : <span className="notif-dot" aria-hidden="true" />}
                    <strong>{item.studentName}</strong> submitted a {item.requestType} outpass request.
                  </span>
                  <span className="notif-item-meta">
                    {new Date(item.createdAt).toLocaleString()} ·{' '}
                    {item.outpass?.status ? `Status: ${item.outpass.status}` : 'Pending'}
                  </span>
                </button>
              ))
            ) : (
              <p className="muted notif-empty">No notifications yet.</p>
            )}
          </div>
        </div>
      ) : null}
    </div>
  );
}
