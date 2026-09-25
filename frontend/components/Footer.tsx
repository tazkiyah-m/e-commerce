import Link from 'next/link';

export default function Footer() {
  return (
    <footer className="w-full bg-[#f5f5f7] pt-4 pb-6">
      <div className="max-w-[1024px] mx-auto px-6">
        {/* Compact link sections */}
        <div className="grid grid-cols-2 md:grid-cols-4 gap-6 py-4 border-b border-[#d2d2d7]/80">
          <div>
            <h4 className="text-[12px] font-semibold text-[#1d1d1f] mb-2">Jelajahi</h4>
            <ul className="space-y-1.5">
              <li><Link className="text-[12px] text-[#424245] hover:text-[#1d1d1f] hover:underline transition-colors" href="/menu">Menu</Link></li>
              <li><Link className="text-[12px] text-[#424245] hover:text-[#1d1d1f] hover:underline transition-colors" href="/#about-us">Our Story</Link></li>
              <li><Link className="text-[12px] text-[#424245] hover:text-[#1d1d1f] hover:underline transition-colors" href="#">Membership</Link></li>
            </ul>
          </div>
          <div>
            <h4 className="text-[12px] font-semibold text-[#1d1d1f] mb-2">Kontak</h4>
            <ul className="space-y-1.5">
              <li className="text-[12px] text-[#424245]">10:00 – 22:00 WIB</li>
              <li className="text-[12px] text-[#424245]">hello@ggswell.com</li>
              <li className="text-[12px] text-[#424245]">+62 21 555 0123</li>
            </ul>
          </div>
          <div>
            <h4 className="text-[12px] font-semibold text-[#1d1d1f] mb-2">Legal</h4>
            <ul className="space-y-1.5">
              <li><Link className="text-[12px] text-[#424245] hover:text-[#1d1d1f] hover:underline transition-colors" href="#">Privacy Policy</Link></li>
              <li><Link className="text-[12px] text-[#424245] hover:text-[#1d1d1f] hover:underline transition-colors" href="#">Terms of Use</Link></li>
            </ul>
          </div>
          <div>
            <h4 className="text-[12px] font-semibold text-[#1d1d1f] mb-2">Follow Us</h4>
            <div className="flex gap-3 mt-1">
              <a className="text-[12px] text-[#424245] hover:text-[#1d1d1f] hover:underline transition-colors" href="#">Instagram</a>
              <a className="text-[12px] text-[#424245] hover:text-[#1d1d1f] hover:underline transition-colors" href="#">TikTok</a>
            </div>
          </div>
        </div>
        {/* Copyright */}
        <div className="pt-3 flex flex-col md:flex-row justify-between items-start md:items-center gap-1">
          <p className="text-[12px] text-[#86868b]">
            Copyright © 2024 GGS_WELL Gastronomy. All rights reserved.
          </p>
          <p className="text-[12px] text-[#86868b]">
            Jakarta, Indonesia
          </p>
        </div>
      </div>
    </footer>
  );
}
