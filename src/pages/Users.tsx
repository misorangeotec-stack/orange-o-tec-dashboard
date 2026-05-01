import { useState } from "react";
import {
  UserPlus, MoreHorizontal, Shield, ShieldCheck, ShieldAlert,
  CheckCircle2, XCircle, KeyRound, Pencil, Power, Trash2,
} from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { CTAButton } from "@/components/CTAButton";
import {
  Select, SelectContent, SelectItem, SelectTrigger, SelectValue,
} from "@/components/ui/select";
import {
  Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle,
} from "@/components/ui/dialog";
import {
  DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuSeparator, DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import {
  Table, TableBody, TableCell, TableHead, TableHeader, TableRow,
} from "@/components/ui/table";
import { useToast } from "@/hooks/use-toast";

type UserRole = "admin" | "manager" | "viewer";
type UserStatus = "active" | "inactive";

interface MockUser {
  id: string;
  name: string;
  email: string;
  role: UserRole;
  status: UserStatus;
  lastActive: string;
}

const roleConfig: Record<UserRole, { label: string; icon: typeof Shield; className: string }> = {
  admin: { label: "Admin", icon: ShieldAlert, className: "bg-primary/10 text-primary border-primary/20" },
  manager: { label: "Manager", icon: ShieldCheck, className: "bg-secondary/10 text-secondary border-secondary/20" },
  viewer: { label: "Viewer", icon: Shield, className: "bg-muted text-muted-foreground border-border" },
};

const initialUsers: MockUser[] = [
  { id: "u1", name: "Rajesh Kumar", email: "rajesh@example.com", role: "admin", status: "active", lastActive: "2026-03-25 09:30" },
  { id: "u2", name: "Priya Sharma", email: "priya@example.com", role: "manager", status: "active", lastActive: "2026-03-25 08:45" },
  { id: "u3", name: "Amit Patel", email: "amit@example.com", role: "viewer", status: "active", lastActive: "2026-03-24 17:20" },
  { id: "u4", name: "Sneha Gupta", email: "sneha@example.com", role: "manager", status: "inactive", lastActive: "2026-03-20 14:10" },
  { id: "u5", name: "Vikram Singh", email: "vikram@example.com", role: "viewer", status: "active", lastActive: "2026-03-23 11:00" },
];

const emptyForm = { name: "", email: "", role: "viewer" as UserRole };

export default function Users() {
  const { toast } = useToast();
  const [users, setUsers] = useState(initialUsers);
  const [dialogOpen, setDialogOpen] = useState(false);
  const [editingUser, setEditingUser] = useState<MockUser | null>(null);
  const [form, setForm] = useState(emptyForm);

  const openAdd = () => {
    setEditingUser(null);
    setForm(emptyForm);
    setDialogOpen(true);
  };

  const openEdit = (user: MockUser) => {
    setEditingUser(user);
    setForm({ name: user.name, email: user.email, role: user.role });
    setDialogOpen(true);
  };

  const handleSave = () => {
    if (!form.name.trim() || !form.email.trim()) {
      toast({ title: "Validation error", description: "Name and email are required.", variant: "destructive" });
      return;
    }
    if (editingUser) {
      setUsers((prev) =>
        prev.map((u) =>
          u.id === editingUser.id ? { ...u, name: form.name, email: form.email, role: form.role } : u
        )
      );
      toast({ title: "User updated", description: `${form.name}'s details have been saved.` });
    } else {
      const newUser: MockUser = {
        id: `u${Date.now()}`,
        name: form.name,
        email: form.email,
        role: form.role,
        status: "active",
        lastActive: "—",
      };
      setUsers((prev) => [...prev, newUser]);
      toast({ title: "User added", description: `${form.name} has been invited.` });
    }
    setDialogOpen(false);
  };

  const toggleStatus = (id: string) => {
    setUsers((prev) =>
      prev.map((u) => {
        if (u.id !== id) return u;
        const next: UserStatus = u.status === "active" ? "inactive" : "active";
        toast({
          title: next === "active" ? "User activated" : "User deactivated",
          description: `${u.name} is now ${next}.`,
        });
        return { ...u, status: next };
      })
    );
  };

  const resetPassword = (user: MockUser) => {
    toast({ title: "Password reset", description: `Reset link sent to ${user.email}.` });
  };

  const deleteUser = (id: string) => {
    const user = users.find((u) => u.id === id);
    setUsers((prev) => prev.filter((u) => u.id !== id));
    toast({ title: "User removed", description: `${user?.name} has been removed.` });
  };

  return (
    <div className="p-6 md:p-8 max-w-content mx-auto space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-foreground">Users</h1>
          <p className="text-sm text-muted-foreground mt-1">Manage system access and roles</p>
        </div>
        <CTAButton onClick={openAdd} showArrow={false}>
          <UserPlus className="h-4 w-4" /> Add User
        </CTAButton>
      </div>

      {/* Summary */}
      <div className="flex items-center gap-3 text-sm text-muted-foreground">
        <span>{users.length} total</span>
        <span>·</span>
        <span>{users.filter((u) => u.status === "active").length} active</span>
        <span>·</span>
        <span>{users.filter((u) => u.status === "inactive").length} inactive</span>
      </div>

      {/* Table */}
      <div className="bg-surface border border-border rounded-card overflow-hidden">
        <Table>
          <TableHeader>
            <TableRow className="bg-muted/30">
              <TableHead className="font-semibold">Name</TableHead>
              <TableHead className="font-semibold">Email</TableHead>
              <TableHead className="font-semibold">Role</TableHead>
              <TableHead className="font-semibold">Status</TableHead>
              <TableHead className="font-semibold">Last Active</TableHead>
              <TableHead className="w-12" />
            </TableRow>
          </TableHeader>
          <TableBody>
            {users.map((user) => {
              const rc = roleConfig[user.role];
              const RoleIcon = rc.icon;
              return (
                <TableRow key={user.id} className={user.status === "inactive" ? "opacity-60" : ""}>
                  <TableCell className="font-medium text-foreground">{user.name}</TableCell>
                  <TableCell className="text-muted-foreground">{user.email}</TableCell>
                  <TableCell>
                    <Badge className={`${rc.className} hover:${rc.className} gap-1`}>
                      <RoleIcon className="h-3 w-3" /> {rc.label}
                    </Badge>
                  </TableCell>
                  <TableCell>
                    {user.status === "active" ? (
                      <span className="inline-flex items-center gap-1 text-emerald-600 text-sm">
                        <CheckCircle2 className="h-3.5 w-3.5" /> Active
                      </span>
                    ) : (
                      <span className="inline-flex items-center gap-1 text-muted-foreground text-sm">
                        <XCircle className="h-3.5 w-3.5" /> Inactive
                      </span>
                    )}
                  </TableCell>
                  <TableCell className="text-muted-foreground text-sm">{user.lastActive}</TableCell>
                  <TableCell>
                    <DropdownMenu>
                      <DropdownMenuTrigger asChild>
                        <Button variant="ghost" size="icon" className="h-8 w-8">
                          <MoreHorizontal className="h-4 w-4" />
                        </Button>
                      </DropdownMenuTrigger>
                      <DropdownMenuContent align="end">
                        <DropdownMenuItem onClick={() => openEdit(user)}>
                          <Pencil className="h-3.5 w-3.5 mr-2" /> Edit Details
                        </DropdownMenuItem>
                        <DropdownMenuItem onClick={() => resetPassword(user)}>
                          <KeyRound className="h-3.5 w-3.5 mr-2" /> Reset Password
                        </DropdownMenuItem>
                        <DropdownMenuItem onClick={() => toggleStatus(user.id)}>
                          <Power className="h-3.5 w-3.5 mr-2" />
                          {user.status === "active" ? "Deactivate" : "Activate"}
                        </DropdownMenuItem>
                        <DropdownMenuSeparator />
                        <DropdownMenuItem className="text-destructive" onClick={() => deleteUser(user.id)}>
                          <Trash2 className="h-3.5 w-3.5 mr-2" /> Remove
                        </DropdownMenuItem>
                      </DropdownMenuContent>
                    </DropdownMenu>
                  </TableCell>
                </TableRow>
              );
            })}
          </TableBody>
        </Table>
      </div>

      {/* Add/Edit Dialog */}
      <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
        <DialogContent className="rounded-card">
          <DialogHeader>
            <DialogTitle>{editingUser ? "Edit User" : "Add User"}</DialogTitle>
            <DialogDescription>
              {editingUser ? "Update user details and role." : "Invite a new user to the system."}
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-4 py-2">
            <div className="space-y-2">
              <Label>Full Name</Label>
              <Input
                className="rounded-input"
                value={form.name}
                onChange={(e) => setForm((f) => ({ ...f, name: e.target.value }))}
                placeholder="e.g. Rajesh Kumar"
              />
            </div>
            <div className="space-y-2">
              <Label>Email</Label>
              <Input
                className="rounded-input"
                type="email"
                value={form.email}
                onChange={(e) => setForm((f) => ({ ...f, email: e.target.value }))}
                placeholder="e.g. rajesh@example.com"
              />
            </div>
            <div className="space-y-2">
              <Label>Role</Label>
              <Select value={form.role} onValueChange={(v) => setForm((f) => ({ ...f, role: v as UserRole }))}>
                <SelectTrigger className="rounded-input">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="admin">Admin</SelectItem>
                  <SelectItem value="manager">Manager</SelectItem>
                  <SelectItem value="viewer">Viewer</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" className="rounded-button" onClick={() => setDialogOpen(false)}>
              Cancel
            </Button>
            <CTAButton onClick={handleSave} showArrow={false}>
              {editingUser ? "Save Changes" : "Add User"}
            </CTAButton>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
