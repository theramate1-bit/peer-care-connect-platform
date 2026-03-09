/**
 * Schedule-style dashboard layout inspired by task/productivity UIs.
 * Three columns: This week (pinned) + calendar strip | Today's schedule (timeline) | User + quick stats.
 * Adapted for practitioner context: sessions, clients, earnings.
 */

import { useState, useMemo } from "react";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Calendar, Settings } from "lucide-react";
import { format, isSameDay } from "date-fns";

export interface ScheduleViewSession {
  id: string;
  session_type: string;
  client_name: string;
  session_date: string;
  start_time: string;
  duration_minutes: number;
  status: string;
  is_exchange_request?: boolean;
  requester_name?: string;
}

interface DashboardScheduleViewProps {
  /** Sessions for today only (shown in center timeline) */
  todaySessions: ScheduleViewSession[];
  /** Upcoming sessions for "This week" (left column), e.g. next 3–5 */
  weekSessions: ScheduleViewSession[];
  /** All upcoming sessions (for calendar date selection); if provided, clicking a date shows that day's sessions */
  allUpcomingSessions?: ScheduleViewSession[];
  /** Display name for the user */
  userName: string;
  /** Optional avatar URL */
  userAvatarUrl?: string | null;
  /** Sessions count today (for right column summary) */
  todayCount: number;
  /** Completion rate 0–100 (for right column) */
  completionRate: number;
  /** This month's earnings formatted, e.g. "£120" */
  earningsLabel: string;
  /** Format time for display, e.g. "9:00 AM" */
  formatTime: (startTime: string) => string;
  /** Format date for display, e.g. "Today", "Tomorrow", "Wed 15 Mar" */
  formatDateLabel: (dateStr: string) => string;
  /** Navigate to full schedule/diary */
  onViewSchedule: () => void;
  /** Navigate to profile/settings */
  onViewSettings: () => void;
  /** Render a single session row in the timeline (title, subtitle, actions) */
  renderSessionCard: (session: ScheduleViewSession) => React.ReactNode;
}

const SESSION_ICON = "🧑‍⚕️";
const PEER_ICON = "🤝";
const DEFAULT_AVATAR_LETTER = (name: string) =>
  name
    .split(" ")
    .map((n) => n[0])
    .join("")
    .toUpperCase()
    .slice(0, 2);

const toDateStr = (d: Date) => format(d, "yyyy-MM-dd");

