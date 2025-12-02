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
                        text: `Hey ${data.name}!\n\nI can help you manage your emails. Try these:\n• "read emails" or "last 5" - see recent emails\n• "reply 1" - generate a response\n• "delete 2" - remove an email\n\nJust type naturally and I'll figure it out.`
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
            if (userText.toLowerCase().includes("last 5") || userText.toLowerCase().includes("read emails") || userText.toLowerCase().includes("show emails")) {
                setMessages((m) => [...m, { author: "bot", text: "Getting your emails..." }]);
                const res = await fetch(`${BACKEND_URL}/emails/last5`, { credentials: "include" });
                const data = await res.json();

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
                setMessages((m) => [...m, { author: "bot", text: `Writing a reply for #${index}...` }]);

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
                        text: `Here's a draft:\n\n${data.reply}\n\nLet me know if you want to send it.`
                    };
                    return newMessages;
                });
                setLoading(false);
                return;
            }

            if (userText.toLowerCase().startsWith("delete")) {
                const index = parseInt(userText.split(" ")[1]);
                setMessages((m) => [...m, { author: "bot", text: `Deleting email #${index}...` }]);

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
                        text: data.status
                    };
                    return newMessages;
                });
                setLoading(false);
                return;
            }

            setMessages((m) => [...m, {
                author: "bot",
                text: "Not sure what you mean. Try 'read emails', 'reply 1', or 'delete 2'"
            }]);
        } catch (error) {
            setMessages((m) => [...m, {
                author: "bot",
                text: "Something went wrong. Try again?"
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
            <div className="min-h-screen bg-gray-950 flex items-center justify-center">
                <div className="text-gray-500">Loading...</div>
            </div>
        );
    }

    return (
        <div className="min-h-screen bg-gray-950 flex flex-col">
            {/* Simple header */}
            <div className="border-b border-gray-800 px-6 py-4 flex items-center justify-between">
                <div>
                    <h1 className="text-xl font-semibold text-white">Email Assistant</h1>
                    <p className="text-sm text-gray-400">{user.name}</p>
                </div>
                <button
                    onClick={() => window.location.href = `${BACKEND_URL}/auth/logout`}
                    className="text-sm text-gray-400 hover:text-white transition-colors"
                >
                    Logout
                </button>
            </div>

            {/* Chat area */}
            <div className="flex-1 overflow-hidden flex flex-col max-w-4xl w-full mx-auto">
                <div className="flex-1 overflow-y-auto px-6 py-6 space-y-6">
                    {messages.map((msg, i) => (
                        <div key={i} className="flex gap-3">
                            <div className={`flex-shrink-0 w-8 h-8 rounded-full flex items-center justify-center text-sm font-medium ${
                                msg.author === "user"
                                    ? "bg-gray-100 text-gray-900"
                                    : "bg-gray-800 text-gray-300"
                            }`}>
                                {msg.author === "user" ? "Y" : "A"}
                            </div>
                            <div className="flex-1 pt-1">
                                <div className="text-sm font-medium text-gray-300 mb-1">
                                    {msg.author === "user" ? "You" : "Assistant"}
                                </div>
                                <div className="text-gray-400 whitespace-pre-wrap break-words leading-relaxed">
                                    {msg.text}
                                </div>
                            </div>
                        </div>
                    ))}
                    {loading && (
                        <div className="flex gap-3">
                            <div className="flex-shrink-0 w-8 h-8 rounded-full bg-gray-800 flex items-center justify-center text-sm font-medium text-gray-300">
                                A
                            </div>
                            <div className="flex-1 pt-1">
                                <div className="text-sm font-medium text-gray-300 mb-1">Assistant</div>
                                <div className="flex gap-1">
                                    <span className="w-2 h-2 bg-gray-600 rounded-full animate-bounce"></span>
                                    <span className="w-2 h-2 bg-gray-600 rounded-full animate-bounce" style={{ animationDelay: '0.1s' }}></span>
                                    <span className="w-2 h-2 bg-gray-600 rounded-full animate-bounce" style={{ animationDelay: '0.2s' }}></span>
                                </div>
                            </div>
                        </div>
                    )}
                    <div ref={messagesEndRef} />
                </div>

                {/* Input */}
                <div className="border-t border-gray-800 px-6 py-4">
                    <div className="flex gap-3">
                        <input
                            value={input}
                            onChange={(e) => setInput(e.target.value)}
                            onKeyPress={handleKeyPress}
                            placeholder="Type a command..."
                            disabled={loading}
                            className="flex-1 px-4 py-3 bg-gray-900 border border-gray-800 text-white placeholder-gray-500 rounded-lg focus:outline-none focus:border-gray-700 disabled:bg-gray-900 disabled:opacity-50"
                        />
                        <button
                            onClick={handleSend}
                            disabled={loading || !input.trim()}
                            className="bg-gray-100 text-gray-900 px-6 py-3 rounded-lg hover:bg-white disabled:bg-gray-800 disabled:text-gray-600 transition-colors font-medium"
                        >
                            Send
                        </button>
                    </div>
                </div>
            </div>
        </div>
    );
}