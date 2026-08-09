"use client";

import { Plus, Trash2 } from "lucide-react";

import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import type { Requirement } from "@/lib/types";
import { cn } from "@/lib/utils";

export function RequirementsBuilder({
  requirements,
  onChange,
  showErrors = false,
}: {
  requirements: Requirement[];
  onChange: (requirements: Requirement[]) => void;
  showErrors?: boolean;
}) {
  function updateRequirement(id: string, patch: Partial<Requirement>) {
    onChange(
      requirements.map((requirement) =>
        requirement.id === id ? { ...requirement, ...patch } : requirement,
      ),
    );
  }

  function addRequirement() {
    onChange([
      ...requirements,
      {
        id: crypto.randomUUID(),
        name: "",
        expectedValue: "",
        unit: "",
        type: "MANDATORY",
      },
    ]);
  }

  function removeRequirement(id: string) {
    onChange(requirements.filter((requirement) => requirement.id !== id));
  }

  return (
    <div>
      <div className="mb-4 flex flex-col justify-between gap-3 sm:flex-row sm:items-start">
        <div>
          <h3 className="text-base font-semibold text-navy-950">Purchasing requirements</h3>
          <p className="mt-1 text-sm leading-5 text-slate-500">
            Mandatory requirements act as compliance guardrails. Preferred requirements improve ranking.
          </p>
        </div>
        <Button type="button" variant="outline" size="sm" onClick={addRequirement}>
          <Plus />
          Add requirement
        </Button>
      </div>

      <div className="hidden grid-cols-[minmax(180px,1.5fr)_minmax(140px,1fr)_110px_150px_40px] gap-3 px-1 pb-2 md:grid">
        {[
          "Requirement",
          "Required value",
          "Unit",
          "Priority",
          "",
        ].map((header) => (
          <span
            key={header || "actions"}
            className="text-[10px] font-semibold uppercase tracking-[0.1em] text-slate-400"
          >
            {header}
          </span>
        ))}
      </div>

      <div className="space-y-3">
        {requirements.map((requirement, index) => {
          const nameError = showErrors && !requirement.name.trim();
          const valueError = showErrors && !requirement.expectedValue.trim();

          return (
            <div
              key={requirement.id}
              className="grid gap-3 rounded-lg border border-slate-200 bg-slate-50/60 p-4 md:grid-cols-[minmax(180px,1.5fr)_minmax(140px,1fr)_110px_150px_40px] md:items-start md:rounded-md md:bg-white md:p-3"
            >
              <div className="space-y-1.5">
                <Label className="md:sr-only" htmlFor={`requirement-name-${index}`}>
                  Requirement name
                </Label>
                <Input
                  id={`requirement-name-${index}`}
                  value={requirement.name}
                  onChange={(event) =>
                    updateRequirement(requirement.id!, { name: event.target.value })
                  }
                  placeholder="e.g. Minimum RAM"
                  aria-invalid={nameError}
                  className={cn(nameError && "border-red-400 focus-visible:border-red-500 focus-visible:ring-red-500/10")}
                />
                {nameError && <p className="text-xs text-red-600">Enter a requirement.</p>}
              </div>

              <div className="space-y-1.5">
                <Label className="md:sr-only" htmlFor={`requirement-value-${index}`}>
                  Required value
                </Label>
                <Input
                  id={`requirement-value-${index}`}
                  value={requirement.expectedValue}
                  onChange={(event) =>
                    updateRequirement(requirement.id!, { expectedValue: event.target.value })
                  }
                  placeholder="e.g. Minimum 16"
                  aria-invalid={valueError}
                  className={cn(valueError && "border-red-400 focus-visible:border-red-500 focus-visible:ring-red-500/10")}
                />
                {valueError && <p className="text-xs text-red-600">Enter the expected value.</p>}
              </div>

              <div className="space-y-1.5">
                <Label className="md:sr-only" htmlFor={`requirement-unit-${index}`}>
                  Unit
                </Label>
                <Input
                  id={`requirement-unit-${index}`}
                  value={requirement.unit ?? ""}
                  onChange={(event) =>
                    updateRequirement(requirement.id!, { unit: event.target.value })
                  }
                  placeholder="GB"
                />
              </div>

              <div className="space-y-1.5">
                <Label className="md:sr-only">Priority</Label>
                <Select
                  value={requirement.type}
                  onValueChange={(value) =>
                    updateRequirement(requirement.id!, {
                      type: value as Requirement["type"],
                    })
                  }
                >
                  <SelectTrigger aria-label={`Priority for requirement ${index + 1}`}>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="MANDATORY">Mandatory</SelectItem>
                    <SelectItem value="PREFERRED">Preferred</SelectItem>
                  </SelectContent>
                </Select>
              </div>

              <Button
                type="button"
                variant="ghost"
                size="icon"
                className="self-end text-slate-400 hover:bg-red-50 hover:text-red-600 md:self-start"
                onClick={() => removeRequirement(requirement.id!)}
                disabled={requirements.length === 1}
                aria-label={`Delete requirement ${index + 1}`}
              >
                <Trash2 />
              </Button>
            </div>
          );
        })}
      </div>

      <div className="mt-4 flex items-center gap-5 text-xs text-slate-500">
        <span>
          <strong className="font-semibold text-slate-700">
            {requirements.filter((item) => item.type === "MANDATORY").length}
          </strong>{" "}
          mandatory
        </span>
        <span>
          <strong className="font-semibold text-slate-700">
            {requirements.filter((item) => item.type === "PREFERRED").length}
          </strong>{" "}
          preferred
        </span>
      </div>
    </div>
  );
}
