"use client";
import {
  ChevronDown,
  Filter,
  LayoutDashboard,
  Plus,
  Search,
  TextAlignJustify,
} from "lucide-react";
import Link from "next/link";

import { mockResources } from "@/lib/mocks/resources.mock";
import { useState } from "react";
import ResourceTableView from "./ResourcesTableView";
import ResourcesGridView from "./ResourceGridView";

export default function ResourcesTable() {
  const [viewMode, setViewMode] = useState<"list" | "grid">("list");

  return (
    <div className="mt-5 overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-sm">
      <div className="flex flex-col items-center justify-between gap-4 border-b border-slate-200 bg-slate-50/70 p-5 sm:flex-row">
        <h2 className="text-lg font-semibold text-slate-800">Resources</h2>

        <div className="flex w-full flex-col items-center gap-4 sm:w-auto sm:flex-row">
          <div className="relative w-full sm:w-80">
            <Search
              className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400"
              size={18}
            />
            <input
              type="text"
              placeholder="Search resource..."
              className="w-full rounded-xl border border-slate-200 bg-white py-2.5 pl-10 pr-4 text-sm text-slate-700 placeholder:text-slate-400 focus:border-transparent focus:outline-none focus:ring-2 focus:ring-[#9e2727]/30"
            />
          </div>

          <div className="flex flex-wrap items-center justify-center gap-2">
            <button
              type="button"
              title="List view"
              onClick={() => setViewMode("list")}
              className={`flex w-full cursor-pointer items-center justify-center gap-2 rounded-xl px-4 py-2.5 text-sm font-medium transition-all sm:w-auto ${
                viewMode === "list"
                  ? "bg-[#9e2727] text-white shadow-sm hover:bg-[#8d2323]"
                  : "border border-slate-200 bg-white text-slate-700 hover:bg-slate-50"
              }`}
            >
              <TextAlignJustify size={18} />
            </button>

            <button
              type="button"
              title="Grid view"
              onClick={() => setViewMode("grid")}
              className={`flex w-full cursor-pointer items-center justify-center gap-2 rounded-xl px-4 py-2.5 text-sm font-medium transition-all sm:w-auto ${
                viewMode === "grid"
                  ? "bg-[#9e2727] text-white shadow-sm hover:bg-[#8d2323]"
                  : "border border-slate-200 bg-white text-slate-700 hover:bg-slate-50"
              }`}
            >
              <LayoutDashboard size={18} />
            </button>
          </div>

          <Link
            href="#"
            title="Create a new resource"
            className="flex w-full items-center justify-center gap-2 rounded-xl bg-[#9e2727] px-4 py-2.5 text-sm font-medium text-white shadow-sm transition-all hover:bg-[#8d2323] sm:w-auto"
          >
            <Plus size={18} />
            <span>New Resource</span>
          </Link>

          <button
            title="Open filters"
            className="flex w-full items-center justify-center gap-2 rounded-xl border border-slate-200 bg-white px-4 py-2.5 text-sm font-medium text-slate-700 transition-all hover:bg-slate-50 sm:w-auto"
          >
            <Filter size={18} />
            Filters
            <ChevronDown size={14} />
          </button>
        </div>
      </div>

      {viewMode === "grid" ? (
        <ResourcesGridView resources={mockResources} />
      ) : (
        <ResourceTableView resources={mockResources} />
      )}
    </div>
  );
}
