import { jsx as _jsx, jsxs as _jsxs } from "react/jsx-runtime";
export default function StatsCard({ title, value, icon, trend, accentColor = 'border-cyan-500', loading }) {
    if (loading) {
        return (_jsxs("div", { className: "bg-zinc-900 rounded-xl p-5 border-l-2 border-zinc-700", children: [_jsx("div", { className: "h-3 w-20 bg-zinc-800 rounded animate-pulse mb-3" }), _jsx("div", { className: "h-8 w-24 bg-zinc-800 rounded animate-pulse" })] }));
    }
    return (_jsxs("div", { className: `bg-zinc-900 rounded-xl p-5 border-l-2 ${accentColor} relative overflow-hidden`, children: [icon && _jsx("div", { className: "absolute top-3 right-3 text-zinc-600", children: icon }), _jsx("p", { className: "text-xs uppercase tracking-wider text-zinc-500 font-medium mb-1", children: title }), _jsxs("div", { className: "flex items-baseline gap-2", children: [_jsx("p", { className: "text-3xl font-bold bg-gradient-to-r from-zinc-100 to-zinc-300 bg-clip-text text-transparent tabular-nums", children: value }), trend && (_jsxs("span", { className: `text-xs font-medium ${trend.isUp ? 'text-emerald-400' : 'text-rose-400'}`, children: [trend.isUp ? '↑' : '↓', " ", Math.abs(trend.value), "%"] }))] })] }));
}
