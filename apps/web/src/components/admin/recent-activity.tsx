import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { formatRelativeTime } from "@/lib/utils";

// Mock data - replace with real data from your activity service
const activities = [
  {
    id: 1,
    user: { name: "John Doe", avatar: "" },
    action: "Published",
    target: "Getting Started with Vyral",
    time: new Date(Date.now() - 1000 * 60 * 30), // 30 minutes ago
  },
  {
    id: 2,
    user: { name: "Jane Smith", avatar: "" },
    action: "Updated",
    target: "About Page",
    time: new Date(Date.now() - 1000 * 60 * 60 * 2), // 2 hours ago
  },
  {
    id: 3,
    user: { name: "Bob Wilson", avatar: "" },
    action: "Uploaded",
    target: "hero-image.jpg",
    time: new Date(Date.now() - 1000 * 60 * 60 * 4), // 4 hours ago
  },
];

export function RecentActivity() {
  return (
    <Card>
      <CardHeader>
        <CardTitle>Recent Activity</CardTitle>
      </CardHeader>
      <CardContent>
        <div className="space-y-4">
          {activities.map((activity) => (
            <div key={activity.id} className="flex items-center space-x-3">
              <Avatar className="h-8 w-8">
                <AvatarImage src={activity.user.avatar} />
                <AvatarFallback>
                  {activity.user.name
                    .split(" ")
                    .map((n) => n[0])
                    .join("")}
                </AvatarFallback>
              </Avatar>
              <div className="flex-1 space-y-1">
                <p className="text-sm font-medium">
                  {activity.user.name} {activity.action.toLowerCase()}{" "}
                  <span className="font-normal">{activity.target}</span>
                </p>
                <p className="text-xs text-muted-foreground">
                  {formatRelativeTime(activity.time)}
                </p>
              </div>
            </div>
          ))}
        </div>
      </CardContent>
    </Card>
  );
}
