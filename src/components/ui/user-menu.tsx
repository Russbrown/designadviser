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
      }
    } catch (error) {
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
        <button className="overflow-clip relative rounded-[5px] shrink-0 size-5">
          <svg 
            width="20" 
            height="20" 
            viewBox="0 0 20 20" 
            fill="none" 
            xmlns="http://www.w3.org/2000/svg"
            className="size-full"
          >
            <g clipPath="url(#clip0_70_1897)">
              <circle cx="10" cy="7.5" r="2.5" stroke="#1C274C" strokeWidth="1.5"/>
              <path d="M14.9745 16.6667C14.8419 14.2571 14.1042 12.5 10.0002 12.5C5.89625 12.5 5.1585 14.2571 5.02588 16.6667" stroke="#1C274C" strokeWidth="1.5" strokeLinecap="round"/>
              <path d="M5.83317 2.78184C7.05889 2.0728 8.48197 1.66699 9.99984 1.66699C14.6022 1.66699 18.3332 5.39795 18.3332 10.0003C18.3332 14.6027 14.6022 18.3337 9.99984 18.3337C5.39746 18.3337 1.6665 14.6027 1.6665 10.0003C1.6665 8.48246 2.07231 7.05938 2.78136 5.83366" stroke="#1C274C" strokeWidth="1.5" strokeLinecap="round"/>
            </g>
            <defs>
              <clipPath id="clip0_70_1897">
                <rect width="20" height="20" fill="white"/>
              </clipPath>
            </defs>
          </svg>
        </button>
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