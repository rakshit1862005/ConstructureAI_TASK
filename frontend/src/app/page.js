'use client'
import Image from "next/image";

export default function Home() {
    const BACKEND_URL = process.env.NEXT_PUBLIC_BACKEND_URL;

    const login = () => {
        window.location.href = `${BACKEND_URL}/auth/google/login`;
    };

    return (
        <div style={{ display: "flex", height: "100vh", alignItems: "center", justifyContent: "center", flexDirection: "column" }}>
            <h1>Email Assistant</h1>
            <button onClick={login} style={{ padding: "10px 20px", fontSize: "18px" }}>
                Login with Google
            </button>
        </div>
    );
}

