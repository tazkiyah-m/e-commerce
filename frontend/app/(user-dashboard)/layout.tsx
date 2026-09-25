import DashboardSidebar from '../../components/DashboardSidebar';
import DashboardHeader from '../../components/DashboardHeader';
import UserChatWidget from '../../components/UserChatWidget';

export default function UserDashboardLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <div className="flex h-screen bg-surface overflow-hidden">
      <DashboardSidebar />
      <div className="flex-1 flex flex-col relative">
        <DashboardHeader />
        <main className="flex-1 overflow-y-auto pt-20 pl-0 md:pl-80 relative z-10 w-full h-full">
          {children}
        </main>
        <UserChatWidget />
      </div>
    </div>
  );
}
