'use client';

import { useState, useEffect } from 'react';
import { Button } from '@/components/ui/button';
import { AuthModal } from '@/components/ui/auth-modal';
import { Switch } from '@/components/ui/switch';
import { useAuth } from '@/contexts/auth-context';
import { 
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import { User, LogOut, Bell, BellOff } from 'lucide-react';

export function UserMenu() {
  const { user, signOut, loading } = useAuth();
  const [authModalOpen, setAuthModalOpen] = useState(false);
  const [dailyReminders, setDailyReminders] = useState(true);
  const [isUpdating, setIsUpdating] = useState(false);

  // Load user preferences when user changes
  useEffect(() => {
    const loadUserPreferences = async () => {
      if (!user) return;
      
      try {
        const response = await fetch(`/api/user-preferences?user_id=${user.id}`);
        if (response.ok) {
          const preferences = await response.json();
          setDailyReminders(preferences.daily_reminders !== false); // Default to true
        }
      } catch (error) {
        console.error('Error loading user preferences:', error);
      }
    };

    loadUserPreferences();
  }, [user]);

  const handleReminderToggle = async (enabled: boolean) => {
    if (!user || isUpdating) return;
    
    setIsUpdating(true);
    try {
      const response = await fetch('/api/user-preferences', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ 
          user_id: user.id, 
          daily_reminders: enabled 
        }),
      });

      if (response.ok) {
        setDailyReminders(enabled);
      } else {
        console.error('Failed to update reminder preference');
      }
    } catch (error) {
      console.error('Error updating reminder preference:', error);
    } finally {
      setIsUpdating(false);
    }
  };

  if (loading) {
    return (
      <div className="w-8 h-8 rounded-full bg-muted animate-pulse" />
    );
  }

  if (!user) {
    return (
      <>
        <Button onClick={() => setAuthModalOpen(true)}>
          Sign In
        </Button>
        <AuthModal 
          isOpen={authModalOpen} 
          onClose={() => setAuthModalOpen(false)} 
        />
      </>
    );
  }

  return (
    <DropdownMenu>
      <DropdownMenuTrigger asChild>
        <Button variant="ghost" size="icon" className="rounded-full">
          <div className="w-8 h-8 rounded-full bg-primary text-primary-foreground flex items-center justify-center">
            <User className="h-4 w-4" />
          </div>
        </Button>
      </DropdownMenuTrigger>
      <DropdownMenuContent align="end">
        <DropdownMenuLabel>
          {user.email}
        </DropdownMenuLabel>
        <DropdownMenuSeparator />
        <div className="flex items-center justify-between px-2 py-1.5 text-sm">
          <div className="flex items-center">
            {dailyReminders ? (
              <Bell className="mr-2 h-4 w-4" />
            ) : (
              <BellOff className="mr-2 h-4 w-4" />
            )}
            Daily Reminders
          </div>
          <Switch
            checked={dailyReminders}
            onCheckedChange={handleReminderToggle}
            disabled={isUpdating}
          />
        </div>
        <DropdownMenuSeparator />
        <DropdownMenuItem onClick={signOut}>
          <LogOut className="mr-2 h-4 w-4" />
          Sign Out
        </DropdownMenuItem>
      </DropdownMenuContent>
    </DropdownMenu>
  );
}