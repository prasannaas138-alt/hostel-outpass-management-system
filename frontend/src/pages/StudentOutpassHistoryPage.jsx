import { useEffect, useMemo, useState } from 'react';
import api from '../services/api';
import StudentLayout from '../components/StudentLayout';
import OutpassHistory from '../components/OutpassHistory';
import { isExpiredRequest, getDisplayStatus } from '../utils/outpassStatus';
import { connectMovementSocket, disconnectMovementSocket, subscribeToOutpassUpdates } from '../services/movementSocket';
import '../styles/history-profile.css';

export default function StudentOutpassHistoryPage() {
  const [requests, setRequests] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [historyTypeFilter, setHistoryTypeFilter] = useState('All');
  const [search, setSearch] = useState('');
  const [nowTick, setNowTick] = useState(0);

  useEffect(() => {
    const timer = setInterval(() => setNowTick((value) => value + 1), 60000);
    return () => clearInterval(timer);
  }, []);

  const loadRequests = async () => {
    setLoading(true);
    setError('');
    try {
      const { data } = await api.get('/outpasses/me');
      setRequests(Array.isArray(data) ? data : []);
    } catch (loadError) {
      setError(loadError.response?.data?.message || 'Failed to load outpass history');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadRequests();
  }, []);

  useEffect(() => {
    connectMovementSocket();
    const unsubscribe = subscribeToOutpassUpdates((event) => {
      if (!event?.outpassObjectId) return;
      setRequests((current) => current.map((request) => (
        String(request._id) === String(event.outpassObjectId)
          ? { ...request, ...event }
          : request
      )));
    });
    return () => {
      unsubscribe();
      disconnectMovementSocket();
    };
  }, []);

  const historyRequests = useMemo(
    () => requests.filter((item) => isExpiredRequest(item)),
    [requests, nowTick],
  );

  const visibleHistoryRequests = useMemo(() => {
    const term = search.trim().toLowerCase();
    return historyRequests.filter((item) => {
      if (historyTypeFilter !== 'All' && item.requestType !== historyTypeFilter) return false;
      if (!term) return true;
      const haystack = `${item.requestType || ''} ${item.reason || ''} ${getDisplayStatus(item)} ${item.date || ''}`.toLowerCase();
      return haystack.includes(term);
    });
  }, [historyRequests, historyTypeFilter, search]);

  const historyCounts = useMemo(() => {
    const counts = { All: historyRequests.length, Home: 0, Outing: 0 };
    historyRequests.forEach((item) => {
      if (item.requestType === 'Home') counts.Home += 1;
      else if (item.requestType === 'Outing') counts.Outing += 1;
    });
    return counts;
  }, [historyRequests]);

  return (
    <StudentLayout
      title="Outpass History"
      subtitle="Review your expired outpasses and verification details."
    >
      <section id="outpass-history" className="panel">
        <div className="panel-heading">
          <div>
            <p className="eyebrow">Outpass history</p>
            <h2>Expired outpasses</h2>
          </div>
        </div>
        <OutpassHistory
          requests={visibleHistoryRequests}
          loading={loading}
          error={error}
          counts={historyCounts}
          typeFilter={historyTypeFilter}
          onTypeFilterChange={setHistoryTypeFilter}
          search={search}
          onSearchChange={setSearch}
        />
      </section>
    </StudentLayout>
  );
}
