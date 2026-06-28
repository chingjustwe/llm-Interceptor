import { jsx as _jsx, jsxs as _jsxs } from "react/jsx-runtime";
export default function DataTable({ columns, data, loading, emptyMessage = 'No data', onSort }) {
    if (loading) {
        return (_jsx("div", { className: "bg-zinc-900 rounded-xl overflow-hidden", children: _jsx("div", { className: "space-y-0", children: Array.from({ length: 5 }).map((_, i) => (_jsx("div", { className: "h-12 bg-zinc-900 animate-pulse border-b border-zinc-800 last:border-0" }, i))) }) }));
    }
    if (data.length === 0) {
        return (_jsx("div", { className: "bg-zinc-900 rounded-xl text-center py-16 text-zinc-500", children: _jsx("p", { children: emptyMessage }) }));
    }
    return (_jsx("div", { className: "bg-zinc-900 rounded-xl overflow-hidden", children: _jsx("div", { className: "overflow-x-auto", children: _jsxs("table", { className: "w-full text-sm", children: [_jsx("thead", { children: _jsx("tr", { className: "bg-zinc-800/50 text-zinc-500 text-xs uppercase tracking-wider", children: columns.map((col) => (_jsxs("th", { className: `text-left px-4 py-3 font-medium ${col.sortable ? 'cursor-pointer hover:text-zinc-300' : ''} ${col.width || ''}`, onClick: () => col.sortable && onSort?.(col.key, 'asc'), children: [col.label, col.sortable && ' ↕'] }, col.key))) }) }), _jsx("tbody", { children: data.map((item, i) => (_jsx("tr", { className: "border-t border-zinc-800 hover:bg-zinc-800/30 transition-colors", children: columns.map((col) => (_jsx("td", { className: "px-4 py-3 text-zinc-300 font-mono text-sm", children: col.render ? col.render(item) : item[col.key] }, col.key))) }, item.id || i))) })] }) }) }));
}
