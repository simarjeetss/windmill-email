import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import DashboardSidebar from "@/components/dashboard/sidebar";
import DashboardTopbar from "@/components/dashboard/topbar";
import { getProfile } from "@/lib/supabase/profile";

export default async function DashboardLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) redirect("/login");

  const { data: profile } = await getProfile();

  return (
    <div
      className="flex min-h-screen"
      style={{ background: "var(--wm-bg)" }}
    >
      {/* Sidebar */}
      <DashboardSidebar user={user} profile={profile} />

      {/* Main */}
      <div className="flex-1 flex flex-col min-w-0">
        <DashboardTopbar user={user} profile={profile} />
        <main className="flex-1 p-6 lg:p-8">{children}</main>
      </div>
    </div>
  );
}
