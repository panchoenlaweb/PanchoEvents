'use client';
import { useState, useEffect, useCallback } from 'react';
import { useRouter } from 'next/navigation';
import {
  Users, Film, ScrollText, Plus, Edit2, Trash2, Power,
  LogOut, Key, Link2, RefreshCw, Shield, CheckCircle, XCircle, Copy, Eye, EyeOff, Wand2,
} from 'lucide-react';
import type { JWTPayload, User, Event, AccessLog } from '@/types';
import { Button } from '@/components/ui/Button';
import { Input } from '@/components/ui/Input';
import { Modal } from '@/components/ui/Modal';
import { Badge } from '@/components/ui/Badge';
import { ToastContainer, useToast } from '@/components/ui/Toast';
import { formatDate, slugify } from '@/lib/utils';

type Tab = 'users' | 'events' | 'logs';

function generatePassword(username: string): string {
  const clean = username.replace(/[^a-z0-9]/gi, '').toLowerCase();
  const head  = clean.slice(0, 4);
  const tail  = clean.length > 4 ? clean.slice(-3) : '';
  const digits = String(Math.floor(1000 + Math.random() * 9000));
  return `${head}${tail}${digits}`;
}

export function AdminClient({ adminUser }: { adminUser: JWTPayload }) {
  const router = useRouter();
  const { toasts, addToast, removeToast } = useToast();
  const [tab, setTab] = useState<Tab>('users');

  // ── Data ────────────────────────────────────────────────────────────────────
  const [users, setUsers] = useState<User[]>([]);
  const [events, setEvents] = useState<Event[]>([]);
  const [logs, setLogs] = useState<AccessLog[]>([]);
  const [loading, setLoading] = useState(false);

  // ── User modal state ─────────────────────────────────────────────────────────
  const [userModal, setUserModal] = useState<{ open: boolean; editing: User | null }>({ open: false, editing: null });
  const [userForm, setUserForm] = useState({ username: '', email: '', password: '', role: 'user' as 'user' | 'admin', is_active: true });
  const [userSaving, setUserSaving] = useState(false);
  const [showPassword, setShowPassword] = useState(false);

  // ── Event modal state ─────────────────────────────────────────────────────────
  const [eventModal, setEventModal] = useState<{ open: boolean; editing: Event | null }>({ open: false, editing: null });
  const [eventForm, setEventForm] = useState({ title: '', description: '', event_date: '', thumbnail_url: '', stream_url: '', status: 'active' as 'active' | 'inactive', slug: '' });
  const [eventSaving, setEventSaving] = useState(false);

  // ── Assign events modal ───────────────────────────────────────────────────────
  const [assignModal, setAssignModal] = useState<{ open: boolean; user: User | null }>({ open: false, user: null });
  const [assignedIds, setAssignedIds] = useState<string[]>([]);
  const [assignSaving, setAssignSaving] = useState(false);

  // ── Fetch helpers ────────────────────────────────────────────────────────────
  const fetchUsers = useCallback(async () => {
    const res = await fetch('/api/admin/users');
    if (res.ok) { const d = await res.json(); setUsers(d.data ?? []); }
  }, []);

  const fetchEvents = useCallback(async () => {
    const res = await fetch('/api/admin/events');
    if (res.ok) { const d = await res.json(); setEvents(d.data ?? []); }
  }, []);

  const fetchLogs = useCallback(async () => {
    const res = await fetch('/api/admin/logs?limit=100');
    if (res.ok) { const d = await res.json(); setLogs(d.data ?? []); }
  }, []);

  useEffect(() => {
    setLoading(true);
    Promise.all([fetchUsers(), fetchEvents()]).finally(() => setLoading(false));
  }, [fetchUsers, fetchEvents]);

  useEffect(() => {
    if (tab === 'logs') fetchLogs();
  }, [tab, fetchLogs]);

  async function logout() {
    await fetch('/api/auth/logout', { method: 'POST' });
    router.replace('/login');
  }

  // ── User CRUD ────────────────────────────────────────────────────────────────
  function openCreateUser() {
    setUserForm({ username: '', email: '', password: '', role: 'user', is_active: true });
    setUserModal({ open: true, editing: null });
  }

  function openEditUser(u: User) {
    setUserForm({ username: u.username, email: u.email ?? '', password: '', role: u.role, is_active: u.is_active });
    setUserModal({ open: true, editing: u });
  }

  async function saveUser() {
    setUserSaving(true);
    try {
      const isEdit = !!userModal.editing;
      const url = isEdit ? `/api/admin/users/${userModal.editing!.id}` : '/api/admin/users';
      const method = isEdit ? 'PUT' : 'POST';
      const body: Record<string, unknown> = { username: userForm.username, role: userForm.role, is_active: userForm.is_active };
      if (userForm.email) body.email = userForm.email;
      if (userForm.password) body.password = userForm.password;
      if (!isEdit) body.password = userForm.password;

      const res = await fetch(url, { method, headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(body) });
      const data = await res.json();
      if (!res.ok) { addToast('error', data.error ?? 'Error al guardar usuario'); return; }

      addToast('success', isEdit ? 'Usuario actualizado' : 'Usuario creado');
      setUserModal({ open: false, editing: null });
      fetchUsers();
    } finally {
      setUserSaving(false);
    }
  }

  async function deleteUser(u: User) {
    if (!confirm(`¿Eliminar al usuario "${u.username}"? Esta acción no se puede deshacer.`)) return;
    const res = await fetch(`/api/admin/users/${u.id}`, { method: 'DELETE' });
    if (res.ok) { addToast('success', 'Usuario eliminado'); fetchUsers(); }
    else { const d = await res.json(); addToast('error', d.error ?? 'Error al eliminar'); }
  }

  async function toggleUserActive(u: User) {
    const res = await fetch(`/api/admin/users/${u.id}`, {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ is_active: !u.is_active }),
    });
    if (res.ok) { addToast('success', u.is_active ? 'Usuario desactivado' : 'Usuario activado'); fetchUsers(); }
    else { const d = await res.json(); addToast('error', d.error ?? 'Error'); }
  }

  // ── Event assignment ─────────────────────────────────────────────────────────
  async function openAssign(u: User) {
    setAssignModal({ open: true, user: u });
    const res = await fetch(`/api/admin/users/${u.id}/events`);
    if (res.ok) {
      const d = await res.json();
      setAssignedIds((d.data ?? []).map((r: Record<string, unknown>) => String(r.event_id)));
    }
  }

  async function saveAssignments() {
    if (!assignModal.user) return;
    setAssignSaving(true);
    try {
      const res = await fetch(`/api/admin/users/${assignModal.user.id}/events`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ eventIds: assignedIds }),
      });
      if (res.ok) { addToast('success', 'Eventos asignados'); setAssignModal({ open: false, user: null }); }
      else { const d = await res.json(); addToast('error', d.error ?? 'Error'); }
    } finally {
      setAssignSaving(false);
    }
  }

  // ── Event CRUD ────────────────────────────────────────────────────────────────
  function openCreateEvent() {
    setEventForm({ title: '', description: '', event_date: '', thumbnail_url: '', stream_url: '', status: 'active', slug: '' });
    setEventModal({ open: true, editing: null });
  }

  function openEditEvent(e: Event) {
    setEventForm({
      title: e.title,
      description: e.description ?? '',
      event_date: e.event_date ? new Date(e.event_date).toISOString().slice(0, 16) : '',
      thumbnail_url: e.thumbnail_url ?? '',
      stream_url: e.stream_url ?? '',
      status: e.status,
      slug: e.slug,
    });
    setEventModal({ open: true, editing: e });
  }

  async function saveEvent() {
    setEventSaving(true);
    try {
      const isEdit = !!eventModal.editing;
      const url = isEdit ? `/api/admin/events/${eventModal.editing!.id}` : '/api/admin/events';
      const method = isEdit ? 'PUT' : 'POST';
      const body = {
        ...eventForm,
        slug: eventForm.slug || slugify(eventForm.title),
        event_date: eventForm.event_date || null,
      };
      const res = await fetch(url, { method, headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(body) });
      const data = await res.json();
      if (!res.ok) { addToast('error', data.error ?? 'Error al guardar evento'); return; }

      addToast('success', isEdit ? 'Evento actualizado' : 'Evento creado');
      setEventModal({ open: false, editing: null });
      fetchEvents();
    } finally {
      setEventSaving(false);
    }
  }

  async function deleteEvent(e: Event) {
    if (!confirm(`¿Eliminar "${e.title}"?`)) return;
    const res = await fetch(`/api/admin/events/${e.id}`, { method: 'DELETE' });
    if (res.ok) { addToast('success', 'Evento eliminado'); fetchEvents(); }
    else { const d = await res.json(); addToast('error', d.error ?? 'Error'); }
  }

  // ── Render ───────────────────────────────────────────────────────────────────
  return (
    <div className="min-h-dvh bg-dark flex flex-col">
      {/* Top bar */}
      <header className="sticky top-0 z-40 border-b border-dark-border bg-black/80 backdrop-blur-md">
        <div className="max-w-6xl mx-auto px-5 py-3.5 flex items-center justify-between gap-4">
          <div className="flex items-center gap-3">
            <Shield size={16} className="text-amber" />
            <span className="font-display text-base text-amber tracking-wider">
              PanchoEvents
            </span>
            <span className="font-display text-[0.6rem] tracking-widest text-zinc-600 uppercase hidden sm:block">
              · Panel de Administración
            </span>
          </div>
          <div className="flex items-center gap-3">
            <span className="font-display text-[0.6rem] tracking-widest text-zinc-500 uppercase hidden sm:block">
              {adminUser.username}
            </span>
            <button
              onClick={logout}
              className="flex items-center gap-1.5 font-display text-[0.6rem] tracking-widest uppercase text-zinc-500 border border-zinc-800 px-3 py-1.5 hover:text-amber hover:border-amber/50 transition-all"
            >
              <LogOut size={12} />
              <span className="hidden sm:inline">Salir</span>
            </button>
          </div>
        </div>
      </header>

      <div className="max-w-6xl mx-auto w-full px-5 py-8 flex-1">
        {/* Stats */}
        <div className="grid grid-cols-2 sm:grid-cols-3 gap-4 mb-8">
          {[
            { label: 'Usuarios', value: users.length, icon: Users },
            { label: 'Eventos', value: events.length, icon: Film },
            { label: 'Activos', value: users.filter((u) => u.is_active).length, icon: CheckCircle },
          ].map(({ label, value, icon: Icon }) => (
            <div key={label} className="bg-dark-card border border-dark-border p-5 relative">
              <div className="absolute top-0 left-0 right-0 h-px bg-gradient-to-r from-transparent via-amber/30 to-transparent" />
              <div className="flex items-center justify-between">
                <div>
                  <p className="font-display text-[0.6rem] tracking-widest text-zinc-500 uppercase">{label}</p>
                  <p className="font-display text-3xl text-amber mt-1">{value}</p>
                </div>
                <Icon size={20} className="text-zinc-700" />
              </div>
            </div>
          ))}
        </div>

        {/* Tabs */}
        <div className="flex gap-0 border-b border-dark-border mb-6">
          {([['users', 'Usuarios', Users], ['events', 'Eventos', Film], ['logs', 'Registros', ScrollText]] as const).map(
            ([id, label, Icon]) => (
              <button
                key={id}
                onClick={() => setTab(id)}
                className={`flex items-center gap-2 font-display text-[0.68rem] tracking-widest uppercase px-5 py-3 border-b-2 transition-all ${
                  tab === id
                    ? 'border-amber text-amber'
                    : 'border-transparent text-zinc-500 hover:text-zinc-300'
                }`}
              >
                <Icon size={13} />
                <span className="hidden sm:inline">{label}</span>
              </button>
            ),
          )}
        </div>

        {/* ── Users tab ──────────────────────────────────────────────────────── */}
        {tab === 'users' && (
          <div>
            <div className="flex items-center justify-between mb-4">
              <p className="font-display text-[0.6rem] tracking-[0.3em] text-zinc-500 uppercase">
                {users.length} usuario{users.length !== 1 ? 's' : ''}
              </p>
              <Button size="sm" onClick={openCreateUser}>
                <Plus size={12} /> Nuevo Usuario
              </Button>
            </div>

            {loading ? (
              <LoadingRows />
            ) : (
              <div className="overflow-x-auto">
                <table className="w-full text-sm">
                  <thead>
                    <tr className="border-b border-dark-border">
                      {['Usuario', 'Email', 'Rol', 'Estado', 'Último acceso', 'Acciones'].map((h) => (
                        <th key={h} className="font-display text-[0.6rem] tracking-widest text-zinc-500 uppercase text-left px-3 py-3">
                          {h}
                        </th>
                      ))}
                    </tr>
                  </thead>
                  <tbody>
                    {users.map((u) => (
                      <tr key={u.id} className="border-b border-dark-border/50 hover:bg-dark-card/50 transition-colors">
                        <td className="px-3 py-3 font-sans text-zinc-200">{u.username}</td>
                        <td className="px-3 py-3 font-sans text-zinc-500 text-xs">{u.email ?? '—'}</td>
                        <td className="px-3 py-3">
                          <Badge variant={u.role === 'admin' ? 'admin' : 'user'}>{u.role}</Badge>
                        </td>
                        <td className="px-3 py-3">
                          <Badge variant={u.is_active ? 'active' : 'inactive'}>
                            {u.is_active ? 'Activo' : 'Inactivo'}
                          </Badge>
                        </td>
                        <td className="px-3 py-3 font-sans text-zinc-600 text-xs whitespace-nowrap">
                          {formatDate(u.last_login)}
                        </td>
                        <td className="px-3 py-3">
                          <div className="flex items-center gap-1">
                            <ActionBtn icon={Edit2} title="Editar" onClick={() => openEditUser(u)} />
                            <ActionBtn icon={Link2} title="Asignar eventos" onClick={() => openAssign(u)} />
                            <ActionBtn
                              icon={u.is_active ? XCircle : CheckCircle}
                              title={u.is_active ? 'Desactivar' : 'Activar'}
                              onClick={() => toggleUserActive(u)}
                            />
                            <ActionBtn
                              icon={Trash2}
                              title="Eliminar"
                              onClick={() => deleteUser(u)}
                              danger
                            />
                          </div>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
                {users.length === 0 && <EmptyRow message="Sin usuarios" />}
              </div>
            )}
          </div>
        )}

        {/* ── Events tab ─────────────────────────────────────────────────────── */}
        {tab === 'events' && (
          <div>
            <div className="flex items-center justify-between mb-4">
              <p className="font-display text-[0.6rem] tracking-[0.3em] text-zinc-500 uppercase">
                {events.length} evento{events.length !== 1 ? 's' : ''}
              </p>
              <Button size="sm" onClick={openCreateEvent}>
                <Plus size={12} /> Nuevo Evento
              </Button>
            </div>

            {loading ? (
              <LoadingRows />
            ) : (
              <div className="overflow-x-auto">
                <table className="w-full text-sm">
                  <thead>
                    <tr className="border-b border-dark-border">
                      {['Título', 'Slug', 'Fecha', 'Stream', 'Estado', 'Acciones'].map((h) => (
                        <th key={h} className="font-display text-[0.6rem] tracking-widest text-zinc-500 uppercase text-left px-3 py-3">
                          {h}
                        </th>
                      ))}
                    </tr>
                  </thead>
                  <tbody>
                    {events.map((e) => (
                      <tr key={e.id} className="border-b border-dark-border/50 hover:bg-dark-card/50 transition-colors">
                        <td className="px-3 py-3 font-sans text-zinc-200 max-w-[180px] truncate">{e.title}</td>
                        <td className="px-3 py-3 font-display text-[0.6rem] text-zinc-500 tracking-wider">{e.slug}</td>
                        <td className="px-3 py-3 font-sans text-zinc-500 text-xs whitespace-nowrap">
                          {formatDate(e.event_date)}
                        </td>
                        <td className="px-3 py-3">
                          {e.stream_url ? (
                            <span className="inline-flex items-center gap-1 font-display text-[0.58rem] tracking-wider text-emerald-400 uppercase">
                              <span className="w-1.5 h-1.5 rounded-full bg-emerald-400" />Listo
                            </span>
                          ) : (
                            <span className="inline-flex items-center gap-1 font-display text-[0.58rem] tracking-wider text-zinc-600 uppercase">
                              <span className="w-1.5 h-1.5 rounded-full bg-zinc-600" />Sin URL
                            </span>
                          )}
                        </td>
                        <td className="px-3 py-3">
                          <Badge variant={e.status === 'active' ? 'active' : 'inactive'}>
                            {e.status === 'active' ? 'Activo' : 'Inactivo'}
                          </Badge>
                        </td>
                        <td className="px-3 py-3">
                          <div className="flex items-center gap-1">
                            <ActionBtn icon={Edit2} title="Editar" onClick={() => openEditEvent(e)} />
                            <ActionBtn icon={Trash2} title="Eliminar" onClick={() => deleteEvent(e)} danger />
                          </div>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
                {events.length === 0 && <EmptyRow message="Sin eventos" />}
              </div>
            )}
          </div>
        )}

        {/* ── Logs tab ───────────────────────────────────────────────────────── */}
        {tab === 'logs' && (
          <div>
            <div className="flex items-center justify-between mb-4">
              <p className="font-display text-[0.6rem] tracking-[0.3em] text-zinc-500 uppercase">
                Últimos {logs.length} registros
              </p>
              <Button size="sm" variant="outline" onClick={fetchLogs}>
                <RefreshCw size={11} /> Actualizar
              </Button>
            </div>
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead>
                  <tr className="border-b border-dark-border">
                    {['Evento', 'Usuario', 'IP', 'Fecha'].map((h) => (
                      <th key={h} className="font-display text-[0.6rem] tracking-widest text-zinc-500 uppercase text-left px-3 py-3">
                        {h}
                      </th>
                    ))}
                  </tr>
                </thead>
                <tbody>
                  {logs.map((l) => (
                    <tr key={l.id} className="border-b border-dark-border/50 hover:bg-dark-card/50">
                      <td className="px-3 py-2.5">
                        <LogBadge type={l.event_type} />
                      </td>
                      <td className="px-3 py-2.5 font-sans text-zinc-400 text-xs">{l.username ?? '—'}</td>
                      <td className="px-3 py-2.5 font-sans text-zinc-600 text-xs">{l.ip_address ?? '—'}</td>
                      <td className="px-3 py-2.5 font-sans text-zinc-600 text-xs whitespace-nowrap">
                        {formatDate(l.created_at)}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
              {logs.length === 0 && <EmptyRow message="Sin registros" />}
            </div>
          </div>
        )}
      </div>

      {/* ── User modal ───────────────────────────────────────────────────────── */}
      <Modal
        open={userModal.open}
        onClose={() => setUserModal({ open: false, editing: null })}
        title={userModal.editing ? 'Editar Usuario' : 'Nuevo Usuario'}
      >
        <div className="flex flex-col gap-4">
          <Input
            label="Usuario *"
            value={userForm.username}
            onChange={(e) => setUserForm((f) => ({ ...f, username: e.target.value }))}
            placeholder="nombre_usuario"
          />
          <Input
            label="Email (opcional)"
            type="email"
            value={userForm.email}
            onChange={(e) => setUserForm((f) => ({ ...f, email: e.target.value }))}
            placeholder="usuario@ejemplo.com"
          />
          <div className="flex flex-col gap-1.5">
            <label className="font-display text-[0.65rem] tracking-widest text-zinc-400 uppercase">
              {userModal.editing ? 'Nueva contraseña (dejar vacío para no cambiar)' : 'Contraseña *'}
            </label>
            <div className="flex gap-2">
              <div className="relative flex-1">
                <input
                  type={showPassword ? 'text' : 'password'}
                  value={userForm.password}
                  onChange={(e) => setUserForm((f) => ({ ...f, password: e.target.value }))}
                  placeholder="Mínimo 6 caracteres"
                  className="w-full bg-dark border border-zinc-800 hover:border-zinc-600 focus:border-amber/70 text-zinc-100 placeholder-zinc-600 font-mono text-sm px-4 py-2.5 pr-10 transition-all focus:outline-none"
                />
                <button
                  type="button"
                  onClick={() => setShowPassword((v) => !v)}
                  className="absolute right-2.5 top-1/2 -translate-y-1/2 text-zinc-500 hover:text-zinc-300 transition-colors"
                >
                  {showPassword ? <EyeOff size={14} /> : <Eye size={14} />}
                </button>
              </div>
              <button
                type="button"
                title="Generar contraseña automática"
                onClick={() => {
                  const pwd = generatePassword(userForm.username || 'user');
                  setUserForm((f) => ({ ...f, password: pwd }));
                  setShowPassword(true);
                }}
                className="flex items-center gap-1.5 px-3 py-2.5 border border-zinc-700 text-zinc-400 hover:border-amber/50 hover:text-amber font-display text-[0.6rem] tracking-widest uppercase transition-all whitespace-nowrap"
              >
                <Wand2 size={12} /> Generar
              </button>
              <button
                type="button"
                title="Copiar contraseña"
                onClick={() => {
                  if (userForm.password) {
                    navigator.clipboard.writeText(userForm.password);
                    addToast('success', `Contraseña copiada: ${userForm.password}`);
                  }
                }}
                className="flex items-center gap-1.5 px-3 py-2.5 border border-zinc-700 text-zinc-400 hover:border-amber/50 hover:text-amber font-display text-[0.6rem] tracking-widest uppercase transition-all"
              >
                <Copy size={12} />
              </button>
            </div>
          </div>
          <div className="flex gap-4">
            <div className="flex flex-col gap-1.5 flex-1">
              <label className="font-display text-[0.65rem] tracking-widest text-zinc-400 uppercase">Rol</label>
              <select
                value={userForm.role}
                onChange={(e) => setUserForm((f) => ({ ...f, role: e.target.value as 'user' | 'admin' }))}
                className="w-full bg-dark border border-zinc-800 text-zinc-100 font-sans text-sm px-4 py-2.5 focus:outline-none focus:border-amber/70"
              >
                <option value="user">Usuario</option>
                <option value="admin">Admin</option>
              </select>
            </div>
            <div className="flex flex-col gap-1.5">
              <label className="font-display text-[0.65rem] tracking-widest text-zinc-400 uppercase">Estado</label>
              <button
                type="button"
                onClick={() => setUserForm((f) => ({ ...f, is_active: !f.is_active }))}
                className={`flex items-center gap-2 px-4 py-2.5 border text-xs font-display tracking-widest transition-all ${
                  userForm.is_active
                    ? 'border-emerald-500/40 text-emerald-400 bg-emerald-500/10'
                    : 'border-zinc-700 text-zinc-500 bg-zinc-800/50'
                }`}
              >
                <Power size={12} />
                {userForm.is_active ? 'Activo' : 'Inactivo'}
              </button>
            </div>
          </div>
          <div className="flex justify-end gap-3 pt-2 border-t border-dark-border">
            <Button variant="outline" size="sm" onClick={() => setUserModal({ open: false, editing: null })}>
              Cancelar
            </Button>
            <Button size="sm" loading={userSaving} onClick={saveUser}>
              {userModal.editing ? 'Guardar cambios' : 'Crear usuario'}
            </Button>
          </div>
        </div>
      </Modal>

      {/* ── Assign events modal ───────────────────────────────────────────────── */}
      <Modal
        open={assignModal.open}
        onClose={() => setAssignModal({ open: false, user: null })}
        title={`Asignar Eventos — ${assignModal.user?.username ?? ''}`}
        size="lg"
      >
        <div className="flex flex-col gap-3 max-h-80 overflow-y-auto mb-4">
          {events.length === 0 && (
            <p className="text-zinc-500 text-sm font-sans text-center py-4">No hay eventos creados.</p>
          )}
          {events.map((e) => {
            const checked = assignedIds.includes(e.id);
            return (
              <label key={e.id} className="flex items-center gap-3 cursor-pointer group">
                <div
                  className={`w-4 h-4 border flex-shrink-0 flex items-center justify-center transition-all ${
                    checked ? 'bg-amber border-amber' : 'border-zinc-600 group-hover:border-zinc-400'
                  }`}
                >
                  {checked && <CheckCircle size={10} className="text-black" />}
                </div>
                <input
                  type="checkbox"
                  className="hidden"
                  checked={checked}
                  onChange={() =>
                    setAssignedIds((prev) =>
                      checked ? prev.filter((id) => id !== e.id) : [...prev, e.id],
                    )
                  }
                />
                <div>
                  <p className="text-zinc-200 text-sm font-sans">{e.title}</p>
                  <p className="text-zinc-600 text-xs font-display tracking-widest">{e.slug}</p>
                </div>
                <Badge variant={e.status === 'active' ? 'active' : 'inactive'} className="ml-auto">
                  {e.status === 'active' ? 'Activo' : 'Inactivo'}
                </Badge>
              </label>
            );
          })}
        </div>
        <div className="flex justify-between items-center pt-3 border-t border-dark-border">
          <span className="font-display text-[0.6rem] tracking-widest text-zinc-500 uppercase">
            {assignedIds.length} seleccionado{assignedIds.length !== 1 ? 's' : ''}
          </span>
          <div className="flex gap-3">
            <Button variant="outline" size="sm" onClick={() => setAssignModal({ open: false, user: null })}>
              Cancelar
            </Button>
            <Button size="sm" loading={assignSaving} onClick={saveAssignments}>
              Guardar asignación
            </Button>
          </div>
        </div>
      </Modal>

      {/* ── Event modal ───────────────────────────────────────────────────────── */}
      <Modal
        open={eventModal.open}
        onClose={() => setEventModal({ open: false, editing: null })}
        title={eventModal.editing ? 'Editar Evento' : 'Nuevo Evento'}
        size="lg"
      >
        <div className="flex flex-col gap-4">
          <Input
            label="Título *"
            value={eventForm.title}
            onChange={(e) => setEventForm((f) => ({ ...f, title: e.target.value, slug: f.slug || slugify(e.target.value) }))}
            placeholder="Nombre del evento"
          />
          <Input
            label="Slug (URL)"
            value={eventForm.slug}
            onChange={(e) => setEventForm((f) => ({ ...f, slug: e.target.value }))}
            placeholder="nombre-del-evento"
          />
          <div className="flex flex-col gap-1.5">
            <label className="font-display text-[0.65rem] tracking-widest text-zinc-400 uppercase">Descripción</label>
            <textarea
              value={eventForm.description}
              onChange={(e) => setEventForm((f) => ({ ...f, description: e.target.value }))}
              placeholder="Descripción del evento..."
              rows={3}
              className="w-full bg-dark border border-zinc-800 hover:border-zinc-600 focus:border-amber/70 text-zinc-100 placeholder-zinc-600 font-sans text-sm px-4 py-2.5 transition-all focus:outline-none resize-none"
            />
          </div>
          <div className="grid grid-cols-2 gap-4">
            <Input
              label="Fecha del evento"
              type="datetime-local"
              value={eventForm.event_date}
              onChange={(e) => setEventForm((f) => ({ ...f, event_date: e.target.value }))}
            />
            <div className="flex flex-col gap-1.5">
              <label className="font-display text-[0.65rem] tracking-widest text-zinc-400 uppercase">Estado</label>
              <select
                value={eventForm.status}
                onChange={(e) => setEventForm((f) => ({ ...f, status: e.target.value as 'active' | 'inactive' }))}
                className="w-full bg-dark border border-zinc-800 text-zinc-100 font-sans text-sm px-4 py-2.5 focus:outline-none focus:border-amber/70"
              >
                <option value="active">Activo</option>
                <option value="inactive">Inactivo</option>
              </select>
            </div>
          </div>
          <Input
            label="URL del Stream (Vimeo)"
            value={eventForm.stream_url}
            onChange={(e) => setEventForm((f) => ({ ...f, stream_url: e.target.value }))}
            placeholder="https://vimeo.com/123456789  ó  vimeo.com/event/ID/embed/interaction"
          />
          <Input
            label="URL de Miniatura"
            value={eventForm.thumbnail_url}
            onChange={(e) => setEventForm((f) => ({ ...f, thumbnail_url: e.target.value }))}
            placeholder="https://..."
          />
          <div className="flex justify-end gap-3 pt-2 border-t border-dark-border">
            <Button variant="outline" size="sm" onClick={() => setEventModal({ open: false, editing: null })}>
              Cancelar
            </Button>
            <Button size="sm" loading={eventSaving} onClick={saveEvent}>
              {eventModal.editing ? 'Guardar cambios' : 'Crear evento'}
            </Button>
          </div>
        </div>
      </Modal>

      <ToastContainer toasts={toasts} onRemove={removeToast} />
    </div>
  );
}

// ── Tiny helpers ────────────────────────────────────────────────────────────

function ActionBtn({
  icon: Icon,
  title,
  onClick,
  danger,
}: {
  icon: React.ElementType;
  title: string;
  onClick: () => void;
  danger?: boolean;
}) {
  return (
    <button
      title={title}
      onClick={onClick}
      className={`p-1.5 border rounded-sm transition-all ${
        danger
          ? 'border-zinc-800 text-zinc-600 hover:border-red-500/50 hover:text-red-400'
          : 'border-zinc-800 text-zinc-500 hover:border-amber/50 hover:text-amber'
      }`}
    >
      <Icon size={12} />
    </button>
  );
}

function LoadingRows() {
  return (
    <div className="flex flex-col gap-2 py-4">
      {[1, 2, 3].map((i) => (
        <div key={i} className="h-10 bg-dark-card border border-dark-border animate-pulse" />
      ))}
    </div>
  );
}

function EmptyRow({ message }: { message: string }) {
  return (
    <div className="py-12 text-center">
      <p className="font-display text-[0.6rem] tracking-widest text-zinc-600 uppercase">{message}</p>
    </div>
  );
}

const LOG_STYLES: Record<string, { label: string; class: string }> = {
  login: { label: 'Login', class: 'text-emerald-400 bg-emerald-500/10 border-emerald-500/30' },
  logout: { label: 'Logout', class: 'text-zinc-400 bg-zinc-800 border-zinc-700' },
  login_failed: { label: 'Fallo', class: 'text-red-400 bg-red-500/10 border-red-500/30' },
  session_expired: { label: 'Expirado', class: 'text-amber bg-amber/10 border-amber/30' },
  access_denied: { label: 'Denegado', class: 'text-orange-400 bg-orange-500/10 border-orange-500/30' },
};

function LogBadge({ type }: { type: string }) {
  const s = LOG_STYLES[type] ?? { label: type, class: 'text-zinc-400 bg-zinc-800 border-zinc-700' };
  return (
    <span className={`inline-flex px-2 py-0.5 font-display text-[0.55rem] tracking-widest uppercase border ${s.class}`}>
      {s.label}
    </span>
  );
}
