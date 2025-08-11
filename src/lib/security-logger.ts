interface SecurityEvent {
  type: 'rate_limit_exceeded' | 'invalid_file_upload' | 'auth_failure' | 'suspicious_activity';
  ip: string;
  userAgent?: string;
  userId?: string;
  details?: Record<string, unknown>;
  timestamp: string;
}

class SecurityLogger {
  private events: SecurityEvent[] = [];
  private maxEvents = 1000;

  log(event: Omit<SecurityEvent, 'timestamp'>) {
    const logEvent: SecurityEvent = {
      ...event,
      timestamp: new Date().toISOString(),
    };

    this.events.push(logEvent);

    if (this.events.length > this.maxEvents) {
      this.events = this.events.slice(-this.maxEvents);
    }

    console.warn(`[SECURITY] ${event.type}:`, {
      ip: event.ip,
      userId: event.userId || 'anonymous',
      details: event.details,
    });
  }

  getRecentEvents(hours: number = 24): SecurityEvent[] {
    const cutoff = new Date(Date.now() - hours * 60 * 60 * 1000).toISOString();
    return this.events.filter(event => event.timestamp > cutoff);
  }

  getEventsForIP(ip: string, hours: number = 24): SecurityEvent[] {
    return this.getRecentEvents(hours).filter(event => event.ip === ip);
  }

  isIPSuspicious(ip: string): boolean {
    const recentEvents = this.getEventsForIP(ip, 1);
    const rateLimitEvents = recentEvents.filter(e => e.type === 'rate_limit_exceeded');
    const failedAuthEvents = recentEvents.filter(e => e.type === 'auth_failure');

    return rateLimitEvents.length > 5 || failedAuthEvents.length > 3;
  }
}

export const securityLogger = new SecurityLogger();

export function getClientIP(request: Request): string {
  const forwarded = request.headers.get('x-forwarded-for');
  const realIP = request.headers.get('x-real-ip');
  
  if (forwarded) {
    return forwarded.split(',')[0].trim();
  }
  
  if (realIP) {
    return realIP.trim();
  }

  return '127.0.0.1';
}