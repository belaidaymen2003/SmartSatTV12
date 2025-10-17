"use client"

import { useEffect, useMemo, useState } from 'react'
import { Search, Calendar, Eye, Edit2, Trash2, User, UserPlus, Coins, X, ChevronDown, Clock, FileText, Download, Zap } from 'lucide-react'
import Pagination from '../../../components/Admin/Pagination'
import ConfirmModal from '../../../components/UI/ConfirmModal'
import { useRouter } from 'next/navigation'

interface AdminUser {
  id: number
  name: string
  email: string
  username: string
  credits: number
  status: 'Approved' | 'Banned'
  createdAt: string
}

interface UserProfile {
  id: number
  name: string
  email: string
  username: string
  credits: number
  status: 'Approved' | 'Banned'
  role: string
  auth: string
  authLastAt: string | null
  createdAt: string
  updatedAt: string
  stats: {
    comments: number
    reviews: number
    subscriptions: number
    appDownloads: number
    beinJobs: number
  }
  subscriptions: Array<{
    id: number
    channelName: string
    channelCategory: string
    duration: string
    status: string
    startDate: string
    endDate: string
    credit: number
  }>
  comments: Array<{
    id: number
    itemTitle: string
    content: string
    status: string
    createdAt: string
  }>
  reviews: Array<{
    id: number
    itemTitle: string
    rating: number
    content: string | null
    status: string
    createdAt: string
  }>
  appDownloads: Array<{
    id: number
    name: string
    description: string
    version: string
    createdAt: string
  }>
  beinJobs: Array<{
    id: number
    code: string
    customerId: string
    months: number
    createdAt: string
  }>
}

