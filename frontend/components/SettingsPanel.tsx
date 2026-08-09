"use client";

import { useEffect, useState } from "react";
import { CheckCircle2, Database, Info, Scale, ShieldCheck } from "lucide-react";

import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Progress } from "@/components/ui/progress";
import { getHealth } from "@/lib/api";

const scoringWeights = [
  ["Price", 35],
  ["Technical compliance", 30],
  ["Delivery", 15],
  ["Warranty", 10],
  ["Payment terms", 5],
  ["Support", 5],
] as const;

export function SettingsPanel() {
  const [connection, setConnection] = useState<
    "checking" | "connected" | "disconnected"
  >("checking");

  useEffect(() => {
    let cancelled = false;
    void getHealth()
      .then(() => {
        if (!cancelled) setConnection("connected");
      })
      .catch(() => {
        if (!cancelled) setConnection("disconnected");
      });
    return () => {
      cancelled = true;
    };
  }, []);

  return (
    <div className="grid gap-5 xl:grid-cols-[minmax(0,1fr)_360px]">
      <div className="space-y-5">
        <Card>
          <CardHeader className="border-b border-slate-100">
            <div className="flex items-start gap-3">
              <span className="flex h-9 w-9 items-center justify-center rounded-md bg-sky-50 text-sky-700">
                <Database className="h-[18px] w-[18px]" />
              </span>
              <div>
                <CardTitle>API connection</CardTitle>
                <p className="mt-1.5 text-sm text-slate-500">Configure the FastAPI service used for evaluation data and quotation uploads.</p>
              </div>
            </div>
          </CardHeader>
          <CardContent className="space-y-5 pt-6">
            <div className="space-y-2">
              <div className="flex items-center justify-between">
                <Label htmlFor="api-url">Backend URL</Label>
                <Badge
                  variant={
                    connection === "connected"
                      ? "success"
                      : connection === "checking"
                        ? "muted"
                        : "warning"
                  }
                >
                  {connection === "connected"
                    ? "Connected"
                    : connection === "checking"
                      ? "Checking"
                      : "Not connected"}
                </Badge>
              </div>
              <Input id="api-url" value={process.env.NEXT_PUBLIC_API_URL ?? "http://localhost:8000"} readOnly />
              <p className="text-xs text-slate-500">Set <code className="rounded bg-slate-100 px-1.5 py-0.5 font-mono text-[11px]">NEXT_PUBLIC_API_URL</code> in <code className="rounded bg-slate-100 px-1.5 py-0.5 font-mono text-[11px]">.env.local</code>.</p>
            </div>

            <div className="grid gap-4 sm:grid-cols-2">
              <div className="space-y-2">
                <Label>Default currency</Label>
                <Select defaultValue="PKR" disabled>
                  <SelectTrigger><SelectValue /></SelectTrigger>
                  <SelectContent>
                    <SelectItem value="PKR">PKR — Pakistani Rupee</SelectItem>
                    <SelectItem value="USD">USD — US Dollar</SelectItem>
                    <SelectItem value="EUR">EUR — Euro</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              <div className="space-y-2">
                <Label htmlFor="upload-limit">PDF upload limit</Label>
                <div className="relative">
                  <Input
                    id="upload-limit"
                    type="number"
                    defaultValue={10}
                    className="pr-12"
                    readOnly
                  />
                  <span className="absolute right-3 top-1/2 -translate-y-1/2 text-xs text-slate-400">MB</span>
                </div>
              </div>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="border-b border-slate-100">
            <div className="flex items-start gap-3">
              <span className="flex h-9 w-9 items-center justify-center rounded-md bg-teal-50 text-teal-700">
                <Scale className="h-[18px] w-[18px]" />
              </span>
              <div>
                <CardTitle>Scoring model</CardTitle>
                <p className="mt-1.5 text-sm text-slate-500">MVP weighting applied after mandatory compliance checks.</p>
              </div>
            </div>
          </CardHeader>
          <CardContent className="space-y-4 pt-6">
            {scoringWeights.map(([label, weight]) => (
              <div key={label} className="grid grid-cols-[140px_1fr_48px] items-center gap-3 sm:grid-cols-[180px_1fr_56px]">
                <span className="text-sm font-medium text-slate-700">{label}</span>
                <Progress value={weight * 2} className="h-2" />
                <span className="text-right text-sm font-semibold tabular-nums text-slate-700">{weight}%</span>
              </div>
            ))}
            <div className="flex items-center justify-between border-t border-slate-100 pt-4 text-sm">
              <span className="font-semibold text-slate-700">Total weight</span>
              <span className="font-bold text-emerald-700">100%</span>
            </div>
          </CardContent>
        </Card>

      </div>

      <div className="space-y-5">
        <Card>
          <CardHeader className="border-b border-slate-100">
            <CardTitle className="flex items-center gap-2"><ShieldCheck className="h-4 w-4 text-teal-700" /> Evaluation safeguards</CardTitle>
          </CardHeader>
          <CardContent className="space-y-4 pt-5">
            {[
              "Mandatory gates run before weighted scoring",
              "AI cannot change verified numeric values",
              "Disqualified vendors cannot be recommended",
              "Missing information remains explicit",
            ].map((item) => (
              <div key={item} className="flex items-start gap-2.5 text-sm leading-5 text-slate-600">
                <CheckCircle2 className="mt-0.5 h-4 w-4 shrink-0 text-emerald-600" /> {item}
              </div>
            ))}
          </CardContent>
        </Card>

        <Alert variant="info">
          <Info />
          <AlertTitle>Frontend configuration only</AlertTitle>
          <AlertDescription>Scoring weights and upload limits must be enforced by FastAPI. This screen presents the intended MVP configuration.</AlertDescription>
        </Alert>
      </div>
    </div>
  );
}
