import { Suspense } from "react";
import { redirect } from "next/navigation";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { AdminSidebar } from "@/components/admin/sidebar";
import { AdminHeader } from "@/components/admin/header";
import { LoadingSpinner } from "@/components/ui";

export default async function AdminLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  interface AdminUser {
    name?: string | null;
    email?: string | null;
    image?: string | null;
    role?: string | null;
  }

  const session = (await getServerSession(authOptions)) as
    | (Omit<Awaited<ReturnType<typeof getServerSession>>, "user"> & {
        user: AdminUser;
      })
    | null;

  if (!session) {
    redirect("/auth/signin?callbackUrl=/admin");
  }

  // Check if user has admin access
  const allowedRoles = ["super_admin", "admin", "editor"];
  if (!session.user || !allowedRoles.includes(session.user.role ?? "")) {
    redirect("/");
  }

  return (
    <div className="min-h-screen bg-background">
      <AdminSidebar />
      <div className="lg:pl-64">
        <AdminHeader />
        <main className="p-6">
          <Suspense fallback={<LoadingSpinner />}>{children}</Suspense>
        </main>
      </div>
    </div>
  );
}
