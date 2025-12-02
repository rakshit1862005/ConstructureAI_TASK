'use client'
import { useEffect, useState, useRef } from "react";

export default function Page() {
    const BACKEND_URL = process.env.NEXT_PUBLIC_BACKEND_URL;

    const [user, setUser] = useState(null);
    const [messages, setMessages] = useState([]);
    const [input, setInput] = useState("");
    const [loading, setLoading] = useState(false);
    const messagesEndRef = useRef(null);

    const scrollToBottom = () => {
        messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
    };

    useEffect(() => {
        scrollToBottom();
    }, [messages]);

    // Load user session
    useEffect(() => {
        fetch(`${BACKEND_URL}/auth/me`, {
            credentials: "include",
        })
            .then(async (res) => {
                if (res.status === 401) {
                    window.location.href = "/";
                    return;
                }
                let data = await res.json();
                setUser(data);
                setMessages([
                    {
                        author: "bot",
                        text: `Hi ${data.name}! 👋 I'm your AI email assistant. Here's what I can help you with:

• "read emails" or "show last 5" - View your recent emails with AI summaries
• "reply 1" - Generate and send an AI response to email #1
• "delete 2" - Remove email #2 from your inbox

Try asking me in natural language!`
                    },
                ]);
            });
    }, []);

    const handleSend = async () => {
        if (!input.trim()) return;

        const userText = input;
        setMessages((m) => [...m, { author: "user", text: userText }]);
        setInput("");
        setLoading(true);

        try {
            // simple command detection
            if (userText.toLowerCase().includes("last 5") || userText.toLowerCase().includes("read emails") || userText.toLowerCase().includes("show emails")) {
                setMessages((m) => [...m, { author: "bot", text: "📧 Fetching your latest emails..." }]);
                const res = await fetch(`${BACKEND_URL}/emails/last5`, { credentials: "include" });
                const data = await res.json();

                // Format the response nicely
                let formatted = "Here's what you have:\n\n";
                if (Array.isArray(data)) {
                    data.forEach((email, idx) => {
                        formatted += `${idx + 1}. ${email.sender || 'Unknown'}\n`;
                        formatted += `   ${email.subject || 'No subject'}\n`;
                        formatted += `   ${email.summary || 'No summary'}\n\n`;
                    });
                } else {
                    formatted = JSON.stringify(data, null, 2);
                }

                setMessages((m) => {
                    const newMessages = [...m];
                    newMessages[newMessages.length - 1] = { author: "bot", text: formatted };
                    return newMessages;
                });
                setLoading(false);
                return;
            }

            if (userText.toLowerCase().startsWith("reply")) {
                const index = parseInt(userText.split(" ")[1]);
                setMessages((m) => [...m, { author: "bot", text: `✍️ Generating reply for email #${index}...` }]);

                const res = await fetch(`${BACKEND_URL}/emails/reply`, {
                    method: "POST",
                    credentials: "include",
                    headers: { "Content-Type": "application/json" },
                    body: JSON.stringify({ index }),
                });
                const data = await res.json();

                setMessages((m) => {
                    const newMessages = [...m];
                    newMessages[newMessages.length - 1] = {
                        author: "bot",
                        text: `✅ Reply generated:\n\n${data.reply}\n\nWould you like to send this?`
                    };
                    return newMessages;
                });
                setLoading(false);
                return;
            }

            if (userText.toLowerCase().startsWith("delete")) {
                const index = parseInt(userText.split(" ")[1]);
                setMessages((m) => [...m, { author: "bot", text: `🗑️ Deleting email #${index}...` }]);

                const res = await fetch(`${BACKEND_URL}/emails/delete`, {
                    method: "POST",
                    credentials: "include",
                    headers: { "Content-Type": "application/json" },
                    body: JSON.stringify({ index }),
                });
                const data = await res.json();

                setMessages((m) => {
                    const newMessages = [...m];
                    newMessages[newMessages.length - 1] = {
                        author: "bot",
                        text: `✅ ${data.status}`
                    };
                    return newMessages;
                });
                setLoading(false);
                return;
            }

            setMessages((m) => [...m, {
                author: "bot",
                text: "❓ I didn't understand that command. Try:\n• 'read emails'\n• 'reply 1'\n• 'delete 2'"
            }]);
        } catch (error) {
            setMessages((m) => [...m, {
                author: "bot",
                text: "❌ Something went wrong. Please try again."
            }]);
        }

        setLoading(false);
    };

    const handleKeyPress = (e) => {
        if (e.key === 'Enter' && !e.shiftKey) {
            e.preventDefault();
            handleSend();
        }
    };

    if (!user) {
        return (
            <div className="min-h-screen bg-gradient-to-br from-blue-50 to-indigo-100 flex items-center justify-center">
                <div className="text-center">
                    <div className="inline-block animate-spin rounded-full h-12 w-12 border-b-2 border-indigo-600 mb-4"></div>
                    <p className="text-gray-600">Loading your assistant...</p>
                </div>
            </div>
        );
    }

    return (
        <div className="min-h-screen bg-gradient-to-br from-blue-50 to-indigo-100">
            {/* Header */}
            <div className="bg-white shadow-sm border-b border-gray-200">
                <div className="max-w-5xl mx-auto px-4 py-4 flex items-center justify-between">
                    <div className="flex items-center space-x-3">
                        <div className="w-10 h-10 bg-indigo-600 rounded-full flex items-center justify-center">
                            <svg className="w-6 h-6 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 8l7.89 5.26a2 2 0 002.22 0L21 8M5 19h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v10a2 2 0 002 2z" />
                            </svg>
                        </div>
                        <div>
                            <h1 className="text-lg font-semibold text-gray-900">Email Assistant</h1>
                            <p className="text-sm text-gray-500">Welcome, {user.name}</p>
                        </div>
                    </div>
                    <button
                        onClick={() => window.location.href = `${BACKEND_URL}/auth/logout`}
                        className="text-sm text-gray-600 hover:text-gray-900 px-4 py-2 rounded-lg hover:bg-gray-100 transition-colors"
                    >
                        Logout
                    </button>
                </div>
            </div>

            {/* Chat Container */}
            <div className="max-w-5xl mx-auto p-4 h-[calc(100vh-80px)] flex flex-col">
                <div className="bg-white rounded-2xl shadow-xl flex-1 flex flex-col overflow-hidden">
                    {/* Messages */}
                    <div className="flex-1 overflow-y-auto p-6 space-y-4">
                        {messages.map((msg, i) => (
                            <div
                                key={i}
                                className={`flex ${msg.author === "user" ? "justify-end" : "justify-start"}`}
                            >
                                <div
                                    className={`max-w-[80%] rounded-2xl px-4 py-3 ${
                                        msg.author === "user"
                                            ? "bg-indigo-600 text-white"
                                            : "bg-gray-100 text-gray-900"
                                    }`}
                                >
                                    <p className="text-sm whitespace-pre-wrap break-words">{msg.text}</p>
                                </div>
                            </div>
                        ))}
                        {loading && (
                            <div className="flex justify-start">
                                <div className="bg-gray-100 rounded-2xl px-4 py-3">
                                    <div className="flex space-x-2">
                                        <div className="w-2 h-2 bg-gray-400 rounded-full animate-bounce"></div>
                                        <div className="w-2 h-2 bg-gray-400 rounded-full animate-bounce" style={{ animationDelay: '0.2s' }}></div>
                                        <div className="w-2 h-2 bg-gray-400 rounded-full animate-bounce" style={{ animationDelay: '0.4s' }}></div>
                                    </div>
                                </div>
                            </div>
                        )}
                        <div ref={messagesEndRef} />
                    </div>

                    {/* Input Area */}
                    <div className="border-t border-gray-200 p-4 bg-gray-50">
                        <div className="flex space-x-3">
                            <input
                                value={input}
                                onChange={(e) => setInput(e.target.value)}
                                onKeyPress={handleKeyPress}
                                placeholder="Type a command or ask me anything..."
                                disabled={loading}
                                className="flex-1 px-4 py-3 rounded-xl border border-gray-300 focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:border-transparent disabled:bg-gray-100 disabled:cursor-not-allowed"
                            />
                            <button
                                onClick={handleSend}
                                disabled={loading || !input.trim()}
                                className="bg-indigo-600 text-white px-6 py-3 rounded-xl hover:bg-indigo-700 transition-colors disabled:bg-gray-300 disabled:cursor-not-allowed font-medium"
                            >
                                Send
                            </button>
                        </div>
                        <p className="text-xs text-gray-500 mt-2 text-center">
                            Try: "read emails" • "reply 1" • "delete 2"
                        </p>
                    </div>
                </div>
            </div>
        </div>
    );
}