export default function UsersContent() {
  const router = useRouter()
  const [query, setQuery] = useState('')
  const [sort, setSort] = useState<'date' | 'name'>('date')
  const [page, setPage] = useState(1)
  const [creditModal, setCreditModal] = useState<{ id: number; mode: 'add' | 'edit' } | null>(null)
  const [creditAmount, setCreditAmount] = useState<string>('')
  const [editModal, setEditModal] = useState<Partial<AdminUser> | null>(null)
  const [editPassword, setEditPassword] = useState('')
  const [editPasswordConfirm, setEditPasswordConfirm] = useState('')
  const [userProfile, setUserProfile] = useState<UserProfile | null>(null)
  const [profileLoading, setProfileLoading] = useState(false)
  const [expandedSection, setExpandedSection] = useState<string | null>(null)
  const [users, setUsers] = useState<AdminUser[]>([])
  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState(false)
  const [error, setError] = useState('')
  const pageSize = 10

  const fetchUsers = async () => {
    try {
      setLoading(true)
      setError('')
      const params = new URLSearchParams({
        page: String(page),
        pageSize: String(pageSize),
        ...(query && { search: query }),
      })

      const response = await fetch(`/api/admin/users?${params}`)
      if (!response.ok) throw new Error('Failed to fetch users')
      
      const data = await response.json()
      setUsers(data.users || [])
    } catch (err: any) {
      setError(err.message)
      console.error('Failed to fetch users:', err)
    } finally {
      setLoading(false)
    }
  }

  const fetchUserProfile = async (userId: number) => {
    try {
      setProfileLoading(true)
      const response = await fetch(`/api/admin/users/profile?id=${userId}`)
      if (!response.ok) throw new Error('Failed to fetch profile')
      
      const data = await response.json()
      setUserProfile(data)
      setExpandedSection(null)
    } catch (err: any) {
      setError(err.message)
      console.error('Failed to fetch profile:', err)
    } finally {
      setProfileLoading(false)
    }
  }

  useEffect(() => {
    fetchUsers()
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [page, query])

  const sorted = useMemo(() => {
    const rows = [...users]
    if (sort === 'date') return rows.sort((a, b) => b.createdAt.localeCompare(a.createdAt))
    return rows.sort((a, b) => a.name.localeCompare(b.name))
  }, [users, sort])

  const total = users.length
  const nf = new Intl.NumberFormat('en-US')

  const toggleStatus = async (id: number) => {
    const user = users.find(u => u.id === id)
    if (!user) return
    
    try {
      setSaving(true)
      const response = await fetch('/api/admin/users', {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          id,
          status: user.status === 'Approved' ? 'Banned' : 'Approved',
        }),
      })
      
      if (!response.ok) throw new Error('Failed to update user')
      
      setUsers(users.map(u => 
        u.id === id ? { ...u, status: u.status === 'Approved' ? 'Banned' : 'Approved' } : u
      ))
      
      if (userProfile?.id === id) {
        setUserProfile({ ...userProfile, status: user.status === 'Approved' ? 'Banned' : 'Approved' })
      }
    } catch (err: any) {
      setError(err.message)
    } finally {
      setSaving(false)
    }
  }

  const removeUser = async (id: number) => {
    if (!confirm('Delete this user?')) return
    
    try {
      setSaving(true)
      const response = await fetch(`/api/admin/users?id=${id}`, {
        method: 'DELETE',
      })
      
      if (!response.ok) throw new Error('Failed to delete user')
      
      setUsers(users.filter(u => u.id !== id))
      if (userProfile?.id === id) setUserProfile(null)
    } catch (err: any) {
      setError(err.message)
    } finally {
      setSaving(false)
    }
  }

  const addCredits = async (id: number, amount: number) => {
    try {
      setSaving(true)
      const response = await fetch('/api/admin/users/credits', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ userId: id, amount }),
      })
      
      if (!response.ok) throw new Error('Failed to add credits')
      
      const data = await response.json()
      setUsers(users.map(u => u.id === id ? { ...u, credits: data.credits } : u))
      if (userProfile?.id === id) {
        setUserProfile({ ...userProfile, credits: data.credits })
      }
    } catch (err: any) {
      setError(err.message)
    } finally {
      setSaving(false)
    }
  }

  const setCredits = async (id: number, amount: number) => {
    try {
      setSaving(true)
      const response = await fetch('/api/admin/users/credits', {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ userId: id, amount }),
      })
      
      if (!response.ok) throw new Error('Failed to update credits')
      
      const data = await response.json()
      setUsers(users.map(u => u.id === id ? { ...u, credits: data.credits } : u))
      if (userProfile?.id === id) {
        setUserProfile({ ...userProfile, credits: data.credits })
      }
    } catch (err: any) {
      setError(err.message)
    } finally {
      setSaving(false)
    }
  }

  const resetCredits = async (id: number) => {
    try {
      setSaving(true)
      const response = await fetch(`/api/admin/users/credits?userId=${id}`, {
        method: 'DELETE',
      })
      
      if (!response.ok) throw new Error('Failed to reset credits')
      
      const data = await response.json()
      setUsers(users.map(u => u.id === id ? { ...u, credits: data.credits } : u))
      if (userProfile?.id === id) {
        setUserProfile({ ...userProfile, credits: data.credits })
      }
    } catch (err: any) {
      setError(err.message)
    } finally {
      setSaving(false)
    }
  }

  const openAddCredits = (id: number) => { setCreditAmount(''); setCreditModal({ id, mode: 'add' }) }
  const openEditCredits = (id: number, current: number) => { setCreditAmount(String(current)); setCreditModal({ id, mode: 'edit' }) }

  const saveCredits = () => {
    if (!creditModal) return
    const value = Number(creditAmount)
    if (Number.isNaN(value)) return
    if (creditModal.mode === 'add') addCredits(creditModal.id, value)
    else setCredits(creditModal.id, value)
    setCreditModal(null)
  }

  const openEditUser = (user: AdminUser) => {
    setEditModal({ ...user })
    setEditPassword('')
    setEditPasswordConfirm('')
  }

  const saveEditUser = async () => {
    if (!editModal || !editModal.id) return
    if (!editModal.name || !editModal.email || !editModal.username) {
      setError('Name, email, and username are required')
      return
    }

    if (editPassword && editPassword !== editPasswordConfirm) {
      setError('Passwords do not match')
      return
    }

    if (editPassword && editPassword.length < 6) {
      setError('Password must be at least 6 characters')
      return
    }

    try {
      setSaving(true)
      const payload: any = {
        id: editModal.id,
        name: editModal.name,
        email: editModal.email,
        username: editModal.username,
        status: editModal.status,
      }

      if (editPassword) {
        payload.password = editPassword
      }

      const response = await fetch('/api/admin/users', {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload),
      })

      if (!response.ok) {
        const data = await response.json()
        throw new Error(data.error || 'Failed to update user')
      }

      const data = await response.json()
      setUsers(users.map(u => u.id === editModal.id ? data.user : u))
      if (userProfile?.id === editModal.id) {
        setUserProfile({ ...userProfile, ...data.user })
      }
      setEditModal(null)
      setEditPassword('')
      setEditPasswordConfirm('')
    } catch (err: any) {
      setError(err.message)
    } finally {
      setSaving(false)
    }
  }

  const openAddUser = () => router.push('/admin/users/add')

  const formatDate = (iso: string) => {
    const date = new Date(iso)
    const dd = String(date.getDate()).padStart(2, '0')
    const mm = String(date.getMonth() + 1).padStart(2, '0')
    const yyyy = date.getFullYear()
    return `${dd}.${mm}.${yyyy}`
  }

  const formatDateTime = (iso: string) => {
    const date = new Date(iso)
    return date.toLocaleString()
  }

  return (
    <div className="space-y-6">
      {error && (
        <div className="p-3 rounded-lg bg-red-500/20 border border-red-500/50 text-red-200 text-sm flex items-center justify-between">
          <span>{error}</span>
          <button onClick={() => setError('')} className="text-red-400 hover:text-red-300">×</button>
        </div>
      )}

      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-semibold text-white">Users <span suppressHydrationWarning className="text-white/50 text-sm align-middle ml-2">{nf.format(total)} Total</span></h1>
        <button onClick={openAddUser} className="px-4 py-2 rounded-lg border border-orange-500 text-orange-400 hover:bg-orange-500/10 transition-colors flex items-center gap-2 disabled:opacity-50" disabled={saving}>
          <UserPlus className="w-4 h-4" />
          ADD USER
        </button>
      </div>

      <div className="flex flex-wrap items-center gap-3">
        <div className="bg-black/20 backdrop-blur-sm border border-white/10 rounded-lg px-3 py-2 flex items-center gap-2">
          <Calendar className="w-4 h-4 text-white/60" />
          <select value={sort} onChange={(e) => setSort(e.target.value as any)} className="bg-transparent text-white/80 text-sm focus:outline-none">
            <option value="date">Date created</option>
            <option value="name">Name</option>
          </select>
        </div>
        <div className="ml-auto bg-black/20 backdrop-blur-sm border border-white/10 rounded-lg px-3 py-2 flex items-center gap-2 w-full md:w-80">
          <Search className="w-4 h-4 text-white/60" />
          <input value={query} onChange={(e) => setQuery(e.target.value)} placeholder="Search users..." className="bg-transparent text-white/80 text-sm w-full placeholder-white/40 focus:outline-none" />
        </div>
      </div>

      <div className="bg-black/20 backdrop-blur-sm rounded-xl border border-white/10">
        {loading ? (
          <div className="p-8 text-center text-white/60">Loading users...</div>
        ) : (
          <>
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead>
                  <tr className="text-white/60 border-b border-white/10">
                    <th className="px-4 py-3 text-left">ID</th>
                    <th className="px-4 py-3 text-left">Name</th>
                    <th className="px-4 py-3 text-left">Email</th>
                    <th className="px-4 py-3 text-left">Username</th>
                    <th className="px-4 py-3 text-left">Status</th>
                    <th className="px-4 py-3 text-left">Created Date</th>
                    <th className="px-4 py-3 text-left">Actions</th>
                  </tr>
                </thead>
                <tbody>
                  {sorted.length === 0 ? (
                    <tr>
                      <td colSpan={7} className="px-4 py-8 text-center text-white/50">
                        No users found
                      </td>
                    </tr>
                  ) : (
                    sorted.map((row) => (
                      <tr key={row.id} className="border-b border-white/5 hover:bg-white/5">
                        <td className="px-4 py-3 text-white/70">{row.id}</td>
                        <td className="px-4 py-3 text-white">{row.name}</td>
                        <td className="px-4 py-3 text-white/80">{row.email}</td>
                        <td className="px-4 py-3 text-white/80">{row.username}</td>
                        <td className="px-4 py-3">
                          <button onClick={() => toggleStatus(row.id)} disabled={saving} className={`px-2.5 py-1 rounded-full text-xs font-medium border transition-colors disabled:opacity-50 ${row.status === 'Approved' ? 'text-green-400 border-green-500/40 bg-green-500/10 hover:bg-green-500/20' : 'text-white/70 border-white/20 bg-white/5 hover:bg-white/10'}`}>{row.status}</button>
                        </td>
                        <td className="px-4 py-3 text-white/60">{formatDate(row.createdAt)}</td>
                        <td className="px-4 py-3">
                          <div className="flex items-center gap-2">
                            <button onClick={() => fetchUserProfile(row.id)} disabled={saving} className="p-2 rounded-md bg-white/5 hover:bg-white/10 disabled:opacity-50 transition-colors" aria-label="View details"><Eye className="w-4 h-4 text-white" /></button>
                            <button onClick={() => openEditUser(row)} disabled={saving} className="p-2 rounded-md bg-white/5 hover:bg-white/10 disabled:opacity-50 transition-colors" aria-label="Edit user"><Edit2 className="w-4 h-4 text-blue-300" /></button>
                            <button onClick={() => (row.credits ? openEditCredits(row.id, row.credits) : openAddCredits(row.id))} disabled={saving} className="p-2 rounded-md bg-white/5 hover:bg-white/10 disabled:opacity-50 transition-colors" aria-label="Manage credits"><Coins className="w-4 h-4 text-yellow-300" /></button>
                            <button onClick={() => removeUser(row.id)} disabled={saving} className="p-2 rounded-md bg-white/5 hover:bg-white/10 disabled:opacity-50 transition-colors" aria-label="Delete"><Trash2 className="w-4 h-4 text-red-400" /></button>
                          </div>
                        </td>
                      </tr>
                    ))
                  )}
                </tbody>
              </table>
            </div>
            <div className="flex items-center justify-between p-4 border-t border-white/10">
              <div className="text-xs text-white/50">{total === 0 ? 0 : 1}–{Math.min(pageSize, total)} of {total}</div>
              <Pagination total={total} pageSize={pageSize} page={page} onPageChange={setPage} />
            </div>
          </>
        )}
      </div>

      {userProfile && (
        <div className="fixed inset-0 z-50 grid place-items-center bg-black/60 p-4 overflow-y-auto" onClick={() => setUserProfile(null)}>
          <div className="w-full max-w-2xl bg-black/30 border border-white/10 rounded-xl backdrop-blur-md my-6" onClick={(e) => e.stopPropagation()}>
            <div className="sticky top-0 bg-black/50 border-b border-white/10 p-5 flex items-center justify-between">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-full bg-orange-500/20 border border-orange-500/40 flex items-center justify-center">
                  <User className="w-5 h-5 text-orange-400" />
                </div>
                <div>
                  <h3 className="text-white font-semibold">{userProfile.name}</h3>
                  <p className="text-white/50 text-xs">@{userProfile.username}</p>
                </div>
              </div>
              <button className="p-1 hover:bg-white/10 rounded-md" onClick={() => setUserProfile(null)}><X className="w-4 h-4 text-white/70" /></button>
            </div>

            {profileLoading ? (
              <div className="p-8 text-center text-white/60">Loading profile...</div>
            ) : (
              <div className="p-5 space-y-4 max-h-[calc(100vh-200px)] overflow-y-auto">
                {/* Account Info */}
                <div className="bg-white/5 border border-white/10 rounded-lg p-4">
                  <h4 className="text-white font-semibold mb-3">Account Information</h4>
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-3 text-sm">
                    <div>
                      <p className="text-white/50">Email</p>
                      <p className="text-white">{userProfile.email}</p>
                    </div>
                    <div>
                      <p className="text-white/50">Status</p>
                      <p className={`${userProfile.status === 'Approved' ? 'text-green-400' : 'text-red-400'}`}>{userProfile.status}</p>
                    </div>
                    <div>
                      <p className="text-white/50">Role</p>
                      <p className="text-white">{userProfile.role}</p>
                    </div>
                    <div>
                      <p className="text-white/50">Credits</p>
                      <p className="text-white font-semibold text-lg">{nf.format(userProfile.credits)}</p>
                    </div>
                    <div>
                      <p className="text-white/50">Member Since</p>
                      <p className="text-white">{formatDate(userProfile.createdAt)}</p>
                    </div>
                    <div>
                      <p className="text-white/50">Last Updated</p>
                      <p className="text-white">{formatDate(userProfile.updatedAt)}</p>
                    </div>
                    {userProfile.authLastAt && (
                      <div>
                        <p className="text-white/50">Last Login</p>
                        <p className="text-white">{formatDateTime(userProfile.authLastAt)}</p>
                      </div>
                    )}
                  </div>
                </div>

                {/* Statistics */}
                <div className="grid grid-cols-2 md:grid-cols-5 gap-3">
                  {[
                    { label: 'Comments', value: userProfile.stats.comments, icon: FileText },
                    { label: 'Reviews', value: userProfile.stats.reviews, icon: FileText },
                    { label: 'Subscriptions', value: userProfile.stats.subscriptions, icon: Clock },
                    { label: 'App Downloads', value: userProfile.stats.appDownloads, icon: Download },
                    { label: 'BeIn Jobs', value: userProfile.stats.beinJobs, icon: Zap },
                  ].map((stat, i) => (
                    <div key={i} className="bg-white/5 border border-white/10 rounded-lg p-3 text-center">
                      <div className="flex justify-center mb-2">
                        <stat.icon className="w-4 h-4 text-orange-400" />
                      </div>
                      <p className="text-2xl font-bold text-white">{stat.value}</p>
                      <p className="text-xs text-white/50">{stat.label}</p>
                    </div>
                  ))}
                </div>

                {/* Credits Section */}
                <div className="bg-white/5 border border-white/10 rounded-lg p-4">
                  <h4 className="text-white font-semibold mb-3 flex items-center gap-2">
                    <Coins className="w-4 h-4 text-yellow-400" />
                    Credits Management
                  </h4>
                  <div className="flex gap-2">
                    <button onClick={() => openAddCredits(userProfile.id)} disabled={saving} className="flex-1 px-3 py-2 rounded-lg border border-blue-500 text-blue-400 hover:bg-blue-500/10 text-sm transition-colors disabled:opacity-50">Add Credits</button>
                    <button onClick={() => openEditCredits(userProfile.id, userProfile.credits)} disabled={saving} className="flex-1 px-3 py-2 rounded-lg border border-orange-500 text-orange-400 hover:bg-orange-500/10 text-sm transition-colors disabled:opacity-50">Set Credits</button>
                    {userProfile.credits > 0 && (
                      <button onClick={() => resetCredits(userProfile.id)} disabled={saving} className="flex-1 px-3 py-2 rounded-lg border border-red-500 text-red-400 hover:bg-red-500/10 text-sm transition-colors disabled:opacity-50">Reset</button>
                    )}
                  </div>
                </div>

                {/* Subscriptions */}
                {userProfile.subscriptions.length > 0 && (
                  <div className="bg-white/5 border border-white/10 rounded-lg">
                    <button onClick={() => setExpandedSection(expandedSection === 'subscriptions' ? null : 'subscriptions')} className="w-full p-4 flex items-center justify-between hover:bg-white/5 transition-colors">
                      <h4 className="text-white font-semibold flex items-center gap-2">
                        <Clock className="w-4 h-4 text-blue-400" />
                        Subscriptions ({userProfile.subscriptions.length})
                      </h4>
                      <ChevronDown className={`w-4 h-4 text-white/50 transition-transform ${expandedSection === 'subscriptions' ? 'rotate-180' : ''}`} />
                    </button>
                    {expandedSection === 'subscriptions' && (
                      <div className="border-t border-white/10 p-4 space-y-3">
                        {userProfile.subscriptions.map((sub) => (
                          <div key={sub.id} className="bg-black/30 rounded p-3 text-sm">
                            <div className="flex items-center justify-between mb-2">
                              <p className="text-white font-medium">{sub.channelName}</p>
                              <span className={`px-2 py-1 rounded text-xs font-medium ${sub.status === 'ACTIVE' ? 'bg-green-500/20 text-green-400' : sub.status === 'EXPIRED' ? 'bg-red-500/20 text-red-400' : 'bg-gray-500/20 text-gray-400'}`}>{sub.status}</span>
                            </div>
                            <div className="grid grid-cols-2 gap-2 text-white/70">
                              <p>Category: {sub.channelCategory}</p>
                              <p>Duration: {sub.duration}</p>
                              <p>Start: {formatDate(sub.startDate)}</p>
                              <p>End: {formatDate(sub.endDate)}</p>
                            </div>
                          </div>
                        ))}
                      </div>
                    )}
                  </div>
                )}

                {/* Comments */}
                {userProfile.comments.length > 0 && (
                  <div className="bg-white/5 border border-white/10 rounded-lg">
                    <button onClick={() => setExpandedSection(expandedSection === 'comments' ? null : 'comments')} className="w-full p-4 flex items-center justify-between hover:bg-white/5 transition-colors">
                      <h4 className="text-white font-semibold flex items-center gap-2">
                        <FileText className="w-4 h-4 text-purple-400" />
                        Comments ({userProfile.comments.length})
                      </h4>
                      <ChevronDown className={`w-4 h-4 text-white/50 transition-transform ${expandedSection === 'comments' ? 'rotate-180' : ''}`} />
                    </button>
                    {expandedSection === 'comments' && (
                      <div className="border-t border-white/10 p-4 space-y-3">
                        {userProfile.comments.map((comment) => (
                          <div key={comment.id} className="bg-black/30 rounded p-3 text-sm">
                            <div className="flex items-center justify-between mb-2">
                              <p className="text-white/80">{comment.itemTitle}</p>
                              <span className={`px-2 py-1 rounded text-xs font-medium ${comment.status === 'APPROVED' ? 'bg-green-500/20 text-green-400' : comment.status === 'PENDING' ? 'bg-yellow-500/20 text-yellow-400' : 'bg-red-500/20 text-red-400'}`}>{comment.status}</span>
                            </div>
                            <p className="text-white/70 mb-1">{comment.content}</p>
                            <p className="text-white/50 text-xs">{formatDate(comment.createdAt)}</p>
                          </div>
                        ))}
                      </div>
                    )}
                  </div>
                )}

                {/* Reviews */}
                {userProfile.reviews.length > 0 && (
                  <div className="bg-white/5 border border-white/10 rounded-lg">
                    <button onClick={() => setExpandedSection(expandedSection === 'reviews' ? null : 'reviews')} className="w-full p-4 flex items-center justify-between hover:bg-white/5 transition-colors">
                      <h4 className="text-white font-semibold flex items-center gap-2">
                        <FileText className="w-4 h-4 text-amber-400" />
                        Reviews ({userProfile.reviews.length})
                      </h4>
                      <ChevronDown className={`w-4 h-4 text-white/50 transition-transform ${expandedSection === 'reviews' ? 'rotate-180' : ''}`} />
                    </button>
                    {expandedSection === 'reviews' && (
                      <div className="border-t border-white/10 p-4 space-y-3">
                        {userProfile.reviews.map((review) => (
                          <div key={review.id} className="bg-black/30 rounded p-3 text-sm">
                            <div className="flex items-center justify-between mb-2">
                              <p className="text-white/80">{review.itemTitle}</p>
                              <span className={`px-2 py-1 rounded text-xs font-medium ${review.status === 'APPROVED' ? 'bg-green-500/20 text-green-400' : review.status === 'PENDING' ? 'bg-yellow-500/20 text-yellow-400' : 'bg-red-500/20 text-red-400'}`}>{review.status}</span>
                            </div>
                            <p className="text-yellow-400 text-sm mb-1">Rating: {review.rating}/10</p>
                            {review.content && <p className="text-white/70 mb-1">{review.content}</p>}
                            <p className="text-white/50 text-xs">{formatDate(review.createdAt)}</p>
                          </div>
                        ))}
                      </div>
                    )}
                  </div>
                )}

                {/* App Downloads */}
                {userProfile.appDownloads.length > 0 && (
                  <div className="bg-white/5 border border-white/10 rounded-lg">
                    <button onClick={() => setExpandedSection(expandedSection === 'apps' ? null : 'apps')} className="w-full p-4 flex items-center justify-between hover:bg-white/5 transition-colors">
                      <h4 className="text-white font-semibold flex items-center gap-2">
                        <Download className="w-4 h-4 text-green-400" />
                        App Downloads ({userProfile.appDownloads.length})
                      </h4>
                      <ChevronDown className={`w-4 h-4 text-white/50 transition-transform ${expandedSection === 'apps' ? 'rotate-180' : ''}`} />
                    </button>
                    {expandedSection === 'apps' && (
                      <div className="border-t border-white/10 p-4 space-y-3">
                        {userProfile.appDownloads.map((app) => (
                          <div key={app.id} className="bg-black/30 rounded p-3 text-sm">
                            <p className="text-white font-medium">{app.name}</p>
                            <p className="text-white/70 text-xs my-1">{app.description}</p>
                            <div className="flex items-center justify-between text-white/50 text-xs">
                              <span>v{app.version}</span>
                              <span>{formatDate(app.createdAt)}</span>
                            </div>
                          </div>
                        ))}
                      </div>
                    )}
                  </div>
                )}

                {/* BeIn Jobs */}
                {userProfile.beinJobs.length > 0 && (
                  <div className="bg-white/5 border border-white/10 rounded-lg">
                    <button onClick={() => setExpandedSection(expandedSection === 'bein' ? null : 'bein')} className="w-full p-4 flex items-center justify-between hover:bg-white/5 transition-colors">
                      <h4 className="text-white font-semibold flex items-center gap-2">
                        <Zap className="w-4 h-4 text-red-400" />
                        BeIn Sport Jobs ({userProfile.beinJobs.length})
                      </h4>
                      <ChevronDown className={`w-4 h-4 text-white/50 transition-transform ${expandedSection === 'bein' ? 'rotate-180' : ''}`} />
                    </button>
                    {expandedSection === 'bein' && (
                      <div className="border-t border-white/10 p-4 space-y-3">
                        {userProfile.beinJobs.map((job) => (
                          <div key={job.id} className="bg-black/30 rounded p-3 text-sm">
                            <p className="text-white font-medium">Code: {job.code}</p>
                            <div className="grid grid-cols-2 gap-2 text-white/70 text-xs mt-2">
                              <p>Customer ID: {job.customerId}</p>
                              <p>Months: {job.months}</p>
                            </div>
                            <p className="text-white/50 text-xs mt-2">{formatDate(job.createdAt)}</p>
                          </div>
                        ))}
                      </div>
                    )}
                  </div>
                )}
              </div>
            )}
          </div>
        </div>
      )}

      {creditModal && (
        <div className="fixed inset-0 z-50 grid place-items-center bg-black/60 p-4" onClick={() => setCreditModal(null)}>
          <div className="w-full max-w-sm bg-black/30 border border-white/10 rounded-xl p-5 backdrop-blur-md" onClick={(e) => e.stopPropagation()}>
            <div className="flex items-center justify-between mb-3">
              <h3 className="text-white font-semibold">{creditModal.mode === 'add' ? 'Add credits' : 'Set credits'}</h3>
              <button className="p-1 hover:bg-white/10 rounded-md" onClick={() => setCreditModal(null)}><X className="w-4 h-4 text-white/70" /></button>
            </div>
            <div className="grid gap-3 text-sm">
              <input value={creditAmount} onChange={(e) => setCreditAmount(e.target.value)} placeholder="Amount" type="number" className="bg-black/40 border border-white/10 rounded-lg px-3 py-2 text-white placeholder-white/30 focus:outline-none focus:border-white/30" />
              <div className="flex items-center justify-end gap-2 mt-1">
                <button onClick={() => setCreditModal(null)} className="px-3 py-2 rounded-md border border-white/10 text-white/70 hover:bg-white/10 transition-colors disabled:opacity-50" disabled={saving}>Cancel</button>
                <button onClick={saveCredits} className="px-3 py-2 rounded-md border border-orange-500 text-orange-400 hover:bg-orange-500/10 transition-colors disabled:opacity-50" disabled={saving || Number.isNaN(Number(creditAmount))}>Save</button>
              </div>
            </div>
          </div>
        </div>
      )}

      {editModal && (
        <div className="fixed inset-0 z-50 grid place-items-center bg-black/60 p-4" onClick={() => setEditModal(null)}>
          <div className="w-full max-w-md bg-black/30 border border-white/10 rounded-xl p-5 backdrop-blur-md" onClick={(e) => e.stopPropagation()}>
            <div className="flex items-center justify-between mb-4">
              <h3 className="text-white font-semibold">Edit User Information</h3>
              <button className="p-1 hover:bg-white/10 rounded-md" onClick={() => setEditModal(null)}><X className="w-4 h-4 text-white/70" /></button>
            </div>
            <div className="grid gap-3 text-sm">
              <div>
                <label className="text-white/70 text-xs mb-1 block">Full Name</label>
                <input
                  value={editModal.name || ''}
                  onChange={(e) => setEditModal({ ...editModal, name: e.target.value })}
                  placeholder="Full name"
                  className="w-full bg-black/40 border border-white/10 rounded-lg px-3 py-2 text-white placeholder-white/30 focus:outline-none focus:border-white/30"
                />
              </div>
              <div>
                <label className="text-white/70 text-xs mb-1 block">Email</label>
                <input
                  value={editModal.email || ''}
                  onChange={(e) => setEditModal({ ...editModal, email: e.target.value })}
                  type="email"
                  placeholder="Email"
                  className="w-full bg-black/40 border border-white/10 rounded-lg px-3 py-2 text-white placeholder-white/30 focus:outline-none focus:border-white/30"
                />
              </div>
              <div>
                <label className="text-white/70 text-xs mb-1 block">Username</label>
                <input
                  value={editModal.username || ''}
                  onChange={(e) => setEditModal({ ...editModal, username: e.target.value })}
                  placeholder="Username"
                  className="w-full bg-black/40 border border-white/10 rounded-lg px-3 py-2 text-white placeholder-white/30 focus:outline-none focus:border-white/30"
                />
              </div>
              <div>
                <label className="text-white/70 text-xs mb-1 block">Status</label>
                <select
                  value={editModal.status || 'Approved'}
                  onChange={(e) => setEditModal({ ...editModal, status: e.target.value as 'Approved' | 'Banned' })}
                  className="w-full bg-black/40 border border-white/10 rounded-lg px-3 py-2 text-white focus:outline-none focus:border-white/30"
                >
                  <option>Approved</option>
                  <option>Banned</option>
                </select>
              </div>
              <div className="border-t border-white/10 pt-3 mt-3">
                <p className="text-white/70 text-xs mb-3 font-medium">Change Password (Optional)</p>
                <div>
                  <label className="text-white/70 text-xs mb-1 block">New Password</label>
                  <input
                    value={editPassword}
                    onChange={(e) => setEditPassword(e.target.value)}
                    type="password"
                    placeholder="Leave empty to keep current password"
                    className="w-full bg-black/40 border border-white/10 rounded-lg px-3 py-2 text-white placeholder-white/30 focus:outline-none focus:border-white/30"
                  />
                </div>
                <div className="mt-2">
                  <label className="text-white/70 text-xs mb-1 block">Confirm Password</label>
                  <input
                    value={editPasswordConfirm}
                    onChange={(e) => setEditPasswordConfirm(e.target.value)}
                    type="password"
                    placeholder="Confirm new password"
                    className="w-full bg-black/40 border border-white/10 rounded-lg px-3 py-2 text-white placeholder-white/30 focus:outline-none focus:border-white/30"
                  />
                </div>
                {editPassword && editPassword.length < 6 && (
                  <p className="text-red-400 text-xs mt-1">Password must be at least 6 characters</p>
                )}
                {editPassword && editPassword !== editPasswordConfirm && (
                  <p className="text-red-400 text-xs mt-1">Passwords do not match</p>
                )}
              </div>
              <div className="flex items-center justify-end gap-2 mt-2">
                <button
                  onClick={() => setEditModal(null)}
                  className="px-3 py-2 rounded-md border border-white/10 text-white/70 hover:bg-white/10 transition-colors disabled:opacity-50"
                  disabled={saving}
                >
                  Cancel
                </button>
                <button
                  onClick={saveEditUser}
                  className="px-3 py-2 rounded-md border border-blue-500 text-blue-400 hover:bg-blue-500/10 transition-colors disabled:opacity-50"
                  disabled={saving || !editModal.name || !editModal.email || !editModal.username}
                >
                  {saving ? 'Saving...' : 'Save Changes'}
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
