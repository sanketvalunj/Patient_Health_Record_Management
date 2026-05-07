"use client"

import { useEffect, useState } from "react"
import { useRouter } from "next/navigation"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
import { Users, Shield, Activity, LogOut, CheckCircle, XCircle, AlertCircle, Loader2, Database } from "lucide-react"
import { useToast } from "@/hooks/use-toast"
import { formatIdentifier } from "@/lib/utils/format"

export default function AdminDashboard() {
  const router = useRouter()
  const { toast } = useToast()
  const [user, setUser] = useState<any>(null)
  const [pendingUsers, setPendingUsers] = useState<any[]>([])
  const [allUsers, setAllUsers] = useState<any[]>([])
  const [auditLogs, setAuditLogs] = useState<any[]>([])
  const [stats, setStats] = useState<any>(null)
  const [loading, setLoading] = useState(true)

  const getAuthHeaders = () => {
    const token = localStorage.getItem("token")
    return {
      "Content-Type": "application/json",
      Authorization: `Bearer ${token}`,
    }
  }

  useEffect(() => {
    const storedUser = localStorage.getItem("user")
    const token = localStorage.getItem("token")

    if (!storedUser || !token) {
      router.push("/")
      return
    }

    const parsedUser = JSON.parse(storedUser)
    if (parsedUser.role !== "admin") {
      router.push("/")
      return
    }

    setUser(parsedUser)
    loadData()
  }, [])

  const loadData = async () => {
    setLoading(true)
    try {
      const headers = getAuthHeaders()
      const [pendingRes, usersRes, logsRes, statsRes] = await Promise.all([
        fetch("/api/admin/pending-verifications", { headers }),
        fetch("/api/admin/users", { headers }),
        fetch("/api/admin/audit-logs?limit=50", { headers }),
        fetch("/api/admin/stats", { headers }),
      ])

      const [pendingData, usersData, logsData, statsData] = await Promise.all([
        pendingRes.json(), usersRes.json(), logsRes.json(), statsRes.json()
      ])

      setPendingUsers(pendingData.users || [])
      setAllUsers(usersData.users || [])
      setAuditLogs(logsData.logs || [])
      setStats(statsData.stats)
    } catch (error) {
      toast({ title: "Sync Failed", description: "Failed to load administrative data.", variant: "destructive" })
    } finally {
      setLoading(false)
    }
  }

  const handleVerifyUser = async (userId: string, action: "approve" | "reject") => {
    try {
      const res = await fetch("/api/admin/verify-user", {
        method: "POST",
        headers: getAuthHeaders(),
        body: JSON.stringify({ userId, action }),
      })

      if (!res.ok) throw new Error("Verification failed")

      toast({ title: "Action Succeeded", description: `User has been ${action}d successfully.` })
      loadData()
    } catch (error: any) {
      toast({ title: "Error", description: error.message, variant: "destructive" })
    }
  }

  const handleBlockUser = async (userId: string, action: "block" | "unblock") => {
    try {
      const res = await fetch("/api/admin/block-user", {
        method: "POST",
        headers: getAuthHeaders(),
        body: JSON.stringify({ userId, action }),
      })

      if (!res.ok) throw new Error("Action failed")

      toast({ title: "Status Updated", description: `User has been ${action}ed.` })
      loadData()
    } catch (error: any) {
      toast({ title: "Error", description: error.message, variant: "destructive" })
    }
  }

  const handleLogout = () => {
    localStorage.removeItem("token")
    localStorage.removeItem("user")
    router.push("/")
  }

  if (loading) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-background">
        <Loader2 className="h-10 w-10 animate-spin text-primary" />
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-slate-50 text-slate-900">
      <header className="border-b bg-white shadow-sm sticky top-0 z-10">
        <div className="container mx-auto flex items-center justify-between px-6 py-4">
          <div className="flex items-center gap-3">
            <div className="h-10 w-10 bg-slate-900 rounded-lg flex items-center justify-center">
              <Shield className="h-6 w-6 text-white" />
            </div>
            <div>
              <h1 className="text-xl font-bold leading-none capitalize">Admin Control Panel</h1>
              <p className="text-xs text-slate-400 mt-1 font-bold">{user?.name} [Identity Governance]</p>
            </div>
          </div>
          <Button variant="ghost" onClick={handleLogout} className="gap-2 text-slate-400 hover:text-destructive">
            <LogOut className="h-4 w-4" />
            Logout
          </Button>
        </div>
      </header>

      <main className="container mx-auto px-6 py-8">
        {stats && (
          <div className="mb-8 grid gap-6 md:grid-cols-4">
            {[
              { label: "Total Users", val: stats.users.total, icon: Users, color: "text-blue-600" },
              { label: "Pending", val: stats.pending.doctors + stats.pending.labs, icon: AlertCircle, color: "text-amber-600" },
              { label: "IPFS Files", val: stats.records.total, icon: Database, color: "text-emerald-600" },
              { label: "Active Grants", val: stats.permissions.active, icon: Activity, color: "text-indigo-600" },
            ].map((s) => (
              <Card key={s.label} className="border-none shadow-sm ring-1 ring-black/5">
                <CardHeader className="flex flex-row items-center justify-between pb-2">
                  <span className="text-[10px] font-bold uppercase tracking-widest text-slate-400">{s.label}</span>
                  <s.icon className={`h-4 w-4 ${s.color}`} />
                </CardHeader>
                <CardContent>
                  <div className="text-3xl font-black text-slate-800">{s.val}</div>
                </CardContent>
              </Card>
            ))}
          </div>
        )}

        <Tabs defaultValue="pending" className="space-y-6">
          <TabsList className="bg-slate-200/50 p-1 rounded-xl w-fit">
            <TabsTrigger value="pending" className="gap-2 rounded-lg font-bold">
              Verification <Badge variant="secondary" className="ml-1 text-[10px] py-0 px-1">{pendingUsers.length}</Badge>
            </TabsTrigger>
            <TabsTrigger value="users" className="gap-2 rounded-lg font-bold">Directories</TabsTrigger>
            <TabsTrigger value="audit" className="gap-2 rounded-lg font-bold">System Logs</TabsTrigger>
          </TabsList>

          <TabsContent value="pending">
            <Card className="border-none shadow-sm ring-1 ring-black/5">
              <CardHeader>
                <CardTitle className="text-xl font-bold">Pending Professional Credentials</CardTitle>
                <CardDescription>Verify identities before clinical permissions are enabled.</CardDescription>
              </CardHeader>
              <CardContent>
                {pendingUsers.length === 0 ? (
                  <div className="py-20 text-center text-slate-400 font-bold italic uppercase tracking-widest text-xs">All clear. No pending verifications.</div>
                ) : (
                  <div className="grid gap-4">
                    {pendingUsers.map((p) => (
                      <div key={p._id} className="flex items-center justify-between p-5 rounded-2xl border bg-white shadow-sm ring-1 ring-black/5">
                        <div>
                          <p className="font-bold text-lg text-slate-800">{p.name}</p>
                          <div className="flex gap-2 mt-1">
                            <Badge variant="outline" className="text-[10px] uppercase font-bold text-slate-400">{p.role}</Badge>
                            <span className="text-xs text-slate-400">{p.email}</span>
                          </div>
                        </div>
                        <div className="flex gap-3">
                          <Button size="sm" onClick={() => handleVerifyUser(p._id, "approve")} className="gap-2 bg-emerald-600 hover:bg-emerald-700 font-bold">
                            Approve
                          </Button>
                          <Button size="sm" variant="destructive" onClick={() => handleVerifyUser(p._id, "reject")} className="gap-2 font-bold">
                            Reject
                          </Button>
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </CardContent>
            </Card>
          </TabsContent>

          <TabsContent value="users">
            <Card className="border-none shadow-sm ring-1 ring-black/5">
              <CardHeader>
                <CardTitle className="text-xl font-bold">Network Participant Directory</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="grid gap-2">
                  {allUsers.map((u) => (
                    <div key={u._id} className="flex items-center justify-between p-4 rounded-xl border bg-white hover:bg-slate-50 transition-colors">
                      <div className="flex flex-col">
                        <div className="flex items-center gap-2">
                          <span className="font-bold text-slate-800">{u.name}</span>
                          <Badge variant="secondary" className="text-[10px] uppercase font-black text-slate-400 tracking-tighter">{u.role}</Badge>
                          {u.isVerified && <CheckCircle className="h-3 w-3 text-emerald-500" />}
                        </div>
                        <span className="text-xs text-slate-400 font-medium">{formatIdentifier(u.blockchainAddress)} • {u.email}</span>
                      </div>
                      {u.role !== "admin" && (
                        <Button size="sm" variant={u.isBlocked ? "default" : "outline"} onClick={() => handleBlockUser(u._id, u.isBlocked ? "unblock" : "block")} className="font-bold text-[10px]">
                          {u.isBlocked ? "UNBLOCK" : "BLOCK USER"}
                        </Button>
                      )}
                    </div>
                  ))}
                </div>
              </CardContent>
            </Card>
          </TabsContent>

          <TabsContent value="audit">
            <Card className="border-none shadow-sm ring-1 ring-black/5">
              <CardHeader>
                <CardTitle className="text-xl font-bold">Forensic System Logs</CardTitle>
                <CardDescription>Real-time audit of all network events.</CardDescription>
              </CardHeader>
              <CardContent>
                <div className="divide-y divide-slate-100">
                  {auditLogs.map((log) => (
                    <div key={log._id} className="flex items-center justify-between py-4 text-xs font-bold text-slate-500">
                      <div className="flex items-center gap-4">
                        <Badge variant="outline" className="text-[9px] uppercase tracking-tighter opacity-70">
                          {log.action.replace("_", " ")}
                        </Badge>
                        <span className="text-slate-700">
                          {log.performedByUser?.name || "System"} [{(log.performedByRole || "system").toUpperCase()}]
                        </span>
                      </div>
                      <span className="opacity-40">{new Date(log.timestamp).toLocaleString()}</span>
                    </div>
                  ))}
                </div>
              </CardContent>
            </Card>
          </TabsContent>
        </Tabs>
      </main>
    </div>
  )
}
