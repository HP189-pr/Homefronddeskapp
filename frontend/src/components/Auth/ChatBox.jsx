//src/components/Auth/ChatBox.jsx
import React, { useEffect, useRef, useState } from 'react';
import { FiChevronLeft, FiChevronRight } from 'react-icons/fi';
import { useAuth } from '../../hooks/useAuth';

const ChatBox = () => {
  const { fetchUsers, isAuthenticated, authFetch, user } = useAuth();
  const [isOpen, setIsOpen] = useState(false);
  const [messages, setMessages] = useState({}); // { usercode: [ { id, text, fileUrl, fileName, sender, time, file_mime } ] }
  const [input, setInput] = useState('');
  const [file, setFile] = useState(null);
  const [users, setUsers] = useState([]);
  const [selectedUser, setSelectedUser] = useState(null);
  const [unreadCounts, setUnreadCounts] = useState({}); // { usercode: number }
  const usersIntervalRef = useRef(null);
  const fileUrlRef = useRef(null);
  const [filesTab, setFilesTab] = useState([]);

  // Load users (prefers fetchUsers from useAuth)
  const loadUsers = async () => {
    if (!isAuthenticated) return;
    try {
      if (typeof fetchUsers === 'function') {
        const list = await fetchUsers();
        setUsers(Array.isArray(list) ? list : []);
      } else {
        // fallback to REST
        const res = await fetch('/api/users', { credentials: 'same-origin' });
        if (res.ok) {
          const payload = await res.json();
          setUsers(Array.isArray(payload?.users) ? payload.users : []);
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

    return () => {
      clearInterval(usersIntervalRef.current);
      usersIntervalRef.current = null;
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [isAuthenticated]);

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
      }
      const rf = await authFetch(`/api/chat/files/${otherId}`);
      if (rf.ok) {
        const fd = await rf.json();
        setFilesTab(fd.files || []);
      }
    })();
  }, [isAuthenticated, selectedUser, authFetch, user]);

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

  const sendMessage = async () => {
    if (!input.trim() && !file) return;
    if (!selectedUser) return;

    const form = new FormData();
    form.append('to_userid', selectedUser.id);
    if (input.trim()) form.append('text', input.trim());
    if (file?.file) form.append('file', file.file);
    const res = await authFetch('/api/chat/send', { method: 'POST', body: form });
    if (res.ok) {
      const m = await res.json();
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
    }

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

  const toggleOpen = () => setIsOpen((s) => !s);

  const totalUnread = Object.values(unreadCounts).reduce((a, b) => a + (b || 0), 0);

  // Keep layout in sync: expose current rail width as a CSS variable
  useEffect(() => {
    const railWidth = !isAuthenticated
      ? '0px'
      : isOpen
      ? 'calc(20rem + 10px)'
      : 'calc(4rem + 10px)';
    document.documentElement.style.setProperty('--chat-rail-width', railWidth);
    return () => {
      // On unmount, clear the variable
      document.documentElement.style.removeProperty('--chat-rail-width');
    };
  }, [isAuthenticated, isOpen]);

  return (
    <div
      className={
        'fixed top-0 right-0 h-full flex items-center transition-all duration-300 ease-in-out z-40'
      }
      style={{ width: !isAuthenticated ? '0px' : (isOpen ? 'calc(20rem + 10px)' : 'calc(4rem + 10px)') }}
      aria-hidden={!isAuthenticated}
    >
      {/* Left spacer to match sidebar gap */}
      <div className="w-[10px] h-full bg-gray-100" />

      {/* Chat rail */}
      <div className={`relative h-full bg-gray-800 text-white flex flex-col ${isOpen ? 'w-80' : 'w-16'}`}>
        {/* Fixed header/title */}
        <div className="absolute top-0 right-0 left-0 bg-gray-900 text-white h-12 flex items-center justify-between px-3 border-b border-gray-700">
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
                    className={`absolute bottom-0 right-0 w-3 h-3 rounded-full border-2 border-gray-800 ${
                      user.status === 'online' ? 'bg-green-400' : 'bg-gray-400'
                    }`}
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

        {/* open: user list */}
        {isOpen && !selectedUser && (
          <div className="flex-1 flex flex-col mt-12">
            <div className="p-2 border-b bg-gray-900 text-white">
              <h3 className="text-lg font-semibold">Users</h3>
            </div>
            <div className="p-2 overflow-auto">
              <ul className="space-y-1">
                {users.map((user) => {
                  const ucode = user.usercode || user.userid;
                  return (
                    <li key={ucode}>
                      <button
                        onClick={() => setSelectedUser(user)}
                        className="w-full flex items-center gap-3 p-2 rounded hover:bg-gray-700 focus:outline-none focus:ring-2 focus:ring-indigo-400"
                        aria-label={`Chat with ${ucode}`}
                      >
                        <div
                          className={`w-3 h-3 rounded-full ${
                            user.status === 'online' ? 'bg-green-500' : 'bg-gray-400'
                          }`}
                        />
                        <div className="flex-1 text-left">{ucode}</div>
                        {unreadCounts[ucode] > 0 && (
                          <div className="text-xs bg-red-500 px-2 py-0.5 rounded text-white">
                            {unreadCounts[ucode]}
                          </div>
                        )}
                      </button>
                    </li>
                  );
                })}
                {users.length === 0 && <li className="text-gray-400 p-2">No users available.</li>}
              </ul>
            </div>
          </div>
        )}

        {/* open: chat with selected user */}
        {selectedUser && (
          <div className="flex-1 flex flex-col mt-12">
            <div className="p-2 border-b bg-gray-900 text-white flex items-center justify-between">
              <h3 className="text-lg font-semibold">{selectedUser.usercode || selectedUser.userid}</h3>
              <div className="flex items-center gap-2">
                <button
                  onClick={() => setSelectedUser(null)}
                  className="text-sm px-2 py-1 rounded bg-gray-800 hover:bg-gray-700 focus:outline-none"
                >
                  Close
                </button>
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
                  {msg.text && <div className="mt-1">{msg.text}</div>}
                  {msg.fileUrl && (
                    <a href={msg.fileUrl} download={msg.fileName} className="text-blue-600 underline mt-1 flex items-center gap-1">
                      <span>{fileIcon(msg.file_mime || msg.fileName)}</span>
                      <span>{msg.fileName || 'Download file'}</span>
                    </a>
                  )}
                  <small className="block text-xs text-gray-500 mt-1">{msg.time}</small>
                </div>
              ))}
            </div>

            <div className="p-2 border-t flex items-center space-x-2 bg-gray-800">
              <input
                type="text"
                className="flex-1 p-2 text-black border rounded"
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
              <input id="file-upload" type="file" className="hidden" onChange={handleFileChange} />
              <label htmlFor="file-upload" className="cursor-pointer bg-gray-700 text-white p-2 rounded">
                📎
              </label>
              <button
                className="px-4 py-2 bg-blue-600 text-white rounded"
                onClick={sendMessage}
                aria-label="Send message"
              >
                Send
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
          </div>
        )}
        {/* toggle button */}
        <button
          onClick={toggleOpen}
          className="absolute top-4 -left-6 w-10 h-10 bg-white border-2 border-blue-500 rounded-full flex items-center justify-center shadow-lg focus:outline-none focus:ring-2 focus:ring-indigo-400"
          aria-pressed={isOpen}
          aria-label={isOpen ? 'Collapse chat' : 'Open chat'}
        >
          {isOpen ? <FiChevronRight className="text-blue-500 text-xl" /> : <FiChevronLeft className="text-blue-500 text-xl" />}
          {!isOpen && totalUnread > 0 && (
            <div className="absolute -top-1 -right-1 w-5 h-5 bg-red-500 text-white text-xs flex items-center justify-center rounded-full">
              {totalUnread}
            </div>
          )}
        </button>
      </div>
    </div>
  );
};

export default ChatBox;
