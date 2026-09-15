import { useState, useEffect, useCallback } from "react";
import { invoke } from "@tauri-apps/api/core";
import toast from "react-hot-toast";
import { UsersThree, Plus, Trash } from "@phosphor-icons/react";
import PageHeader from "@/components/ui/PageHeader";
import EmptyState from "@/components/ui/EmptyState";

interface User {
  id: number;
  username: string;
  role: string;
  display_name: string;
}

export default function Users() {
  const [users, setUsers] = useState<User[]>([]);
  const [loading, setLoading] = useState(true);
  const [showForm, setShowForm] = useState(false);
  const [username, setUsername] = useState("");
  const [password, setPassword] = useState("");
  const [displayName, setDisplayName] = useState("");
  const [role, setRole] = useState("cashier");
  const [saving, setSaving] = useState(false);

  const fetchUsers = useCallback(async () => {
    setLoading(true);
    try {
      const res = await invoke<User[]>("list_users");
      setUsers(res);
    } catch {
      setUsers([]);
      toast.error("Gagal memuat data");
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => { fetchUsers(); }, [fetchUsers]);

  const handleCreate = async () => {
    if (!username.trim()) { toast.error("Username harus diisi"); return; }
    if (password.length < 4) { toast.error("Password minimal 4 karakter"); return; }
    if (!displayName.trim()) { toast.error("Nama harus diisi"); return; }

    setSaving(true);
    try {
      await invoke("create_user", {
        input: {
          username: username.trim(),
          password,
          role,
          display_name: displayName.trim(),
        },
      });
      toast.success("User berhasil dibuat");
      setShowForm(false);
      setUsername("");
      setPassword("");
      setDisplayName("");
      setRole("cashier");
      fetchUsers();
    } catch (err) {
      toast.error(String(err));
    } finally {
      setSaving(false);
    }
  };

  const handleDelete = async (userId: number, userName: string) => {
    if (!window.confirm(`Hapus user "${userName}"?`)) return;
    try {
      await invoke("delete_user", { id: userId });
      toast.success("User dihapus");
      fetchUsers();
    } catch (err) {
      toast.error(String(err));
    }
  };

  const roleLabel = (r: string) => r === "admin" ? "Admin" : "Kasir";
  const roleBadge = (r: string) => r === "admin" ? "badge-primary" : "badge-ghost";

  return (
    <div className="space-y-4">
      <PageHeader icon={UsersThree} title="Manajemen User" subtitle={`${users.length} user aktif`}>
        <button className="btn btn-primary" onClick={() => setShowForm(true)}>
          <Plus size={18} weight="bold" /> Tambah User
        </button>
      </PageHeader>

      <div className="bg-base-200 rounded-box overflow-x-auto">
        {loading ? (
          <div className="p-8 text-center"><span className="loading loading-spinner loading-md" /></div>
        ) : users.length === 0 ? (
          <EmptyState icon={UsersThree} title="Belum ada user"
            description="Klik 'Tambah User' untuk membuat user baru."
            action={{ label: "Tambah User", onClick: () => setShowForm(true) }} />
        ) : (
          <table className="table table-zebra">
            <thead>
              <tr>
                <th>Username</th><th>Nama</th><th>Role</th><th className="w-20">Aksi</th>
              </tr>
            </thead>
            <tbody>
              {users.map((u) => (
                <tr key={u.id}>
                  <td className="font-mono text-sm">{u.username}</td>
                  <td>{u.display_name}</td>
                  <td><span className={`badge badge-sm ${roleBadge(u.role)}`}>{roleLabel(u.role)}</span></td>
                  <td>
                    <button
                      className="btn btn-xs btn-ghost text-error"
                      onClick={() => handleDelete(u.id, u.username)}
                    >
                      <Trash size={14} />
                    </button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </div>

      {showForm && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50" onClick={() => setShowForm(false)}>
          <div className="bg-base-100 rounded-box p-6 w-full max-w-md shadow-xl" onClick={(e) => e.stopPropagation()}>
            <h3 className="font-bold text-lg mb-4">Tambah User Baru</h3>
            <div className="space-y-3">
              <div className="form-control">
                <label className="label"><span className="label-text">Username *</span></label>
                <input type="text" className="input input-bordered" value={username}
                  onChange={(e) => setUsername(e.target.value)} autoFocus />
              </div>
              <div className="form-control">
                <label className="label"><span className="label-text">Password *</span></label>
                <input type="password" className="input input-bordered" value={password}
                  onChange={(e) => setPassword(e.target.value)} placeholder="Minimal 4 karakter" />
              </div>
              <div className="form-control">
                <label className="label"><span className="label-text">Nama Tampilan *</span></label>
                <input type="text" className="input input-bordered" value={displayName}
                  onChange={(e) => setDisplayName(e.target.value)} />
              </div>
              <div className="form-control">
                <label className="label"><span className="label-text">Role</span></label>
                <select className="select select-bordered" value={role} onChange={(e) => setRole(e.target.value)}>
                  <option value="cashier">Kasir</option>
                  <option value="admin">Admin</option>
                </select>
              </div>
              <div className="flex gap-2 justify-end pt-2">
                <button className="btn btn-ghost" onClick={() => setShowForm(false)}>Batal</button>
                <button className="btn btn-primary" disabled={saving} onClick={handleCreate}>
                  {saving ? <span className="loading loading-spinner" /> : "Buat User"}
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
