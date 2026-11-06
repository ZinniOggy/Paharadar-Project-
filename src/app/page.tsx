import { Hero } from "@/components/Hero";
import { Marquee, Checks, HowItWorks, DemoBand } from "@/components/Sections";

export default function Home() {
  return (
    <>
      <Hero />
      <Marquee />
      <Checks />
      <HowItWorks />
      <DemoBand />
    </>
  );
}