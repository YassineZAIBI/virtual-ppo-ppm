'use client';

import { useState, useEffect } from 'react';
import { useAppStore } from '@/lib/store';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Avatar, AvatarFallback } from '@/components/ui/avatar';
import { Dialog, DialogContent, DialogFooter, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Plus, Trash2, Info, Link2, X, Users } from 'lucide-react';
import { toast } from 'sonner';
import { Skeleton } from '@/components/ui/skeleton';
import { isSampleData } from '@/lib/sample-data';
import { ExampleBadge } from '@/components/ui/example-badge';

export function UserJourneyView() {
  const { personas, addPersona, updatePersona, deletePersona, initiatives, updateInitiative, setPersonas, setInitiatives } = useAppStore();
  const [showAddPersona, setShowAddPersona] = useState(false);
  const [journeyLoading, setJourneyLoading] = useState(true);

  // Fetch target groups and initiatives in parallel
  useEffect(() => {
    Promise.all([
      fetch('/api/vision/target-groups')
        .then(r => r.ok ? r.json() : [])
        .then(data => {
          if (Array.isArray(data) && data.length > 0) {
            const mapped = data.map((tg: any) => {
              let goals: string[] = [];
              if (tg.goals) {
                if (Array.isArray(tg.goals)) goals = tg.goals;
                else if (typeof tg.goals === 'string') {
                  try { const parsed = JSON.parse(tg.goals); goals = Array.isArray(parsed) ? parsed : [tg.goals]; }
                  catch { goals = [tg.goals]; }
                }
              }
              let painPoints: string[] = [];
              if (tg.painPoints) {
                if (Array.isArray(tg.painPoints)) painPoints = tg.painPoints;
                else if (typeof tg.painPoints === 'string') {
                  try { const parsed = JSON.parse(tg.painPoints); painPoints = Array.isArray(parsed) ? parsed : [tg.painPoints]; }
                  catch { painPoints = [tg.painPoints]; }
                }
              }
              return { id: tg.id, name: tg.name, role: tg.role || '', goals, painPoints };
            });
            setPersonas(mapped);
          }
        }),
      fetch('/api/initiatives')
        .then(r => r.ok ? r.json() : [])
        .then(d => { if (Array.isArray(d)) setInitiatives(d); }),
    ]).catch(() => {}).finally(() => setJourneyLoading(false));
  }, []); // eslint-disable-line react-hooks/exhaustive-deps
  const [linkingPersonaId, setLinkingPersonaId] = useState<string | null>(null);
  const [newPersona, setNewPersona] = useState({ name: '', role: '', goals: '', painPoints: '' });

  const handleAddPersona = () => {
    if (!newPersona.name.trim()) return;
    addPersona({
      id: crypto.randomUUID(),
      name: newPersona.name,
      role: newPersona.role,
      goals: newPersona.goals.split(',').map(g => g.trim()).filter(Boolean),
      painPoints: newPersona.painPoints.split(',').map(p => p.trim()).filter(Boolean),
    });
    setNewPersona({ name: '', role: '', goals: '', painPoints: '' });
    setShowAddPersona(false);
    toast.success('Persona added!');
  };

  const handleDeletePersona = (id: string) => {
    // Unlink from all initiatives first
    initiatives.forEach((init) => {
      if (init.personaIds?.includes(id)) {
        updateInitiative(init.id, {
          personaIds: init.personaIds.filter((pid) => pid !== id),
        });
      }
    });
    deletePersona(id);
    toast.success('Persona removed');
  };

  const handleLinkInitiative = (personaId: string, initiativeId: string) => {
    const initiative = initiatives.find((i) => i.id === initiativeId);
    if (!initiative) return;
    const current = initiative.personaIds || [];
    if (current.includes(personaId)) return;
    updateInitiative(initiativeId, { personaIds: [...current, personaId] });
    setLinkingPersonaId(null);
    toast.success('Initiative linked!');
  };

  const handleUnlinkInitiative = (personaId: string, initiativeId: string) => {
    const initiative = initiatives.find((i) => i.id === initiativeId);
    if (!initiative) return;
    updateInitiative(initiativeId, {
      personaIds: (initiative.personaIds || []).filter((pid) => pid !== personaId),
    });
    toast.success('Initiative unlinked');
  };

  const getLinkedInitiatives = (personaId: string) =>
    initiatives.filter((i) => i.personaIds?.includes(personaId));

  const getUnlinkedInitiatives = (personaId: string) =>
    initiatives.filter((i) => !i.personaIds?.includes(personaId));

  const avatarColors = [
    'bg-blue-100 text-blue-600 dark:bg-blue-500/15 dark:text-blue-300',
    'bg-purple-100 text-purple-600 dark:bg-purple-500/15 dark:text-purple-300',
    'bg-emerald-100 text-emerald-600 dark:bg-emerald-500/15 dark:text-emerald-300',
    'bg-amber-100 text-amber-600 dark:bg-amber-500/15 dark:text-amber-300',
    'bg-rose-100 text-rose-600 dark:bg-rose-500/15 dark:text-rose-300',
    'bg-cyan-100 text-cyan-600 dark:bg-cyan-500/15 dark:text-cyan-300',
  ];

  if (journeyLoading) {
    return (
      <div className="p-6 space-y-4">
        {[1, 2, 3].map(i => <Skeleton key={i} className="h-24 w-full rounded-lg" />)}
      </div>
    );
  }

  return (
    <div className="p-6 space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-3">
          <div>
            <h1 className="text-2xl font-bold text-foreground">User Personas</h1>
            <p className="text-muted-foreground">Define target users and link them to initiatives</p>
          </div>
          <Popover>
            <PopoverTrigger asChild>
              <Button variant="ghost" size="sm" className="h-7 w-7 p-0 text-muted-foreground hover:text-blue-500">
                <Info className="h-4 w-4" />
              </Button>
            </PopoverTrigger>
            <PopoverContent className="w-80 text-sm" side="bottom" align="start">
              <div className="space-y-2">
                <h4 className="font-semibold flex items-center gap-1.5">
                  <Users className="h-4 w-4 text-blue-500" />
                  What are Personas?
                </h4>
                <p className="text-muted-foreground">
                  Personas represent your target users. Each persona captures the goals and pain points of a user segment.
                </p>
                <p className="text-muted-foreground">
                  <strong>Link personas to initiatives</strong> to track which user needs each initiative addresses. This helps prioritize work based on real user impact.
                </p>
              </div>
            </PopoverContent>
          </Popover>
        </div>
        <Button onClick={() => setShowAddPersona(true)}>
          <Plus className="h-4 w-4 mr-2" />Add Persona
        </Button>
      </div>

      {/* Empty state */}
      {personas.length === 0 && (
        <Card className="border-dashed">
          <CardContent className="py-12 text-center">
            <Users className="h-10 w-10 text-muted-foreground mx-auto mb-3" />
            <p className="text-muted-foreground mb-3">No personas yet. Create your first persona to start mapping user needs to initiatives.</p>
            <Button variant="outline" onClick={() => setShowAddPersona(true)}>
              <Plus className="h-4 w-4 mr-2" />Create Persona
            </Button>
          </CardContent>
        </Card>
      )}

      {/* Persona Cards */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
        {personas.map((persona, idx) => {
          const linked = getLinkedInitiatives(persona.id);
          const unlinked = getUnlinkedInitiatives(persona.id);
          const colorClass = avatarColors[idx % avatarColors.length];

          return (
            <Card key={persona.id} className="flex flex-col">
              <CardHeader className="pb-2">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-3">
                    <Avatar className="h-11 w-11">
                      <AvatarFallback className={`text-lg font-semibold ${colorClass}`}>
                        {persona.name.charAt(0)}
                      </AvatarFallback>
                    </Avatar>
                    <div>
                      <div className="flex items-center gap-1.5">
                        <CardTitle className="text-base">{persona.name}</CardTitle>
                        {isSampleData(persona.id) && <ExampleBadge />}
                      </div>
                      <p className="text-sm text-muted-foreground">{persona.role}</p>
                    </div>
                  </div>
                  <Button
                    variant="ghost"
                    size="sm"
                    onClick={() => handleDeletePersona(persona.id)}
                    className="h-7 w-7 p-0 text-muted-foreground hover:text-red-500"
                  >
                    <Trash2 className="h-3.5 w-3.5" />
                  </Button>
                </div>
              </CardHeader>
              <CardContent className="flex-1 space-y-3">
                {/* Goals */}
                {persona.goals.length > 0 && (
                  <div>
                    <h4 className="text-xs font-medium text-green-700 dark:text-green-400 mb-1 uppercase tracking-wider">Goals</h4>
                    <ul className="space-y-0.5">
                      {persona.goals.map((g, j) => (
                        <li key={j} className="text-sm text-muted-foreground flex items-start gap-1.5">
                          <span className="text-green-500 mt-1.5 h-1 w-1 rounded-full bg-green-500 flex-shrink-0" />
                          {g}
                        </li>
                      ))}
                    </ul>
                  </div>
                )}

                {/* Pain Points */}
                {persona.painPoints.length > 0 && (
                  <div>
                    <h4 className="text-xs font-medium text-red-700 dark:text-red-400 mb-1 uppercase tracking-wider">Pain Points</h4>
                    <ul className="space-y-0.5">
                      {persona.painPoints.map((p, j) => (
                        <li key={j} className="text-sm text-muted-foreground flex items-start gap-1.5">
                          <span className="mt-1.5 h-1 w-1 rounded-full bg-red-500 flex-shrink-0" />
                          {p}
                        </li>
                      ))}
                    </ul>
                  </div>
                )}

                {/* Linked Initiatives */}
                <div className="pt-2 border-t">
                  <h4 className="text-xs font-medium text-muted-foreground mb-2 uppercase tracking-wider flex items-center gap-1">
                    <Link2 className="h-3 w-3" />
                    Linked Initiatives
                  </h4>
                  <div className="flex flex-wrap gap-1.5">
                    {linked.map((init) => (
                      <Badge
                        key={init.id}
                        variant="secondary"
                        className="text-xs cursor-pointer hover:bg-red-100 hover:text-red-700 dark:hover:bg-red-900 dark:hover:text-red-300 group pr-1"
                        onClick={() => handleUnlinkInitiative(persona.id, init.id)}
                        title="Click to unlink"
                      >
                        {init.title}
                        <X className="h-3 w-3 ml-1 opacity-0 group-hover:opacity-100 transition-opacity" />
                      </Badge>
                    ))}
                    {linked.length === 0 && (
                      <span className="text-xs text-muted-foreground italic">No initiatives linked</span>
                    )}

                    {/* Link button */}
                    {unlinked.length > 0 && (
                      <Popover open={linkingPersonaId === persona.id} onOpenChange={(open) => setLinkingPersonaId(open ? persona.id : null)}>
                        <PopoverTrigger asChild>
                          <Button variant="outline" size="sm" className="h-6 text-xs px-2 gap-1">
                            <Plus className="h-3 w-3" />Link
                          </Button>
                        </PopoverTrigger>
                        <PopoverContent className="w-64 p-2" align="start">
                          <ScrollArea className="max-h-48">
                            <div className="space-y-1">
                              {unlinked.map((init) => (
                                <button
                                  key={init.id}
                                  className="w-full text-left px-2 py-1.5 rounded text-sm hover:bg-accent transition-colors"
                                  onClick={() => handleLinkInitiative(persona.id, init.id)}
                                >
                                  <span className="font-medium">{init.title}</span>
                                  <span className="block text-xs text-muted-foreground capitalize">{init.status}</span>
                                </button>
                              ))}
                            </div>
                          </ScrollArea>
                        </PopoverContent>
                      </Popover>
                    )}
                  </div>
                </div>
              </CardContent>
            </Card>
          );
        })}
      </div>

      {/* Add Persona Dialog */}
      <Dialog open={showAddPersona} onOpenChange={setShowAddPersona}>
        <DialogContent>
          <DialogHeader><DialogTitle>Add Persona</DialogTitle></DialogHeader>
          <div className="space-y-4 py-4">
            <div>
              <Label>Name</Label>
              <Input value={newPersona.name} onChange={(e) => setNewPersona({ ...newPersona, name: e.target.value })} placeholder="e.g., Data Analyst" />
            </div>
            <div>
              <Label>Role</Label>
              <Input value={newPersona.role} onChange={(e) => setNewPersona({ ...newPersona, role: e.target.value })} placeholder="e.g., Analytics User" />
            </div>
            <div>
              <Label>Goals (comma separated)</Label>
              <Input value={newPersona.goals} onChange={(e) => setNewPersona({ ...newPersona, goals: e.target.value })} placeholder="Goal 1, Goal 2..." />
            </div>
            <div>
              <Label>Pain Points (comma separated)</Label>
              <Input value={newPersona.painPoints} onChange={(e) => setNewPersona({ ...newPersona, painPoints: e.target.value })} placeholder="Pain point 1, Pain point 2..." />
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setShowAddPersona(false)}>Cancel</Button>
            <Button onClick={handleAddPersona}>Add Persona</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
