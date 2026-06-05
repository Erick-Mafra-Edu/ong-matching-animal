"use client"

import * as React from "react"
import { ChevronLeft, ChevronRight } from "lucide-react"
import { DayPicker } from "react-day-picker"

import { cn } from "@/lib/utils"

export type CalendarProps = React.ComponentProps<typeof DayPicker>

function Calendar({
  className,
  classNames,
  showOutsideDays = true,
  ...props
}: CalendarProps) {
  return (
    <DayPicker
      showOutsideDays={showOutsideDays}
      className={cn("p-3", className)}
      classNames={{
        months: "flex flex-col sm:flex-row space-y-4 sm:space-x-4 sm:space-y-0",
        month: "space-y-4",
        caption: "flex justify-center pt-1 relative items-center",
        caption_label: "text-sm font-medium text-white",
        nav: "space-x-1 flex items-center",
        nav_button: cn(
          "h-7 w-7 bg-transparent p-0 opacity-50 hover:opacity-100 text-white"
        ),
        nav_button_previous: "absolute left-1",
        nav_button_next: "absolute right-1",
        table: "w-full border-collapse space-y-1",
        head_row: "flex",
        head_cell:
          "text-slate-500 rounded-md w-9 font-normal text-[0.8rem]",
        row: "flex w-full mt-2",
        cell: "h-9 w-9 text-center text-sm p-0 relative [&:has([aria-selected].day-range-end)]:rounded-r-md [&:has([aria-selected].day-outside)]:bg-white/5 [&:has([aria-selected])]:bg-white/10 first:[&:has([aria-selected])]:rounded-l-md last:[&:has([aria-selected])]:rounded-r-md focus-within:relative focus-within:z-20",
        day: cn(
          "h-9 w-9 p-0 font-normal aria-selected:opacity-100 hover:bg-white/10 rounded-md text-slate-300"
        ),
        day_range_end: "day-range-end",
        day_selected:
          "bg-cyan-200 text-slate-950 hover:bg-cyan-200 hover:text-slate-950 focus:bg-cyan-200 focus:text-slate-950",
        day_today: "bg-white/10 text-white",
        day_outside:
          "day-outside text-slate-500 opacity-50 aria-selected:bg-white/5 aria-selected:text-slate-500 aria-selected:opacity-30",
        day_disabled: "text-slate-500 opacity-50",
        day_range_middle:
          "aria-selected:bg-white/5 aria-selected:text-white",
        day_hidden: "invisible",
        ...classNames,
      } as CalendarProps["classNames"]}
      components={{
        Chevron: ({ orientation }) => orientation === "left"
          ? <ChevronLeft className="h-4 w-4" />
          : <ChevronRight className="h-4 w-4" />,
      } as CalendarProps["components"]}
      {...props}
    />
  )
}
Calendar.displayName = "Calendar"

export { Calendar }
