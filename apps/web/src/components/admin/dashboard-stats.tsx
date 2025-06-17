import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { FileText, Users, Eye, TrendingUp } from "lucide-react";

interface DashboardStatsProps {
  stats: {
    totalPosts: number;
    publishedPosts: number;
    draftPosts: number;
    totalUsers: number;
  };
}

export function DashboardStats({ stats }: DashboardStatsProps) {
  const statCards = [
    {
      title: "Total Posts",
      value: stats.totalPosts,
      description: `${stats.publishedPosts} published`,
      icon: FileText,
      trend: "+12%",
    },
    {
      title: "Total Users",
      value: stats.totalUsers,
      description: "Active users",
      icon: Users,
      trend: "+8%",
    },
    {
      title: "Draft Posts",
      value: stats.draftPosts,
      description: "Pending publication",
      icon: Eye,
      trend: "+3%",
    },
    {
      title: "Growth",
      value: "23.4%",
      description: "From last month",
      icon: TrendingUp,
      trend: "+2.1%",
    },
  ];

  return (
    <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
      {statCards.map((stat, index) => {
        const Icon = stat.icon;
        return (
          <Card key={index}>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">
                {stat.title}
              </CardTitle>
              <Icon className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">{stat.value}</div>
              <p className="text-xs text-muted-foreground">
                {stat.description}
              </p>
              <div className="flex items-center pt-1">
                <span className="text-xs text-green-600 font-medium">
                  {stat.trend}
                </span>
                <span className="text-xs text-muted-foreground ml-1">
                  from last month
                </span>
              </div>
            </CardContent>
          </Card>
        );
      })}
    </div>
  );
}
