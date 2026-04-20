// Branded placeholder image for web search results — uShoe logo + generic shoe silhouette
export default function UShoeWebImage({ className = "" }) {
  return (
    <div className={`flex flex-col items-center justify-center bg-gradient-to-br from-slate-100 to-slate-200 dark:from-slate-800 dark:to-slate-900 ${className}`}>
      <svg viewBox="0 0 120 100" className="w-3/4 max-w-[90px] opacity-60" fill="none" xmlns="http://www.w3.org/2000/svg">
        {/* Shoe silhouette */}
        <path
          d="M10 70 Q15 45 35 42 Q50 40 60 44 Q75 38 90 42 Q105 46 108 58 Q110 66 100 70 Z"
          fill="currentColor"
          className="text-slate-400 dark:text-slate-600"
        />
        <path
          d="M10 70 Q55 68 108 70 L108 75 Q55 77 10 75 Z"
          fill="currentColor"
          className="text-slate-500 dark:text-slate-500"
        />
        {/* Laces */}
        <line x1="50" y1="58" x2="70" y2="55" stroke="white" strokeWidth="1.5" strokeLinecap="round" opacity="0.5"/>
        <line x1="52" y1="63" x2="72" y2="60" stroke="white" strokeWidth="1.5" strokeLinecap="round" opacity="0.5"/>
      </svg>
      {/* uShoe wordmark */}
      <div className="mt-1 flex items-center gap-1">
        <span className="text-[10px]">👟</span>
        <span className="text-[10px] font-bold text-slate-500 dark:text-slate-400 tracking-wide font-heading">uShoe</span>
      </div>
    </div>
  );
}