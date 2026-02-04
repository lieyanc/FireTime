"use client";

import { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";

export default function LoginPage() {
  const router = useRouter();
  const [password, setPassword] = useState("");
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);
  const [checkingAuth, setCheckingAuth] = useState(true);

  useEffect(() => {
    async function checkAuth() {
      try {
        const [verifyRes, statusRes] = await Promise.all([
          fetch("/api/auth/verify"),
          fetch("/api/auth/password"),
        ]);
        const verifyData = await verifyRes.json();
        const statusData = await statusRes.json();

        if (verifyData.authenticated) {
          router.replace("/dashboard");
          return;
        }

        if (!statusData.user1 && !statusData.user2) {
          const loginRes = await fetch("/api/auth/login", {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({ password: "" }),
          });
          if (loginRes.ok) {
            const data = await loginRes.json();
            localStorage.setItem("currentUserId", data.userId);
            router.replace("/dashboard");
            return;
          }
        }
      } catch {
        // Continue to login page
      } finally {
        setCheckingAuth(false);
      }
    }

    checkAuth();
  }, [router]);

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault();

    setLoading(true);
    setError("");

    try {
      const res = await fetch("/api/auth/login", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ password }),
      });

      const data = await res.json();

      if (!res.ok) {
        setError(data.error || "登录失败");
        return;
      }

      localStorage.setItem("currentUserId", data.userId);
      router.replace("/dashboard");
    } catch {
      setError("网络错误");
    } finally {
      setLoading(false);
    }
  };

  if (checkingAuth) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-background">
        <div className="text-sm text-muted-foreground">...</div>
      </div>
    );
  }

  return (
    <div className="min-h-screen flex items-center justify-center bg-background p-4">
      <div className="w-full max-w-xs space-y-8">
        {/* Logo */}
        <div className="text-center space-y-2">
          <div className="inline-flex items-center justify-center w-16 h-16 rounded-full border-2 border-foreground">
            <span className="text-2xl font-bold">F</span>
          </div>
          <h1 className="text-xl font-semibold tracking-tight">FireTime</h1>
        </div>

        {/* Form */}
        <form onSubmit={handleLogin} className="space-y-4">
          <Input
            type="password"
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            placeholder="密码"
            className="h-11 text-center border-border bg-transparent"
            autoFocus
          />

          {error && (
            <p className="text-sm text-destructive text-center">{error}</p>
          )}

          <Button
            type="submit"
            variant="outline"
            className="w-full h-11"
            disabled={loading || !password}
          >
            {loading ? "..." : "进入"}
          </Button>
        </form>
      </div>
    </div>
  );
}
