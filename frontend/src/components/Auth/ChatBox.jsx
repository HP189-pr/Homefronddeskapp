//src/components/Auth/ChatBox.jsx
import React, { useEffect, useMemo, useRef, useState } from 'react';
import { FiChevronLeft, FiChevronRight, FiSend, FiPaperclip, FiFolder, FiDownload, FiSmile } from 'react-icons/fi';
import { useAuth } from '../../hooks/useAuth';

const ChatBox = () => {
  const { fetchUsers, isAuthenticated, authFetch, user } = useAuth();
  // Default open on desktop for visibility
  const [isOpen, setIsOpen] = useState(true);
  const [messages, setMessages] = useState({}); // { usercode: [ { id, text, fileUrl, fileName, sender, time, file_mime } ] }
  const [input, setInput] = useState('');
  const [file, setFile] = useState(null);
  const [users, setUsers] = useState([]);
  const [userQuery, setUserQuery] = useState('');
  const [lastMessages, setLastMessages] = useState({}); // { userId: { text, time, fromMe, fileName } }
  const [selectedUser, setSelectedUser] = useState(null);
  const [unreadCounts, setUnreadCounts] = useState({}); // { usercode: number }
  const usersIntervalRef = useRef(null);
  const fileUrlRef = useRef(null);
  const [filesTab, setFilesTab] = useState([]);
  const presenceIntervalRef = useRef(null);
  const [onlineMap, setOnlineMap] = useState({}); // { userid: true|false }
  // File System Access API state (Chromium browsers). Not persisted across sessions.
  const downloadDirHandleRef = useRef(null);
  const [downloadDirLabel, setDownloadDirLabel] = useState('Not set');
  const [autoDownload, setAutoDownload] = useState(false);
  // Transfer progress: { [messageId]: { dir: 'upload'|'download', pct: number, status: 'sending'|'sent'|'failed'|'receiving'|'received', note?: string } }
  const [transfer, setTransfer] = useState({});
  // Track already auto-downloaded ids this session
  const autoDownloaded = useRef(new Set());
  // Emoji picker
  const [emojiOpen, setEmojiOpen] = useState(false);
  const EMOJIS = useMemo(()=>['😀','😁','😂','🥰','😍','👍','👏','🙏','🎉','✅','❌','🔥','⭐','📝','📎','📁','💬'],[]);

  // Load users (prefers fetchUsers from useAuth)
  const loadUsers = async () => {
    if (!isAuthenticated) return;
    try {
      if (typeof fetchUsers === 'function') {
  const list = await fetchUsers();
  // Exclude current user from list for clarity
  const filtered = (Array.isArray(list) ? list : []).filter(u => u.id !== user?.id);
  setUsers(filtered);
      } else {
        // fallback to REST
        const res = await fetch('/api/users', { credentials: 'same-origin' });
        if (res.ok) {
          const payload = await res.json();
          const arr = Array.isArray(payload?.users) ? payload.users : [];
          setUsers(arr.filter(u => u.id !== user?.id));
        } else {
          console.warn('Failed to fetch users:', res.status);
        }
      }
    } catch (err) {
      console.error('Error loading users', err);
    }
  };

  useEffect(() => {
    // Only start when authenticated
    if (!isAuthenticated) return;

    // initial load
    loadUsers();

    // poll users list every 10s
    usersIntervalRef.current = setInterval(loadUsers, 10000);

    // Start heartbeat every 15s and presence fetch every 10s
    const ping = async () => { try { await authFetch('/api/chat/ping', { method: 'POST' }); } catch {} };
    const fetchPresence = async () => {
      try {
        const res = await authFetch('/api/chat/presence');
        if (res.ok) {
          const p = await res.json();
          const map = {};
          for (const row of (p.presence || [])) map[row.userid] = !!row.online;
          setOnlineMap(map);
        }
      } catch {}
    };
    ping(); fetchPresence();
    const pingId = setInterval(ping, 15000);
    presenceIntervalRef.current = setInterval(fetchPresence, 10000);

    return () => {
      clearInterval(usersIntervalRef.current);
      usersIntervalRef.current = null;
      clearInterval(presenceIntervalRef.current);
      presenceIntervalRef.current = null;
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [isAuthenticated]);

  // Load last message (preview) for each user in the list
  useEffect(() => {
    if (!isAuthenticated || users.length === 0) return;
    let cancelled = false;
    (async () => {
      // Limit to first 25 to avoid too many requests
      const subset = users.slice(0, 25);
      const results = await Promise.all(subset.map(async (u) => {
        try {
          const r = await authFetch(`/api/chat/history/${u.id}?limit=1`);
          if (!r.ok) return null;
          const d = await r.json();
          const m = (d.messages || [])[0];
          if (!m) return { uid: u.id, data: null };
          return {
            uid: u.id,
            data: {
              text: m.text || '',
              fileName: m.file_name || '',
              time: m.createdat,
              fromMe: m.from_userid === user?.id,
            }
          };
        } catch {
          return null;
        }
      }));
      if (cancelled) return;
      const map = {};
      for (const it of results) {
        if (it && it.uid) map[it.uid] = it.data;
      }
      setLastMessages((prev) => ({ ...prev, ...map }));
    })();
    return () => { cancelled = true; };
  }, [isAuthenticated, users, authFetch, user]);

  // Auto-select first available user for quicker access
  useEffect(() => {
    if (!isAuthenticated) return;
    if (!selectedUser && users.length) {
      const candidate = users[0];
      if (candidate) setSelectedUser(candidate);
    }
  }, [isAuthenticated, users, selectedUser]);

  // Load history when selecting a user
  useEffect(() => {
    if (!isAuthenticated || !selectedUser) return;
    (async () => {
      const otherId = selectedUser.id;
      const res = await authFetch(`/api/chat/history/${otherId}?limit=200`);
      if (res.ok) {
        const d = await res.json();
        const ucode = selectedUser.usercode || selectedUser.userid;
        const list = (d.messages || []).map(m => ({
          id: m.id,
          text: m.text,
          fileUrl: m.file_path ? `/media/${m.file_path}` : null,
          fileName: m.file_name || null,
          file_mime: m.file_mime || null,
          sender: m.from_userid === user?.id ? 'Me' : (selectedUser.usercode || selectedUser.userid),
          time: new Date(m.createdat).toLocaleTimeString(),
        }));
        setMessages(prev => ({ ...prev, [ucode]: list }));
        // update last message preview for this user
        const last = (d.messages || [])[0];
        if (last) {
          setLastMessages((prev) => ({
            ...prev,
            [selectedUser.id]: {
              text: last.text || '',
              fileName: last.file_name || '',
              time: last.createdat,
              fromMe: last.from_userid === user?.id,
            },
          }));
        }
      }
      const rf = await authFetch(`/api/chat/files/${otherId}`);
      if (rf.ok) {
        const fd = await rf.json();
        setFilesTab(fd.files || []);
        // Trigger auto-download for new incoming files if enabled
        if (autoDownload && downloadDirHandleRef.current) {
          const mine = user?.id;
          for (const f of (fd.files || [])) {
            if (f.file_path && f.from_userid !== mine && !autoDownloaded.current.has(f.id)) {
              downloadMessageFile({
                id: f.id,
                fileUrl: `/media/${f.file_path}`,
                fileName: f.file_name || 'download',
              });
            }
          }
        }
      }
    })();
  }, [isAuthenticated, selectedUser, authFetch, user, autoDownload]);

  // Selecting a user clears unread count for that user
  useEffect(() => {
    if (!selectedUser) return;
    const code = selectedUser.usercode;
    setUnreadCounts((prev) => ({ ...prev, [code]: 0 }));
  }, [selectedUser]);

  // Clean up any created file URL when `file` changes or component unmounts
  useEffect(() => {
    return () => {
      if (fileUrlRef.current) {
        URL.revokeObjectURL(fileUrlRef.current);
        fileUrlRef.current = null;
      }
    };
  }, []);

  const handleFileChange = (e) => {
    const f = e.target.files && e.target.files[0];
    if (!f) return;

    // revoke old
    if (fileUrlRef.current) {
      URL.revokeObjectURL(fileUrlRef.current);
      fileUrlRef.current = null;
    }

    const url = URL.createObjectURL(f);
    fileUrlRef.current = url;
    setFile({ file: f, url, name: f.name });
  };

  // Choose a folder for auto-download (File System Access API)
  const chooseDownloadFolder = async () => {
    try {
      if (!('showDirectoryPicker' in window)) {
        alert('Your browser does not support choosing download folders. Use Chrome/Edge.');
        return;
      }
      const handle = await window.showDirectoryPicker();
      downloadDirHandleRef.current = handle;
      setDownloadDirLabel(handle.name || 'Selected');
    } catch (e) {
      // user cancelled
    }
  };

  // Ensure we have permission to write into the chosen folder
  const ensureDirPermission = async () => {
    const dir = downloadDirHandleRef.current;
    if (!dir) return false;
    if (dir.queryPermission && (await dir.queryPermission({ mode: 'readwrite' })) === 'granted') return true;
    if (dir.requestPermission && (await dir.requestPermission({ mode: 'readwrite' })) === 'granted') return true;
    return false;
  };

  // Download a file to the chosen folder with progress
  const downloadMessageFile = async ({ id, fileUrl, fileName }) => {
    try {
      if (!downloadDirHandleRef.current) return;
      const ok = await ensureDirPermission();
      if (!ok) return;
      setTransfer(prev => ({ ...prev, [id]: { dir: 'download', pct: 0, status: 'receiving' } }));
      const res = await fetch(fileUrl);
      if (!res.ok || !res.body) throw new Error('Download failed');
      const contentLength = Number(res.headers.get('content-length') || '0');
      const fileHandle = await downloadDirHandleRef.current.getFileHandle(fileName, { create: true });
      const writable = await fileHandle.createWritable();
      const reader = res.body.getReader();
      let received = 0;
      while (true) {
        const { done, value } = await reader.read();
        if (done) break;
        await writable.write(value);
        received += value.byteLength;
        const pct = contentLength ? Math.round((received / contentLength) * 100) : Math.min(99, (received % 100));
        setTransfer(prev => ({ ...prev, [id]: { dir: 'download', pct, status: 'receiving' } }));
      }
      await writable.close();
      autoDownloaded.current.add(id);
      setTransfer(prev => ({ ...prev, [id]: { dir: 'download', pct: 100, status: 'received', note: `${downloadDirLabel}\\${fileName}` } }));
    } catch (e) {
      setTransfer(prev => ({ ...prev, [id]: { dir: 'download', pct: 0, status: 'failed', note: e.message } }));
    }
  };

  // Send a message with upload progress using XMLHttpRequest
  const sendMessage = async () => {
    if (!input.trim() && !file) return;
    if (!selectedUser) return;

    const form = new FormData();
    form.append('to_userid', selectedUser.id);
    if (input.trim()) form.append('text', input.trim());
    if (file?.file) form.append('file', file.file);
    // XHR for upload progress
    const xhr = new XMLHttpRequest();
    xhr.open('POST', '/api/chat/send', true);
    // attach auth header
    try {
      const token = localStorage.getItem('token');
      if (token) xhr.setRequestHeader('Authorization', `Bearer ${token}`);
    } catch {}
    // temp id for progress tracking until server responds with real id
    const tempId = `tmp_${Date.now()}`;
    if (xhr.upload) {
      xhr.upload.onprogress = (ev) => {
        if (ev.lengthComputable) {
          const pct = Math.round((ev.loaded / ev.total) * 100);
          setTransfer(prev => ({ ...prev, [tempId]: { dir: 'upload', pct, status: pct < 100 ? 'sending' : 'sent' } }));
        } else {
          setTransfer(prev => ({ ...prev, [tempId]: { dir: 'upload', pct: 0, status: 'sending' } }));
        }
      };
    }
    xhr.onreadystatechange = () => {
      if (xhr.readyState === 4) {
        try {
          if (xhr.status >= 200 && xhr.status < 300) {
            const m = JSON.parse(xhr.responseText || '{}');
            const ucode = selectedUser.usercode || selectedUser.userid;
            const msg = {
              id: m.id,
              text: m.text,
              fileUrl: m.file_path ? `/media/${m.file_path}` : null,
              fileName: m.file_name || null,
              file_mime: m.file_mime || null,
              sender: 'Me',
              time: new Date(m.createdat).toLocaleTimeString(),
            };
            setMessages(prev => {
              const list = prev[ucode] ? [...prev[ucode]] : [];
              return { ...prev, [ucode]: [...list, msg] };
            });
            if (m.file_path) setFilesTab(prev => [{ ...m }, ...prev]);
            setTransfer(prev => ({ ...prev, [m.id]: { dir: 'upload', pct: 100, status: 'sent' } }));
            // update last message preview for that user
            setLastMessages(prev => ({
              ...prev,
              [selectedUser.id]: {
                text: m.text || '',
                fileName: m.file_name || '',
                time: m.createdat,
                fromMe: true,
              }
            }));
          } else {
            setTransfer(prev => ({ ...prev, [tempId]: { dir: 'upload', pct: 0, status: 'failed' } }));
          }
        } catch (e) {
          setTransfer(prev => ({ ...prev, [tempId]: { dir: 'upload', pct: 0, status: 'failed' } }));
        }
      }
    };
    xhr.send(form);

    setInput('');
    setFile(null);
    if (fileUrlRef.current) fileUrlRef.current = null;
  };

  const clearHistory = async (type = 'all') => {
    if (!selectedUser) return;
    const otherId = selectedUser.id;
    const res = await authFetch(`/api/chat/clear/${otherId}`, { method: 'POST', headers: { 'Content-Type':'application/json' }, body: JSON.stringify({ type }) });
    if (res.ok) {
      const ucode = selectedUser.usercode || selectedUser.userid;
      if (type === 'all' || type === 'messages') setMessages(prev => ({ ...prev, [ucode]: [] }));
      if (type === 'all' || type === 'files') setFilesTab([]);
    }
  };

  const fileIcon = (mimeOrName) => {
    const s = (mimeOrName || '').toString().toLowerCase();
    if (s.includes('pdf') || s.endsWith('.pdf')) return '📄';
    if (s.includes('excel') || s.endsWith('.xlsx') || s.endsWith('.xls')) return '📊';
    if (s.includes('word') || s.endsWith('.doc') || s.endsWith('.docx')) return '📝';
    if (s.includes('image') || s.endsWith('.png') || s.endsWith('.jpg') || s.endsWith('.jpeg')) return '🖼️';
    if (s.includes('text') || s.endsWith('.txt') || s.endsWith('.csv')) return '📃';
    return '📦';
  };

  // Format status visuals
  const statusClass = (msgId, hasFile, dir) => {
    const t = transfer[msgId];
    if (!t) return hasFile ? 'text-blue-700' : (dir === 'out' ? 'text-blue-700' : 'text-black');
    if (t.status === 'failed') return 'text-red-600';
    if (t.status === 'received' && hasFile) return 'text-green-600';
    if (t.status === 'sent' && !hasFile) return 'text-blue-700';
    return 'text-gray-800';
  };

  const statusTicks = (msgId) => {
    const t = transfer[msgId];
    if (!t) return '✓';
    if (t.status === 'failed') return '✗';
    if (t.status === 'received') return '✓✓';
    if (t.status === 'sent') return '✓';
    return '…';
  };

  const toggleOpen = () => setIsOpen((s) => !s);


  // Keep layout in sync: expose current rail width as a CSS variable
  useEffect(() => {
    const railWidth = !isAuthenticated
      ? '0px'
      : isOpen
        ? 'calc(44rem + 10px)'
      : 'calc(4rem + 10px)';
    document.documentElement.style.setProperty('--chat-rail-width', railWidth);
    return () => {
      // On unmount, clear the variable
      document.documentElement.style.removeProperty('--chat-rail-width');
    };
  }, [isAuthenticated, isOpen]);

    // Poll recent messages to keep list sorted and update unread flags
    useEffect(() => {
      if (!isAuthenticated || users.length === 0) return;
      let cancelled = false;
      let timer;
      const tick = async () => {
        const subset = users.slice(0, 50);
        try {
          const results = await Promise.all(subset.map(async (u) => {
            try {
              const r = await authFetch(`/api/chat/history/${u.id}?limit=1`);
              if (!r.ok) return null;
              const d = await r.json();
              const m = (d.messages || [])[0];
              if (!m) return { uid: u.id, data: null };
              return {
                uid: u.id,
                data: {
                  text: m.text || '',
                  fileName: m.file_name || '',
                  time: m.createdat,
                  fromMe: m.from_userid === user?.id,
                },
              };
            } catch {
              return null;
            }
          }));
          if (cancelled) return;
          const map = {};
          for (const it of results) if (it && it.uid) map[it.uid] = it.data;
          // update previews
          setLastMessages((prev) => ({ ...prev, ...map }));
          // update unread flags: mark 1 if latest is from other and this chat is not open
          setUnreadCounts((prev) => {
            const next = { ...prev };
            for (const u of subset) {
              const code = u.usercode || u.userid;
              const lm = map[u.id];
              if (!lm) continue;
              const isCurrent = selectedUser?.id === u.id;
              if (!lm.fromMe && !isCurrent) next[code] = 1; else next[code] = 0;
            }
            return next;
          });
        } finally {
          if (!cancelled) timer = setTimeout(tick, 20000);
        }
      };
      tick();
      return () => { cancelled = true; if (timer) clearTimeout(timer); };
    }, [isAuthenticated, users, authFetch, user, selectedUser]);
  // Count chats with unread > 0 (not total messages)
  const totalUnread = Object.values(unreadCounts).reduce((acc, val) => acc + ((val || 0) > 0 ? 1 : 0), 0);
  const onlineCount = useMemo(() => users.reduce((acc, u) => acc + (onlineMap[u.id] ? 1 : 0), 0), [users, onlineMap]);

  // Helpers for user list formatting
  const formatLastTime = (iso) => {
    if (!iso) return '';
    try {
      const d = new Date(iso);
      const today = new Date();
      const isSameDay = d.toDateString() === today.toDateString();
      return isSameDay ? d.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }) : d.toLocaleDateString();
    } catch {
      return '';
    }
  };
  const previewText = (lm) => {
    if (!lm) return '';
    if (lm.text) return (lm.fromMe ? 'You: ' : '') + lm.text;
    if (lm.fileName) return (lm.fromMe ? 'You: ' : '') + `[File] ${lm.fileName}`;
    return '';
  };

  const filteredUsers = useMemo(() => {
    const q = userQuery.trim().toLowerCase();
    let arr = users;
    if (q) arr = users.filter(u => (u.usercode || u.userid || '').toLowerCase().includes(q));
    // sort: unread first, then by last message time desc, then online, then name
    return [...arr].sort((a, b) => {
      const codeA = a.usercode || a.userid || '';
      const codeB = b.usercode || b.userid || '';
      const unreadA = unreadCounts[codeA] ? 1 : 0;
      const unreadB = unreadCounts[codeB] ? 1 : 0;
      if (unreadA !== unreadB) return unreadB - unreadA;
      const tA = lastMessages[a.id]?.time ? new Date(lastMessages[a.id].time).getTime() : 0;
      const tB = lastMessages[b.id]?.time ? new Date(lastMessages[b.id].time).getTime() : 0;
      if (tA !== tB) return tB - tA;
      const oa = onlineMap[a.id] ? 1 : 0; const ob = onlineMap[b.id] ? 1 : 0;
      if (oa !== ob) return ob - oa;
      const sa = codeA.toLowerCase();
      const sb = codeB.toLowerCase();
      return sa.localeCompare(sb);
    });
  }, [users, userQuery, onlineMap, unreadCounts, lastMessages]);

  return (
    <div
      className={
        'fixed top-0 right-0 h-full flex items-center transition-all duration-300 ease-in-out z-40'
      }
  style={{ width: !isAuthenticated ? '0px' : (isOpen ? 'calc(44rem + 10px)' : 'calc(4rem + 10px)') }}
      aria-hidden={!isAuthenticated}
    >
      {/* Left spacer to match sidebar gap */}
      <div className="w-[10px] h-full bg-gray-100" />

      {/* Chat rail */}
  <div className={`relative h-full bg-gray-800 text-white flex flex-col shadow-xl ${isOpen ? 'w-[44rem]' : 'w-16'} rounded-l-xl overflow-hidden`}>
        {/* Header/title (sticky) */}
        <div className="sticky top-0 bg-gray-900 text-white h-12 flex items-center justify-between px-3 pr-10 border-b border-gray-700 z-10">
          <div className="font-semibold">Team Chat</div>
          {totalUnread > 0 && (
            <div className="text-xs bg-red-500 px-2 py-0.5 rounded">{totalUnread} new</div>
          )}
        </div>
        {/* collapsed avatars */}
        {!isOpen && (
          <div className="flex flex-col items-center py-3 space-y-3 overflow-auto mt-12">
            {users.map((user) => {
              const ucode = user.usercode || user.userid;
              return (
                <button
                  key={ucode}
                  onClick={() => {
                    setSelectedUser(user);
                    setIsOpen(true);
                    // clear unread for that user
                    setUnreadCounts((prev) => ({ ...prev, [ucode]: 0 }));
                  }}
                  className="relative rounded-full focus:outline-none focus:ring-2 focus:ring-indigo-400"
                  aria-label={`Open chat with ${ucode}`}
                >
                  <div className="w-10 h-10 bg-gray-500 rounded-full flex items-center justify-center text-sm font-semibold">
                    {(ucode || 'U').slice(0, 2).toUpperCase()}
                  </div>
                  <div
                    className={`absolute bottom-0 right-0 w-3 h-3 rounded-full border-2 border-gray-800 ${onlineMap[user.id] ? 'bg-green-400' : 'bg-gray-400'}`}
                  />
                  {unreadCounts[ucode] > 0 && (
                    <div className="absolute -top-1 -right-1 w-5 h-5 bg-red-500 text-white text-xs flex items-center justify-center rounded-full">
                      {unreadCounts[ucode]}
                    </div>
                  )}
                </button>
              );
            })}
          </div>
        )}

        {/* Two-pane layout when open: left user list + right chat */}
        {isOpen && (
          <div className="flex-1 flex overflow-hidden">
            {/* Left: user list */}
            <div className="w-64 bg-gray-800 border-r border-gray-700 flex flex-col">
              <div className="p-2 bg-gray-900 flex items-center gap-2">
                <h3 className="text-lg font-semibold flex-1">Users</h3>
                <span className="text-[10px] bg-gray-700 px-2 py-0.5 rounded" title="Online users">Online {onlineCount}</span>
                <span className="text-[10px] bg-gray-700 px-2 py-0.5 rounded" title="Total users">Total {users.length}</span>
                <span className="text-[10px] bg-red-500/80 px-2 py-0.5 rounded" title="Chats with new messages">Unread {totalUnread}</span>
              </div>
              <div className="p-2">
                <input
                  type="text"
                  value={userQuery}
                  onChange={(e)=>setUserQuery(e.target.value)}
                  placeholder="Search"
                  className="w-full text-black rounded px-2 py-1 text-sm"
                  aria-label="Search users"
                />
              </div>
              <div className="px-2 pb-2 overflow-auto">
                <ul className="space-y-1">
                  {filteredUsers.map((u) => {
                    const ucode = u.usercode || u.userid;
                    const lm = lastMessages[u.id];
                    return (
                      <li key={ucode}>
                        <button
                          onClick={() => setSelectedUser(u)}
                          className={`w-full flex items-center gap-3 p-2 rounded hover:bg-gray-700 focus:outline-none focus:ring-2 focus:ring-indigo-400 ${selectedUser?.id===u.id ? 'bg-gray-700' : ''}`}
                          aria-label={`Chat with ${ucode}`}
                        >
                          <div className="relative">
                            <div className="w-10 h-10 bg-gray-500 rounded-full flex items-center justify-center text-sm font-semibold">
                              {(ucode || 'U').slice(0, 2).toUpperCase()}
                            </div>
                            <span className={`absolute -bottom-0.5 -right-0.5 w-3 h-3 rounded-full border-2 border-gray-800 ${onlineMap[u.id] ? 'bg-green-400' : 'bg-gray-400'}`} />
                          </div>
                          <div className="flex-1 text-left min-w-0">
                            <div className="flex items-center justify-between gap-2">
                              <span className="font-medium truncate">{ucode}</span>
                              <span className="text-[10px] text-gray-300">{formatLastTime(lm?.time)}</span>
                            </div>
                            <div className="text-xs text-gray-300 truncate">{previewText(lm)}</div>
                          </div>
                          {unreadCounts[ucode] > 0 && (
                            <div className="text-xs bg-red-500 px-2 py-0.5 rounded text-white">
                              {unreadCounts[ucode]}
                            </div>
                          )}
                        </button>
                      </li>
                    );
                  })}
                  {filteredUsers.length === 0 && <li className="text-gray-400 p-2">No users found.</li>}
                </ul>
              </div>
            </div>

            {/* Right: chat panel */}
            <div className="flex-1 bg-gray-50 text-black flex flex-col">
              {!selectedUser ? (
                <div className="m-auto text-gray-500">Select a user to start chatting</div>
              ) : (
                <>
                  <div className="p-2 border-b bg-gray-900 text-white flex items-center justify-between">
                    <h3 className="text-lg font-semibold flex items-center gap-2">
                      {selectedUser.usercode || selectedUser.userid}
                      <span className={`inline-block w-2 h-2 rounded-full ${onlineMap[selectedUser.id] ? 'bg-green-400' : 'bg-gray-400'}`} title={onlineMap[selectedUser.id] ? 'Online' : 'Offline'} />
                    </h3>
                    <div className="flex items-center gap-2">
                      <button onClick={chooseDownloadFolder} className="text-xs px-2 py-1 rounded bg-gray-800 hover:bg-gray-700" title={`Download to: ${downloadDirLabel}`}>
                        <span className="inline-flex items-center gap-1"><FiFolder /> {isOpen ? (downloadDirLabel.length>12? downloadDirLabel.slice(0,12)+'…':downloadDirLabel) : ''}</span>
                      </button>
                      <label className="text-xs px-2 py-1 rounded bg-gray-800 hover:bg-gray-700 inline-flex items-center gap-1 cursor-pointer">
                        <input type="checkbox" className="mr-1" checked={autoDownload} onChange={(e)=>setAutoDownload(e.target.checked)} /> Auto
                      </label>
                      <button onClick={() => setSelectedUser(null)} className="text-sm px-2 py-1 rounded bg-gray-800 hover:bg-gray-700 focus:outline-none">Back</button>
                      <div className="relative group">
                        <button className="text-sm px-2 py-1 rounded bg-gray-800 hover:bg-gray-700">History ▾</button>
                        <div className="absolute right-0 mt-1 hidden group-hover:block bg-white text-black rounded shadow z-10">
                          <button onClick={()=>clearHistory('messages')} className="block px-3 py-1 hover:bg-gray-100 w-full text-left">Clear chat messages</button>
                          <button onClick={()=>clearHistory('files')} className="block px-3 py-1 hover:bg-gray-100 w-full text-left">Clear file history</button>
                          <button onClick={()=>clearHistory('all')} className="block px-3 py-1 hover:bg-gray-100 w-full text-left">Clear all</button>
                        </div>
                      </div>
                    </div>
                  </div>

                  <div className="flex-1 overflow-auto p-3 space-y-3 bg-gray-100 text-black custom-scrollbar">
                    {(messages[selectedUser.usercode || selectedUser.userid] || []).map((msg, idx) => (
                      <div
                        key={idx}
                        className={`p-2 rounded ${msg.sender === 'Me' ? 'bg-blue-200 ml-auto' : 'bg-white'}`}
                        style={{ maxWidth: '85%' }}
                      >
                        <div className="text-sm font-medium">{msg.sender}</div>
                        {msg.text && (
                          <div className={`mt-1 ${statusClass(msg.id, false, msg.sender==='Me'?'out':'in')}`}>
                            {msg.text} <span className="ml-2 text-xs opacity-70">{statusTicks(msg.id)}</span>
                          </div>
                        )}
                        {msg.fileUrl && (
                          <div className="mt-1 flex items-center gap-2">
                            <span>{fileIcon(msg.file_mime || msg.fileName)}</span>
                            <span className={`truncate ${statusClass(msg.id, true, msg.sender==='Me'?'out':'in')}`}>{transfer[msg.id]?.note ? transfer[msg.id].note : (msg.fileName || 'Download file')}</span>
                            {!transfer[msg.id]?.note && (
                              <a href={msg.fileUrl} download={msg.fileName} onClick={(e)=>{
                                if (autoDownload && downloadDirHandleRef.current) {
                                  e.preventDefault();
                                  downloadMessageFile({ id: msg.id, fileUrl: msg.fileUrl, fileName: msg.fileName || 'download' });
                                }
                              }} className="text-xs px-2 py-0.5 rounded bg-gray-200 hover:bg-gray-300 text-gray-800 inline-flex items-center gap-1" title="Download">
                                <FiDownload />
                              </a>
                            )}
                            {transfer[msg.id] && (
                              <span className="text-xs text-gray-600">{transfer[msg.id].pct || 0}%</span>
                            )}
                            <span className="text-xs opacity-70">{statusTicks(msg.id)}</span>
                          </div>
                        )}
                        <small className="block text-xs text-gray-500 mt-1">{msg.time}</small>
                      </div>
                    ))}
                  </div>

                  <div className="p-2 border-t flex items-center space-x-2 bg-gray-800 sticky bottom-0 z-10">
                    <input
                      type="text"
                      className="flex-1 min-w-0 p-2 text-black border rounded"
                      placeholder="Type a message..."
                      value={input}
                      onChange={(e) => setInput(e.target.value)}
                      onKeyDown={(e) => {
                        if (e.key === 'Enter') {
                          e.preventDefault();
                          sendMessage();
                        }
                      }}
                      aria-label="Message input"
                    />
                    {/* Emoji picker */}
                    <div className="relative">
                      <button onClick={()=>setEmojiOpen(v=>!v)} className="shrink-0 bg-gray-700 hover:bg-gray-600 text-white p-2 rounded" title="Emoji">
                        <FiSmile />
                      </button>
                      {emojiOpen && (
                        <div className="absolute bottom-10 right-0 bg-white text-black rounded shadow p-2 w-40 grid grid-cols-6 gap-1 z-20">
                          {EMOJIS.map((em)=> (
                            <button key={em} onClick={()=>{ setInput(prev=>prev + em); setEmojiOpen(false); }} className="hover:bg-gray-100 rounded text-lg">
                              {em}
                            </button>
                          ))}
                        </div>
                      )}
                    </div>
                    <input id="file-upload" type="file" className="hidden" onChange={handleFileChange} />
                    <label htmlFor="file-upload" className="shrink-0 cursor-pointer bg-gray-700 hover:bg-gray-600 text-white p-2 rounded" title="Attach file">
                      <FiPaperclip />
                    </label>
                    {file?.name && (
                      <div className="max-w-[7rem] truncate text-xs bg-gray-700 text-white px-2 py-1 rounded" title={file.name}>
                        {file.name}
                      </div>
                    )}
                    <button
                      className={`shrink-0 px-3 py-2 rounded flex items-center gap-2 ${(!input.trim() && !file) ? 'bg-blue-600/60 cursor-not-allowed' : 'bg-blue-600 hover:bg-blue-700'} text-white`}
                      onClick={sendMessage}
                      aria-label="Send message"
                      disabled={!input.trim() && !file}
                    >
                      <FiSend /> <span>Send</span>
                    </button>
                  </div>

                  {/* Files history panel */}
                  {filesTab.length > 0 && (
                    <div className="p-2 bg-white border-t">
                      <div className="text-sm font-semibold mb-1">Files</div>
                      <ul className="max-h-40 overflow-auto space-y-1">
                        {filesTab.map(f => (
                          <li key={f.id} className="flex items-center gap-2 text-sm">
                            <span>{fileIcon(f.file_mime || f.file_name)}</span>
                            <a href={`/media/${f.file_path}`} download={f.file_name} className="text-blue-600 underline">
                              {f.file_name}
                            </a>
                            <span className="text-gray-500">· {new Date(f.createdat).toLocaleString()}</span>
                          </li>
                        ))}
                      </ul>
                    </div>
                  )}
                </>
              )}
            </div>
          </div>
        )}

        {/* toggle button */}
        <button
          onClick={toggleOpen}
          className="absolute top-1 right-2 w-[30px] h-[30px] rounded-full bg-gray-800 text-white hover:bg-gray-600 transition text-3xl flex items-center justify-center leading-none shadow focus:outline-none focus:ring-2 focus:ring-indigo-400 z-20"
          aria-pressed={isOpen}
          aria-label={isOpen ? 'Collapse chat' : 'Open chat'}
          title={isOpen ? 'Collapse chat' : 'Open chat'}
        >
          {isOpen ? '»' : '«'}
        </button>
      </div>
    </div>
  );
};

export default ChatBox;
