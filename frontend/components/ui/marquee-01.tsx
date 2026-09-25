import { Card, CardContent } from "@/components/ui/card";
import { Marquee } from "@/components/ui/marquee-01-utils/marquee";

const reviews = [
  {
    name: "Andi Wijaya",
    username: "@andiw",
    body: "“Rasa daging panggangnya luar biasa, empuk dan bumbunya meresap sempurna. Jauh lebih baik dari tempat lain yang pernah saya coba!”",
    profile: "https://images.unsplash.com/photo-1534528741775-53994a69daeb?w=150&h=150&fit=crop",
  },
  {
    name: "Budi Santoso",
    username: "@bsantoso",
    body: "“Pengiriman sangat cepat dan kemasannya aman. Makanan masih hangat saat sampai. Pelayanan terbaik untuk pesanan kantor kami.”",
    profile: "https://images.unsplash.com/photo-1506794778202-cad84cf45f1d?w=150&h=150&fit=crop",
  },
  {
    name: "Citra Lestari",
    username: "@clestari",
    body: "“Sangat suka dengan konsep organik yang ditawarkan. Sayurannya segar dan porsinya mengenyangkan. xGGSx memang pantas jadi favorit.”",
    profile: "https://images.unsplash.com/photo-1494790108377-be9c29b29330?w=150&h=150&fit=crop",
  },
  {
    name: "Dimas Pratama",
    username: "@dimasp",
    body: "“Resep rahasia keluarga mereka benar-benar juara. Rasanya otentik dan selalu konsisten setiap kali saya pesan. Sangat merekomendasikan!”",
    profile: "https://images.unsplash.com/photo-1517841905240-472988babdf9?w=150&h=150&fit=crop",
  },
  {
    name: "Eka Putri",
    username: "@ekaputri",
    body: "“Cocok banget buat acara kumpul keluarga. Semua pada suka! Porsinya pas, harganya juga sangat sepadan dengan kualitas yang didapat.”",
    profile: "https://images.unsplash.com/photo-1539571696357-5a69c17a67c6?w=150&h=150&fit=crop",
  },
  {
    name: "Fajar Nugraha",
    username: "@fajarn",
    body: "“Penyelamat lapar di tengah malam. Walau pesannya telat, kualitas dan rasa tetap konsisten seperti biasa. Sangat puas dengan xGGSx.”",
    profile: "https://images.unsplash.com/photo-1438761681033-6461ffad8d80?w=150&h=150&fit=crop",
  },
];

const firstRow = reviews.slice(0, reviews.length / 2);
const secondRow = reviews.slice(reviews.length / 2);

const ReviewCard = ({
  profile,
  name,
  username,
  body,
}: {
  profile: string;
  name: string;
  username: string;
  body: string;
}) => {
  return (
    <Card className="relative h-full w-64 cursor-pointer overflow-hidden border-border bg-card shadow-none p-4">
      <CardContent className="p-0 flex flex-col gap-2">
        <div className="flex flex-row items-center gap-2">
          <img
            className="rounded-full object-cover"
            width="32"
            height="32"
            alt=""
            src={profile}
          />
          <div className="flex flex-col">
            <p className="text-sm font-medium text-foreground">{name}</p>
            <p className="text-xs font-medium text-muted-foreground">
              {username}
            </p>
          </div>
        </div>
        <p className="text-sm line-clamp-2 text-foreground">{body}</p>
      </CardContent>
    </Card>
  );
};

export default function TestimonialMarqueeDemo() {
  return (
    <div className="group relative flex w-full flex-col items-center justify-center overflow-hidden">
      <Marquee pauseOnHover className="[--duration:20s]">
        {firstRow.map((review) => (
          <ReviewCard key={review.username} {...review} />
        ))}
      </Marquee>
      <Marquee reverse pauseOnHover className="[--duration:20s]">
        {secondRow.map((review) => (
          <ReviewCard key={review.username} {...review} />
        ))}
      </Marquee>
      <div className="from-[#f5f5f7] pointer-events-none absolute inset-y-0 left-0 w-1/4 bg-gradient-to-r"></div>
      <div className="from-[#f5f5f7] pointer-events-none absolute inset-y-0 right-0 w-1/4 bg-gradient-to-l"></div>
    </div>
  );
}
