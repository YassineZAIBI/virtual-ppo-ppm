'use client';

import { useState } from 'react';
import { cn } from '@/lib/utils';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Avatar, AvatarFallback } from '@/components/ui/avatar';
import { Dialog, DialogContent, DialogFooter, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Plus, ArrowRight, Trash2 } from 'lucide-react';
import { toast } from 'sonner';

interface Persona {
  name: string;
  role: string;
  goals: string[];
  painPoints: string[];
}

interface JourneyStep {
  step: string;
  action: string;
  emotion: 'happy' | 'neutral' | 'frustrated';
  touchpoint: string;
}

const defaultPersonas: Persona[] = [
  { name: 'Data Analyst', role: 'Analytics User', goals: ['Access real-time dashboards', 'Export reports easily'], painPoints: ['Complex query building', 'Slow load times'] },
  { name: 'Product Manager', role: 'Decision Maker', goals: ['View KPIs at a glance', 'Track roadmap progress'], painPoints: ['Too many clicks to find info', 'Lack of mobile access'] },
];

const defaultJourneySteps: JourneyStep[] = [
  { step: '1. Discovery', action: 'User finds product through search', emotion: 'neutral', touchpoint: 'Website' },
  { step: '2. Sign Up', action: 'Creates account with email', emotion: 'happy', touchpoint: 'Registration Form' },
  { step: '3. Onboarding', action: 'Completes setup wizard', emotion: 'happy', touchpoint: 'Dashboard' },
  { step: '4. First Use', action: 'Explores main features', emotion: 'neutral', touchpoint: 'App' },
  { step: '5. Regular Use', action: 'Uses product daily', emotion: 'happy', touchpoint: 'Dashboard' },
];

const emotionConfig = {
  happy: { bg: 'bg-green-100 text-green-700 dark:bg-green-900 dark:text-green-300', icon: '😊' },
  neutral: { bg: 'bg-blue-100 text-blue-700 dark:bg-blue-900 dark:text-blue-300', icon: '😐' },
  frustrated: { bg: 'bg-red-100 text-red-700 dark:bg-red-900 dark:text-red-300', icon: '😤' },
};

export function UserJourneyView() {
  const [personas, setPersonas] = useState<Persona[]>(defaultPersonas);
  const [journeySteps] = useState<JourneyStep[]>(defaultJourneySteps);
  const [showAddPersona, setShowAddPersona] = useState(false);
  const [newPersona, setNewPersona] = useState({ name: '', role: '', goals: '', painPoints: '' });

  const handleAddPersona = () => {
    if (!newPersona.name.trim()) return;
    setPersonas([...personas, {
      name: newPersona.name,
      role: newPersona.role,
      goals: newPersona.goals.split(',').map(g => g.trim()).filter(Boolean),
      painPoints: newPersona.painPoints.split(',').map(p => p.trim()).filter(Boolean),
    }]);
    setNewPersona({ name: '', role: '', goals: '', painPoints: '' });
    setShowAddPersona(false);
    toast.success('Persona added!');
  };

  const handleDeletePersona = (index: number) => {
    setPersonas(personas.filter((_, i) => i !== index));
    toast.success('Persona removed');
  };

  return (
    <div className="p-6 space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-slate-900 dark:text-white">User Journey Map</h1>
          <p className="text-slate-500">Design and analyze user experiences</p>
        </div>
        <Button onClick={() => setShowAddPersona(true)}>
          <Plus className="h-4 w-4 mr-2" />Add Persona
        </Button>
      </div>

      {/* Personas */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
        {personas.map((persona, i) => (
          <Card key={i}>
            <CardHeader className="pb-2">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-3">
                  <Avatar className="h-12 w-12">
                    <AvatarFallback className="bg-blue-100 text-blue-600 text-lg">{persona.name.charAt(0)}</AvatarFallback>
                  </Avatar>
                  <div>
                    <CardTitle className="text-lg">{persona.name}</CardTitle>
                    <p className="text-sm text-slate-500">{persona.role}</p>
                  </div>
                </div>
                <Button variant="ghost" size="sm" onClick={() => handleDeletePersona(i)} className="text-slate-400 hover:text-red-500">
                  <Trash2 className="h-4 w-4" />
                </Button>
              </div>
            </CardHeader>
            <CardContent>
              <div className="space-y-3">
                <div>
                  <h4 className="text-sm font-medium text-green-700 dark:text-green-400 mb-1">Goals</h4>
                  <ul className="text-sm text-slate-600 dark:text-slate-400 list-disc list-inside">
                    {persona.goals.map((g, j) => <li key={j}>{g}</li>)}
                  </ul>
                </div>
                <div>
                  <h4 className="text-sm font-medium text-red-700 dark:text-red-400 mb-1">Pain Points</h4>
                  <ul className="text-sm text-slate-600 dark:text-slate-400 list-disc list-inside">
                    {persona.painPoints.map((p, j) => <li key={j}>{p}</li>)}
                  </ul>
                </div>
              </div>
            </CardContent>
          </Card>
        ))}
      </div>

      {/* Journey Map */}
      <Card>
        <CardHeader><CardTitle>Journey Steps</CardTitle></CardHeader>
        <CardContent>
          <div className="flex gap-4 overflow-x-auto pb-4">
            {journeySteps.map((step, i) => (
              <div key={i} className="min-w-[200px] flex-shrink-0">
                <div className="bg-slate-50 dark:bg-slate-800 rounded-lg p-4 h-full">
                  <div className="flex items-center justify-between mb-2">
                    <span className="text-xs font-medium text-slate-500">{step.step}</span>
                    <Badge className={emotionConfig[step.emotion].bg}>{emotionConfig[step.emotion].icon}</Badge>
                  </div>
                  <p className="text-sm text-slate-700 dark:text-slate-300">{step.action}</p>
                  <div className="mt-2 pt-2 border-t">
                    <span className="text-xs text-slate-500">Touchpoint:</span>
                    <p className="text-sm font-medium">{step.touchpoint}</p>
                  </div>
                </div>
                {i < journeySteps.length - 1 && (
                  <div className="flex justify-center mt-2">
                    <ArrowRight className="h-4 w-4 text-slate-400" />
                  </div>
                )}
              </div>
            ))}
          </div>
        </CardContent>
      </Card>

      {/* Add Persona Dialog */}
      <Dialog open={showAddPersona} onOpenChange={setShowAddPersona}>
        <DialogContent>
          <DialogHeader><DialogTitle>Add Persona</DialogTitle></DialogHeader>
          <div className="space-y-4 py-4">
            <div><Label>Name</Label><Input value={newPersona.name} onChange={(e) => setNewPersona({ ...newPersona, name: e.target.value })} placeholder="Persona name..." /></div>
            <div><Label>Role</Label><Input value={newPersona.role} onChange={(e) => setNewPersona({ ...newPersona, role: e.target.value })} placeholder="User role..." /></div>
            <div><Label>Goals (comma separated)</Label><Input value={newPersona.goals} onChange={(e) => setNewPersona({ ...newPersona, goals: e.target.value })} placeholder="Goal 1, Goal 2..." /></div>
            <div><Label>Pain Points (comma separated)</Label><Input value={newPersona.painPoints} onChange={(e) => setNewPersona({ ...newPersona, painPoints: e.target.value })} placeholder="Pain point 1, Pain point 2..." /></div>
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
