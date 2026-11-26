import Image from "next/image";
import Link from "next/link";
import ReactPlayer from "react-player"
import ProductCatalog from "./catalog/page";
import MediaManagementPage from "./media/page";
function App() {
  return (
    <MediaManagementPage/>
    /*
    <main className="min-h-screen bg-[#e7ded2] p-4 md:p-8">
      <section className="mx-auto min-h-170.5 w-full max-w-375 bg-[#eee7de] px-7 py-10 md:px-12 md:py-12">
        <div className="grid min-h-147.5 grid-cols-1 gap-10 md:grid-cols-[1fr_428px] md:gap-12">

          <div className="flex flex-col items-start">
            <div className="mb-10 flex items-center gap-4 font-mono text-xs uppercase tracking-wide text-[#b87955]">
              <span>Kollektion</span>
              <span>·</span>
              <span>Europeiskt hantverk</span>
            </div>

            <h1 className="max-w-150 font-serif text-3xl font-semibold leading-[1.2] tracking-tight text-[#171411] md:text-5xl">
              Lorem Ipsum Dolor Sit
              <br />
              Amet Consectetur
              <br />
              Adipiscing Elit
            </h1>

            <p className="mt-6 max-w-100 font-sans text-sm leading-7 text-[#171411]">
              lorem ipsum dolor sit amet consectetur
              <br className="hidden md:block" />
              adipiscing elit
            </p>

            <div className="mt-auto pt-12">
              <Link href="/catalog" className="min-w-70 rounded-full bg-[#392b20] px-12 py-5 font-mono text-xs uppercase text-[#f5eee6] transition-colors duration-300 hover:bg-[#594333] md:min-w-[423px]">
                Handla kollektionen
              </Link>
            </div>
          </div>

          <div className="md:block">
            <ReactPlayer height={"590px"} autoPlay={true} loop={true} muted={true} src='womens_underwear_8.mp4'/>
          </div>
        </div>
      </section>
    </main> */
  );
}

export default App;