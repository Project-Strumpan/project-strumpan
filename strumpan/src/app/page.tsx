import Image from "next/image";

export default function Home() {
  return (
    <div className="relative flex-1 bg-[url('/image004.jpg')] bg-cover bg-center">
      <Image
        className="absolute bottom-4 right-4 h-auto w-40"
        src="/Loopia_Logotype_Neg_RGB.png"
        alt="Loopia"
        width={3126}
        height={950}
      />
    </div>
  );
}
