import Header from "../../components/Header";
import Footer from "../../components/Footer";
import UserChatWidget from "../../components/UserChatWidget";

export default function PublicLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <>
      <Header />
      <div className="flex-grow">
        {children}
      </div>
      <Footer />
      <UserChatWidget />
    </>
  );
}
