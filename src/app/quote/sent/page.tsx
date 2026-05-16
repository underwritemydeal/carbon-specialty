import type { Metadata } from "next";
import { Header } from "@/components/Header";
import { Footer } from "@/components/Footer";
import { Confirmation } from "@/components/Confirmation";

export const metadata: Metadata = {
  title: "Submission received",
  description: "Carbon Specialty has received your submission. A specialist will follow up within one business day.",
  alternates: { canonical: "/quote/sent" },
  robots: { index: false, follow: false },
};

export default function ConfirmationPage() {
  return (
    <>
      <Header />
      <main id="main">
        <Confirmation />
      </main>
      <Footer />
    </>
  );
}
