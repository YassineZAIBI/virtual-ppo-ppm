'use client';

import { useState } from 'react';
import { signOut } from 'next-auth/react';
import { useAppStore } from '@/lib/store';
import { cn } from '@/lib/utils';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Separator } from '@/components/ui/separator';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { User, Shield, Database, Trash2, Download, Loader2, Lock } from 'lucide-react';
import { toast } from 'sonner';

export function ProfileView() {
  const { initiatives, competitors, chatSessions, marketResearches, meetings, roadmapItems } = useAppStore();

  const [displayName, setDisplayName] = useState('Product Manager');
  const [email] = useState('user@example.com');
  const [memberSince] = useState('January 2026');
  const [isSaving, setIsSaving] = useState(false);
  const [isExporting, setIsExporting] = useState(false);
  const [deleteConfirmation, setDeleteConfirmation] = useState('');
  const [isDeleting, setIsDeleting] = useState(false);

  const initials = displayName
    .split(' ')
    .map((n) => n[0])
    .join('')
    .toUpperCase()
    .slice(0, 2);

  const handleSaveProfile = async () => {
    setIsSaving(true);
    try {
      const response = await fetch('/api/profile', {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ displayName }),
      });
      if (response.ok) {
        toast.success('Profile updated successfully');
      } else {
        const data = await response.json();
        toast.error(data.error || 'Failed to update profile');
      }
    } catch {
      toast.error('Failed to update profile');
    } finally {
      setIsSaving(false);
    }
  };

  const handleExportData = async () => {
    setIsExporting(true);
    try {
      const response = await fetch('/api/profile/export', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
      });
      if (response.ok) {
        const data = await response.json();
        const blob = new Blob([JSON.stringify(data, null, 2)], { type: 'application/json' });
        const url = URL.createObjectURL(blob);
        const a = document.createElement('a');
        a.href = url;
        a.download = `azmyra-export-${new Date().toISOString().split('T')[0]}.json`;
        document.body.appendChild(a);
        a.click();
        document.body.removeChild(a);
        URL.revokeObjectURL(url);
        toast.success('Data exported successfully');
      } else {
        toast.error('Failed to export data');
      }
    } catch {
      toast.error('Failed to export data');
    } finally {
      setIsExporting(false);
    }
  };

  const handleDeleteAccount = async () => {
    if (deleteConfirmation !== 'DELETE') return;
    setIsDeleting(true);
    try {
      const response = await fetch('/api/profile/delete', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
      });
      if (response.ok) {
        toast.success('Account deleted successfully');
        localStorage.removeItem('vppo-user-id'); localStorage.removeItem('vppo-storage'); signOut({ callbackUrl: '/auth/signin' });
      } else {
        const data = await response.json();
        toast.error(data.error || 'Failed to delete account');
      }
    } catch {
      toast.error('Failed to delete account');
    } finally {
      setIsDeleting(false);
    }
  };

  return (
    <div className="space-y-6 p-6 max-w-4xl mx-auto">
      <div>
        <h1 className="text-2xl font-bold tracking-tight">Profile</h1>
        <p className="text-muted-foreground">
          Manage your account settings and data
        </p>
      </div>

      <Tabs defaultValue="profile" className="space-y-6">
        <TabsList>
          <TabsTrigger value="profile" className="gap-2">
            <User className="h-4 w-4" />
            Profile Info
          </TabsTrigger>
          <TabsTrigger value="data" className="gap-2">
            <Database className="h-4 w-4" />
            Data Management
          </TabsTrigger>
          <TabsTrigger value="security" className="gap-2">
            <Shield className="h-4 w-4" />
            Security
          </TabsTrigger>
          <TabsTrigger value="account" className="gap-2">
            <Trash2 className="h-4 w-4" />
            Account
          </TabsTrigger>
        </TabsList>

        {/* Profile Info Tab */}
        <TabsContent value="profile">
          <Card>
            <CardHeader>
              <CardTitle>Profile Information</CardTitle>
              <CardDescription>
                Update your display name and view your account details
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-6">
              <div className="flex items-center gap-6">
                <div
                  className={cn(
                    'flex h-20 w-20 items-center justify-center rounded-full text-2xl font-bold text-white',
                    'bg-gradient-to-br from-violet-500 to-indigo-600'
                  )}
                >
                  {initials}
                </div>
                <div className="space-y-1">
                  <p className="text-lg font-semibold">{displayName}</p>
                  <p className="text-sm text-muted-foreground">{email}</p>
                  <p className="text-xs text-muted-foreground">
                    Member since {memberSince}
                  </p>
                </div>
              </div>

              <Separator />

              <div className="space-y-4">
                <div className="space-y-2">
                  <Label htmlFor="displayName">Display Name</Label>
                  <Input
                    id="displayName"
                    value={displayName}
                    onChange={(e) => setDisplayName(e.target.value)}
                    placeholder="Enter your display name"
                  />
                </div>

                <div className="space-y-2">
                  <Label htmlFor="email">Email</Label>
                  <Input
                    id="email"
                    value={email}
                    readOnly
                    disabled
                    className="bg-muted"
                  />
                  <p className="text-xs text-muted-foreground">
                    Email is managed by your authentication provider
                  </p>
                </div>

                <Button onClick={handleSaveProfile} disabled={isSaving}>
                  {isSaving && <Loader2 className="h-4 w-4 mr-2 animate-spin" />}
                  Save Changes
                </Button>
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        {/* Data Management Tab */}
        <TabsContent value="data">
          <div className="space-y-6">
            <Card>
              <CardHeader>
                <CardTitle>Export All Data</CardTitle>
                <CardDescription>
                  Download a JSON file containing all your data
                </CardDescription>
              </CardHeader>
              <CardContent>
                <Button onClick={handleExportData} disabled={isExporting}>
                  {isExporting ? (
                    <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                  ) : (
                    <Download className="h-4 w-4 mr-2" />
                  )}
                  {isExporting ? 'Generating export...' : 'Export All Data'}
                </Button>
              </CardContent>
            </Card>

            <Card>
              <CardHeader>
                <CardTitle>Storage Usage</CardTitle>
                <CardDescription>
                  Summary of data stored in your account
                </CardDescription>
              </CardHeader>
              <CardContent>
                <div className="grid grid-cols-2 gap-4 sm:grid-cols-3">
                  <StorageStat label="Initiatives" count={initiatives.length} />
                  <StorageStat label="Competitors" count={competitors.length} />
                  <StorageStat label="Chat Sessions" count={chatSessions.length} />
                  <StorageStat label="Market Research" count={marketResearches.length} />
                  <StorageStat label="Meetings" count={meetings.length} />
                  <StorageStat label="Roadmap Items" count={roadmapItems.length} />
                </div>
              </CardContent>
            </Card>
          </div>
        </TabsContent>

        {/* Security Tab */}
        <TabsContent value="security">
          <div className="space-y-6">
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <Lock className="h-5 w-5" />
                  Encryption Status
                </CardTitle>
              </CardHeader>
              <CardContent>
                <div className="flex items-center gap-3 rounded-lg border border-green-200 bg-green-50 p-4 dark:border-green-900 dark:bg-green-950">
                  <Shield className="h-5 w-5 text-green-600 dark:text-green-400" />
                  <div>
                    <p className="font-medium text-green-800 dark:text-green-300">
                      AES-256 encryption active for sensitive fields
                    </p>
                    <p className="text-sm text-green-600 dark:text-green-400">
                      All API keys and credentials are encrypted at rest
                    </p>
                  </div>
                </div>
              </CardContent>
            </Card>

            <Card>
              <CardHeader>
                <CardTitle>Change Password</CardTitle>
                <CardDescription>
                  Update your account password
                </CardDescription>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="space-y-2">
                  <Label htmlFor="currentPassword">Current Password</Label>
                  <Input
                    id="currentPassword"
                    type="password"
                    disabled
                    placeholder="********"
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="newPassword">New Password</Label>
                  <Input
                    id="newPassword"
                    type="password"
                    disabled
                    placeholder="********"
                  />
                </div>
                <Button disabled variant="outline">
                  Change Password
                </Button>
                <p className="text-xs text-muted-foreground">
                  Password management is handled by your authentication provider
                </p>
              </CardContent>
            </Card>
          </div>
        </TabsContent>

        {/* Account (Danger Zone) Tab */}
        <TabsContent value="account">
          <Card className="border-red-300 dark:border-red-900">
            <CardHeader>
              <CardTitle className="text-red-600 dark:text-red-400">
                Danger Zone
              </CardTitle>
              <CardDescription>
                Irreversible actions that affect your account
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-6">
              <div className="rounded-lg border border-red-200 bg-red-50 p-4 dark:border-red-900 dark:bg-red-950">
                <h3 className="font-semibold text-red-800 dark:text-red-300">
                  Delete Account
                </h3>
                <p className="mt-1 text-sm text-red-600 dark:text-red-400">
                  Permanently delete your account and all associated data. This
                  action cannot be undone.
                </p>

                <Separator className="my-4" />

                <div className="space-y-3">
                  <Label htmlFor="deleteConfirmation" className="text-red-700 dark:text-red-300">
                    Type <span className="font-mono font-bold">DELETE</span> to confirm
                  </Label>
                  <Input
                    id="deleteConfirmation"
                    value={deleteConfirmation}
                    onChange={(e) => setDeleteConfirmation(e.target.value)}
                    placeholder="Type DELETE to confirm"
                    className="max-w-xs border-red-300 dark:border-red-800"
                  />
                  <Button
                    variant="destructive"
                    onClick={handleDeleteAccount}
                    disabled={deleteConfirmation !== 'DELETE' || isDeleting}
                  >
                    {isDeleting && <Loader2 className="h-4 w-4 mr-2 animate-spin" />}
                    Delete My Account
                  </Button>
                </div>
              </div>
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>
    </div>
  );
}

function StorageStat({ label, count }: { label: string; count: number }) {
  return (
    <div className="rounded-lg border p-3 text-center">
      <p className="text-2xl font-bold">{count}</p>
      <p className="text-xs text-muted-foreground">{label}</p>
    </div>
  );
}
