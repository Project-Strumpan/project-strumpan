//import Image from "next/image";
import Link from "next/link";
//import ReactPlayer from "react-player"

function App() {
  return (
    <main className="min-h-screen bg-background p-4 md:p-8">
      <section className="mx-auto min-h-170.5 w-full max-w-375 bg-foreground dark:bg-(--foreground2) px-7 py-10 md:px-12 md:py-12">
        <div className="grid min-h-147.5 grid-cols-1 gap-10 md:grid-cols-[1fr_428px] md:gap-12">

          <div className="flex flex-col items-start">
            <div className="mb-10 flex items-center gap-4 font-mono text-xs uppercase tracking-wide text-[#b87955] dark:text-[#f0bda0]">
              <span>Kollektion</span>
              <span className="text-sm">·</span>
              <span>Europeiskt hantverk</span>
            </div>

            <h1 className="max-w-150 font-serif text-3xl font-semibold leading-[1.2] tracking-tight text-[#171411] dark:text-(--text-color-headings) md:text-5xl">
              Lorem Ipsum Dolor Sit
              <br />
              Amet Consectetur
              <br />
              Adipiscing Elit
            </h1>

            <p className="mt-6 max-w-100 font-sans text-sm leading-7 text-[#171411] dark:text-[#83411b]">
              Lorem ipsum dolor sit amet, consectetur adipiscing elit. Donec auctor orci quis porta pellentesque. Nunc nec pellentesque ex, sit amet vulputate erat. 
              Mauris facilisis, massa quis finibus malesuada, neque mauris aliquet libero
              {/*<br className="hidden md:block" />*/}
            </p>

            <div className="mt-auto pt-12">
              <Link href="/catalog" className="min-w-70 rounded-full bg-(--button) hover:bg-[#594333] px-12 py-5 font-mono text-xs uppercase text-[#f5eee6] transition-colors duration-300 md:min-w-[423px]">
                Handla kollektionen
              </Link>
            </div>
          </div>

          
          <div className="md:block">
            <img src='media/images/socks/sports socks motor.jpg'/>
            {/*<ReactPlayer height={"590px"} autoPlay={true} loop={true} muted={true} src='womens_underwear_.mp4'/>  */} 
          </div>
        </div>
      </section>
    </main>
  );
}

export default App;