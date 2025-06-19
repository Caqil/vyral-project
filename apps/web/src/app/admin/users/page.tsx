import { Suspense } from "react";
import Link from "next/link";
import { UserService } from "@vyral/core";
import { connectDB } from "@/lib/db";
import { Plus, Search, Filter, Edit, Trash2, Shield, User } from "lucide-react";
import {
  formatDate,
  formatRelativeTime,
} from "../../../../../../packages/plugin-sdk/src/utils/date-utils";
import { Avatar, AvatarFallback, AvatarImage, Badge, Button, Card, CardContent, Input, Skeleton } from "@/components/ui";

interface UsersPageProps {
  searchParams: {
    page?: string;
    search?: string;
    role?: string;
  };
}

async function getUsers(searchParams: UsersPageProps["searchParams"]) {
  await connectDB();
  const userService = new UserService(process.env.JWT_SECRET!);

  const page = parseInt(searchParams.page || "1");
  const filters: any = {};

  if (searchParams.role) filters.role = searchParams.role;
  if (searchParams.search) {
    filters.$or = [
      { username: { $regex: searchParams.search, $options: "i" } },
      { email: { $regex: searchParams.search, $options: "i" } },
      { displayName: { $regex: searchParams.search, $options: "i" } },
    ];
  }

  return await userService.findMany(filters, {
    page,
    limit: 20,
    sort: "createdAt",
    order: "desc",
  });
}

function UsersContent({
  searchParams,
}: {
  searchParams: UsersPageProps["searchParams"];
}) {
  return (
    <Suspense fallback={<UsersTableSkeleton />}>
      <UsersTable searchParams={searchParams} />
    </Suspense>
  );
}

