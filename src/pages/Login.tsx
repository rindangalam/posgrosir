import { useState } from "react";
import { useNavigate } from "react-router-dom";
import { invoke } from "@tauri-apps/api/core";
import { ChartPieSlice, SignIn } from "@phosphor-icons/react";
import { useUIStore } from "@/stores/uiStore";

export default function Login() {
  const navigate = useNavigate();
  const setCurrentUser = useUIStore((s) => s.setCurrentUser);
  const [username, setUsername] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    setError("");
    if (!username.trim() || !password.trim()) {
      setError("Username dan password harus diisi");
      return;
    }
    setLoading(true);
    try {
      const user = await invoke<{ id: number; username: string; role: string; display_name: string }>("login_user", {
        input: { username: username.trim(), password },
      });
      setCurrentUser(user);
      navigate("/dashboard", { replace: true });
    } catch (err) {
      setError(String(err));
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-primary via-primary/80 to-secondary/60 p-4">
      <div className="w-full max-w-md">
        <div className="text-center mb-8">
          <div className="w-20 h-20 mx-auto bg-white/20 backdrop-blur rounded-2xl flex items-center justify-center mb-4 shadow-lg">
            <ChartPieSlice size={44} className="text-white" weight="fill" />
          </div>
          <h1 className="text-4xl font-heading font-bold text-white drop-shadow-md">POS Grosir</h1>
          <p className="text-white/80 mt-1">Sistem Kasir & Manajemen Stok Grosir</p>
        </div>

        <form onSubmit={handleLogin} className="bg-white/10 backdrop-blur-lg rounded-2xl p-8 shadow-xl border border-white/20 space-y-4">
          <div className="flex flex-col items-center gap-3">
            <div className="w-16 h-1 bg-white/30 rounded-full" />
            <p className="text-white/90 text-sm">Masuk ke akun Anda</p>
          </div>

          {error && (
            <div className="alert alert-error text-sm py-2">
              <span>{error}</span>
            </div>
          )}

          <div className="form-control">
            <label className="label"><span className="label-text text-white/80">Username</span></label>
            <input type="text" className="input input-bordered bg-white/20 text-white border-white/30 placeholder:text-white/50"
              placeholder="admin" value={username} onChange={(e) => setUsername(e.target.value)}
              autoFocus disabled={loading} />
          </div>

          <div className="form-control">
            <label className="label"><span className="label-text text-white/80">Password</span></label>
            <input type="password" className="input input-bordered bg-white/20 text-white border-white/30 placeholder:text-white/50"
              placeholder="admin123" value={password} onChange={(e) => setPassword(e.target.value)}
              disabled={loading} />
          </div>

          <button type="submit" className="btn btn-primary w-full" disabled={loading}>
            {loading ? <span className="loading loading-spinner" /> : <SignIn size={20} weight="bold" />}
            Masuk
          </button>

          <p className="text-center text-white/50 text-xs">
            Default: admin / admin123
          </p>
        </form>

        <p className="text-center text-white/50 text-xs mt-6">
          v1.0.0 — Tauri + React + SQLite
        </p>
      </div>
    </div>
  );
}
