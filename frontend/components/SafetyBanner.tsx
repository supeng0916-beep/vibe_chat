"use client";

export function SafetyBanner() {
  return (
    <div className="rounded-2xl border border-rose-300/25 bg-rose-500/10 p-4 text-sm leading-6 text-rose-100">
      <div className="mb-1 font-medium">你不是一个人 💗</div>
      <p className="text-rose-100/80">
        我感觉到你此刻很不容易。如果情绪难以承受，请记得身边有人愿意听你说。
        全国心理援助热线 <span className="font-semibold text-rose-50">400-161-9995</span>，24 小时在线。
      </p>
    </div>
  );
}