async function UsersTable({
  searchParams,
}: {
  searchParams: UsersPageProps["searchParams"];
}) {
  const { data: users, pagination } = await getUsers(searchParams);

  const getRoleColor = (role: string) => {
    switch (role) {
      case "super_admin":
        return "bg-purple-100 text-purple-800 dark:bg-purple-900 dark:text-purple-200";
      case "admin":
        return "bg-red-100 text-red-800 dark:bg-red-900 dark:text-red-200";
      case "editor":
        return "bg-blue-100 text-blue-800 dark:bg-blue-900 dark:text-blue-200";
      case "author":
        return "bg-green-100 text-green-800 dark:bg-green-900 dark:text-green-200";
      case "contributor":
        return "bg-yellow-100 text-yellow-800 dark:bg-yellow-900 dark:text-yellow-200";
      default:
        return "bg-gray-100 text-gray-800 dark:bg-gray-900 dark:text-gray-200";
    }
  };

  const getStatusColor = (status: string) => {
    switch (status) {
      case "active":
        return "bg-green-100 text-green-800 dark:bg-green-900 dark:text-green-200";
      case "pending":
        return "bg-yellow-100 text-yellow-800 dark:bg-yellow-900 dark:text-yellow-200";
      case "inactive":
        return "bg-gray-100 text-gray-800 dark:bg-gray-900 dark:text-gray-200";
      case "banned":
        return "bg-red-100 text-red-800 dark:bg-red-900 dark:text-red-200";
      default:
        return "bg-gray-100 text-gray-800 dark:bg-gray-900 dark:text-gray-200";
    }
  };

  return (
    <div className="space-y-4">
      {users.length === 0 ? (
        <Card>
          <CardContent className="flex flex-col items-center justify-center py-12">
            <User className="h-12 w-12 text-muted-foreground mb-4" />
            <h3 className="text-lg font-semibold">No users found</h3>
            <p className="text-muted-foreground mb-4">
              {searchParams.search
                ? "Try adjusting your search terms"
                : "No users match the current filters"}
            </p>
          </CardContent>
        </Card>
      ) : (
        <div className="grid gap-4">
          {users.map((user: any) => (
            <Card key={user._id}>
              <CardContent className="p-6">
                <div className="flex items-center justify-between">
                  <div className="flex items-center space-x-4">
                    <Avatar className="h-12 w-12">
                      <AvatarImage src={user.avatar} />
                      <AvatarFallback>
                        {user.displayName.charAt(0).toUpperCase()}
                      </AvatarFallback>
                    </Avatar>

                    <div className="flex-1">
                      <div className="flex items-center space-x-2 mb-1">
                        <h3 className="text-lg font-semibold">
                          {user.displayName}
                        </h3>
                        <Badge className={getRoleColor(user.role)}>
                          {user.role.replace("_", " ")}
                        </Badge>
                        <Badge className={getStatusColor(user.status)}>
                          {user.status}
                        </Badge>
                      </div>

                      <p className="text-muted-foreground text-sm">
                        @{user.username} • {user.email}
                      </p>

                      <div className="flex items-center space-x-4 text-xs text-muted-foreground mt-2">
                        <span>Joined {formatDate(user.createdAt)}</span>
                        {user.lastLogin && (
                          <>
                            <span>•</span>
                            <span>
                              Last login {formatRelativeTime(user.lastLogin)}
                            </span>
                          </>
                        )}
                        <span>•</span>
                        <span>{user.loginCount || 0} logins</span>
                      </div>
                    </div>
                  </div>

                  <div className="flex items-center space-x-2">
                    <Button variant="ghost" size="sm">
                      <Shield className="h-4 w-4" />
                    </Button>
                    <Button variant="ghost" size="sm">
                      <Edit className="h-4 w-4" />
                    </Button>
                    <Button variant="ghost" size="sm">
                      <Trash2 className="h-4 w-4" />
                    </Button>
                  </div>
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      )}

      {/* Pagination */}
      {pagination.pages > 1 && (
        <div className="flex justify-center items-center space-x-4">
          {pagination.hasPrev && (
            <Button variant="outline" asChild>
              <Link href={`/admin/users?page=${pagination.page - 1}`}>
                Previous
              </Link>
            </Button>
          )}

          <span className="text-sm text-muted-foreground">
            Page {pagination.page} of {pagination.pages}
          </span>

          {pagination.hasNext && (
            <Button variant="outline" asChild>
              <Link href={`/admin/users?page=${pagination.page + 1}`}>
                Next
              </Link>
            </Button>
          )}
        </div>
      )}
    </div>
  );
}

function UsersTableSkeleton() {
  return (
    <div className="space-y-4">
      {[...Array(5)].map((_, i) => (
        <Card key={i}>
          <CardContent className="p-6">
            <div className="flex items-center justify-between">
              <div className="flex items-center space-x-4">
                <Skeleton className="h-12 w-12 rounded-full" />
                <div className="flex-1">
                  <div className="flex items-center space-x-2 mb-1">
                    <Skeleton className="h-6 w-32" />
                    <Skeleton className="h-5 w-16" />
                    <Skeleton className="h-5 w-16" />
                  </div>
                  <Skeleton className="h-4 w-48 mb-2" />
                  <div className="flex items-center space-x-4">
                    <Skeleton className="h-3 w-20" />
                    <Skeleton className="h-3 w-24" />
                    <Skeleton className="h-3 w-16" />
                  </div>
                </div>
              </div>
              <div className="flex items-center space-x-2">
                <Skeleton className="h-8 w-8" />
                <Skeleton className="h-8 w-8" />
                <Skeleton className="h-8 w-8" />
              </div>
            </div>
          </CardContent>
        </Card>
      ))}
    </div>
  );
}

export default function AdminUsersPage({ searchParams }: UsersPageProps) {
  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold tracking-tight">Users</h1>
          <p className="text-muted-foreground">
            Manage user accounts and permissions
          </p>
        </div>
        <Button asChild>
          <Link href="/admin/users/new">
            <Plus className="h-4 w-4 mr-2" />
            Add User
          </Link>
        </Button>
      </div>

      <div className="flex items-center space-x-4">
        <div className="relative flex-1 max-w-sm">
          <Search className="absolute left-3 top-3 h-4 w-4 text-muted-foreground" />
          <Input placeholder="Search users..." className="pl-10" />
        </div>

        <Button variant="outline">
          <Filter className="h-4 w-4 mr-2" />
          Filter
        </Button>
      </div>

      <UsersContent searchParams={searchParams} />
    </div>
  );
}