export function DashboardScheduleView({
  todaySessions,
  weekSessions,
  allUpcomingSessions = [],
  userName,
  userAvatarUrl,
  todayCount,
  completionRate,
  earningsLabel,
  formatTime,
  formatDateLabel,
  onViewSchedule,
  onViewSettings,
  renderSessionCard,
}: DashboardScheduleViewProps) {
  const today = new Date();
  const [selectedDate, setSelectedDate] = useState<Date>(() => new Date(today));

  const selectedDateStr = toDateStr(selectedDate);
  const sessionsForSelectedDay = useMemo(() => {
    if (isSameDay(selectedDate, today)) return todaySessions;
    return (allUpcomingSessions || []).filter((s) => s.session_date === selectedDateStr);
  }, [selectedDate, selectedDateStr, today, todaySessions, allUpcomingSessions]);

  const upcomingToShow = useMemo(() => {
    const pool = allUpcomingSessions.length ? allUpcomingSessions : weekSessions;
    return pool
      .filter((s) => s.session_date > selectedDateStr)
      .sort((a, b) => (a.session_date !== b.session_date ? a.session_date.localeCompare(b.session_date) : (a.start_time || "").localeCompare(b.start_time || "")))
      .slice(0, 5);
  }, [allUpcomingSessions, weekSessions, selectedDateStr]);

  const dayName = format(selectedDate, "EEEE");
  const dayNum = format(selectedDate, "d");
  const isSelectedToday = isSameDay(selectedDate, today);

  return (
    <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 lg:gap-8">
      {/* Left: This week + calendar strip */}
      <aside className="lg:col-span-3 space-y-6">
        <div className="space-y-4">
          <div className="flex items-center justify-between">
            <h2 className="text-xl font-semibold text-foreground">This week</h2>
            <Button
              variant="ghost"
              size="sm"
              className="text-primary font-semibold text-sm h-auto py-1 px-0"
              onClick={onViewSchedule}
            >
              View all
            </Button>
          </div>
          <div className="space-y-3">
            {weekSessions.slice(0, 3).map((s) => (
              <Card
                key={s.id}
                className="rounded-2xl border border-border/50 bg-card shadow-sm transition-[border-color,background-color] duration-200 ease-out overflow-hidden"
              >
                <CardContent className="p-4">
                  <div className="min-w-0">
                    <p className="font-semibold text-foreground truncate">
                      {s.session_type || "Session"}
                    </p>
                    <p className="text-sm text-muted-foreground truncate">
                      {s.requester_name || s.client_name}
                    </p>
                    <p className="text-xs text-muted-foreground mt-0.5">
                      {formatDateLabel(s.session_date)} · {formatTime(s.start_time)}
                    </p>
                  </div>
                </CardContent>
              </Card>
            ))}
            {weekSessions.length === 0 && (
              <Card className="rounded-2xl border border-dashed border-muted-foreground/25 bg-muted/30">
                <CardContent className="p-6 text-center text-sm text-muted-foreground">
                  No upcoming sessions this week
                </CardContent>
              </Card>
            )}
          </div>
        </div>

        {/* This week strip */}
        <div className="space-y-2">
          <div className="flex items-center justify-between">
            <p className="text-lg font-medium text-foreground">
              {format(today, "MMMM, yyyy")}
            </p>
            <Button
              variant="ghost"
              size="sm"
              className="text-primary text-xs h-auto py-0"
              onClick={onViewSchedule}
            >
              View diary
            </Button>
          </div>
          <Card className="rounded-2xl border border-border/50 bg-card p-3 shadow-sm">
            <div className="grid grid-cols-7 gap-1 text-center text-xs">
              {["Mon", "Tue", "Wed", "Thu", "Fri", "Sat", "Sun"].map((d) => (
                <span key={d} className="font-semibold text-primary">
                  {d}
                </span>
              ))}
              {(() => {
                const start = new Date(today);
                const dayOfWeek = start.getDay();
                const toMonday = dayOfWeek === 0 ? -6 : 1 - dayOfWeek;
                start.setDate(start.getDate() + toMonday);
                return Array.from({ length: 14 }, (_, i) => {
                  const date = new Date(start);
                  date.setDate(start.getDate() + i);
                  const isToday = date.toDateString() === today.toDateString();
                  const isSelected = date.toDateString() === selectedDate.toDateString();
                  return (
                    <button
                      key={i}
                      type="button"
                      onClick={() => setSelectedDate(date)}
                      className={`py-1 rounded-full w-full text-xs font-medium transition-colors hover:bg-muted ${
                        isSelected
                          ? "bg-primary text-primary-foreground"
                          : isToday
                            ? "bg-primary/20 text-primary"
                            : "text-muted-foreground"
                      }`}
                    >
                      {format(date, "d")}
                    </button>
                  );
                });
              })()}
            </div>
          </Card>
        </div>
      </aside>

      {/* Center: Schedule for selected day */}
      <section className="lg:col-span-6 space-y-4">
        <div className="flex items-baseline gap-2">
          <h2 className="text-2xl lg:text-3xl font-medium text-foreground">
            {isSelectedToday ? "Today's schedule" : "Schedule"}
          </h2>
          <span className="text-2xl lg:text-3xl font-medium text-primary">
            {dayName} {dayNum}
          </span>
        </div>
        <div className="space-y-3">
          {sessionsForSelectedDay.length === 0 ? (
            <Card className="rounded-2xl border border-border/50 bg-muted/20 overflow-hidden">
              <CardContent className="py-8 text-center text-muted-foreground">
                <Calendar className="h-10 w-10 mx-auto mb-2 opacity-50" />
                <p className="font-medium">
                  {isSelectedToday ? "No sessions today" : `No sessions on ${format(selectedDate, "EEE, MMM d")}`}
                </p>
                <p className="text-sm mt-1">
                  {isSelectedToday ? "Your day is clear." : "Select another date or see upcoming bookings below."}
                </p>
                {upcomingToShow.length > 0 && (
                  <div className="mt-6 text-left border-t border-border/50 pt-6">
                    <p className="text-sm font-semibold text-foreground mb-3">Upcoming bookings</p>
                    <ul className="space-y-2">
                      {upcomingToShow.map((s) => (
                        <li
                          key={s.id}
                          className="flex items-center justify-between gap-2 py-2 px-3 rounded-lg bg-card border border-border/50 text-sm"
                        >
                          <div className="min-w-0">
                            <span className="font-medium text-foreground block truncate">{s.session_type || "Session"}</span>
                            <span className="text-muted-foreground text-xs truncate block">{s.requester_name || s.client_name}</span>
                          </div>
                          <span className="text-muted-foreground shrink-0 text-xs">{formatDateLabel(s.session_date)} · {formatTime(s.start_time)}</span>
                        </li>
                      ))}
                    </ul>
                  </div>
                )}
                <Button
                  variant="outline"
                  size="sm"
                  className="mt-4"
                  onClick={onViewSchedule}
                >
                  View schedule
                </Button>
              </CardContent>
            </Card>
          ) : (
            sessionsForSelectedDay.map((session) => (
              <Card
                key={session.id}
                className="rounded-2xl border border-border/50 bg-card/80 shadow-sm transition-[border-color,background-color] duration-200 ease-out overflow-hidden"
              >
                <CardContent className="p-4 flex items-start gap-4">
                  <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-xl bg-primary/10 text-primary text-base">
                    {session.is_exchange_request ? PEER_ICON : SESSION_ICON}
                  </div>
                  <div className="min-w-0 flex-1">
                    {renderSessionCard(session)}
                  </div>
                  <div className="shrink-0 text-right text-sm font-medium text-muted-foreground">
                    {formatTime(session.start_time)}
                  </div>
                </CardContent>
              </Card>
            ))
          )}
        </div>
      </section>

      {/* Right: User + quick stats */}
      <aside className="lg:col-span-3 space-y-4">
        <Card className="rounded-2xl border border-border/50 bg-card shadow-sm overflow-hidden">
          <CardContent className="p-4 flex items-center gap-3">
            <div className="h-14 w-14 rounded-xl bg-primary/10 flex items-center justify-center text-xl font-bold text-primary overflow-hidden">
              {userAvatarUrl ? (
                <img
                  src={userAvatarUrl}
                  alt=""
                  className="h-full w-full object-cover"
                />
              ) : (
                DEFAULT_AVATAR_LETTER(userName || "U")
              )}
            </div>
            <div className="min-w-0 flex-1">
              <p className="font-semibold text-foreground truncate">
                {userName || "Practitioner"}
              </p>
              <Button
                variant="ghost"
                size="sm"
                className="text-primary h-auto py-0 px-0 font-semibold text-sm -ml-1"
                onClick={onViewSettings}
              >
                <Settings className="h-3.5 w-3.5 mr-1 inline" />
                My profile
              </Button>
            </div>
          </CardContent>
        </Card>

        <Card className="rounded-2xl border border-border/50 bg-card shadow-sm overflow-hidden">
          <CardContent className="p-4 space-y-3">
            <div className="flex justify-between items-baseline">
              <span className="text-sm text-muted-foreground">Sessions today</span>
              <span className="text-lg font-semibold text-foreground">
                {todayCount}
              </span>
            </div>
            <div className="flex justify-between items-baseline">
              <span className="text-sm text-muted-foreground">Completion rate</span>
              <span className="text-lg font-semibold text-foreground">
                {completionRate}%
              </span>
            </div>
            <div className="flex justify-between items-baseline pt-2 border-t border-border/50">
              <span className="text-sm text-muted-foreground">This month</span>
              <span className="text-lg font-semibold text-foreground">
                {earningsLabel}
              </span>
            </div>
          </CardContent>
        </Card>
      </aside>
    </div>
  );
}
