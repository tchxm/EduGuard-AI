export function RecentActivity() {
  const activities = [
    { time: 'Just now', action: 'John marked attendance', type: 'attendance' },
    { time: '5 mins ago', action: 'New student enrolled: Sarah', type: 'student' },
    { time: '1 hour ago', action: 'Class "Math 101" created', type: 'class' },
    { time: '2 hours ago', action: 'Attendance session ended', type: 'attendance' },
    { time: 'Yesterday', action: '12 absences recorded', type: 'alert' },
  ];

  return (
    <div className="bg-white rounded-lg border border-border p-6">
      <h2 className="text-lg font-semibold text-foreground mb-4">Recent Activity</h2>
      <div className="space-y-3">
        {activities.map((activity, idx) => (
          <div key={idx} className="flex items-start gap-3 pb-3 border-b border-border last:border-b-0">
            <div className="mt-1">
              {activity.type === 'attendance' && <span className="text-lg">✓</span>}
              {activity.type === 'student' && <span className="text-lg">👤</span>}
              {activity.type === 'class' && <span className="text-lg">📚</span>}
              {activity.type === 'alert' && <span className="text-lg">⚠️</span>}
            </div>
            <div>
              <p className="text-sm text-foreground">{activity.action}</p>
              <p className="text-xs text-muted">{activity.time}</p>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}
