import React, { useEffect, useRef, useState } from 'react';
import { FiChevronLeft, FiChevronRight } from 'react-icons/fi';
import { useAuth } from '../../hooks/useAuth';

const ChatBox = () => {
  const { fetchUsers, isAuthenticated } = useAuth();
  const [isOpen, setIsOpen] = useState(false);
  const [messages, setMessages] = useState({}); // { usercode: [ { text, fileUrl, fileName, sender, time } ] }
  const [input, setInput] = useState('');
  const [file, setFile] = useState(null);
  const [users, setUsers] = useState([]);
  const [selectedUser, setSelectedUser] = useState(null);
  const [unreadCounts, setUnreadCounts] = useState({}); // { usercode: number }
  const usersIntervalRef = useRef(null);
  const simulatedMessagesIntervalRef = useRef(null);
  const fileUrlRef = useRef(null);

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

  // Simulate incoming messages for demo (only when authenticated)
  useEffect(() => {
    if (!isAuthenticated) return;

    simulatedMessagesIntervalRef.current = setInterval(() => {
      // choose a random user (if any)
      if (users.length === 0) return;
      const randomUser = users[Math.floor(Math.random() * users.length)];
      const ucode = randomUser.usercode || randomUser.userid || 'User1';

      setMessages((prev) => {
        const userMsgs = prev[ucode] ? [...prev[ucode]] : [];
        userMsgs.push({
          text: 'New message from ' + ucode,
          fileUrl: null,
          fileName: null,
          sender: ucode,
          time: new Date().toLocaleTimeString(),
        });
        return { ...prev, [ucode]: userMsgs };
      });

      setUnreadCounts((prev) => ({ ...prev, [ucode]: (prev[ucode] || 0) + 1 }));
    }, 15000);

    return () => {
      clearInterval(simulatedMessagesIntervalRef.current);
      simulatedMessagesIntervalRef.current = null;
    };
  }, [isAuthenticated, users]);

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

  const sendMessage = () => {
    if (!input.trim() && !file) return;
    if (!selectedUser) return;

    const key = selectedUser.usercode;
    const msg = {
      text: input.trim(),
      fileUrl: file ? file.url : null,
      fileName: file ? file.name : null,
      sender: 'Me',
      time: new Date().toLocaleTimeString(),
    };

    setMessages((prev) => {
      const existing = Array.isArray(prev[key]) ? [...prev[key]] : [];
      return { ...prev, [key]: [...existing, msg] };
    });

    // If you want to POST to backend, do it here (omitted for demo)
    // Example:
    // fetch(`/api/chats/${encodeURIComponent(key)}`, { method: 'POST', body: formData })

    setInput('');
    setFile(null);
    if (fileUrlRef.current) {
      // keep the URL for download in message; will be revoked on unmount
      fileUrlRef.current = null;
    }
  };

  const toggleOpen = () => setIsOpen((s) => !s);

  const totalUnread = Object.values(unreadCounts).reduce((a, b) => a + (b || 0), 0);

  return (
    <div
      className={`fixed top-0 right-0 h-full flex items-center transition-all duration-300 ease-in-out z-40 ${
        isOpen ? 'w-80' : 'w-16'
      }`}
      aria-hidden={!isAuthenticated}
    >
      <div className={`h-full bg-gray-800 text-white flex flex-col ${isOpen ? 'w-80' : 'w-16'}`}>
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
              </div>
            </div>

            <div className="flex-1 overflow-auto p-3 space-y-3 bg-gray-100 text-black custom-scrollbar">
              {(messages[selectedUser.usercode] || []).map((msg, idx) => (
                <div
                  key={idx}
                  className={`p-2 rounded ${msg.sender === 'Me' ? 'bg-blue-200 ml-auto' : 'bg-white'}`}
                  style={{ maxWidth: '85%' }}
                >
                  <div className="text-sm font-medium">{msg.sender}</div>
                  {msg.text && <div className="mt-1">{msg.text}</div>}
                  {msg.fileUrl && (
                    <a
                      href={msg.fileUrl}
                      download={msg.fileName}
                      className="text-blue-500 underline block mt-1"
                    >
                      {msg.fileName || 'Download file'}
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
          </div>
        )}
      </div>

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
  );
};

export default ChatBox;
